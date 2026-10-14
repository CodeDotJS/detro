#!/usr/bin/env python3
"""Retry only missing new_fare_with_route files (local collector).

Uses the same Origin/Referer as the route download script. The app never calls this.

    python3 src/lib/offline/retry_missing_fares.py
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data" / "en"
BASE = "https://backend.delhimetrorail.com/api/v2"
MODES = ("least-distance", "minimum-interchange")


def main() -> int:
    from audit_journeys import missing_fare_files

    missing = missing_fare_files()
    if not missing:
        print("no missing fare files", flush=True)
        return 0
    print(f"retrying {len(missing)} fare files", flush=True)
    ok = skip = fail = 0
    for entry in missing:
        mode, origin, destination = entry.split("/", 2)
        rel = DATA / "fares" / mode / origin / f"{destination}.json"
        if rel.is_file() and rel.stat().st_size > 2:
            skip += 1
            continue
        api = f"en/new_fare_with_route/{origin}/{destination}/{mode}/"
        status, payload = fetch_json(api)
        if status == "200" and isinstance(payload, dict):
            rel.parent.mkdir(parents=True, exist_ok=True)
            temporary = rel.with_suffix(".json.partial")
            temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            temporary.replace(rel)
            ok += 1
            print(f"  ok {entry}", flush=True)
        else:
            fail += 1
            print(f"  {status} {entry}", flush=True)
            time.sleep(0.5)
    print(f"finished ok={ok} skip={skip} fail={fail}", flush=True)
    return 0 if fail == 0 else 1


def fetch_json(path: str) -> tuple[str, object | None]:
    url = f"{BASE}/{path}"
    proc = subprocess.run(
        [
            "curl",
            "-sS",
            "--max-time",
            "30",
            "-w",
            "\n%{http_code}",
            "-A",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
            "-H",
            "Accept: application/json",
            "-H",
            "Content-Type: application/json",
            "-H",
            "Origin: https://delhimetrorail.com",
            "-H",
            "Referer: https://delhimetrorail.com/",
            url,
        ],
        capture_output=True,
    )
    if proc.returncode != 0:
        return "error", None
    text = proc.stdout.decode("utf-8", errors="replace")
    if "\n" not in text:
        return "error", None
    body, status = text.rsplit("\n", 1)
    if status != "200":
        return status, None
    stripped = body.lstrip()
    if not stripped.startswith("{") and not stripped.startswith("["):
        return "html", None
    try:
        return "200", json.loads(body)
    except json.JSONDecodeError:
        return "json", None


if __name__ == "__main__":
    raise SystemExit(main())
