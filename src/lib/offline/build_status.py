#!/usr/bin/env python3
"""Pack closed-station status, daily history, and corporate service update."""

from __future__ import annotations

import argparse
import html as html_lib
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "data" / "en" / "status.json"
HISTORY_OUT = ROOT / "data" / "en" / "status-history.json"
STATIONS_DIR = ROOT / "data" / "en" / "stations"
BASE = "https://backend.delhimetrorail.com/api/v2/en"
HEADERS = {
    "Accept": "application/json",
    "Origin": "https://delhimetrorail.com",
    "Referer": "https://delhimetrorail.com/",
    "User-Agent": "detro-status-bake",
}
DATE_RE = re.compile(r"Dated:\s*(\d{1,2}\.\d{1,2}\.\d{4})", re.I)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-dir", type=Path, help="Folder of saved line_list, metro/{code}.json, linepage/{code}.json")
    args = parser.parse_args()
    try:
        now = datetime.now(ZoneInfo("Asia/Kolkata"))
        fetched_at = now.strftime("%Y-%m-%dT%H:%M:%S.000")
        day = now.strftime("%Y-%m-%d")
        lines = read_dir(args.from_dir) if args.from_dir else fetch_live()
        pack = pack_status(fetched_at, lines)
        service = (
            read_service_file(args.from_dir / "service-update.json", fetched_at)
            if args.from_dir
            else fetch_service_update(fetched_at)
        )
        names = load_station_names()
        previous = read_pack(OUT)
        previous_history = read_history(HISTORY_OUT)
        history = merge_history(previous_history, day, pack["stations"], names)

        out = {"fetchedAt": fetched_at, "stations": pack["stations"]}
        if service:
            out["serviceUpdate"] = service
        if previous is not None and previous.get("stations") == out["stations"]:
            out["fetchedAt"] = previous.get("fetchedAt") or fetched_at

        status_changed = previous is None or normalize_status(previous) != normalize_status(out)
        history_changed = previous_history != history

        OUT.parent.mkdir(parents=True, exist_ok=True)
        if status_changed:
            OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            print(f"wrote {len(out['stations'])} closed stations at {out['fetchedAt']}", flush=True)
        else:
            print(f"unchanged {len(out['stations'])} closed stations (kept {out['fetchedAt']})", flush=True)

        if history_changed:
            HISTORY_OUT.write_text(
                json.dumps(history, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            today = next((row for row in history["days"] if row["date"] == day), None)
            count = today["count"] if today else 0
            print(f"wrote history through {day} ({count} closed that day)", flush=True)
        else:
            print(f"history unchanged through {day}", flush=True)
        return 0
    except Exception as error:
        print(f"status bake failed: {error}", file=sys.stderr)
        return 1


def normalize_status(pack: dict) -> dict:
    return {
        "stations": pack.get("stations") or {},
        "serviceUpdate": pack.get("serviceUpdate"),
    }


def read_pack(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def read_history(path: Path) -> dict:
    raw = read_pack(path)
    if not raw or not isinstance(raw.get("days"), list):
        return {"days": []}
    days = []
    for row in raw["days"]:
        parsed = read_history_day(row)
        if parsed:
            days.append(parsed)
    days.sort(key=lambda item: item["date"])
    return {"days": days}


def read_history_day(row: object) -> dict | None:
    if not isinstance(row, dict):
        return None
    date = row.get("date")
    if not isinstance(date, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
        return None
    stations = []
    raw_stations = row.get("stations")
    if isinstance(raw_stations, list):
        for item in raw_stations:
            if not isinstance(item, dict):
                continue
            code = item.get("code")
            name = item.get("name")
            if isinstance(code, str) and code and isinstance(name, str) and name:
                stations.append({"code": code, "name": name})
    stations = unique_stations(stations)
    return {"date": date, "count": len(stations), "stations": stations}


def merge_history(history: dict, day: str, closed: dict, names: dict[str, str]) -> dict:
    by_code: dict[str, str] = {}
    existing = next((row for row in history.get("days", []) if row.get("date") == day), None)
    if existing:
        for item in existing.get("stations", []):
            by_code[item["code"]] = item["name"]
    for code in closed:
        by_code[code] = names.get(code) or by_code.get(code) or code
    stations = unique_stations([{"code": code, "name": name} for code, name in by_code.items()])
    days = [row for row in history.get("days", []) if row.get("date") != day]
    if stations:
        days.append({"date": day, "count": len(stations), "stations": stations})
    days.sort(key=lambda item: item["date"])
    return {"days": days}


def unique_stations(rows: list[dict]) -> list[dict]:
    seen: dict[str, str] = {}
    for row in rows:
        code = row["code"]
        if code not in seen:
            seen[code] = row["name"]
    return [{"code": code, "name": seen[code]} for code in sorted(seen)]


def load_station_names() -> dict[str, str]:
    names: dict[str, str] = {}
    if not STATIONS_DIR.exists():
        return names
    for path in sorted(STATIONS_DIR.glob("*.json")):
        try:
            rows = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            code = row.get("station_code")
            name = row.get("station_name")
            if isinstance(code, str) and code and isinstance(name, str) and name:
                names[code] = name
    return names


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


def fetch_service_update(fetched_at: str) -> dict | None:
    payload = get_json(f"{BASE}/corporate/service-update/")
    return read_service_payload(payload, fetched_at)


def read_service_file(path: Path, fetched_at: str) -> dict | None:
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return read_service_payload(payload, fetched_at)


def read_service_payload(payload: object, fetched_at: str) -> dict | None:
    row = None
    if isinstance(payload, list):
        row = next((item for item in payload if isinstance(item, dict)), None)
    elif isinstance(payload, dict):
        row = payload
    if not row:
        return None
    title = clean_text(str(row.get("title") or "Service update"))
    text = plain_from_html(str(row.get("content") or ""))
    if not text:
        return None
    dated_match = DATE_RE.search(text) or DATE_RE.search(str(row.get("content") or ""))
    dated = dated_match.group(1) if dated_match else None
    return {
        "title": title or "Service update",
        "text": text,
        "dated": dated,
        "fetchedAt": fetched_at,
    }


def plain_from_html(raw: str) -> str:
    parser = _TextExtractor()
    parser.feed(raw)
    parser.close()
    text = html_lib.unescape(parser.text())
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    lines = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        lower = stripped.lower()
        if lower in {"back", "delhimetro"}:
            continue
        if lower == "service update" and (not lines or lines[-1].lower() == "service update"):
            continue
        lines.append(stripped)
    while lines and lines[0].lower() == "service update":
        lines.pop(0)
    return "\n".join(lines).strip()


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._chunks: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        classes = " ".join(value for key, value in attrs if key == "class" and value).lower()
        if tag in {"script", "style"} or "d-none" in classes.split():
            self._skip_depth += 1
            return
        if self._skip_depth:
            self._skip_depth += 1
            return
        if tag in {"p", "div", "br", "h1", "h2", "h3", "h4", "li", "tr"}:
            self._chunks.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if self._skip_depth:
            self._skip_depth -= 1
            return
        if tag in {"p", "div", "h1", "h2", "h3", "h4", "li", "tr"}:
            self._chunks.append("\n")

    def handle_data(self, data: str) -> None:
        if not self._skip_depth and data:
            self._chunks.append(data)

    def text(self) -> str:
        return "".join(self._chunks)


def clean_text(value: str) -> str:
    return " ".join(value.split()).strip()


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
