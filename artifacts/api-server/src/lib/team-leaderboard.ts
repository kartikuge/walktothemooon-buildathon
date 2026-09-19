import { pool } from "@workspace/db";
import { GetTeamMapLeaderboardResponse } from "@workspace/api-zod";

const fail=(status:number,message:string)=>Object.assign(new Error(message),{status});

export async function teamMapLeaderboard(teamId:number,mapId:number,userId:number) {
  if(![teamId,mapId,userId].every(id=>Number.isSafeInteger(id)&&id>0&&id<=2147483647)) {
    throw fail(400,"Choose a valid runner, team and Map.");
  }
  // Authorization precedes even the disabled response; no non-member gets data.
  if(!(await pool.query("SELECT id FROM moon_members WHERE team_id=$1 AND user_id=$2",[teamId,userId])).rowCount) {
    throw fail(403,"Only current team members can view this leaderboard.");
  }
  const map=(await pool.query(`SELECT t.leaderboard_enabled FROM moon_maps m
    JOIN moon_teams t ON t.id=m.team_id WHERE m.id=$1 AND m.team_id=$2`,[mapId,teamId])).rows[0];
  if(!map) throw fail(404,"Map not found in this team.");
  const result={teamId,mapId,leaderboardEnabled:map.leaderboard_enabled,members:[] as unknown[]};
  if(map.leaderboard_enabled) {
    // No route/date fallback: only actual runs assigned to this exact map and
    // team count. Preserve stored attribution, including pre-membership dates.
    // Tie rule: exact numeric miles descending, then stable ascending user ID.
    result.members=(await pool.query(`SELECT u.id AS "userId",u.name,u.avatar_emoji AS "avatarEmoji",
      COALESCE(SUM(r.miles),0)::float8 AS miles,
      (ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(r.miles),0) DESC,u.id ASC))::int AS rank
      FROM moon_members member JOIN moon_users u ON u.id=member.user_id
      LEFT JOIN moon_runs r ON r.user_id=u.id AND r.map_id=$1 AND r.team_id=$2
      WHERE member.team_id=$2
      GROUP BY u.id,u.name,u.avatar_emoji
      ORDER BY COALESCE(SUM(r.miles),0) DESC,u.id ASC`,[mapId,teamId])).rows;
  }
  return GetTeamMapLeaderboardResponse.parse(result);
}