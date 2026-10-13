# DETRO

A free, ad-free Delhi Metro planner. Independent of DMRC.

`docs/PRODUCT.md` is the product scope. `docs/DMRC_API.md` is the API evidence record. When an older note and the evidence file disagree, follow the evidence file.

## Commands

```bash
npm install
npm test          # vitest
npm run build     # tsc, then vite build
npm run dev       # http://127.0.0.1:5173
```

`npm run smoke` calls the live DMRC backend and uses `scripts/`, which is not in Git. It is not part of CI.

## Architecture

```text
src/lib/dmrc/       Upstream shapes. Validate with Zod. Do not leak them into the UI.
src/lib/transit/    Normalized stations, lines, and journeys.
src/lib/offline/    Saved journey packs and the street-tile set.
src/lib/status/     Closed-gate pack. Missing codes stay open.
src/lib/plan/       Plan state, saved trips, selection.
src/lib/play/       Play games. Questions are built only from saved data.
src/ui/             Screens. They consume transit types.
data/en/            English snapshot that ships: lines, stations, briefs, coordinates, journeys, platforms, status, status history.
public/map-tiles/   Street tiles for the metro area, through zoom 14.
workers/status-ping/ Cloudflare cron that dispatches the Status bake workflow (not part of the app shell).
```

Routes are calculated from station order. A packed journey supplies the fare, platform, and first and last train when that pair was saved. `python3 src/lib/offline/build_platforms.py` reads the packs and writes `data/en/platforms.json`, one boarding platform per station, line, and direction. `python3 src/lib/offline/build_status.py` writes `data/en/status.json` from live linepage phrases, metro_line notes, and the corporate service-update page, and unions each day’s closed stations into `data/en/status-history.json`. Closed gates cannot be boarded or left. Trains still pass. A transfer is allowed only when a note says the interchange facility is available. Plan still shows Least and Fewest for the asked pair, and Alternative via the one nearest open gate.

## Constraints

- Missing fare, duration, or interchange count stays missing. It is not zero.
- Journey timestamps use Asia/Kolkata wall time, with no offset.
- Do not invent stations, fares, platforms, contacts, or coordinates. A station with no saved position stays off the city map.
- Do not spoof the official site’s `Origin` or `Referer`, copy challenge cookies, or retry HTTP 403. The status bake collector may send those headers, as recorded in `curls/station_status`. The app does not.
- The interface is English only. Do not add Hindi chrome, theme names, a language control, or Hindi strings in `src/i18n/`. `data/hi/` and the download scripts stay on this machine. The app does not load them.
- Do not load fonts from a CDN. Vendored font files are allowed.
- Do not claim live arrivals, live lifts, or official affiliation.
- Do not push or open a pull request until the user has verified the change locally and said to deploy. A nit that cannot change the site stays local until the next product change. Follow `docs/DEPLOYMENT.md`. When the user says to deploy, follow `.cursor/skills/deploy-detro/SKILL.md`. Do not add analytics, ads, or a paid service. The only Cloudflare Worker allowed is `detro-status-ping` for Status bake dispatch.

## Local files

These stay on the machine and out of Git. Do not delete them.

- `data/hi/` — Hindi snapshot. The app does not load it.
- `data/en/routes/`, `data/en/fares/`, `data/en/first-last/` — pair downloads. `python3 src/lib/offline/build_journeys.py` packs them into `data/en/journeys/`.
- `scripts/`, `detro.archives/`, `curls/`, `prompt.md` — collectors and the original brief. Helpers under `.cursor/skills/` may be committed.
- `data/download-*` and the unused English dumps listed in `.gitignore`.
- `.env` — local secrets. Never commit.

The same list is in `.cursor/rules/50-local-files.mdc`.

## Commits

`type(scope): description`

`feat(offline): pack every saved journey into the app`

The type is `feat`, `fix`, `docs`, `test`, `refactor`, or `chore`. The scope is the area that changed. The description is the change, in lowercase, with no period. One commit is one change.
