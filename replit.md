# Run to the Moon

## What this is
A mobile-first WEB app where teams pool running miles to travel long routes
together. Buildathon submission, due in hours. Demo quality over completeness.

## The hook
Every mile any user logs, ever, adds to one global counter climbing toward
239,000 miles — the distance to the Moon. This counter is the product's
identity. It goes at the TOP of the home screen, not in a footer.

## Deliberate scope choices (these are decisions, not limitations)
- Web app, not Expo/React Native. Judges open a URL; they will not install
  Expo Go. Mobile-first responsive at 390px, must not break on desktop.
- NO Replit Auth, no login of any kind. A login wall between a judge and the
  demo is a scoring risk, and I need to switch between seeded users mid-demo
  to show team pooling. Use a name dropdown + localStorage + a persistent
  user-switcher in the header.
- No real map tiles. Landmark "scenes" are CSS gradients + emoji. A
  half-loaded map tile looks broken on a phone; a designed scene doesn't.

## Stack
React + Node/Express + Replit Postgres. One app. All distances in MILES.
All dates local timezone. Default rest days: Saturday and Sunday.

## Do not build today
Apple Watch / Garmin / HealthKit, passwords, payments, email, push
notifications, custom route creation, individual member leaderboards.

## Product rules that are non-negotiable design decisions
- NEVER show "behind schedule" or any warning state. If a team is behind,
  show the number and nothing else.
- NEVER rank team members. One line only: "Top contributor: [name]".
- All miles go into ONE shared team pool. No per-member debt or quota.

## Priority — do not start P1 until every P0 works end to end
P0: Home / Map detail / Log a run / Completion+stamp / Competition view
P1: Passport / Goal planner / Create+join team / Lifetime stats
P2 (only if genuinely ahead): react-leaflet + OSM tiles on map detail

## The demo path that must never break
Home -> log 9 miles -> Steel City Striders cross 300 mi -> stamp celebration
showing "+9.0 mi to the Moon" -> Passport.
Fix anything on this path before anything else.

## Approved Maps expansion
The user has now approved P1, P2, and custom city-to-city Maps. These decisions
supersede the earlier "do not build today" restrictions on maps/custom routes:
- Call selectable journeys "Maps" in the interface.
- Offer clearly labelled virtual great-circle distances and real pedestrian
  routes where the routing service supports them; never silently swap modes.
- Home supports adding preset or custom Maps, solo or with an existing team.
  Teams can have several independent Maps; a logged run belongs to one Map
  and adds to the global Moon counter once.
- Personal activity profiles support a home city, baseline daily miles,
  walking commutes, and dedicated sessions. Plans do not automatically log runs.
- Group estimates may show equal-share examples and hypothetical participant
  counts, but must not impose member quotas, rankings, or shame warnings.
- Keep fixed-distance event challenges distinct from geographic travel Maps.
- Public Open-Meteo geocoding is for this non-commercial demo; Valhalla/FOSSGIS
  routing and standard OpenStreetMap tiles are usage-limited public services.
  Preserve attribution and caching; use suitable production providers before
  expanding beyond their allowed usage.