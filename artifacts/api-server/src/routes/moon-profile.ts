import { Router } from "express";
import { randomInt } from "node:crypto";
import { pool } from "@workspace/db";
import { CreateTeamBody, JoinTeamBody, GetRunnerProfileResponse } from "@workspace/api-zod";
import { teamMapLeaderboard } from "../lib/team-leaderboard";
import { requireRunner } from "../middlewares/auth";

const router = Router();
const dayValid = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
const receiptColumns = `id,name,invite_code AS "inviteCode",route_id AS "routeId",end_date::text AS "endDate",leaderboard_enabled AS "leaderboardEnabled"`;
const legacyReceiptColumns = `id,name,invite_code AS "inviteCode",route_id AS "routeId",end_date::text AS "endDate",false AS "leaderboardEnabled"`;
let leaderboardColumnSupported: Promise<boolean> | undefined;

function supportsLeaderboardColumn() {
  leaderboardColumnSupported ??= pool.query(`SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema=current_schema() AND table_name='moon_teams' AND column_name='leaderboard_enabled'
  ) AS supported`).then(result => result.rows[0]?.supported === true);
  return leaderboardColumnSupported;
}

router.get("/moon/teams/:teamId/maps/:mapId/leaderboard",requireRunner,async(req,res)=>{
  try {
     res.json(await teamMapLeaderboard(Number(req.params.teamId),Number(req.params.mapId),req.runnerId!));
  } catch(err) {
    const status=(err as {status?:number}).status;
    if(status) {res.status(status).json({error:(err as Error).message});return;}
    req.log.error({err},"Leaderboard loading failed");
    res.status(500).json({error:"Could not load this leaderboard. Please try again."});
  }
});

router.get("/moon/profile", requireRunner, async (req,res) => {
  const userId=req.runnerId!, today=String(req.query.today);
  if(!dayValid(today)) {res.status(400).json({error:"Choose a valid local date."});return;}
  const user=(await pool.query("SELECT rest_days FROM moon_users WHERE id=$1",[userId])).rows[0];
  if(!user) {res.status(404).json({error:"Runner not found."});return;}
  const teamReceiptColumns = await supportsLeaderboardColumn() ? receiptColumns : legacyReceiptColumns;
  const [routes,stamps,teams,totals,dates] = await Promise.all([
    pool.query(`SELECT id,name,type,total_miles::float8 AS "totalMiles",emoji,gradient_from AS "gradientFrom",gradient_to AS "gradientTo",geometry FROM moon_routes r WHERE is_preset OR EXISTS(SELECT 1 FROM moon_maps m WHERE m.route_id=r.id AND (m.solo_user_id=$1 OR m.team_id IN (SELECT team_id FROM moon_members WHERE user_id=$1))) ORDER BY id`,[userId]),
    pool.query(`SELECT s.route_id AS "routeId",r.name AS "routeName",r.emoji,s.earned_at::text AS "earnedAt",s.earned_with_team AS "earnedWithTeam" FROM moon_stamps s JOIN moon_routes r ON r.id=s.route_id WHERE user_id=$1 ORDER BY earned_at DESC`,[userId]),
    pool.query(`SELECT ${teamReceiptColumns} FROM moon_teams WHERE id IN (SELECT team_id FROM moon_members WHERE user_id=$1) ORDER BY id`,[userId]),
    pool.query(`SELECT COALESCE(SUM(miles),0)::float8 AS "totalMiles",COALESCE(SUM(duration_minutes),0)::float8 AS "totalMinutes",COALESCE(MAX(miles),0)::float8 AS "longestRun" FROM moon_runs WHERE user_id=$1`,[userId]),
    pool.query("SELECT DISTINCT logged_at::text AS day FROM moon_runs WHERE user_id=$1 AND logged_at<=$2 ORDER BY day DESC",[userId,today]),
  ]);
  const runDays = new Set(dates.rows.map(r=>r.day));
  let cursor=Date.parse(today),currentStreak=0;
  // A streak stays current until today ends; count consecutive calendar run days.
  if(!runDays.has(today)) cursor-=86400000;
  while(runDays.has(new Date(cursor).toISOString().slice(0,10))) {currentStreak++;cursor-=86400000;}
  const completed=(await pool.query(`SELECT (SELECT COUNT(*) FROM moon_map_completions WHERE user_id=$1)+(SELECT COUNT(*) FROM moon_stamps s WHERE s.user_id=$1 AND NOT EXISTS(SELECT 1 FROM moon_map_completions c JOIN moon_maps m ON m.id=c.map_id WHERE c.user_id=s.user_id AND m.route_id=s.route_id)) AS count`,[userId])).rows[0];
  res.json(GetRunnerProfileResponse.parse({routes:routes.rows.map(r=>({...r,geometry:r.geometry??undefined})),stamps:stamps.rows,teams:teams.rows,...totals.rows[0],mapsCompleted:Number(completed.count),currentStreak,restDays:user.rest_days}));
});

router.post("/moon/teams",requireRunner,async(req,res)=>{
  const parsed=CreateTeamBody.safeParse(req.body);
  if(!parsed.success) {res.status(400).json({error:"Enter a team name, route, and end date."});return;}
  const v={...parsed.data,userId:req.runnerId!},name=v.name.trim();
  if(!name||!dayValid(v.today)||!dayValid(v.endDate)||v.endDate<v.today) {res.status(400).json({error:"Use a team name and an end date on or after today."});return;}
  const c=await pool.connect();
  try {
    await c.query("BEGIN");
    const user=await c.query("SELECT id FROM moon_users WHERE id=$1",[v.userId]);
    const route=await c.query(`SELECT r.id FROM moon_routes r WHERE r.id=$1 AND
      (r.is_preset OR EXISTS(SELECT 1 FROM moon_maps m WHERE m.route_id=r.id AND
        (m.solo_user_id=$2 OR m.team_id IN (SELECT team_id FROM moon_members WHERE user_id=$2))))`,[v.routeId,v.userId]);
    if(!user.rowCount||!route.rowCount) {await c.query("ROLLBACK");res.status(404).json({error:"Runner or route not found."});return;}
    // Coordinate code generation with other team creators; unique constraint remains the final guard.
    await c.query("SELECT pg_advisory_xact_lock(41201)");
    const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code:string;
    do {code=Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join("");}
    while((await c.query("SELECT id FROM moon_teams WHERE invite_code=$1",[code])).rowCount);
    const team=(await c.query(`INSERT INTO moon_teams(name,invite_code,owner_user_id,route_id,end_date,leaderboard_enabled) VALUES($1,$2,$3,$4,$5,$6) RETURNING ${receiptColumns}`,[name,code,v.userId,v.routeId,v.endDate,v.leaderboardEnabled??false])).rows[0];
    await c.query("INSERT INTO moon_members(team_id,user_id) VALUES($1,$2)",[team.id,v.userId]);
    await c.query("INSERT INTO moon_maps(team_id,route_id,end_date,legacy_key) VALUES($1,$2,$3,$4)",[team.id,v.routeId,v.endDate,`team-${team.id}`]);
    await c.query("COMMIT");res.status(201).json(team);
  } catch(err) {await c.query("ROLLBACK");req.log.error({err},"Team creation failed");res.status(500).json({error:"Could not create your team. Please try again."});}
  finally {c.release();}
});

router.post("/moon/teams/join",requireRunner,async(req,res)=>{
  const parsed=JoinTeamBody.safeParse({...req.body,inviteCode:typeof req.body?.inviteCode==="string"?req.body.inviteCode.trim().toUpperCase():req.body?.inviteCode});
  if(!parsed.success) {res.status(400).json({error:"Enter a six-character invite code."});return;}
  const v={...parsed.data,userId:req.runnerId!},c=await pool.connect();
  try {
    await c.query("BEGIN");
    // Same lock order as run completion: joining and team-wide awards cannot race.
    await c.query("SELECT id FROM moon_settings WHERE id=1 FOR UPDATE");
    const team=(await c.query(`SELECT ${receiptColumns} FROM moon_teams WHERE invite_code=$1`,[v.inviteCode])).rows[0];
    const user=await c.query("SELECT id FROM moon_users WHERE id=$1",[v.userId]);
    if(!team||!user.rowCount) {await c.query("ROLLBACK");res.status(404).json({error:!team?"No team found with that code.":"Runner not found."});return;}
    const existing=await c.query("SELECT id FROM moon_members WHERE team_id=$1 AND user_id=$2",[team.id,v.userId]);
    const active=await c.query("SELECT m.id FROM moon_maps m JOIN moon_routes r ON r.id=m.route_id WHERE m.team_id=$1 AND r.total_miles>(SELECT COALESCE(SUM(miles),0) FROM moon_runs WHERE map_id=m.id)",[team.id]);
    if(!existing.rowCount&&!active.rowCount) {await c.query("ROLLBACK");res.status(409).json({error:"This team has finished all its Maps. Ask a member to add another Map."});return;}
    await c.query("INSERT INTO moon_members(team_id,user_id) VALUES($1,$2) ON CONFLICT(team_id,user_id) DO NOTHING",[team.id,v.userId]);
    await c.query("COMMIT");res.json(team);
  } catch(err) {await c.query("ROLLBACK");req.log.error({err},"Team join failed");res.status(500).json({error:"Could not join the team. Please try again."});}
  finally {c.release();}
});
export default router;