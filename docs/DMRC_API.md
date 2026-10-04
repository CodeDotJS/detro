# DMRC API evidence

Verification date: **2026-09-30** (Asia/Kolkata).

This backend is undocumented. Nothing here is a stable public contract.

Evidence labels:

- **Source** — string or call in the website’s public JavaScript. Response not verified.
- **Request** — a request was sent. No readable success body.
- **Response** — HTTP 200 and JSON were read.

A source string is never described as fully verified.

## How this was checked

Homepage `https://delhimetrorail.com/` returned the bundle names from the brief:

- `https://delhimetrorail.com/static/js/main.81213a8b.chunk.js`
- `https://delhimetrorail.com/static/js/10.18d6e9f4.chunk.js`

Also downloaded with a browser user agent: chunks `1`, `4`, `11`, and `15`. Python’s default client received HTTP 403 for lazy chunks; that was a client block, not an API result. Not every lazy chunk was read.

Successful curls used a browser user agent, `Accept: application/json`, `Content-Type: application/json`, `Origin: https://delhimetrorail.com`, and `Referer: https://delhimetrorail.com/`. Those official-site headers describe the request that worked. They are not permission to impersonate the site from our app.

In-browser `fetch` of `line_list` from `https://delhimetrorail.com/` returned 200 JSON. The same fetch from `https://example.com/` failed with `TypeError: Failed to fetch` and no readable body.

## Base URL

Source and successful calls:

```text
https://backend.delhimetrorail.com/api/v2/{lang}/{path}
```

`lang` **response-verified** for `en` and `hi`.

`GET /api/v2/en/` → **302** to `/en/api/v2/en/` with an empty body. The base URL is not a catalog.

The client constant is `REACT_APP_API_BASE || "https://backend.delhimetrorail.com"` plus `/api/v2`. Header on official fetches: `Content-Type: application/json`. Method is GET unless noted.

## Access blocker

| Attempt | Result |
| --- | --- |
| Curl with official site Origin and Referer | 200 JSON on the operations below |
| Curl with no Origin, `http://localhost:5173`, or `https://example.com` | Cloudflare HTML 403, title “Attention Required!” |
| Browser fetch on the official site | 200 JSON for `line_list` |
| Browser fetch on `https://example.com` | Failed fetch, no body |
| English keyword search, once | TCP connection reset, then a later call returned 200 |

`access-control-allow-origin: *` was present on official-origin JSON responses, including the HTTP 500 HTML error. That header was not visible to the page script (`get` returned null) even when the official page could read the body.

Do not spoof the official origin, copy challenge cookies, or retry 403. Milestone 1 must retry from this app’s own browser origin. If that fails, show an honest error and test with fixtures. A server adapter that also gets 403 is still blocked.

`cf-cache-status` on `line_list` was `DYNAMIC`. Cache-Control on successful JSON was not recorded.

## Endpoints with successful responses

No pagination fields were present on these payloads.

### `GET /api/v2/{lang}/line_list`

- **Status:** Response. `en` and `hi` (Hindi body was JSON; field-by-field key audit was done on English).
- **Purpose:** Lines for search and the map legend.
- **Trailing slash:** `GET .../line_list/` → 302 to `/en/api/v2/en/line_list/`, empty body. Call it without a slash.
- **English shape:** array of 14 objects. Fields: `id`, `name`, `line_color`, `line_code`, `primary_color_code`, `secondary_color_code`, `class_primary`, `class_secondary`, `start_station`, `end_station`, `show_in_frontend`, `status`.
- **Sample object (English, real):** Line 1, `line_code` `LN1`, `line_color` “Red Line”, `primary_color_code` `#c0282c`, `start_station` “RITHALA”, `end_station` “SHAHEED STHAL ( NEW BUS ADDA)”, `show_in_frontend` true, `status` “Normal Service”.
- **Hindi:** `name`, `line_color`, `start_station`, and `end_station` were Hindi in the first object; `line_code` stayed `LN1`.
- Full code list: `docs/DATA_SOURCES.md`.

### `GET /api/v2/{lang}/station_by_keyword/all/{keyword}`

- **Status:** Response for `en` and `hi`, keywords `Rithala` and `Rajiv` (English).
- **Purpose:** Station search. The journey planner calls this only when the keyword is non-empty.
- **Sample:** `Rithala` → one object, `station_code` `RI`, `station_name` “RITHALA” in English and “रिठाला” in Hindi. `Rajiv` → `RCK`, “RAJIV CHOWK”.
- **Fields present:** `id`, `station_name`, `station_code`, `station_facility[]` (`name`, `class_name`, `image.title`, `image.file`).
- **Fields absent here:** line code, line color, `interchange`, `status`. Line chips need `station_by_line` or another verified join. Do not guess the line from the name.

### `GET /api/v2/{lang}/station_by_line/{line_code}`

- **Status:** Response for `en` and `LN1`.
- **Purpose:** Stations on one line. Source passes `line_code` (for example `LN1`), not the color name.
- **LN1:** 29 stations. Fields: `id`, `station_name`, `station_code`, `station_facility`, `interchange` (boolean), `status` (all “Station Open” in this sample).
- Facility names seen: “Divyang Friendly Station”, “Parking Available”, “Lift/Escalator Available”, “Interchange Station”. Image files are paths under the backend host. A listed lift is not live lift status.
- `interchange: true` is not a walking-transfer graph.

### `GET /api/v2/{lang}/station_route/{from}/{to}/{mode}/{datetime}`

- **Status:** Response. No trailing slash in the source URL, and the calls below had none.
- **Purpose:** Online journey. This is the planner the first slice should call.
- **Parameters that returned JSON:**
  - `from` / `to`: station codes `RI`, `KG`, `RCK` from the responses above. Not station names. `NOPE` → HTTP 500 HTML titled “Internal server error”.
  - `mode`: `least-distance` and `minimum-interchange`. For `RI` → `RCK`, those two responses were identical. That does not prove the modes are aliases.
  - `lowest-fare`: called from the official site and from this repo. HTTP 200 with an empty body for `RI` → `KG` at `2026-09-30T12:00:00.000`. No JSON to save. The download skips this mode.
  - `datetime`: `YYYY-MM-DDTHH:mm:ss.SSS` with no offset. Source builds it with `moment.utc(valueWithoutZ).local()`.
- **Time samples, `RI` → `KG`, `least-distance`, English:**
  - Request `2026-09-30T02:27:11.310` → `new_start_time` `06:00:02`, `new_end_time` `06:34:02`.
  - Request `2026-09-30T12:00:00.000` → `new_start_time` `12:00:20`, `new_end_time` `12:27:24`.
  - `total_time` stayed `0:25:57`, `fare` stayed `43`, platform string stayed “Platform No. 2”.
  - The clock time moves with the requested wall time. The early request did not echo `02:27`; it returned a later service time. Send Asia/Kolkata wall time. Do not send a `Z` timestamp. These are schedule times from the payload, not live arrivals.
- **Top-level fields:** `stations`, `from`, `to`, `from_station_status`, `to_station_status` (`status`, `title`, `note`), `total_time`, `fare`, `route[]`, `message`.
- **Leg fields:** `line`, `line_no`, `path[]` (`name`, `status`), `path_time`, `map-path[]`, `station_interchange_time`, `start`, `end`, `direction`, `towards_station`, `platform_name`, `new_start_time`, `new_end_time`.
- **`RI` → `KG`:** 1 leg, Red Line, `line_no` 1, `stations` 14, `path` length 14, `map-path` length 13, `direction` `up`, `towards_station` “SHAHEED STHAL ( NEW BUS ADDA)”, `station_interchange_time` 0, `fare` 43, `total_time` `0:25:57`, `message` `""`. Status `Open` with empty title and note.
- **`RI` → `RCK`:** 2 legs, `stations` 18. Leg 2 is Yellow Line, `line_no` 2, `direction` `down`, `towards_station` “MILLENNIUM CITY CENTRE GURUGRAM”, `platform_name` “Platform No. 1”, `station_interchange_time` 10.0, `path_time` `0:08:37`. Change at Kashmere Gate. `total_time` `0:44:34` equals the two `path_time` values plus 10 minutes. Treat `10.0` as minutes for this sample.
- **Hindi `RI` → `KG`:** same codes in `map-path`, Hindi `from`, `to`, line, path names, towards, and platform. Status text was “स्टेशन चालू है”, not “Open”. `fare` and `total_time` matched English.
- **`fare`:** number, no currency field and no fare-type field. The official UI prefixes `₹`. Empty or missing fare must stay unavailable. The official bundle’s `fare || 0` pattern is rejected.
- **`platform_name`:** localized phrase when present. Show that phrase for the leg. Do not invent one when it is absent.
- **`total_time` and `path_time`:** strings like `H:MM:SS` durations.
- Source also reads `note`, `note_hindi`, and `route[].map-path` for the map. `note` / `note_hindi` were absent from these successes. `map-path` was present.

### `GET /api/v2/{lang}/new_fare_with_route/{from}/{to}/{mode}/`

- **Status:** Response for `en`, `RI`, `KG`, `least-distance`, with the trailing slash the bundle uses.
- **Source:** fare-calculator chunk. Also searches with `station_by_keyword/all/{keyword}`.
- **Fields:** `stations`, `from`, `to`, `total_time`, `weekday_fare`, `weekend_fare`, `route[]`.
- **This sample:** `weekday_fare` 43, `weekend_fare` 32, `total_time` `0:25:57`, `stations` 14. On Wednesday 2026-09-30, `station_route.fare` for the same pair was 43, the same number as `weekday_fare`.
- Leg fields here: `line`, `line_no`, `path`, `path_time`, `map-path`, `station_interchange_time`, `start`, `end`. No `platform_name`, `towards_station`, `direction`, or clock times in this sample.
- No smart-card field. Do not invent a smart-card price.

### `GET /api/v2/{lang}/first_and_last_train_with_filter/{from}/{to}/{mode}/`

- **Status:** Response for `en`, `RI`, `KG`, `least-distance`, with the trailing slash the bundle uses.
- **Sample:** first train `RI` 06:00:02 → `KG` 06:34:02. Last train `RI` 23:00:00 → `KG` 23:25:49. Names “RITHALA” and “KASHMERE GATE”.
- **Fields:** `first_train.endstation_from_first_train_estimated_time`, `first_train.first_train_route_detail[]` (`start_st`, `start_time`, `end_st`, `end_time`, `interchange_time`, `start_station_name`, `end_station_name`), and the same shape under `last_train` / `last_train_route_detail`.
- In this one payload, first-train `interchange_time` was `""` and last-train `interchange_time` was `0`. Do not coerce either to a number of changes.
- This is a filtered first/last result for one pair and mode, not a station timetable and not a live departure.

## Name mismatch (response)

For `LN1`, `station_by_line` names and `station_route` path names disagree for the same `map-path` codes:

| Code | `station_by_line.station_name` | Journey `path[].name` |
| --- | --- | --- |
| RHW | DR. BABA SAHEB AMBEDKAR HOSPITAL | ROHINI WEST |
| RHE | ROHINI | ROHINI EAST |
| PTP | MADHUBAN CHOWK (earlier PITAMPURA) | PITAMPURA |

Join on codes. Show the journey’s path names inside the journey, and the line-list name in search, until a person verifies which public name to prefer. One journey path name included a trailing space (`KANHAIYA NAGAR `).

## Seen in source, not given a successful response

| Pattern | Notes |
| --- | --- |
| `station_by_keyword/{mode}/{keyword}` | First/last screen. The mode state is initialized to `least-distance`, so the built path can be `station_by_keyword/least-distance/{keyword}`. Not called. The verified search path is `station_by_keyword/all/{keyword}`. |
| `lowest-fare` | Journey preference string next to `least-distance` and `minimum-interchange`. Called. HTTP 200 with an empty body. See the station-route note above. |
| `POST /api/v2/{lang}/search_by_facility_category` | JSON body. Not called. |
| `GET /api/v2/{lang}/service_information` | `useSimpleFetch` in the main bundle. Not called. |
| `GET /api/v2/{lang}/menus` | Curl returned 301 to `/api/v2/en/menus/` and an empty body. Not a JSON success. |
| `GET /api/v2/{lang}/passengers/notification` | Source only. |
| `ws://metro.stagemyapp.com:8000/ws/station_data/` and `.../metro_line_data/` | Staging websocket in source. Not called. Do not use. |

The website route `/station/:id` is a page route. In the fare chunk, that id is a `station_code`. No separate station-detail JSON path was found in the scanned bundles.

## Errors observed

- Unknown station code on `station_route`: HTTP 500, HTML, title “Internal server error”.
- `line_list` with a trailing slash: HTTP 302, empty body.
- Non-official origins: Cloudflare HTML 403. One search call reset the connection, then succeeded.
- Official client turns a failed `station_route` parse into `false` and can store `note` JSON in `localStorage`. We will not follow that storage pattern.

## Captures in `curls/` — 2026-09-30

The curl files in `curls/` were run and the JSON bodies saved under `curls/responses/`. Field-by-field notes are in `curls/STRUCTURE.md`. New response-verified paths from that set:

- `GET /api/v2/en/metro_line/LN1` — two-element array: a line summary, then a separate updates object.
- `GET /api/v2/en/station_by_line_linepage/LN1` — station rows plus a final count object, not another station.
- `GET /api/v2/en/station_brief_detail/HDNR` and `.../NBAA` — station, line, facilities, and lift rows. Lift `status` is a boolean beside a relative `last_update`, not a live reading.
- `GET /api/v2/en/station_by_keyword/all/s` — 10 stations, same search fields as before.
- `GET /api/v2/en/station_route/SAKT/RI/least-distance/2026-09-30T02:58:08.829` — three-leg journey. Same route fields as the earlier two-leg sample.

## Local snapshot used by the app

`scripts/download-dmrc-snapshot.py` saved `line_list` and `station_by_line` for `en` and `hi` under `data/` on 2026-09-30. `details` also saves `metro_line` and English `station_brief_detail` records. Station-to-station `station_route` responses are not downloaded.

Search reads this snapshot. “Show my route” uses a saved `station_route` file when `data/{lang}/routes/least-distance/{from}/{to}.json` exists, including fare and platform from that file. Otherwise it calculates a path from station order: fewer changes, then fewer stops, with fare and timing unavailable.

`scripts/download-dmrc-extra.py` saved facility categories, one facility search per category (toilets, water, food, and the other listed categories), `station_by_line_linepage` for every line, menus, and service information, in English and Hindi. `scripts/download-dmrc-routes.py` resumes an English download of `station_route`, `new_fare_with_route`, and `first_and_last_train_with_filter` for every station pair, for `least-distance` and `minimum-interchange`. Hindi downloads are not requested. `lowest-fare` is not requested because it returns an empty HTTP 200. The journey time sent for every route is `2026-09-30T12:00:00.000`. Progress is written to `data/download-status.json`. LN12 stays out of search and routing. The Magenta line and Magenta extension lists do not share a station code, so the calculated fallback does not invent a link between them.

`detro.archives/` holds separate collectors for a later full site archive, including Hindi and the page calls named in the public bundles. Their catalog is `detro.archives/CATALOG.md`. They write to `detro.archives/dump/`, not to `data/`, and they are not the app.

## App origin check — 2026-09-30

From the running app at `http://127.0.0.1:5173/`:

- The page requested `GET /api/v2/en/line_list` and `GET /api/v2/en/station_by_keyword/all/Rithala`.
- `fetch` failed with `TypeError: Failed to fetch`. No status or body was readable.
- The screen showed “Station search did not answer.” It did not show a route.
- The app did not send the official site’s `Origin` or `Referer`.

This matches the earlier non-DMRC-origin block. Live planning from this app is not working. Fixture tests cover the route text.

## Integration limits

- Browser access from this app’s origin is unverified and currently blocked in curl.
- Fare type is on `new_fare_with_route` (`weekday_fare`, `weekend_fare`), not on `station_route`.
- Platforms and towards-stations are on `station_route` legs in these samples, not on the fare payload.
- Route display names and line-list names can differ.
- No response included a dataset version or `sourceUpdatedAt`.
- Redistribution permission is unknown. Fixtures used in tests should be small and sanitized. Do not check in a full station dump as the app database.
