#!/usr/bin/env python3
"""Pack saved route, fare, and first/last files into one file per origin."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data" / "en"
OUT = DATA / "journeys"
MODES = ("least-distance", "minimum-interchange")
CLOCK = __import__("re").compile(r"^\d{2}:[0-5]\d:[0-5]\d$")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    origins = sorted(path.stem for path in (DATA / "routes" / "least-distance").iterdir() if path.is_dir())
    written = 0
    for index, origin in enumerate(origins, start=1):
        pack = pack_origin(origin)
        target = OUT / f"{origin}.json"
        target.write_text(json.dumps(pack, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
        written += 1
        if index % 25 == 0 or index == len(origins):
            print(f"{index}/{len(origins)} {origin}", flush=True)
    print(f"wrote {written} origin packs", flush=True)


def pack_origin(origin: str) -> dict:
    destinations = set()
    for mode in MODES:
        folder = DATA / "routes" / mode / origin
        if folder.is_dir():
            destinations.update(path.stem for path in folder.glob("*.json"))
    rows = {}
    for destination in sorted(destinations):
        distance = ride(origin, destination, "least-distance")
        changes = ride(origin, destination, "minimum-interchange")
        if changes is not None and distance is not None and changes == distance:
            changes = None
        if distance is None and changes is None:
            continue
        row = {}
        if distance is not None:
            row["d"] = distance
        if changes is not None:
            row["c"] = changes
        rows[destination] = row
    return rows


def ride(origin: str, destination: str, mode: str):
    route = read_json(DATA / "routes" / mode / origin / f"{destination}.json")
    if not isinstance(route, dict) or not isinstance(route.get("route"), list) or not route["route"]:
        return None
    legs = []
    for leg in route["route"]:
        if not isinstance(leg, dict):
            continue
        codes = codes_from(leg.get("map-path"))
        names = [stop.get("name") for stop in leg.get("path") or [] if isinstance(stop, dict) and stop.get("name")]
        if len(codes) < 2 and len(names) < 2:
            continue
        packed = {"n": leg.get("line") or ""}
        towards = text(leg.get("towards_station"))
        platform = text(leg.get("platform_name"))
        if towards:
            packed["t"] = towards
        if platform:
            packed["p"] = platform
        if len(codes) >= 2:
            packed["c"] = codes
        elif names:
            packed["s"] = names
        legs.append(packed)
    if not legs:
        return None
    fare = read_json(DATA / "fares" / mode / origin / f"{destination}.json")
    trains = read_json(DATA / "first-last" / mode / origin / f"{destination}.json")
    packed = {"g": legs}
    minutes = duration_minutes(route.get("total_time"))
    if minutes is not None:
        packed["m"] = minutes
    if isinstance(fare, dict) and isinstance(fare.get("weekday_fare"), (int, float)) and isinstance(fare.get("weekend_fare"), (int, float)):
        packed["w"] = fare["weekday_fare"]
        packed["e"] = fare["weekend_fare"]
    elif isinstance(route.get("fare"), (int, float)):
        packed["a"] = route["fare"]
    first = train_pair(trains, "first_train", "first_train_route_detail", "endstation_from_first_train_estimated_time")
    last = train_pair(trains, "last_train", "last_train_route_detail", "endstation_from_last_train_estimated_time")
    if first:
        packed["f"] = first
    if last:
        packed["l"] = last
    return packed


def train_pair(payload, group: str, detail: str, estimated: str):
    if not isinstance(payload, dict):
        return None
    block = payload.get(group)
    if not isinstance(block, dict):
        return None
    rows = block.get(detail)
    depart = clock(rows[0].get("start_time")) if isinstance(rows, list) and rows and isinstance(rows[0], dict) else None
    arrive = clock(block.get(estimated))
    if arrive is None and isinstance(rows, list) and rows and isinstance(rows[-1], dict):
        arrive = clock(rows[-1].get("end_time"))
    if not depart or not arrive:
        return None
    return [depart, arrive]


def codes_from(hops) -> list[str]:
    codes: list[str] = []
    if not isinstance(hops, list):
        return codes
    for hop in hops:
        if not isinstance(hop, str) or "-" not in hop:
            continue
        start, end = hop.split("-", 1)
        if not start or not end:
            continue
        if not codes:
            codes.append(start)
        if codes[-1] != end:
            codes.append(end)
    return codes


def duration_minutes(value):
    if not isinstance(value, str):
        return None
    parts = value.strip().split(":")
    if len(parts) != 3:
        return None
    try:
        hours, minutes, seconds = (int(part) for part in parts)
    except ValueError:
        return None
    if minutes > 59 or seconds > 59:
        return None
    return round((hours * 3600 + minutes * 60 + seconds) / 60)


def clock(value):
    if not isinstance(value, str) or CLOCK.fullmatch(value) is None:
        return None
    return value


def text(value):
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    return cleaned or None


def read_json(path: Path):
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


if __name__ == "__main__":
    main()
