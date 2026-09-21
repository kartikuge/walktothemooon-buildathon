---
name: Clerk production proxy trust
description: Production proxy environment bridging and host validation requirements for Replit-managed Clerk.
---

Published web builds must expose Replit's managed `CLERK_PROXY_URL` to the Vite client proxy setting, while the server may derive Clerk keys only from domains in `REPLIT_DOMAINS` or an explicit custom-host allowlist.

**Why:** Development keys can work without the proxy and hide broken production wiring. Forwarded host headers are client-controlled unless validated, so using an arbitrary forwarded host to select a Clerk key weakens the authentication boundary.

**How to apply:** Keep the browser proxy prop unconditional, bridge the managed production variable at build time, validate forwarded/Host candidates against Replit's runtime domain list, and keep localhost allowances development-only.