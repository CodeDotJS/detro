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
src/lib/plan/       Plan state, saved trips, selection.
src/ui/             Screens. They consume transit types.
data/en/            English snapshot that ships: lines, stations, briefs, coordinates, journeys.
public/map-tiles/   Street tiles for the metro area, through zoom 14.
```

Routes are calculated from station order. A packed journey supplies the fare, platform, and first and last train when that pair was saved.

## Constraints

- Missing fare, duration, or interchange count stays missing. It is not zero.
- Journey timestamps use Asia/Kolkata wall time, with no offset.
- Do not invent stations, fares, platforms, contacts, or coordinates. A station with no saved position stays off the city map.
- Do not spoof the official site’s `Origin` or `Referer`, copy challenge cookies, or retry HTTP 403.
- Do not add a Hindi language control. Hindi strings in `src/i18n/copy.ts` exist so the types compile.
- Do not load fonts from a CDN. Vendored font files are allowed.
- Do not claim live arrivals, live lifts, or official affiliation.
- Do not deploy, and do not add analytics, ads, or a paid service, until the user approves it. Follow `docs/DEPLOYMENT.md`.

## Local files

These stay on the machine and out of Git. Do not delete them.

- `data/hi/` — Hindi snapshot. The app does not load it.
- `data/en/routes/`, `data/en/fares/`, `data/en/first-last/` — pair downloads. `python3 src/lib/offline/build_journeys.py` packs them into `data/en/journeys/`.
- `scripts/`, `detro.archives/`, `curls/`, `prompt.md` — collectors and the original brief.
- `data/download-*` and the unused English dumps listed in `.gitignore`.

The same list is in `.cursor/rules/50-local-files.mdc`.

## Commits

`type(scope): description`

`feat(offline): pack every saved journey into the app`

The type is `feat`, `fix`, `docs`, `test`, `refactor`, or `chore`. The scope is the area that changed. The description is the change, in lowercase, with no period. One commit is one change.
