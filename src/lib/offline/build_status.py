#!/usr/bin/env python3
"""Pack closed-station status from metro_line notes and linepage phrases."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "data" / "en" / "status.json"
BASE = "https://backend.delhimetrorail.com/api/v2/en"
HEADERS = {
    "Accept": "application/json",
    "Origin": "https://delhimetrorail.com",
    "Referer": "https://delhimetrorail.com/",
    "User-Agent": "detro-status-bake",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-dir", type=Path, help="Folder of saved line_list, metro/{code}.json, linepage/{code}.json")
    args = parser.parse_args()
    try:
        fetched_at = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%dT%H:%M:%S.000")
        lines = read_dir(args.from_dir) if args.from_dir else fetch_live()
        pack = pack_status(fetched_at, lines)
        previous = read_pack(OUT)
        if previous is not None and previous.get("stations") == pack["stations"]:
            kept = previous.get("fetchedAt") or "previous stamp"
            print(f"unchanged {len(pack['stations'])} closed stations (kept {kept})", flush=True)
            return 0
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps(pack, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(f"wrote {len(pack['stations'])} closed stations at {fetched_at}", flush=True)
        return 0
    except Exception as error:
        print(f"status bake failed: {error}", file=sys.stderr)
        return 1


def read_pack(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def fetch_live() -> list[dict]:
    line_list = get_json(f"{BASE}/line_list")
    if not isinstance(line_list, list):
        raise RuntimeError("line_list was not a list")
    rows = []
    for item in line_list:
        code = item.get("line_code") if isinstance(item, dict) else None
        if not code:
            continue
        rows.append(
            {
                "code": code,
                "metro": get_json(f"{BASE}/metro_line/{code}"),
                "linepage": get_json(f"{BASE}/station_by_line_linepage/{code}"),
            }
        )
    if not rows:
        raise RuntimeError("line_list had no line codes")
    return rows


def read_dir(folder: Path) -> list[dict]:
    line_list = json.loads((folder / "line_list.json").read_text(encoding="utf-8"))
    rows = []
    for item in line_list:
        code = item.get("line_code") if isinstance(item, dict) else None
        if not code:
            continue
        metro_path = first_existing(folder / "metro" / f"{code}.json", folder / f"metro_{code}.json")
        page_path = first_existing(folder / "linepage" / f"{code}.json", folder / f"linepage_{code}.json")
        if not metro_path or not page_path:
            continue
        rows.append(
            {
                "code": code,
                "metro": json.loads(metro_path.read_text(encoding="utf-8")),
                "linepage": json.loads(page_path.read_text(encoding="utf-8")),
            }
        )
    if not rows:
        raise RuntimeError(f"no line files in {folder}")
    return rows


def pack_status(fetched_at: str, lines: list[dict]) -> dict:
    stations: dict[str, dict] = {}
    notes: dict[str, list[str]] = {}
    for line in lines:
        code = line["code"]
        for row in station_updates(line.get("metro")):
            station = (row.get("station") or {}).get("station_code")
            if not station:
                continue
            if row.get("note"):
                notes.setdefault(station, []).append(row["note"])
            current = stations.get(station, empty_station())
            current["phrase"] = current["phrase"] or "Station Closed"
            current["note"] = current["note"] or row.get("note")
            current["title"] = row.get("title") or current["title"]
            current["start"] = row.get("start_date") or current["start"]
            current["end"] = row.get("end_date") or current["end"]
            current["lineCodes"] = unique([*current["lineCodes"], code])
            stations[station] = current
        for row in station_rows(line.get("linepage")):
            if row["status"] != "Station Closed":
                continue
            current = stations.get(row["code"], empty_station())
            extra = notes.get(row["code"], [])
            current["phrase"] = "Station Closed"
            current["note"] = current["note"] or (extra[0] if extra else None)
            current["lineCodes"] = unique([*current["lineCodes"], code])
            stations[row["code"]] = current
    for code, station in stations.items():
        merged = merge_notes(notes.get(code, [station["note"]] if station["note"] else []))
        chosen = pick_note(notes.get(code, []), merged)
        if chosen:
            station["note"] = chosen
    return {"fetchedAt": fetched_at, "stations": dict(sorted(stations.items()))}


def empty_station() -> dict:
    return {"phrase": "", "note": None, "title": None, "start": None, "end": None, "lineCodes": []}


def station_rows(linepage: object) -> list[dict]:
    if not isinstance(linepage, list):
        return []
    rows = []
    for item in linepage:
        if not isinstance(item, dict) or "station_code" not in item:
            continue
        rows.append({"code": item["station_code"], "status": item.get("status") or ""})
    return rows


def station_updates(metro: object) -> list[dict]:
    if not isinstance(metro, list) or len(metro) < 2 or not isinstance(metro[1], dict):
        return []
    updates = metro[1].get("stations_updates")
    if not isinstance(updates, list):
        return []
    return [row for row in updates if isinstance(row, dict)]


def classify_note(note: str | None) -> str:
    text = " ".join((note or "").split())
    if not text:
        return "silent"
    lower = text.lower()
    if "will not be available" in lower and "interchange" in lower:
        return "unavailable"
    if "interchange facility is available" in lower:
        return "available"
    return "silent"


def merge_notes(values: list[str | None]) -> str:
    kinds = [classify_note(note) for note in values]
    if "unavailable" in kinds:
        return "unavailable"
    if "available" in kinds:
        return "available"
    return "silent"


def pick_note(values: list[str], merged: str) -> str | None:
    if merged == "unavailable":
        for item in values:
            if "will not be available" in item.lower():
                return item
    if merged == "available":
        for item in values:
            if "interchange facility is available" in item.lower():
                return item
    return values[0] if values else None


def first_existing(*paths: Path) -> Path | None:
    for path in paths:
        if path.exists():
            return path
    return None


def unique(values: list[str]) -> list[str]:
    seen = []
    for item in values:
        if item not in seen:
            seen.append(item)
    return seen


def get_json(url: str) -> object:
    request = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            if response.status != 200:
                raise RuntimeError(f"{url} returned {response.status}")
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"{url} returned {error.code}") from error


if __name__ == "__main__":
    raise SystemExit(main())
