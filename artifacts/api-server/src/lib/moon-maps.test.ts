import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "@workspace/db";
import { backfillMoonMaps } from "./moon-backfill";
import moonRouter, { moonState } from "../routes/moon";

// All fixture writes and backfill DML are rolled back. No existing run is logged,
// edited, or removed; sequence values may advance as with any rolled-back insert.
test("additive backfill, zero-mile enrollment, isolated completion and replay",async()=>{
  const c=await pool.connect();
  const originalQuery=pool.query,originalConnect=pool.connect;
  await c.query("BEGIN");
  try {
    await backfillMoonMaps(c);
    const user=(await c.query("INSERT INTO moon_users(name,avatar_emoji) VALUES('Map isolation fixture','🧪') RETURNING id")).rows[0].id;
    const peer=(await c.query("INSERT INTO moon_users(name,avatar_emoji) VALUES('Map peer fixture','🧪') RETURNING id")).rows[0].id;
    const route=(await c.query("INSERT INTO moon_routes(name,type,total_miles,emoji,gradient_from,gradient_to) VALUES('Test challenge','journey',5,'🧪','#000','#fff') RETURNING id")).rows[0].id;
    const extra=(await c.query("INSERT INTO moon_routes(name,type,total_miles,emoji,gradient_from,gradient_to) VALUES('Independent challenge','journey',10,'🧪','#000','#fff') RETURNING id")).rows[0].id;
    const team=(await c.query("INSERT INTO moon_teams(name,invite_code,owner_user_id,route_id,end_date) VALUES('Fixture team',$1,$2,$3,'2099-12-31') RETURNING id",[`T${user}`,user,route])).rows[0].id;
    await c.query("INSERT INTO moon_members(team_id,user_id) VALUES($1,$2),($1,$3)",[team,user,peer]);
    await c.query("INSERT INTO moon_runs(user_id,team_id,route_id,miles,duration_minutes,logged_at,request_id) VALUES($1,$2,$3,1,10,'2026-01-01',$4)",[user,team,route,`fixture-legacy-${user}`]);
    const before=(await c.query("SELECT SUM(miles)::text AS miles,COUNT(*)::int AS count FROM moon_runs")).rows[0];
    await backfillMoonMaps(c);await backfillMoonMaps(c);
    assert.deepEqual((await c.query("SELECT SUM(miles)::text AS miles,COUNT(*)::int AS count FROM moon_runs")).rows[0],before);
    assert.equal((await c.query("SELECT COUNT(*)::int AS n FROM moon_runs WHERE map_id IS NULL")).rows[0].n,0);
    const initial=(await c.query("SELECT id FROM moon_maps WHERE team_id=$1",[team])).rows[0].id;
    const second=(await c.query("INSERT INTO moon_maps(team_id,route_id,end_date) VALUES($1,$2,'2099-12-31') RETURNING id",[team,extra])).rows[0].id;
    const solo=(await c.query("INSERT INTO moon_maps(solo_user_id,route_id,end_date) VALUES($1,$2,'2099-12-31') RETURNING id",[user,extra])).rows[0].id;
    pool.query=c.query.bind(c) as typeof pool.query;
    pool.connect=(async()=>({
      query:(sql:string,args?:unknown[])=>["BEGIN","COMMIT","ROLLBACK"].includes(sql)?Promise.resolve({rows:[],rowCount:0}):c.query(sql,args),
      release:()=>{},
    })) as unknown as typeof pool.connect;
    const state=await moonState(user,"2026-01-02");
    assert.equal(state.journeys.find(j=>j.mapId===initial)?.id,`team-${team}`);
    assert.equal(state.journeys.find(j=>j.mapId===solo)?.miles,0);
    assert.equal(state.journeys.find(j=>j.mapId===second)?.miles,0);
    const handler=(moonRouter as any).stack.find((s:any)=>s.route?.path==="/moon/runs").route.stack[0].handle;
    async function log(body:unknown) {
      let status=200,result:any;
      const res={status(n:number){status=n;return this;},json(v:unknown){result=v;return this;}};
      await handler({body,log:{error:()=>{}}},res);
      return {status,result};
    }
    const body={userId:user,teamId:team,routeId:route,mapId:initial,miles:4,durationMinutes:40,loggedAt:"2026-01-02",requestId:`fixture-complete-${user}`};
    const first=await log(body);
    assert.equal(first.status,201);assert.equal(first.result.completed,true);
    assert.deepEqual(await log(body),first);
    assert.equal((await log({...body,miles:2})).status,409);
    const after=await moonState(user,"2026-01-02");
    assert.equal(after.journeys.find(j=>j.mapId===initial)?.miles,5);
    assert.equal(after.journeys.find(j=>j.mapId===second)?.miles,0);
    assert.equal(after.journeys.find(j=>j.mapId===solo)?.miles,0);
    assert.equal((await c.query("SELECT COUNT(*)::int AS n FROM moon_map_completions WHERE map_id=$1",[initial])).rows[0].n,2);
    assert.equal((await c.query("SELECT COUNT(*)::int AS n FROM moon_stamps WHERE user_id IN ($1,$2) AND route_id=$3",[user,peer,route])).rows[0].n,2);
  }finally{
    pool.query=originalQuery;pool.connect=originalConnect;
    await c.query("ROLLBACK");c.release();await pool.end();
  }
});