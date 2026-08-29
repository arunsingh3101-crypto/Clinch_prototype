#!/usr/bin/env python3
"""Phaser adapter — the ONLY Phaser-aware code in the pipeline.

Reads the canonical library (art/approved/<id>.png + <id>.meta.json) and copies
assets into the game's assets/ folder, emitting a Phaser atlas/manifest the game
can load. Pivot/scale come from the shared .meta.json so Phaser and Unity agree.

Usage:
    python phaser.py --library ../../art/approved --dest ../../assets
"""
from __future__ import annotations
import argparse, json, shutil
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--library", required=True)
    ap.add_argument("--dest", required=True)
    args = ap.parse_args()

    lib, dest = Path(args.library), Path(args.dest)
    dest.mkdir(parents=True, exist_ok=True)
    entries = []

    for png in sorted(lib.glob("*.png")):
        meta_path = png.with_suffix(".meta.json")
        meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
        shutil.copy2(png, dest / png.name)
        entries.append({
            "key": png.stem,
            "url": f"assets/{png.name}",
            "pivot": meta.get("pivot", [0.5, 0.5]),
            "frameWidth": meta.get("width"),
            "frameHeight": meta.get("height"),
        })

    (dest / "art-manifest.json").write_text(json.dumps({"assets": entries}, indent=2))
    print(f"phaser: wrote {len(entries)} assets + art-manifest.json to {dest}")
    print("reminder: run scripts/bump-cache-version.sh before pushing (?v= cache-bust).")


if __name__ == "__main__":
    main()
