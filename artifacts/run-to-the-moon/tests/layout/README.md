# City search layout regression

Run from the workspace root:

```sh
pnpm --filter @workspace/run-to-the-moon test:layout
```

The check starts a temporary Vite server on port 4178 and measures the actual
`/maps/add` City to City form in Chromium at 320px and 390px. All API requests
are intercepted with isolated fixtures; unknown requests and writes fail the
test and never reach the backend. No saved Maps are read or modified.

Both fields must retain at least 160px of typing space. Search targets must be
44–56px in both dimensions, stay inline, and fit inside their rows and viewport.
A separate probe checks that the shared Button's default still fills a 240px
container, so changing the global default cannot mask a local regression.

Replit's Chromium is detected automatically. Elsewhere, install Chromium once
with `pnpm --filter @workspace/run-to-the-moon exec playwright install chromium`,
or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed Chromium binary.
The test requires no API server or database.