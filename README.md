# DETRO

A free, ad-free Delhi Metro planner. It is an independent project and is not affiliated with DMRC.

Pick two stations. The result shows the train, where to change, the platform when a saved journey has one, and the fare when that journey has one.

## What you get

| | |
| --- | --- |
| Plan | Search by station name or code. Swap the ends. Show one ride, and a second when fewer changes takes different stations. |
| Map | One line at a time. Start here and Go here set the trip. |
| City | Stations with a saved position, on a street map kept in this repo. A ride draws between the ends that have positions. |
| Offline | After the app has loaded once, search, fares, platforms, first and last trains, station briefs, and both maps still open with the network off. |
| Saved trips | Stay on this device. A shared link carries station codes only. |

There is no account, payment, ad, or live arrival board.

## Run

Node 22 or newer.

```bash
npm install
npm test
npm run dev
```

Open `http://127.0.0.1:5173`. `npm run build` typechecks and writes `dist`. `npm run smoke` is a local check against the DMRC backend. It is not part of `npm test`.

## Docs

| File | Contents |
| --- | --- |
| `AGENTS.md` | Commands, boundaries, and commit form |
| `docs/PRODUCT.md` | Scope and journeys |
| `docs/ARCHITECTURE.md` | Boundaries |
| `docs/DMRC_API.md` | Endpoint evidence and access blockers |
| `docs/DATA_SOURCES.md` | Sources, line list, and gaps |
| `docs/ACCEPTANCE_CRITERIA.md` | What done means |
| `docs/IMPLEMENTATION_PLAN.md` | Phases |
| `docs/DECISIONS.md` | Defaults already chosen |
| `docs/DEPLOYMENT.md` | Cloudflare Pages and GitHub Actions, after approval |

## Do not

- Invent a station, fare, platform, contact, or coordinate.
- Spoof the official site’s `Origin` or `Referer`, copy challenge cookies, or retry HTTP 403.
- Commit `data/en/routes/`, `data/en/fares/`, `data/en/first-last/`, `data/hi/`, `scripts/`, `detro.archives/`, `curls/`, or `prompt.md`.
- Deploy, or add analytics, ads, or a paid service, until that work is approved. See `docs/DEPLOYMENT.md`.

## Commits

`type(scope): description`

`feat(offline): pack every saved journey into the app`

`fix(plan): keep the current ride on screen while the next one loads`

`docs(deploy): describe the Cloudflare Pages pipeline`

The type is `feat`, `fix`, `docs`, `test`, `refactor`, or `chore`. The scope is the area that changed. The description is the change, in lowercase, with no period.
