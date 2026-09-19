---
name: Layout regression isolation
description: Safety and measurement decisions for narrow-screen regression checks.
---

Keep layout-only regression checks isolated from live runner data, with unexpected API calls rejected rather than forwarded.

**Why:** Layout checks should remain repeatable regardless of saved Maps and must not accidentally modify them as the UI evolves.

**How to apply:** Supply only the read fixtures needed to render the tested screen. For flex rows, measure child and row bounds directly: an overflow-hidden ancestor can hide broken layout without producing page-level horizontal scrolling.

Database-backed regression fixtures should use temporary shadow tables with
private identity sequences, not just a rollback around application tables.

**Why:** PostgreSQL sequence advancement and sequence reset operations are not
undone by transaction rollback, so a seemingly rolled-back fixture can still
change the application's next IDs.

**How to apply:** When testing backfills or handlers that insert rows, isolate
both tables and sequences on a dedicated connection. Be explicit that temporary
tables made with `LIKE` do not automatically reproduce foreign-key constraints.