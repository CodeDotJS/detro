# Status

Date: 2026-10-10. Status is a seventh destination, before Play. Closures are packed into `data/en/status.json` and shipped with the static site.

## What “closed” means

Linepage `status` is the source of a closed gate. Live phrases are `"Station Open"` and `"Station Closed"`. Do not invent other phrases.

A closed station is not deleted from the network.

| Access | Rule |
| --- | --- |
| Board / alight | False when the phrase is `Station Closed`. |
| Pass | True. Trains still run through. |
| Transfer | True only when a note matches `/interchange facility is available/i`. False when a note matches `/will not be available/i` and mentions interchange, or when the station is closed and silent. |

Notes attach by station code across lines. If notes disagree, unavailable wins, then available, then silent. Open stations are omitted from the pack. A missing code is open.

## Refresh

A Cloudflare Worker (`workers/status-ping`) fires three times a day at 08:00, 14:00, and 20:00 Asia/Kolkata (`30 2,8,14 * * *` UTC) and `POST`s GitHub `workflow_dispatch` for the Status bake. Actions `schedule` never registered on this repo. The bake job fetches `line_list`, then `metro_line/{code}` and `station_by_line_linepage/{code}` for each line. `python3 src/lib/offline/build_status.py` writes `data/en/status.json` only when the closed-station map or the service-update notice content (title / text / dated) changed. Pack and notice fetch clocks alone leave the file alone, so no pull request opens. When there is a change, the bake opens `chore/status-bake` with the `STATUS_BAKE_TOKEN` secret (a classic PAT with `repo` scope), waits for `check`, and merges to `main` so production uploads. The default `GITHUB_TOKEN` cannot start CI from its own push. No R2, KV, D1, or Pages Function. The only Worker is this status ping.

A failed fetch keeps the previous file and clock. Silence is not treated as all-clear.

The app never sends the official site’s `Origin` or `Referer`. The bake collector may, as recorded in `curls/station_status`, because a request without those headers is a Cloudflare 403.

## Surfaces

- **Status** — closed and open counts, the pack clock, each closed station once, one nearest open gate, a closures-over-time chart from `status-history.json`, and the baked corporate service update when present.
- **Plan** — Least and Fewest still use the asked pair. Alternative is the ride via the one nearest open gate.
- **Lines, City** — a closed mark on those stations. A blocked change is skipped. Trains still ride through.
- **Saved** — a stored pair is recalculated when the saved ride violates access. Fare and timing may then stay missing.
- Location is requested only after the button. Coordinates are not stored. Share links stay station codes.

The header is the mark plus seven tabs. Phone widths stay one column, 44px targets, no sideways scroll.
