#!/usr/bin/env python3
"""Unit checks for journey pack audit helpers (no network)."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import audit_journeys


class AuditHelpersTest(unittest.TestCase):
    def test_inspect_ride_counts_untyped_fare_and_missing_first(self) -> None:
        audit = audit_journeys.Audit()
        audit_journeys.inspect_ride(
            audit,
            "A->B",
            {"g": [{"n": "Yellow", "c": ["A", "B"]}], "a": 20, "m": 9},
            "distance",
        )
        self.assertEqual(audit.untyped_fare_distance, ["A->B"])
        self.assertEqual(audit.missing_first_distance, ["A->B"])
        self.assertEqual(audit.platform_gap_distance, 1)

    def test_missing_fare_files_lists_route_without_fare(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            routes = root / "routes" / "least-distance" / "RI"
            fares = root / "fares" / "least-distance" / "RI"
            routes.mkdir(parents=True)
            fares.mkdir(parents=True)
            (routes / "KG.json").write_text("{}", encoding="utf-8")
            (routes / "RCK.json").write_text("{}", encoding="utf-8")
            (fares / "KG.json").write_text('{"weekday_fare":10,"weekend_fare":10}', encoding="utf-8")
            with mock.patch.object(audit_journeys, "DATA", root):
                missing = audit_journeys.missing_fare_files()
            self.assertEqual(missing, ["least-distance/RI/RCK"])


if __name__ == "__main__":
    unittest.main()
