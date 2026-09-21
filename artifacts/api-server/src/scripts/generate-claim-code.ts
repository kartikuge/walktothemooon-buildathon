import { pool } from "@workspace/db";
import { createClaimCode, ensureMoonAuthSchema, hashClaimCode } from "../lib/moon-auth";

/**
 * Owner-only handoff procedure:
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/generate-claim-code.ts <runner-id>
 * Run locally or in a protected one-off shell, never as part of the server.
 * The only output is the code for secure manual delivery; it is not logged by
 * the API and the plaintext is never committed or stored.
 */
const id = Number(process.argv[2]);
if (!Number.isSafeInteger(id) || id < 1) throw new Error("Usage: generate-claim-code <runner-id>");
await ensureMoonAuthSchema();
const code = createClaimCode();
const result = await pool.query(
  "INSERT INTO moon_runner_claims(user_id,code_hash) VALUES($1,$2) ON CONFLICT(user_id) DO NOTHING RETURNING id",
  [id, hashClaimCode(code)],
);
if (!result.rowCount) throw new Error("Runner already has a claim code.");
process.stdout.write(`${code}\n`);
await pool.end();