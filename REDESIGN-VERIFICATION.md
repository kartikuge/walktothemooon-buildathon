# Redesign verification

## Preserved behavior and access

- Home `/`: global Moon counter remains the prominent first feature, with the
  original total, goal, pooled progress, daily target, streak and active Maps.
- Bottom navigation: Home, Maps (`/maps/add`), prominent Log Run (`/log`),
  Teams (`/teams`), Profile (`/profile`).
- More navigation retains Competition (`/competition`) and Planner (`/planner`).
- Profile retains Passport (`/passport`), Activity Profile (`/activity`), and
  Stats (`/stats`). Journey deep links and Completion remain unchanged.
- Map enrollment, custom city search, route preview, run submission, invite
  copying, create/join, goal dates and effort estimation retain existing APIs.
- Saved demo-runner initialization remains synchronous.

## Checks completed

- Workspace TypeScript checks passed, including API, frontend and shared clients.
- API production build passed. Frontend production build passed with its required
  `PORT` and `BASE_PATH` supplied.
- Root `pnpm build` first stopped at the untouched Canvas build because its
  required `PORT` was absent; the two changed application builds were then run
  directly. No Canvas files were changed.
- Existing backend regressions: 14 passed (effort, geography, activity validation,
  and Map attribution/completion). Map DB fixtures use temporary shadows and
  private identity sequences.
- Leaderboard backend checks: 2 passed, covering omitted/false/true and invalid
  settings, reload persistence, original INSERT compatibility, membership
  restrictions, zero miles, ties, cross-map/team/solo isolation, disabled results,
  removed members, post-run refresh and unchanged stored dates.
- Isolated Playwright checks: 13 cases passed across the initial pass (6) and
  targeted rerun of the 7 initially failing cases. The rerun followed narrow-screen
  layout fixes and test-selector/animation-wait corrections; it was not a second
  complete pass.
- Browser checks cover 320px, 390px and 1280px primary routes/forms, Moon
  visibility, navigation, saved-runner switching/reload, create settings and
  fixture persistence, challenge-specific ranks, cached post-run refresh,
  loading/error/empty states, and the existing city-search checks.
- Browser API traffic is intercepted; unexpected requests fail. Backend writes
  use isolated development fixtures. No production data was mutated by tests.
- Downloaded route photographs verified as actual JPEGs. License/source details
  are in `artifacts/run-to-the-moon/public/images/PROVENANCE.md`.

## Remaining non-blocking build warnings

Vite reports the existing large application bundle and source-map reporting
warnings for UI components. Builds complete successfully. Bundle splitting is a
separate proposed optimization, not a dropped redesign requirement.

See `ORIGINAL-APP.md` for branch switching and deployment restoration.
The database change is additive and defaults off; see
`lib/db/leaderboard-migration.md`. Nothing was published.