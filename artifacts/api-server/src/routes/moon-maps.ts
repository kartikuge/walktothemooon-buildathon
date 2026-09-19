import { Router } from "express";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { AddMapBody, AddMapResponse, PreviewMapBody, PreviewMapResponse, SearchPlacesQueryParams, SearchPlacesResponse, SaveActivityProfileBody, GetActivityProfileResponse, EstimateMapBody, EstimateMapResponse } from "@workspace/api-zod";
import { searchCities, resolveCity, buildGeoPreview } from "../lib/geo";
import { activityWeek, calculateEffort } from "../lib/effort";
import { moonState } from "./moon";

const router=Router();
const validDay=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const fail=(status:number,message:string)=>Object.assign(new Error(message),{status});
async function requireUser(userId:number) {
  if(!Number.isInteger(userId)||userId<1) throw fail(400,"Choose a valid runner.");
  if(!(await pool.query("SELECT id FROM moon_users WHERE id=$1",[userId])).rowCount) throw fail(404,"Runner not found.");
}
async function requireMember(userId:number,teamId:number|null) {
  await requireUser(userId);
  if(teamId!==null&&!(await pool.query("SELECT id FROM moon_members WHERE user_id=$1 AND team_id=$2",[userId,teamId])).rowCount) throw fail(403,"Choose one of your teams.");
}
export async function loadActivity(userId:number) {
  const saved=(await pool.query("SELECT body,configured FROM moon_activity WHERE user_id=$1",[userId])).rows[0];
  const profile={homeCity:null,dailyMiles:0,restDays:[6,0],commuteMiles:0,commuteDays:[],sessions:[],...saved?.body,userId,configured:saved?.configured??false,weeklyMiles:0};
  profile.weeklyMiles=Math.round(activityWeek(profile).reduce((a,b)=>a+b,0)*100)/100;
  return GetActivityProfileResponse.parse(profile);
}
router.get("/moon/places",async(req,res)=>{
  const q=SearchPlacesQueryParams.safeParse(req.query);
  if(!q.success){res.status(400).json({error:"Enter 2–100 characters to search cities."});return;}
  res.json(SearchPlacesResponse.parse(await searchCities(q.data.q)));
});
router.post("/moon/map-preview",async(req,res)=>{
  const parsed=PreviewMapBody.safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:"Choose two cities and a route mode."});return;}
  const v=parsed.data,data=await buildGeoPreview(v.originId,v.destinationId,v.mode),previewId=randomUUID();
  await pool.query("INSERT INTO moon_map_previews(id,body) VALUES($1,$2)",[previewId,JSON.stringify(data)]);
  res.json(PreviewMapResponse.parse({previewId,...data}));
});
router.post("/moon/maps",async(req,res)=>{
  const parsed=AddMapBody.safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:"Choose a runner, Map, and goal date."});return;}
  const v=parsed.data;
  if((v.routeId===undefined)===(v.previewId===undefined)||!validDay(v.today)||!validDay(v.endDate)||v.endDate<v.today) throw fail(400,"Choose exactly one route or preview and a goal on or after today.");
  await requireMember(v.userId,v.teamId);
  const c=await pool.connect();
  let mapId:number;
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(41202)");
    let routeId=v.routeId;
    if(v.previewId!==undefined) {
      const preview=(await c.query("SELECT body FROM moon_map_previews WHERE id=$1 AND created_at>NOW()-INTERVAL '24 hours'",[v.previewId])).rows[0];
      if(!preview) throw fail(400,"Preview expired or not found. Preview your Map again.");
      const p=preview.body;
      // The preview is server-owned. Its first enrollment fixes one reusable
      // route snapshot; the mutation lock serializes concurrent submissions.
      if(Number.isInteger(p.routeId)) {
        routeId=p.routeId;
      } else {
        routeId=(await c.query("INSERT INTO moon_routes(name,type,total_miles,emoji,gradient_from,gradient_to,geometry,is_preset) VALUES($1,'journey',$2,'🧭','#164b43','#78aa8c',$3,false) RETURNING id",[p.name,p.totalMiles,JSON.stringify(p.geometry)])).rows[0].id;
        await c.query("UPDATE moon_map_previews SET body=$1 WHERE id=$2",[JSON.stringify({...p,routeId}),v.previewId]);
      }
    } else if(!(await c.query(`SELECT r.id FROM moon_routes r WHERE r.id=$1 AND
      (r.is_preset OR EXISTS(SELECT 1 FROM moon_maps m WHERE m.route_id=r.id AND
        (m.solo_user_id=$2 OR m.team_id IN (SELECT team_id FROM moon_members WHERE user_id=$2))))`,[routeId,v.userId])).rowCount) throw fail(404,"Route not found in your enrolled Maps or preset catalog.");
    const map=(await c.query("INSERT INTO moon_maps(team_id,solo_user_id,route_id,end_date) VALUES($1,$2,$3,$4) RETURNING id",[v.teamId,v.teamId===null?v.userId:null,routeId,v.endDate])).rows[0];
    mapId=map.id;
    await c.query("COMMIT");
  } catch(err:any) {await c.query("ROLLBACK");if(err.code==="23505")throw fail(409,"This Map is already enrolled. Your existing miles are unchanged.");throw err;} finally {c.release();}
  const state=await moonState(v.userId,v.today);
  res.status(201).json(AddMapResponse.parse(state.journeys.find(j=>j.mapId===mapId)));
});
router.get("/moon/activity/:userId",async(req,res)=>{
  const id=Number(req.params.userId);await requireUser(id);res.json(await loadActivity(id));
});
router.put("/moon/activity/:userId",async(req,res)=>{
  const id=Number(req.params.userId);await requireUser(id);
  const parsed=SaveActivityProfileBody.safeParse(req.body);
  if(!parsed.success)throw fail(400,"Enter valid activity miles and days.");
  const v=parsed.data,unique=(days:number[])=>new Set(days).size===days.length;
  if(!unique(v.restDays)||!unique(v.commuteDays)||v.sessions.some(s=>!unique(s.days))||new Set(v.sessions.map(s=>s.id)).size!==v.sessions.length)throw fail(400,"Activity days and session IDs must be unique.");
  if(v.homeCity) v.homeCity=await resolveCity(v.homeCity.id);
  const c=await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("INSERT INTO moon_activity(user_id,body,configured) VALUES($1,$2,true) ON CONFLICT(user_id) DO UPDATE SET body=EXCLUDED.body,configured=true",[id,JSON.stringify(v)]);
    await c.query("UPDATE moon_users SET rest_days=$1 WHERE id=$2",[v.restDays,id]);
    await c.query("COMMIT");
  }catch(err){await c.query("ROLLBACK");throw err;}finally{c.release();}
  res.json(await loadActivity(id));
});
router.post("/moon/estimates",async(req,res)=>{
  const parsed=EstimateMapBody.safeParse(req.body);
  if(!parsed.success)throw fail(400,"Enter a valid distance, participant count, and dates.");
  const v=parsed.data;
  if(!validDay(v.today)||!validDay(v.endDate)||v.endDate<v.today)throw fail(400,"Goal date must be on or after today.");
  await requireMember(v.userId,v.teamId);
  const ids=v.teamId===null?[v.userId]:(await pool.query("SELECT user_id FROM moon_members WHERE team_id=$1 ORDER BY (user_id=$2) DESC,user_id",[v.teamId,v.userId])).rows.map(r=>r.user_id);
  const profiles=await Promise.all(ids.map(loadActivity));
  res.json(EstimateMapResponse.parse(calculateEffort({...v,profiles})));
});
router.use((err:any,req:import("express").Request,res:import("express").Response,_next:import("express").NextFunction)=>{
  const status=Number.isInteger(err.status)&&err.status>=400&&err.status<600?err.status:500;
  if(status===500)req.log.error({err},"Maps request failed");
  res.status(status).json({error:status===500?"Unable to complete this Maps request. Please try again.":err.message});
});
export default router;