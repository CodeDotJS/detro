#!/usr/bin/env python3
"""List the boarding platform for each station, line, and direction found in the journey packs."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data" / "en"
PACKS = DATA / "journeys"
OUT = DATA / "platforms.json"


def main() -> None:
    seen: dict[tuple[str, str, str], set[str]] = {}
    for path in sorted(PACKS.glob("*.json")):
        pack = json.loads(path.read_text(encoding="utf-8"))
        for row in pack.values():
            for key in ("d", "c"):
                for leg in (row.get(key) or {}).get("g") or []:
                    codes = leg.get("c") or []
                    line, towards, platform = leg.get("n"), leg.get("t"), leg.get("p")
                    if len(codes) < 2 or not line or not towards or not platform:
                        continue
                    seen.setdefault((codes[0], line, towards), set()).add(platform.strip())
    stations: dict[str, list[dict[str, str]]] = {}
    dropped = 0
    for (station, line, towards), platforms in sorted(seen.items()):
        if len(platforms) != 1:
            dropped += 1
            continue
        stations.setdefault(station, []).append({"n": line, "t": towards, "p": next(iter(platforms))})
    OUT.write_text(json.dumps({"stations": stations}, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    total = sum(len(rows) for rows in stations.values())
    print(f"wrote {total} platforms at {len(stations)} stations, dropped {dropped} with more than one value", flush=True)


if __name__ == "__main__":
    main()
