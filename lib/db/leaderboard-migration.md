# Optional leaderboard schema

Source of truth: `src/schema/moon.ts` adds
`moon_teams.leaderboard_enabled boolean NOT NULL DEFAULT false`.

To reproduce in development, with the workspace's development `DATABASE_URL`,
run `pnpm --filter @workspace/db push`. Review the proposed diff: this change
adds one column; do not accept unrelated destructive changes. Re-running against
the updated schema should propose no leaderboard changes. Development application
and metadata verification were completed for this change.

Existing rows become false. Original-code INSERT statements specify their
columns and omit this new column, so PostgreSQL supplies false; that compatibility
is also covered by the isolated leaderboard test. No existing fields, rows,
run attribution, shared progress, or completion calculations are changed.
Returning to original code does not require dropping the column.

Branches share the database; switching code is not database rollback. No custom
production migration or startup DDL is provided. Managed production schema
changes belong to Replit's user-initiated Publish flow; nothing was published
or mutated in production during this work.