#!/usr/bin/env python3
"""Stage 4 — Verify + route. Check a conformed candidate against the manifest's
acceptance criteria and decide what happens next.

Emits one of four verdicts:
    pass         -> promote to the library, run adapters
    conform-fix  -> subject is right, but dims/palette/alpha/tiling off; re-run stage 3
    regenerate   -> wrong subject / off-style; re-run stage 2 (optionally revised prompt)
    escalate     -> still failing; hand to a human

The pixel checks live here. The *semantic* check ("is this actually a top-down
arena floor?") is an LLM call the orchestrator makes; pass its boolean in via
--visual-ok / --visual-bad so this stays a pure, testable function.

Usage:
    python verify.py --asset arena-floor --manifest ../../art/manifest.json \
        --img ../../art/approved/arena-floor.png [--visual-ok|--visual-bad]
"""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install -r requirements.txt")

try:
    import numpy as np
except ImportError:
    np = None

DEFAULTS = {"palette_delta_e_max": 12, "tiling_edge_diff_max": 8}


def load(manifest_path, asset_id):
    mp = Path(manifest_path)
    m = json.loads(mp.read_text())
    # style_bible is stored relative to the manifest file (see conform.py).
    bible = str(mp.parent / m["style_bible"])
    for a in m["assets"]:
        if a["id"] == asset_id:
            return a, bible
    raise SystemExit(f"asset '{asset_id}' not in manifest")


def palette(bible_path):
    b = json.loads(Path(bible_path).read_text())
    out = []
    for hexv in b.get("palette", {}).values():
        h = hexv.lstrip("#")
        out.append((int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)))
    return out


def check_dims(img, spec):
    return img.width == spec["width"] and img.height == spec["height"]


def check_alpha(img):
    if img.mode != "RGBA":
        return False
    if np is None:
        return True
    return bool((np.array(img)[:, :, 3] < 255).any())


def palette_delta(img, pal):
    """Mean distance from each pixel to its nearest palette colour (lower = better)."""
    if np is None or not pal:
        return 0.0
    arr = np.array(img.convert("RGB")).astype(int).reshape(-1, 3)
    p = np.array(pal)
    d = np.sqrt(((arr[:, None, :] - p[None, :, :]) ** 2).sum(axis=2)).min(axis=1)
    return float(d.mean())


def tiling_edge_diff(img):
    """Mean difference between opposite edges (lower = more seamless)."""
    if np is None:
        return 0.0
    a = np.array(img.convert("RGB")).astype(int)
    lr = abs(a[:, 0, :] - a[:, -1, :]).mean()
    tb = abs(a[0, :, :] - a[-1, :, :]).mean()
    return float((lr + tb) / 2)


def verify(asset, bible_path, img_path, visual_ok):
    spec = asset["spec"]
    accept = {**DEFAULTS, **asset.get("accept", {})}
    img = Image.open(img_path)
    checks, fixable, semantic = {}, [], []

    checks["dims"] = check_dims(img, spec)
    if not checks["dims"]:
        fixable.append("dims")

    if spec.get("transparent") or accept.get("require_alpha"):
        checks["alpha"] = check_alpha(img)
        if not checks["alpha"]:
            fixable.append("alpha")

    if spec.get("palette_snap"):
        d = palette_delta(img, palette(bible_path))
        checks["palette_delta_e"] = round(d, 2)
        if d > accept["palette_delta_e_max"]:
            fixable.append("palette")

    if spec.get("tiling"):
        t = tiling_edge_diff(img)
        checks["tiling_edge_diff"] = round(t, 2)
        if t > accept["tiling_edge_diff_max"]:
            fixable.append("tiling")

    if accept.get("visual_check", True):
        checks["visual_ok"] = visual_ok
        if visual_ok is False:
            semantic.append("visual")

    # routing: semantic failure dominates (conforming won't fix wrong subject)
    if semantic:
        verdict = "regenerate"
    elif fixable:
        verdict = "conform-fix"
    elif visual_ok is None and accept.get("visual_check", True):
        verdict = "needs-visual-check"
    else:
        verdict = "pass"

    return {"asset": asset["id"], "verdict": verdict, "checks": checks,
            "fixable": fixable, "semantic": semantic}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--asset", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--img", required=True)
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--visual-ok", dest="visual", action="store_true", default=None)
    g.add_argument("--visual-bad", dest="visual", action="store_false")
    args = ap.parse_args()
    asset, bible = load(args.manifest, args.asset)
    print(json.dumps(verify(asset, bible, args.img, args.visual), indent=2))


if __name__ == "__main__":
    main()
