# Implementation plan

Phase 0 is this preparation pass. Do not start Phase 1 until it has been reviewed.

## Phase 0 — Preparation

- [x] Inspect the repository. It contained `prompt.md` only.
- [x] Record API evidence in `docs/DMRC_API.md`.
- [x] Add project rules and the docs listed in `prompt.md`.
- [x] Review blockers before writing app code.

## Phase 1 — First working slice

Goal: select origin → select destination → request a DMRC journey → read the route.

1. [x] Scaffold Vite, React, TypeScript, Zod, and Vitest. Add a lockfile. No router, PWA plugin, server, or `.env` yet.
2. [x] Add the DMRC client, Zod schemas, and normalizer for `line_list`, `station_by_keyword/all`, `station_by_line`, and `station_route`.
3. [x] Copy sanitized real responses into `tests/fixtures/dmrc/`. Cover direct, one change, missing fare, and HTML 500.
4. [x] Build the Plan screen: search, select, swap, and “Show my route.”
5. [x] Load `line_list`, then `station_by_line` per visible line, and cache them so suggestions can show line name and color. Hide LN12 while `show_in_frontend` is false. Live line loading is blocked from the app origin, so chips were not seen in the browser.
6. [x] Render steps from the normalized journey. Label the criterion “Least distance.”
7. [x] For the same codes, call `new_fare_with_route` and show weekday and weekend fares when that call succeeds. If it fails, show `station_route.fare` without a fare type.
8. [x] From the running app origin, try one live `line_list` and one live journey. Recorded in `docs/DMRC_API.md`: the browser could not read a response. The screen shows an error. Fixtures still cover the route text. The app does not spoof the official origin.

Milestone 1 is in place for local use and fixture tests. A live route still needs the backend to answer this app’s origin.

## Phase 2 — Map and station details

- [x] Original SVG schematic from the saved line order, with zoom in, zoom out, and reset.
- [x] Text list of stations on the selected line, with Start here and Go here.
- [x] Station details from saved briefs: lines, listed facilities, listed lifts. Gates and step-free routes say “Not verified” when the brief has no gate data. Lift rows are not described as live.
- [x] First and last trains for the open journey, from the saved pair file. Missing clocks stay missing. These are schedule times, not a live departure.

## Phase 3 — Language, text size, save, share

- [x] English chrome only. No Hindi strings in the app, and no language control.
- [x] Text size and theme persist on this device.
- [x] Save and reopen trips locally. Help clears text size, theme, and saved trips.
- [x] Share and open links that carry station codes only.

## Phase 4 — Cache and offline

- [x] The production build registers a service worker. It keeps the app shell and caches snapshot files after they are fetched.
- [x] Help separates the line/station snapshot date from the clock time used for downloaded journeys.
- [x] Offline, the map and a calculated route still work. Fare and timing stay unavailable, and the screen says so. A downloaded journey is used only while online, unless that file is already in the service-worker cache.

## Phase 5 — Release checks

- [x] `npm run smoke` checks saved journeys and stays out of `npm test`. Direct and interchange samples passed. The Blue Line branch, Airport Express, and Hindi samples are still pending in the download. See `docs/RELEASE_CHECKS.md`.
- [x] Layout notes for a narrow phone width and a desktop width, at larger text. Contrast of the stylesheet colors is recorded there.
- [x] The current journey can be shown on the map. Stations on that route are marked in the list, and unknown station codes are left off.
- [ ] Screen reader pass, a full keyboard walk, and usability sessions with real riders.

## Dependencies for Phase 1

Already on this machine: Node `v26.10.0`, npm `11.19.1`.

Install at scaffold time, current stable versions, saved in the lockfile:

- `react`, `react-dom`
- `typescript`, `vite`, `@vitejs/plugin-react`
- `zod`
- `vitest`

No environment variables. No server. No map SDK. No i18n framework. No paid service.

```bash
npm install
npm test
npm run dev
```
