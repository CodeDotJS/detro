# Status history and service update

Date: 2026-10-12. Extends Status with a daily closed-station history chart and a baked corporate service-update notice.

## Decisions

- History stores **count plus station codes and names** for each Asia/Kolkata calendar day.
- Retention is **complete** in `data/en/status-history.json`. The chart range control is **dynamic**: All days always; last week / month / year only once history reaches that far; years present in the pack always listed.
- Layout: two top panes (lookup + live board), then a **centered** history card and **centered** service-update card under them.
- Chart columns are fixed width with visible date labels; they do not stretch full viewport. Tap a day opens a **dialog** with that day’s closed stations.
- A day’s station list is the **union** of every successful bake that day.
- **Service update** sits under the history card. Omit it when the bake has no usable text.
- Still static: bake into `data/en/status.json` and `data/en/status-history.json`. No R2, Worker, or live call from the app.
- Collector may send official `Origin` / `Referer` for `corporate/service-update/` as in `curls/service-status`. The app does not.

## Files

| File | Role |
| --- | --- |
| `data/en/status.json` | Live closed map, `fetchedAt`, optional `serviceUpdate` |
| `data/en/status-history.json` | `{ "days": [ { "date", "count", "stations": [{ "code", "name" }] } ] }` |

## Bake

`python3 src/lib/offline/build_status.py` still packs linepage closed phrases. It also fetches service-update, strips HTML to plain text, merges today’s union into history, and writes only files whose readable content changed (closed map, notice title/text/dated, or history days). Fetch clocks alone do not rewrite `status.json`. GitHub Actions opens a PR when either file differs from `main`.
