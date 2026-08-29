#!/usr/bin/env python3
"""Stage 3 — Conform. Turn a raw generated candidate into a spec-exact,
engine-neutral canonical asset. Deterministic, idempotent, no AI.

Usage:
    python conform.py --asset arena-floor --manifest ../../art/manifest.json \
        --in ../../art/generated/arena-floor/0.png \
        --out ../../art/approved/arena-floor.png

Depends on Pillow (required) and, optionally, rembg (better bg-removal) and
numpy (palette/tiling math). Optional deps degrade gracefully.
"""
from __future__ import annotations
import argparse, json, os, sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install -r requirements.txt")

try:
    import numpy as np
except ImportError:
    np = None


def load_asset(manifest_path: str, asset_id: str) -> dict:
    m = json.loads(Path(manifest_path).read_text())
    for a in m["assets"]:
        if a["id"] == asset_id:
            return a
    raise SystemExit(f"asset '{asset_id}' not in manifest")


def load_palette(bible_path: str) -> list[tuple[int, int, int]]:
    bible = json.loads(Path(bible_path).read_text())
    out = []
    for hexv in bible.get("palette", {}).values():
        h = hexv.lstrip("#")
        out.append((int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)))
    return out


def remove_background(img: Image.Image) -> Image.Image:
    """rembg when available; otherwise knock out a near-uniform border colour."""
    try:
        from rembg import remove
        return remove(img)
    except Exception:
        img = img.convert("RGBA")
        if np is None:
            return img
        arr = np.array(img)
        # sample the four corners; treat pixels close to the dominant corner as bg
        corners = np.concatenate([arr[0, 0:1], arr[0, -1:], arr[-1, 0:1], arr[-1, -1:]])
        bg = corners[:, :3].mean(axis=0)
        dist = np.sqrt(((arr[:, :, :3].astype(int) - bg) ** 2).sum(axis=2))
        arr[dist < 24, 3] = 0
        return Image.fromarray(arr, "RGBA")


def trim_and_pad(img: Image.Image, w: int, h: int) -> Image.Image:
    img = img.convert("RGBA")
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    canvas = Image.new("RGBA", (img.width, img.height), (0, 0, 0, 0))
    canvas.paste(img, (0, 0))
    return canvas


def resize(img: Image.Image, w: int, h: int, pixel_art: bool) -> Image.Image:
    flt = Image.NEAREST if pixel_art else Image.LANCZOS
    return img.resize((w, h), flt)


def palette_snap(img: Image.Image, palette, tol: int = 999) -> Image.Image:
    if np is None or not palette:
        return img
    arr = np.array(img.convert("RGBA"))
    rgb = arr[:, :, :3].astype(int)
    pal = np.array(palette)
    # nearest palette colour per pixel
    d = np.sqrt(((rgb[:, :, None, :] - pal[None, None, :, :]) ** 2).sum(axis=3))
    idx = d.argmin(axis=2)
    nearest = pal[idx]
    within = d.min(axis=2) <= tol
    rgb[within] = nearest[within]
    arr[:, :, :3] = rgb
    return Image.fromarray(arr.astype("uint8"), "RGBA")


def make_seamless(img: Image.Image) -> Image.Image:
    """Offset by half, blend the seam so opposite edges match. The blend
    itself must not become a visible seam: taper it smoothly (raised-cosine)
    from full strength at the exact new seam down to zero at the band edge,
    rather than a flat-weight hard-edged stripe."""
    if np is None:
        return img
    arr = np.array(img.convert("RGBA")).astype(float)
    h, w = arr.shape[:2]
    rolled = np.roll(np.roll(arr, w // 2, axis=1), h // 2, axis=0)

    band = max(8, min(w, h) // 16)

    def taper(size: int, center: int, band: int) -> "np.ndarray":
        d = np.minimum(np.abs(np.arange(size) - center), band)
        return 0.5 * (1 + np.cos(np.pi * d / band))

    fx = taper(w, w // 2, band)
    fy = taper(h, h // 2, band)
    mask = np.maximum(fx[None, :], fy[:, None])[:, :, None]

    blended = arr * (1 - mask * 0.5) + rolled * (mask * 0.5)
    return Image.fromarray(blended.astype("uint8"), "RGBA")


def conform(asset: dict, in_path: str, out_path: str, bible_path: str) -> dict:
    spec = asset["spec"]
    w, h = spec["width"], spec["height"]
    img = Image.open(in_path).convert("RGBA")
    report = {"asset": asset["id"], "steps": []}

    if spec.get("transparent"):
        img = remove_background(img)
        img = trim_and_pad(img, w, h)
        report["steps"].append("bg_removed+trimmed")

    img = resize(img, w, h, spec.get("pixel_art", False))
    report["steps"].append(f"resized:{w}x{h}")

    if spec.get("palette_snap"):
        img = palette_snap(img, load_palette(bible_path))
        report["steps"].append("palette_snapped")

    if spec.get("tiling"):
        img = make_seamless(img)
        report["steps"].append("seamless")

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path)
    report["out"] = out_path
    return report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--asset", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--in", dest="in_path", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    asset = load_asset(args.manifest, args.asset)
    # style_bible is stored relative to the manifest file, so it resolves the
    # same no matter which directory the pipeline is invoked from.
    manifest = Path(args.manifest)
    bible = str(manifest.parent / json.loads(manifest.read_text())["style_bible"])
    report = conform(asset, args.in_path, args.out, bible)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
