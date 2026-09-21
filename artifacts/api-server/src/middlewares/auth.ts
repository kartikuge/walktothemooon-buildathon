import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";
import { pool } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      clerkSubject?: string;
      runnerId?: number;
    }
  }
}

const unauthorized = (res: Response) => {
  res.status(401).json({ error: "Sign in required." });
};

/** Require a verified Clerk session, but allow accounts that still need provisioning. */
export function requireClerk(req: Request, res: Response, next: NextFunction): void {
  const subject = getAuth(req).userId;
  if (!subject) {
    unauthorized(res);
    return;
  }
  req.clerkSubject = subject;
  next();
}

/** Resolve the stable integer runner associated with the verified Clerk subject. */
export async function requireRunner(req: Request, res: Response, next: NextFunction): Promise<void> {
  const subject = getAuth(req).userId;
  if (!subject) {
    unauthorized(res);
    return;
  }
  const row = (await pool.query("SELECT id FROM moon_users WHERE clerk_subject=$1", [subject])).rows[0];
  if (!row) {
    res.status(403).json({ error: "Complete account setup before using Run to the Moon." });
    return;
  }
  req.clerkSubject = subject;
  req.runnerId = row.id;
  next();
}

export function runnerId(req: Request): number {
  if (!req.runnerId) throw Object.assign(new Error("Account is not provisioned."), { status: 403 });
  return req.runnerId;
}