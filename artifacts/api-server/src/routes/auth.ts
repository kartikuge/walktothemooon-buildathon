import { Router } from "express";
import { pool } from "@workspace/db";
import { UpdateRunnerProfileBody } from "@workspace/api-zod";
import { requireClerk } from "../middlewares/auth";
import { hashClaimCode } from "../lib/moon-auth";

const router = Router();
router.use(requireClerk);

router.get("/auth/account", async (req, res): Promise<void> => {
  const subject = req.clerkSubject!;
  const row = (await pool.query("SELECT id,name,avatar_emoji AS \"avatarEmoji\",COALESCE(rest_days,ARRAY[]::integer[]) AS \"restDays\" FROM moon_users WHERE clerk_subject=$1", [subject])).rows[0];
  res.json(row ? { provisioned: true, runner: row } : { provisioned: false, runner: null });
});

router.post("/auth/claim", async (req, res): Promise<void> => {
  const code = typeof req.body?.claimCode === "string" ? req.body.claimCode.trim() : "";
  if (!/^[A-Z2-9]{8,32}$/i.test(code)) {
    res.status(400).json({ error: "Enter your runner's one-time claim code." });
    return;
  }
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const subject = req.clerkSubject!;
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [subject]);
    const already = (await c.query("SELECT id,name,avatar_emoji AS \"avatarEmoji\",COALESCE(rest_days,ARRAY[]::integer[]) AS \"restDays\" FROM moon_users WHERE clerk_subject=$1 FOR UPDATE", [subject])).rows[0];
    if (already) {
      await c.query("COMMIT");
      res.json({ provisioned: true, runner: already });
      return;
    }
    const claim = (await c.query("SELECT id,user_id FROM moon_runner_claims WHERE code_hash=$1 AND used_at IS NULL FOR UPDATE", [hashClaimCode(code)])).rows[0];
    if (!claim) {
      await c.query("ROLLBACK");
      res.status(409).json({ error: "That claim code is invalid or has already been used." });
      return;
    }
    const runner = (await c.query("UPDATE moon_users SET clerk_subject=$1 WHERE id=$2 AND clerk_subject IS NULL RETURNING id,name,avatar_emoji AS \"avatarEmoji\",COALESCE(rest_days,ARRAY[]::integer[]) AS \"restDays\"", [subject, claim.user_id])).rows[0];
    if (!runner) {
      await c.query("ROLLBACK");
      res.status(409).json({ error: "That runner has already been claimed." });
      return;
    }
    await c.query("UPDATE moon_runner_claims SET used_at=now() WHERE id=$1", [claim.id]);
    await c.query("COMMIT");
    res.status(201).json({ provisioned: true, runner });
  } catch (err) {
    await c.query("ROLLBACK");
    req.log.error({ err }, "Runner claim failed");
    res.status(500).json({ error: "Could not claim this runner." });
  } finally {
    c.release();
  }
});

router.post("/auth/profile", async (req, res): Promise<void> => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const avatarEmoji = typeof req.body?.avatarEmoji === "string" ? req.body.avatarEmoji.trim() : "🏃";
  if (!name || name.length > 80 || !avatarEmoji || avatarEmoji.length > 16) {
    res.status(400).json({ error: "Enter a display name and avatar." });
    return;
  }
  const subject = req.clerkSubject!;
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [subject]);
    const existing = (await c.query("SELECT id,name,avatar_emoji AS \"avatarEmoji\",COALESCE(rest_days,ARRAY[]::integer[]) AS \"restDays\" FROM moon_users WHERE clerk_subject=$1 FOR UPDATE", [subject])).rows[0];
    if (existing) {
      await c.query("COMMIT");
      res.json({ provisioned: true, runner: existing });
      return;
    }
    const runner = (await c.query("INSERT INTO moon_users(name,avatar_emoji,clerk_subject) VALUES($1,$2,$3) RETURNING id,name,avatar_emoji AS \"avatarEmoji\",COALESCE(rest_days,ARRAY[]::integer[]) AS \"restDays\"", [name, avatarEmoji, subject])).rows[0];
    await c.query("COMMIT");
    res.status(201).json({ provisioned: true, runner });
  } catch (err: any) {
    await c.query("ROLLBACK");
    if (err?.code === "23505") {
      res.status(409).json({ error: "This account is already provisioned." });
      return;
    }
    req.log.error({ err }, "Profile creation failed");
    res.status(500).json({ error: "Could not create your runner profile." });
  } finally {
    c.release();
  }
});

router.put("/auth/profile", async (req, res): Promise<void> => {
  const parsed = UpdateRunnerProfileBody.safeParse({
    name: typeof req.body?.name === "string" ? req.body.name.trim() : req.body?.name,
    avatarEmoji: typeof req.body?.avatarEmoji === "string" ? req.body.avatarEmoji.trim() : req.body?.avatarEmoji,
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a display name and avatar." });
    return;
  }

  const runner = (await pool.query(
    `UPDATE moon_users
     SET name=$1, avatar_emoji=$2
     WHERE clerk_subject=$3
     RETURNING id,name,avatar_emoji AS "avatarEmoji",COALESCE(rest_days,ARRAY[]::integer[]) AS "restDays"`,
    [parsed.data.name, parsed.data.avatarEmoji, req.clerkSubject!],
  )).rows[0];
  if (!runner) {
    res.status(403).json({ error: "Complete account setup before editing your runner profile." });
    return;
  }

  res.json({ provisioned: true, runner });
});

export default router;