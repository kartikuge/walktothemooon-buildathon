import { createHash, randomBytes } from "node:crypto";
import { pool } from "@workspace/db";

export const hashClaimCode = (code: string) =>
  createHash("sha256").update(code.trim().toUpperCase()).digest("hex");

export function createClaimCode(): string {
  // Human-readable alphabet avoids ambiguous characters. The plaintext is returned
  // only to the owner-facing command and is never persisted or logged.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(12);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
}

export async function ensureMoonAuthSchema(): Promise<void> {
  await pool.query("ALTER TABLE moon_users ADD COLUMN IF NOT EXISTS clerk_subject text");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS moon_users_clerk_subject_idx ON moon_users(clerk_subject) WHERE clerk_subject IS NOT NULL");
  await pool.query(`CREATE TABLE IF NOT EXISTS moon_runner_claims (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES moon_users(id),
    code_hash text NOT NULL UNIQUE,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS moon_runner_claims_user_idx ON moon_runner_claims(user_id)");
}