#!/usr/bin/env python3
"""Unit checks for status bake equality (no network)."""

from __future__ import annotations

import unittest

from build_status import normalize_service, normalize_status


class NormalizeStatusTest(unittest.TestCase):
    def test_service_fetch_clock_alone_is_equal(self) -> None:
        previous = {
            "fetchedAt": "2026-10-12T23:23:29.000",
            "stations": {},
            "serviceUpdate": {
                "title": "SERVICE UPDATE",
                "text": "Gates note",
                "dated": "12.10.2026",
                "fetchedAt": "2026-10-12T23:23:29.000",
            },
        }
        current = {
            "fetchedAt": "2026-10-12T23:23:29.000",
            "stations": {},
            "serviceUpdate": {
                "title": "SERVICE UPDATE",
                "text": "Gates note",
                "dated": "12.10.2026",
                "fetchedAt": "2026-10-13T09:23:44.000",
            },
        }
        self.assertEqual(normalize_status(previous), normalize_status(current))
        self.assertEqual(
            normalize_service(previous["serviceUpdate"]),
            normalize_service(current["serviceUpdate"]),
        )

    def test_service_text_change_differs(self) -> None:
        previous = {
            "stations": {},
            "serviceUpdate": {
                "title": "SERVICE UPDATE",
                "text": "Old",
                "dated": "12.10.2026",
                "fetchedAt": "2026-10-12T23:23:29.000",
            },
        }
        current = {
            "stations": {},
            "serviceUpdate": {
                "title": "SERVICE UPDATE",
                "text": "New",
                "dated": "12.10.2026",
                "fetchedAt": "2026-10-13T09:23:44.000",
            },
        }
        self.assertNotEqual(normalize_status(previous), normalize_status(current))

    def test_closed_map_change_differs(self) -> None:
        previous = {"stations": {}, "serviceUpdate": None}
        current = {
            "stations": {"AIIMS": {"phrase": "Station Closed", "lineCodes": ["LN2"]}},
            "serviceUpdate": None,
        }
        self.assertNotEqual(normalize_status(previous), normalize_status(current))


if __name__ == "__main__":
    unittest.main()
