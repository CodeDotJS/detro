#!/usr/bin/env python3
"""Unit checks for journey packing helpers (no network)."""

from __future__ import annotations

import unittest

from build_journeys import clock, train_pair


class ClockTest(unittest.TestCase):
    def test_accepts_whole_seconds(self) -> None:
        self.assertEqual(clock("06:01:49"), "06:01:49")
        self.assertEqual(clock("23:59:59"), "23:59:59")

    def test_truncates_fractional_seconds(self) -> None:
        self.assertEqual(clock("06:22:07.500000"), "06:22:07")
        self.assertEqual(clock("06:30:15.5"), "06:30:15")

    def test_rejects_invalid(self) -> None:
        self.assertIsNone(clock(None))
        self.assertIsNone(clock(""))
        self.assertIsNone(clock("6:01:49"))
        self.assertIsNone(clock("06:61:00"))
        self.assertIsNone(clock("not-a-time"))


class TrainPairTest(unittest.TestCase):
    def test_first_train_with_fractional_arrive(self) -> None:
        payload = {
            "first_train": {
                "first_train_route_detail": [{"start_time": "06:01:49", "end_time": "06:22:07.500000"}],
                "endstation_from_first_train_estimated_time": "06:22:07.500000",
            }
        }
        self.assertEqual(
            train_pair(
                payload,
                "first_train",
                "first_train_route_detail",
                "endstation_from_first_train_estimated_time",
            ),
            ["06:01:49", "06:22:07"],
        )


if __name__ == "__main__":
    unittest.main()
