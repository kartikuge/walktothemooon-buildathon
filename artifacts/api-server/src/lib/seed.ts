import { pool } from "@workspace/db";

export async function seedMoon() {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(41200)");
    const existing = await c.query("SELECT id FROM moon_settings WHERE id=1");
    if (existing.rowCount) { await c.query("COMMIT"); return; }
    const names = ["Kartik","Maneeth","Acyuth","Nihal","Priya","Dev","Sam","Ana","Raj"];
    for (let i=0;i<names.length;i++) await c.query("INSERT INTO moon_users(id,name,avatar_emoji) VALUES($1,$2,$3)",[i+1,names[i],["🏃","⚡","🌟","🚀","🌸","🌲","☀️","🌊","🔥"][i]]);
    await c.query(`INSERT INTO moon_routes(id,name,type,total_miles,emoji,gradient_from,gradient_to) VALUES
      (1,'Pittsburgh to Philadelphia','journey',300,'🔔','#123d48','#438d85'),
      (2,'Rome Marathon','event',26.2,'🏛️','#8d4b33','#dbab74'),
      (3,'Great Wall Marathon','event',26.2,'🏯','#254a36','#83a16a'),
      (4,'Coast to Coast USA','journey',2800,'🏔️','#36395e','#9c93bd')`);
    const end = `${new Date().getFullYear()}-12-31`;
    await c.query("INSERT INTO moon_teams(id,name,invite_code,owner_user_id,route_id,end_date) VALUES(1,'Steel City Striders','STEEL1',1,1,$1),(2,'Liberty Bell Runners','BELL01',5,1,$1)",[end]);
    for(let i=1;i<=9;i++) await c.query("INSERT INTO moon_members(team_id,user_id) VALUES($1,$2)",[i<=4?1:2,i]);
    await c.query("INSERT INTO moon_competitions(id,name,route_id,end_date) VALUES(1,'The Pennsylvania Run',1,$1)",[end]);
    await c.query("INSERT INTO moon_competition_teams(competition_id,team_id) VALUES(1,1),(1,2)");
    for(let team=1;team<=2;team++) {
      const amounts = team===1?[...Array(11).fill(24),27.4]:[...Array(11).fill(24),24.7];
      for(let i=0;i<12;i++) {
        const d=new Date(); d.setDate(d.getDate()-55+i*4);
        const day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        await c.query("INSERT INTO moon_runs(user_id,team_id,route_id,miles,duration_minutes,logged_at,request_id) VALUES($1,$2,1,$3,$4,$5,$6)",[team===1?1+i%4:5+i%5,team,amounts[i],Math.round(amounts[i]*10),day,`seed-team-${team}-${i}`]);
      }
    }
    for(let i=0;i<6;i++) await c.query("INSERT INTO moon_runs(user_id,route_id,miles,duration_minutes,logged_at,request_id) VALUES(1,2,3,30,CURRENT_DATE-$1::integer,$2)",[i*7+1,`seed-solo-${i}`]);
    await c.query("INSERT INTO moon_stamps(user_id,route_id,earned_at,earned_with_team) VALUES(1,3,CURRENT_DATE-60,false)");
    // Imported historical community miles plus the 598.1 seeded run miles = 41,200.
    await c.query("INSERT INTO moon_settings(id,historical_miles) VALUES(1,40601.9)");
    for (const table of ["moon_users","moon_routes","moon_teams","moon_competitions"]) {
      await c.query(`SELECT setval(pg_get_serial_sequence('${table}','id'),(SELECT MAX(id) FROM ${table}))`);
    }
    await c.query("COMMIT");
  } catch(e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
}