---
name: Layout regression isolation
description: Safety and measurement decisions for narrow-screen regression checks.
---

Keep layout-only regression checks isolated from live runner data, with unexpected API calls rejected rather than forwarded.

**Why:** Layout checks should remain repeatable regardless of saved Maps and must not accidentally modify them as the UI evolves.

**How to apply:** Supply only the read fixtures needed to render the tested screen. For flex rows, measure child and row bounds directly: an overflow-hidden ancestor can hide broken layout without producing page-level horizontal scrolling.