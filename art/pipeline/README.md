# art/pipeline — the reusable spine

LLM-directed, engine-neutral 2D art pipeline. Full rationale:
[`docs/art-pipeline.md`](../../docs/art-pipeline.md).

**Reusable (copy between games, don't edit per game):** this folder.
**Per-game (author for each new game):** `../style-bible.json`, `../manifest.json`.

## The four stages

1. **Direct** — Claude (the `art-director` skill) reads the style bible + one
   manifest entry and builds a Grok prompt from `prompts/templates.md`.
2. **Generate** — Grok renders candidates into `../generated/<id>/`.
   *(The only model-specific step; isolated behind one seam.)*
3. **Conform** — `conform.py` makes it spec-exact (size, alpha, palette, tiling).
4. **Verify** — `verify.py` checks it and routes: `pass` / `conform-fix` /
   `regenerate` / `escalate`.

Approved assets land in `../approved/` as `<id>.png` + `<id>.meta.json`.
Adapters then emit engine files:

```
python adapters/phaser.py --library ../approved --dest ../../assets
python adapters/unity.py  --library ../approved --dest ../../unity/Assets/Art
```

## Setup

```bash
pip install -r requirements.txt   # add rembg for best background removal
```

## Run one asset by hand (stages 3–4)

```bash
python conform.py --asset arena-floor --manifest ../manifest.json \
    --in ../generated/arena-floor/0.png --out ../approved/arena-floor.png
python verify.py  --asset arena-floor --manifest ../manifest.json \
    --img ../approved/arena-floor.png            # add --visual-ok / --visual-bad
```

Stages 1–2 are driven by the `art-director` skill in-conversation (that's where
Grok is actually called); 3–4 are plain scripts you or the skill invoke.

## Adding a new game

1. Copy this `pipeline/` folder into the new game's repo.
2. Write `style-bible.json` (palette, resolution targets, style words, negatives).
3. Write `manifest.json` (the asset list).
4. Run the skill; assets flow into `approved/`; run the adapter for the target engine.
