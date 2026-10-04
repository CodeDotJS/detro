#!/usr/bin/env python3
"""Save the metro-area street tiles into public/map-tiles."""

import hashlib
import json
import math
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "public" / "map-tiles"
COORDS = ROOT / "data" / "en" / "coordinates.json"
ZOOMS = (9, 10, 11, 12, 13, 14)
PAD = 0.08
WORKERS = 2
PAUSE = 0.2
AGENT = "DETRO/1.0 (offline Delhi Metro map; https://detro.pages.dev)"
BLOCKED = "b02c44252dac5a5e820ecef1e9bf9200e9407c042df668a466a1aa81a9ecca7a"


def main() -> None:
    tiles = tile_list()
    OUT.mkdir(parents=True, exist_ok=True)
    pending = [tile for tile in tiles if not saved(tile)]
    print(f"{len(tiles)} tiles, {len(pending)} to download", flush=True)
    done = len(tiles) - len(pending)
    failed = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = [pool.submit(fetch, tile) for tile in pending]
        for future in as_completed(futures):
            ok = future.result()
            if ok:
                done += 1
            else:
                failed += 1
            finished = done + failed - (len(tiles) - len(pending))
            if finished % 25 == 0 or finished == len(pending):
                print(f"{done} saved, {failed} failed, {len(tiles)} total", flush=True)
    print(f"finished {done} saved, {failed} failed", flush=True)


def tile_list() -> list[tuple[int, int, int]]:
    stations = json.loads(COORDS.read_text(encoding="utf-8"))["stations"]
    lats = [point["lat"] for point in stations.values()]
    lngs = [point["lng"] for point in stations.values()]
    south, north = min(lats) - PAD, max(lats) + PAD
    west, east = min(lngs) - PAD, max(lngs) + PAD
    tiles: list[tuple[int, int, int]] = []
    for zoom in ZOOMS:
        span = 2**zoom
        x0, x1 = lon_tile(west, span) - 1, lon_tile(east, span) + 1
        y0, y1 = lat_tile(north, span) - 1, lat_tile(south, span) + 1
        for x in range(x0, x1 + 1):
            for y in range(max(0, y0), y1 + 1):
                tiles.append((zoom, x, y))
    return tiles


def saved(tile: tuple[int, int, int]) -> bool:
    path = tile_path(tile)
    if not path.is_file() or path.stat().st_size <= 100:
        return False
    if hashlib.sha256(path.read_bytes()).hexdigest() == BLOCKED:
        return False
    return True


def fetch(tile: tuple[int, int, int]) -> bool:
    zoom, x, y = tile
    time.sleep(PAUSE)
    url = f"https://tile.openstreetmap.de/{zoom}/{x}/{y}.png"
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read()
            status = response.status
        if status != 200 or not body.startswith(b"\x89PNG"):
            return False
        if hashlib.sha256(body).hexdigest() == BLOCKED:
            return False
        path = tile_path(tile)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
        return True
    except Exception:
        return False


def tile_path(tile: tuple[int, int, int]) -> Path:
    zoom, x, y = tile
    return OUT / str(zoom) / str(x) / f"{y}.png"


def lon_tile(lng: float, span: int) -> int:
    return math.floor((lng + 180) / 360 * span)


def lat_tile(lat: float, span: int) -> int:
    rad = math.radians(lat)
    merc = math.log(math.tan(rad) + 1 / math.cos(rad))
    return math.floor((1 - merc / math.pi) / 2 * span)


if __name__ == "__main__":
    main()
