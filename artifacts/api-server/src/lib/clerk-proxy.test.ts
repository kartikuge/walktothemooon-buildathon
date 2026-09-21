import assert from "node:assert/strict";
import test from "node:test";
import { getClerkProxyHost } from "../middlewares/clerkProxyMiddleware";

test("accepts only configured Replit or custom hosts", () => {
  const previousDomains = process.env.REPLIT_DOMAINS;
  const previousAllowed = process.env.CLERK_ALLOWED_HOSTS;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  process.env.REPLIT_DOMAINS = "run-to-the-moon.replit.app";
  process.env.CLERK_ALLOWED_HOSTS = "running.example.com";
  try {
    assert.equal(
      getClerkProxyHost({ headers: { "x-forwarded-host": "run-to-the-moon.replit.app" } }),
      "run-to-the-moon.replit.app",
    );
    assert.equal(
      getClerkProxyHost({ headers: { "x-forwarded-host": "running.example.com:443" } }),
      "running.example.com",
    );
    assert.equal(
      getClerkProxyHost({
        headers: {
          "x-forwarded-host": "attacker.example, run-to-the-moon.replit.app",
          host: "internal.invalid",
        },
      }),
      "run-to-the-moon.replit.app",
    );
    assert.equal(
      getClerkProxyHost({ headers: { "x-forwarded-host": "attacker.example", host: "internal.invalid" } }),
      undefined,
    );
  } finally {
    if (previousDomains === undefined) delete process.env.REPLIT_DOMAINS;
    else process.env.REPLIT_DOMAINS = previousDomains;
    if (previousAllowed === undefined) delete process.env.CLERK_ALLOWED_HOSTS;
    else process.env.CLERK_ALLOWED_HOSTS = previousAllowed;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});