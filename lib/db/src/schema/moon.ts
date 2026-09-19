import { pgTable, serial, integer, text, numeric, date, boolean, jsonb, unique, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("moon_users", {
  id: serial("id").primaryKey(), name: text("name").notNull(), avatarEmoji: text("avatar_emoji").notNull(),
  restDays: integer("rest_days").array().notNull().default([6, 0]),
});
export const routes = pgTable("moon_routes", {
  id: serial("id").primaryKey(), name: text("name").notNull(), type: text("type").notNull(),
  totalMiles: numeric("total_miles").notNull(), emoji: text("emoji").notNull(),
  gradientFrom: text("gradient_from").notNull(), gradientTo: text("gradient_to").notNull(),
  geometry: jsonb("geometry"), isPreset: boolean("is_preset").notNull().default(true),
});
export const teams = pgTable("moon_teams", {
  id: serial("id").primaryKey(), name: text("name").notNull(), inviteCode: text("invite_code").unique().notNull(),
  leaderboardEnabled: boolean("leaderboard_enabled").notNull().default(false),
  ownerUserId: integer("owner_user_id").notNull().references(() => users.id),
  routeId: integer("route_id").notNull().references(() => routes.id), endDate: date("end_date").notNull(),
});
export const members = pgTable("moon_members", {
  id: serial("id").primaryKey(), teamId: integer("team_id").notNull().references(() => teams.id),
  userId: integer("user_id").notNull().references(() => users.id),
}, t => [unique().on(t.teamId, t.userId)]);
export const competitions = pgTable("moon_competitions", {
  id: serial("id").primaryKey(), name: text("name").notNull(), routeId: integer("route_id").notNull().references(() => routes.id),
  endDate: date("end_date").notNull(), winnerTeamId: integer("winner_team_id").references(() => teams.id),
});
export const competitionTeams = pgTable("moon_competition_teams", {
  id: serial("id").primaryKey(), competitionId: integer("competition_id").notNull().references(() => competitions.id),
  teamId: integer("team_id").notNull().references(() => teams.id),
});
export const maps = pgTable("moon_maps", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id),
  soloUserId: integer("solo_user_id").references(() => users.id),
  routeId: integer("route_id").notNull().references(() => routes.id),
  endDate: date("end_date").notNull(), legacyKey: text("legacy_key"),
}, t => [
  unique().on(t.teamId, t.routeId), unique().on(t.soloUserId, t.routeId),
  check("moon_maps_one_owner", sql`(${t.teamId} IS NULL) <> (${t.soloUserId} IS NULL)`),
]);
export const mapPreviews = pgTable("moon_map_previews", {
  id: text("id").primaryKey(), body: jsonb("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const activity = pgTable("moon_activity", {
  userId: integer("user_id").primaryKey().references(() => users.id),
  body: jsonb("body").notNull(), configured: boolean("configured").notNull().default(false),
});
export const mapCompletions = pgTable("moon_map_completions", {
  id: serial("id").primaryKey(), mapId: integer("map_id").notNull().references(() => maps.id),
  userId: integer("user_id").notNull().references(() => users.id), earnedAt: date("earned_at").notNull(),
}, t => [unique().on(t.mapId, t.userId)]);
export const runs = pgTable("moon_runs", {
  id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id),
  teamId: integer("team_id").references(() => teams.id), routeId: integer("route_id").notNull().references(() => routes.id),
  miles: numeric("miles").notNull(), durationMinutes: numeric("duration_minutes").notNull(),
  loggedAt: date("logged_at").notNull(), requestId: text("request_id").unique().notNull(),
  result: jsonb("result"),
  mapId: integer("map_id").references(() => maps.id),
});
export const stamps = pgTable("moon_stamps", {
  id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id),
  routeId: integer("route_id").notNull().references(() => routes.id),
  earnedAt: date("earned_at").notNull(), earnedWithTeam: boolean("earned_with_team").notNull(),
}, t => [unique().on(t.userId, t.routeId)]);
export const settings = pgTable("moon_settings", {
  id: integer("id").primaryKey(), historicalMiles: numeric("historical_miles").notNull(),
});