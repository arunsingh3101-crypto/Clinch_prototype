#!/usr/bin/env python3
"""Unity adapter — the ONLY Unity-aware code in the pipeline.

Reads the canonical library and writes assets into a Unity-friendly folder with
an import-settings sidecar per asset (sprite mode, pivot, pixels-per-unit,
filter/compression) derived from the shared .meta.json. Point Unity at this
folder; a small editor script (or AssetPostprocessor) applies the sidecar so the
importer is deterministic and matches the Phaser prototype 1:1.

Usage:
    python unity.py --library ../../art/approved --dest ../../unity/Assets/Art
"""
from __future__ import annotations
import argparse, json, shutil
from pathlib import Path


def import_settings(meta: dict) -> dict:
    spec_pixel_art = meta.get("pixel_art", False)
    return {
        "textureType": "Sprite",
        "spriteMode": "Single",
        "pixelsPerUnit": meta.get("pixels_per_unit", 100),
        "pivot": meta.get("pivot", [0.5, 0.5]),
        "filterMode": "Point" if spec_pixel_art else "Bilinear",
        "compression": "None" if spec_pixel_art else "Normal",
        "alphaIsTransparency": meta.get("transparent", False),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--library", required=True)
    ap.add_argument("--dest", required=True)
    args = ap.parse_args()

    lib, dest = Path(args.library), Path(args.dest)
    dest.mkdir(parents=True, exist_ok=True)
    n = 0

    for png in sorted(lib.glob("*.png")):
        meta_path = png.with_suffix(".meta.json")
        meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
        shutil.copy2(png, dest / png.name)
        # ".import.json" sidecar consumed by an AssetPostprocessor on the Unity side
        (dest / f"{png.stem}.import.json").write_text(
            json.dumps(import_settings(meta), indent=2))
        n += 1

    print(f"unity: wrote {n} assets + import sidecars to {dest}")
    print("reminder: an AssetPostprocessor in the Unity project applies each *.import.json.")


if __name__ == "__main__":
    main()
