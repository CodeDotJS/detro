# Data sources

Access date for everything below: **2026-09-30**.

## Primary

| Source | Role | Rights |
| --- | --- | --- |
| [delhimetrorail.com](https://delhimetrorail.com/) | Official site. Public bundles show how requests are built. | Site content belongs to DMRC. Bundle URLs are evidence, not a dependency. |
| `https://backend.delhimetrorail.com/api/v2/` | Undocumented website backend for lines, stations, journeys, fares, and first/last trains. | No developer terms or redistribution permission were found. Do not commit a full network dump as production data. |

Details and response evidence: `docs/DMRC_API.md`.

## Design reference

[metrothogoli.com](https://www.metrothogoli.com/#/) was retrieved on 2026-09-30. It is a Bengaluru Namma Metro planner with a route-first layout. Use that clarity as inspiration only. Do not copy its branding, code, text, or assets. This app is Delhi Metro, not Namma Metro.

## Not sources

- Remembered station counts, fares, or hours.
- The station dictionary bundled inside DMRC’s JavaScript. It was not copied here.
- `ws://metro.stagemyapp.com:8000/...` from the website bundle. Staging websocket. Not called.
- Third-party transit APIs. Not a substitute for this backend.
- Map tiles, until each `station_code` has a saved latitude and longitude. A Leaflet map may use OpenStreetMap tiles after that, with the required OpenStreetMap attribution. Do not place a station without that pair.

`data/en/coordinates.json` saves those pairs for station codes whose OpenStreetMap `ref` matched the code on 2026-10-01. The network tag was Delhi Metro or Rapid Metro. A code with two nearby nodes uses their midpoint. A code with no matching ref is omitted and is not drawn on the city map.
- Gate exits, until a saved record names the gate and where it comes out. Lift rows in `station_brief_detail` leave `from_gate_code` and `to_gate_code` empty. A facility note that says “near gate 2” is not an exit destination.

## Coverage we will state in the product

Verified `line_list` rows on 2026-09-30, English:

| Code | Name | Color name | Shown on official site |
| --- | --- | --- | --- |
| LN1 | Line 1 | Red Line | yes |
| LN2 | Line 2 | Yellow Line | yes |
| LN3 | Line 3 | Blue Line | yes |
| LN4 | Line 4 | Blue Line | yes |
| LN5 | Line 5 | Green Line | yes |
| LN6 | Line 6 | Violet Line | yes |
| LN7 | Line 7 | Pink Line | yes |
| LN7EXTN | Line 7 Ext. | Pink (Ext.) | yes |
| LN8 | Line 8 | Magenta Line | yes |
| LN8EXTN | Line 8 Ext. | Magenta (Ext.) | yes |
| LN9 | Line 9 | Grey Line | yes |
| LN10 | Airport Express | Orange Line | yes |
| LN11 | Rapid Metro | RMGL | yes |
| LN12 | FOB Dhaula Kuan | FOB | no |

LN3 and LN4 share the Blue Line color `#3b76c0`. LN9 and LN12 share `#808080`.

Usable routing starts with operational Delhi Metro lines whose journeys we have checked. Airport Express stays labeled separately until an Airport Express journey is verified. Rapid Metro stays unsupported until topology, transfer, and fare rules are verified. LN12 is hidden on the official site and is excluded from choices. Proposed and under-construction sections are excluded.

## Local snapshot

`data/manifest.json` records a curl download on 2026-09-30 of English and Hindi line lists, per-line station lists, line summaries, and English station briefs. Routes are calculated from station order on those lines. The snapshot does not include a saved journey for every station pair.

## Unresolved gaps

- Usage rights for storing responses in the app cache.
- Gates, toilets, and exit-level accessibility beyond the facility labels on `station_by_line`.
- A dedicated station-detail endpoint. Not found in the bundles scanned.
- Smart-card discounts and Sunday/holiday rules as data. The fare endpoint does distinguish weekday and weekend numbers; see `docs/DMRC_API.md`.
- Official assistance phone numbers. Do not invent them.
- Human review of Hindi UI chrome. Hindi names returned by `hi` responses are source strings, not our translation.
- Route `path[].name` versus `station_name` for the same code. See the API doc.
- Whether `minimum-interchange` changes a journey for pairs other than the one sample where it matched `least-distance`. `lowest-fare` returns an empty HTTP 200, so it is not a saved mode.
