import { pool } from "@workspace/db";

// DML only: Publish owns schema changes. Repeatable for existing installations.
export async function backfillMoonMaps(c: Pick<typeof pool,"query">) {
  await c.query(`INSERT INTO moon_maps(team_id,route_id,end_date,legacy_key)
    SELECT id,route_id,end_date,'team-'||id FROM moon_teams ON CONFLICT DO NOTHING`);
  await c.query(`INSERT INTO moon_maps(solo_user_id,route_id,end_date,legacy_key)
    SELECT DISTINCT user_id,route_id,make_date(EXTRACT(year FROM CURRENT_DATE)::int,12,31),'solo-'||route_id
    FROM moon_runs WHERE team_id IS NULL AND map_id IS NULL ON CONFLICT DO NOTHING`);
  const migrated=await c.query(`UPDATE moon_runs r SET map_id=m.id FROM moon_maps m
    WHERE r.map_id IS NULL AND r.route_id=m.route_id AND
    (r.team_id=m.team_id OR (r.team_id IS NULL AND m.solo_user_id=r.user_id)) RETURNING r.map_id`);
  // Only historical stamp holders receive historical completion credit; never late joiners.
  await c.query(`INSERT INTO moon_map_completions(map_id,user_id,earned_at)
    SELECT m.id,s.user_id,s.earned_at FROM moon_maps m JOIN moon_stamps s ON s.route_id=m.route_id
    WHERE m.legacy_key IS NOT NULL AND m.id=ANY($1::integer[])
    AND (m.solo_user_id=s.user_id OR EXISTS(SELECT 1 FROM moon_runs r WHERE r.map_id=m.id AND r.user_id=s.user_id))
    AND (SELECT COALESCE(SUM(miles),0) FROM moon_runs WHERE map_id=m.id)>=(SELECT total_miles FROM moon_routes WHERE id=m.route_id)
    ON CONFLICT DO NOTHING`,[[...new Set(migrated.rows.map(r=>r.map_id))]]);
  const geometries = [
    { mode:"preset", coordinates:[[40.4406,-79.9959],[39.9526,-75.1652]], attribution:"City coordinates; virtual challenge", description:"Preset 300-mile challenge. Straight geographic line, not a walking route." },
    { mode:"event", coordinates:[[41.9028,12.4964]], attribution:"Event city location", description:"Rome event location only; not a race course." },
    { mode:"event", coordinates:[[40.4319,116.5704]], attribution:"Great Wall location", description:"Event location only; not a race course." },
    { mode:"preset", coordinates:[[40.7128,-74.006],[37.7749,-122.4194]], attribution:"City coordinates; virtual challenge", description:"Preset 2,800-mile virtual challenge, not a walking route." },
  ];
  for (let i=0;i<geometries.length;i++) await c.query("UPDATE moon_routes SET geometry=$1 WHERE id=$2 AND is_preset=true AND geometry IS NULL",[JSON.stringify(geometries[i]),i+1]);
  for(const table of ["moon_users","moon_routes","moon_teams","moon_competitions"]) {
    await c.query(`SELECT setval(pg_get_serial_sequence('${table}','id'),GREATEST((SELECT COALESCE(MAX(id),1) FROM ${table}),(SELECT last_value FROM ${table}_id_seq)))`);
  }
}