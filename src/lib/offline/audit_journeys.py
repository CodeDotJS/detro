#!/usr/bin/env python3
"""Report holes in packed journeys and the raw downloads they were built from.

Read-only. Does not invent fares, platforms, or clocks.

    python3 src/lib/offline/audit_journeys.py
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data" / "en"
MODES = ("least-distance", "minimum-interchange")


@dataclass
class Audit:
    origins: int = 0
    destinations: int = 0
    with_changes: int = 0
    distance_only: int = 0
    missing_first_distance: list[str] = field(default_factory=list)
    missing_first_changes: list[str] = field(default_factory=list)
    untyped_fare_distance: list[str] = field(default_factory=list)
    untyped_fare_changes: list[str] = field(default_factory=list)
    missing_fare_files: list[str] = field(default_factory=list)
    platform_gap_distance: int = 0
    platform_gap_changes: int = 0

    def as_dict(self) -> dict:
        return {
            "origins": self.origins,
            "destinationRows": self.destinations,
            "withDistinctChanges": self.with_changes,
            "distanceOnly": self.distance_only,
            "missingFirstTrain": {
                "leastDistance": len(self.missing_first_distance),
                "fewestChanges": len(self.missing_first_changes),
                "samples": self.missing_first_distance[:10],
            },
            "untypedFare": {
                "leastDistance": len(self.untyped_fare_distance),
                "fewestChanges": len(self.untyped_fare_changes),
                "pairs": self.untyped_fare_distance + self.untyped_fare_changes,
            },
            "missingFareFiles": self.missing_fare_files,
            "ridesMissingSomePlatform": {
                "leastDistance": self.platform_gap_distance,
                "fewestChanges": self.platform_gap_changes,
            },
        }


def main() -> int:
    audit = run_audit()
    json.dump(audit.as_dict(), sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
    # Fail only on gaps the packer can close. Untyped fares and empty platforms
    # stay as upstream reports when DMRC returns HTTP 500 or omits platform_name.
    fixable = len(audit.missing_first_distance) + len(audit.missing_first_changes)
    if audit.origins == 0 or audit.destinations == 0:
        return 1
    return 1 if fixable else 0


def run_audit() -> Audit:
    audit = Audit()
    journeys = DATA / "journeys"
    packs = sorted(journeys.glob("*.json"))
    audit.origins = len(packs)
    for pack_path in packs:
        origin = pack_path.stem
        pack = read_json(pack_path)
        if not isinstance(pack, dict):
            continue
        for destination, row in pack.items():
            if not isinstance(row, dict):
                continue
            audit.destinations += 1
            distance = row.get("d")
            changes = row.get("c")
            if isinstance(distance, dict) and isinstance(changes, dict):
                audit.with_changes += 1
            elif isinstance(distance, dict):
                audit.distance_only += 1
            pair = f"{origin}->{destination}"
            inspect_ride(audit, pair, distance, "distance")
            inspect_ride(audit, pair, changes, "changes")
    audit.missing_fare_files = missing_fare_files()
    return audit


def inspect_ride(audit: Audit, pair: str, ride: object, kind: str) -> None:
    if not isinstance(ride, dict):
        return
    if "f" not in ride:
        if kind == "distance":
            audit.missing_first_distance.append(pair)
        else:
            audit.missing_first_changes.append(pair)
    if "a" in ride and "w" not in ride:
        if kind == "distance":
            audit.untyped_fare_distance.append(pair)
        else:
            audit.untyped_fare_changes.append(pair)
    legs = ride.get("g")
    if isinstance(legs, list) and any(isinstance(leg, dict) and not leg.get("p") for leg in legs):
        if kind == "distance":
            audit.platform_gap_distance += 1
        else:
            audit.platform_gap_changes += 1


def missing_fare_files() -> list[str]:
    missing: list[str] = []
    routes_root = DATA / "routes"
    fares_root = DATA / "fares"
    if not routes_root.is_dir():
        return missing
    for mode in MODES:
        mode_routes = routes_root / mode
        if not mode_routes.is_dir():
            continue
        for origin_dir in sorted(mode_routes.iterdir()):
            if not origin_dir.is_dir():
                continue
            for route_file in sorted(origin_dir.glob("*.json")):
                fare = fares_root / mode / origin_dir.name / route_file.name
                if not fare.is_file():
                    missing.append(f"{mode}/{origin_dir.name}/{route_file.stem}")
    return missing


def read_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


if __name__ == "__main__":
    raise SystemExit(main())
