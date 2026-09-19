import { Router } from "express";
import { pool } from "@workspace/db";
import { LogRunBody, GetMoonStateResponse } from "@workspace/api-zod";

const router = Router();
const round = (n: number) => Math.round(n * 100) / 100;
function validDay(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(`${s}T12:00:00Z`).toISOString().slice(0,10) === s;
}

router.get("/moon/state", async (req,res) => {
  const userId = Number(req.query.userId), today = String(req.query.today);
  if (!Number.isInteger(userId) || !validDay(today)) { res.status(400).json({error:"Choose a user and a valid local date."}); return; }
  const users = (await pool.query('SELECT id,name,avatar_emoji AS "avatarEmoji",rest_days AS "restDays" FROM moon_users ORDER BY id')).rows;
  const user = users.find(u=>u.id===userId);
  if (!user) { res.status(404).json({error:"Runner not found"}); return; }
  const routes = (await pool.query("SELECT * FROM moon_routes")).rows;
  const teams = (await pool.query("SELECT *,end_date::text AS end_day FROM moon_teams ORDER BY id")).rows;
  const members = (await pool.query("SELECT * FROM moon_members")).rows;
  const runs = (await pool.query("SELECT user_id,team_id,route_id,miles FROM moon_runs")).rows;
  const competition = (await pool.query("SELECT *,end_date::text AS end_day FROM moon_competitions WHERE id=1")).rows[0];
  const compTeams = (await pool.query("SELECT team_id FROM moon_competition_teams WHERE competition_id=1")).rows.map(t=>t.team_id);
  const day = new Date(`${today}T12:00:00Z`);
  const restDay = user.restDays.includes(day.getUTCDay());
  function journey(route: any, team?: any) {
    const selected = runs.filter(r=>team?r.team_id===team.id:r.team_id===null && r.user_id===userId && r.route_id===route.id);
    const miles = round(selected.reduce((a,r)=>a+Number(r.miles),0));
    const remainingMiles = round(Math.max(0,Number(route.total_miles)-miles));
    const endDate = team?.end_day ?? `${day.getUTCFullYear()}-12-31`;
    const daysRemaining = Math.max(0,Math.ceil((Date.parse(`${endDate}T12:00:00Z`)-day.getTime())/86400000));
    let activeDays=0;
    for(let i=0;i<=daysRemaining;i++) {
      const d=new Date(day.getTime()+i*86400000);
      if(!user.restDays.includes(d.getUTCDay())) activeDays++;
    }
    const teamMembers=team?members.filter(m=>m.team_id===team.id):[{user_id:userId}];
    const sums=new Map<number,number>();
    for(const r of selected) sums.set(r.user_id,(sums.get(r.user_id)||0)+Number(r.miles));
    const top=[...sums].sort((a,b)=>b[1]-a[1])[0]?.[0] ?? userId;
    return {id:team?`team-${team.id}`:`solo-${route.id}`,routeId:route.id,teamId:team?.id??null,name:route.name,teamName:team?.name??"Your solo journey",totalMiles:Number(route.total_miles),miles,remainingMiles,daysRemaining,dailyTarget:restDay?0:round(remainingMiles/Math.max(1,activeDays)/teamMembers.length),memberCount:teamMembers.length,topContributor:users.find(u=>u.id===top)?.name??user.name,emoji:route.emoji,gradientFrom:route.gradient_from,gradientTo:route.gradient_to,endDate,completed:remainingMiles===0,type:route.type};
  }
  const journeys = teams.filter(t=>members.some(m=>m.team_id===t.id&&m.user_id===userId)).map(t=>journey(routes.find(r=>r.id===t.route_id),t));
  const soloRoutes = [...new Set(runs.filter(r=>r.team_id===null&&r.user_id===userId).map(r=>r.route_id))];
  journeys.push(...soloRoutes.map(id=>journey(routes.find(r=>r.id===id))));
  const stamps=(await pool.query(`SELECT s.route_id AS "routeId",r.name AS "routeName",r.emoji,s.earned_at::text AS "earnedAt",s.earned_with_team AS "earnedWithTeam" FROM moon_stamps s JOIN moon_routes r ON r.id=s.route_id WHERE s.user_id=$1 ORDER BY s.earned_at DESC`,[userId])).rows;
  const historical=Number((await pool.query("SELECT historical_miles FROM moon_settings WHERE id=1")).rows[0].historical_miles);
  res.json(GetMoonStateResponse.parse({users,moonMiles:round(historical+runs.reduce((a,r)=>a+Number(r.miles),0)),moonGoal:239000,journeys,dailyTarget:round(journeys.reduce((a,j)=>a+j.dailyTarget,0)),restDay,stamps,competition:{name:competition.name,endDate:competition.end_day,winnerTeamId:competition.winner_team_id,teams:teams.filter(t=>compTeams.includes(t.id)).map(t=>journey(routes.find(r=>r.id===t.route_id),t))}}));
});

router.post("/moon/runs",async(req,res)=>{
  const parsed=LogRunBody.safeParse(req.body);
  if(!parsed.success) {res.status(400).json({error:"Enter a positive distance, duration, and valid run date."});return;}
  const v=parsed.data;
  if(!validDay(v.loggedAt)||v.miles<=0||v.durationMinutes<=0) {res.status(400).json({error:"Enter a valid date, distance and duration."});return;}
  const c=await pool.connect();
  try {
    await c.query("BEGIN");
    // Serialize pool completion, winner selection, and duplicate submission checks.
    await c.query("SELECT id FROM moon_settings WHERE id=1 FOR UPDATE");
    const previous=await c.query("SELECT result FROM moon_runs WHERE request_id=$1",[v.requestId]);
    if(previous.rowCount) {await c.query("COMMIT");res.status(201).json(previous.rows[0].result);return;}
    const user=await c.query("SELECT id FROM moon_users WHERE id=$1",[v.userId]);
    const route=(await c.query("SELECT * FROM moon_routes WHERE id=$1",[v.routeId])).rows[0];
    if(!user.rowCount||!route) {await c.query("ROLLBACK");res.status(404).json({error:"Runner or route not found."});return;}
    if(v.teamId!==null) {
      const membership=await c.query("SELECT m.id FROM moon_members m JOIN moon_teams t ON t.id=m.team_id WHERE m.user_id=$1 AND m.team_id=$2 AND t.route_id=$3",[v.userId,v.teamId,v.routeId]);
      if(!membership.rowCount) {await c.query("ROLLBACK");res.status(403).json({error:"Choose one of your team's routes."});return;}
    } else {
      const solo=await c.query("SELECT id FROM moon_runs WHERE user_id=$1 AND team_id IS NULL AND route_id=$2 LIMIT 1",[v.userId,v.routeId]);
      if(!solo.rowCount) {await c.query("ROLLBACK");res.status(400).json({error:"Choose an active solo journey."});return;}
    }
    const total=await c.query("SELECT COALESCE(SUM(miles),0) AS miles FROM moon_runs WHERE route_id=$1 AND (($2::integer IS NOT NULL AND team_id=$2) OR ($2::integer IS NULL AND team_id IS NULL AND user_id=$3))",[v.routeId,v.teamId,v.userId]);
    const before=Number(total.rows[0].miles);
    const completed=before<Number(route.total_miles)&&round(before+v.miles)>=Number(route.total_miles);
    await c.query("INSERT INTO moon_runs(user_id,team_id,route_id,miles,duration_minutes,logged_at,request_id) VALUES($1,$2,$3,$4,$5,$6,$7)",[v.userId,v.teamId,v.routeId,v.miles,v.durationMinutes,v.loggedAt,v.requestId]);
    if(completed) {
      if(v.teamId!==null) {
        await c.query("INSERT INTO moon_stamps(user_id,route_id,earned_at,earned_with_team) SELECT user_id,$1,$2,true FROM moon_members WHERE team_id=$3 ON CONFLICT(user_id,route_id) DO NOTHING",[v.routeId,v.loggedAt,v.teamId]);
        await c.query("UPDATE moon_competitions SET winner_team_id=$1 WHERE route_id=$2 AND winner_team_id IS NULL AND id IN (SELECT competition_id FROM moon_competition_teams WHERE team_id=$1)",[v.teamId,v.routeId]);
      } else await c.query("INSERT INTO moon_stamps(user_id,route_id,earned_at,earned_with_team) VALUES($1,$2,$3,false) ON CONFLICT(user_id,route_id) DO NOTHING",[v.userId,v.routeId,v.loggedAt]);
    }
    const global=(await c.query("SELECT historical_miles+(SELECT COALESCE(SUM(miles),0) FROM moon_runs) AS miles FROM moon_settings WHERE id=1")).rows[0];
    const result={milesAdded:v.miles,moonMiles:Number(global.miles),completed,routeName:route.name,emoji:route.emoji};
    await c.query("UPDATE moon_runs SET result=$1 WHERE request_id=$2",[JSON.stringify(result),v.requestId]);
    await c.query("COMMIT");
    res.status(201).json(result);
  } catch(err) {await c.query("ROLLBACK");req.log.error({err},"Unable to save run");res.status(500).json({error:"Your run could not be saved. Please try again."});}
  finally {c.release();}
});
export default router;