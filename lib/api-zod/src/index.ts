export * from "./generated/api";
export * from "./generated/types";
// Orval gives the path validator and query type the same Params name when an
// operation has both. Keep the validator public and expose the query type clearly.
export { GetTeamMapLeaderboardParams } from "./generated/api";
export type { GetTeamMapLeaderboardParams as TeamMapLeaderboardQuery } from "./generated/api";
