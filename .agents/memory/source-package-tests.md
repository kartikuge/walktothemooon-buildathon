---
name: Source-package test execution
description: Running Node tests through workspace TypeScript package imports.
---

Bundle tests that import workspace source packages with the existing server esbuild dependency, then run the resulting ESM with Node's test runner.

**Why:** Node's native TypeScript stripping does not resolve extensionless internal imports in the generated source packages. Tests without those package imports can run directly.

**How to apply:** Prefer a temporary bundled test output rather than changing generated import conventions or adding a runtime dependency just to run unit tests.