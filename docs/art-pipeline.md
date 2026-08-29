# Art Pipeline — a reusable LLM-directed asset pipeline for 2D games

This document formalises how we produce final 2D art with an LLM sitting as
**art director** on top of an image generator (Grok today, swappable). It is
written to be reused **game after game**: only two per-game inputs change (a
*style bible* and an *asset manifest*); every stage, script, and convention
below stays identical.

It is deliberately **engine-neutral**. Our standard flow is *quick Phaser
prototype → full game in Unity → next game*. If the pipeline emitted
Phaser-shaped assets it would be thrown away at the Unity step every time. So
the pipeline produces a **canonical asset library** (PNG + sidecar metadata),
and thin per-engine **adapters** translate that library into what Phaser or
Unity actually import. Nothing above the adapter layer knows or cares which
engine consumes the art.

---

## 1. The one rule

> **Produce canonical, engine-neutral assets. Engines are adapters, not the target.**

Concretely, the pipeline's output for every asset is a pair:

```
art/approved/<asset-id>.png          # the pixels, at final spec
art/approved/<asset-id>.meta.json    # pivot, pixels-per-unit, bounds, tags, provenance
```

Both Phaser and Unity read pivot/scale from the **same** `.meta.json`, so a
sprite lands identically in both engines. The Phaser→Unity migration inside a
single game becomes "run the Unity adapter over the library you already have",
not "remake the art".

---

## 2. What is reusable vs. per-game

**Reusable spine (never changes between games)** — lives in `art/pipeline/`:

- `schema/manifest.schema.json` — the manifest contract
- `prompts/templates.md` — the prompt-template library, per asset class
- `conform.py` — deterministic post-processing (stage 3)
- `verify.py` — automated QA + the routing decision (stage 4)
- `adapters/phaser.py`, `adapters/unity.py` — engine integration
- `.claude/skills/art-director/SKILL.md` — the orchestration skill (stage 1)

**Per-game inputs (the only things you author for a new game):**

- `art/style-bible.json` — palette, resolution targets, style words, camera,
  negative list. The single source of visual coherence.
- `art/manifest.json` — the list of assets this game needs, each with a spec
  and a semantic intent.

To start a new game: copy `art/pipeline/`, write a new `style-bible.json` and
`manifest.json`, run the pipeline. That is the whole reuse story.

---

## 3. The four stages

Every asset flows through the same four stages, all keyed off its manifest entry.

### Stage 1 — Direct (Claude as art director)

Input: the game's `style-bible.json` + one manifest entry.
Output: a fully-formed generation prompt (positive + negative + params).

Claude injects the **style-bible preamble into every prompt** — this is the
single biggest lever for making a *set* of assets cohere, and it is why a human
eyeballing prompts one at a time drifts and the pipeline does not. The prompt is
assembled from the templates in `prompts/templates.md` for the asset's `class`
(sprite / tileset / background / ui / icon / keyart), with the manifest entry's
`intent` filling the subject slot.

### Stage 2 — Generate (Grok)

Input: the stage-1 prompt + params (`size`, `seed`, `n`).
Output: one or more raw candidates in `art/generated/<asset-id>/`.

This is the **only** stage bound to a specific image model. It is isolated
behind a single seam (`generate()` in the orchestrator) so Grok can be replaced
without touching stages 1, 3, or 4. Params that matter for consistency:
- **seed** — lock per asset-family so variants stay on-style.
- **size** — always generate at ≥2× the target and downscale in stage 3;
  small game assets come out crisper this way.
- reference-image conditioning — use where the generator supports it, to pin a
  family (e.g. all five enemy variants) to one look.

### Stage 3 — Conform (deterministic, `conform.py`)

No AI. Idempotent. Turns a raw candidate into a spec-exact canonical asset:

1. **Background removal / alpha** — `rembg` when available, else chroma/flood
   knock-out; verify a real alpha channel exists where the spec requires it.
2. **Trim + pad** — crop to the opaque bounding box, then pad to the target
   canvas so the pivot is stable.
3. **Resize** — to the manifest's exact `width`×`height`. Nearest-neighbour for
   pixel-art assets, Lanczos otherwise.
4. **Palette snap** — map each pixel to the nearest style-bible hex within a
   tolerance, so generated art respects our load-bearing colour coding
   (in Clinch, enemy *type* is read by colour). Optional per asset.
5. **Seamless-tile fix** — for `tileset`/tiling `background`, offset-and-blend
   edges so the asset wraps.
6. **Atlas pack** — optional grouping of many small sprites into one sheet.

Output: `art/approved/<asset-id>.png` (candidate) + a conform report.

### Stage 4 — Verify (gate + router, `verify.py`)

Automated checks against the manifest's acceptance criteria:
- dimensions exact
- alpha present where required
- palette adherence ≥ threshold (mean ΔE to nearest bible colour)
- seamless-tile score ≥ threshold (opposite-edge difference)
- plus an **LLM visual check**: "is this actually `<intent>` and on-style?"
  (semantic correctness a pixel check can't catch)

Then it **routes** — the formal version of "auto-edit vs. unusable":

| Verdict | Cause | Action |
|---|---|---|
| **pass** | all checks green | promote to library, run adapters |
| **conform-fix** | dims/palette/alpha/tiling off, subject correct | re-run stage 3 with adjusted params — no regen |
| **regenerate** | wrong subject / off-style (semantic) | re-run stage 2, optionally with a Claude-revised prompt; ≤ `max_attempts` |
| **escalate** | still failing after `max_attempts` | stop, report to human with the candidates and the failing checks |

---

## 4. How the earlier shortcomings are addressed

| Shortcoming of raw image-gen | Where it's handled |
|---|---|
| Inconsistency across a set | style-bible preamble in every prompt (S1) + seed/reference locking per family (S2) |
| Non-seamless tiles | seamless-tile fix (S3) + tiling score gate (S4) |
| Wrong dimensions / pivots | resize to spec + trim/pad (S3); pivot/ppu in `.meta.json` |
| Missing transparency | bg-removal + alpha verify (S3/S4) |
| Palette drift | palette-snap to bible hexes (S3) + palette-ΔE gate (S4) |
| "Looks wrong" (semantic) | LLM visual check + regenerate route (S4) |

---

## 5. Engine adapters

Adapters are the **only** engine-aware code. They read the canonical library +
`.meta.json` and emit engine-native artifacts:

- **`adapters/phaser.py`** → copies PNGs into `assets/`, emits atlas JSON, and
  applies the repo's `?v=` cache-bust convention (see `scripts/bump-cache-version.sh`).
- **`adapters/unity.py`** → writes assets into a Unity-friendly folder with an
  import-settings sidecar (sprite mode, pivot, pixels-per-unit, filter/compression)
  derived from `.meta.json`, so Unity's importer is deterministic and matches
  the Phaser prototype 1:1.

Adding a third engine later = one more adapter; the library and every upstream
stage are untouched.

---

## 6. Provenance & reproducibility

Every approved asset's `.meta.json` records the prompt, model, seed, params,
conform settings, and pipeline version that produced it. Regenerating an asset
on-style later (or explaining why two assets match) is then deterministic rather
than folklore. Approved assets are versioned in git alongside the code.

---

## 7. Where this lives now

Per the decision to prove it on Clinch first, the spine lives in this repo under
`art/pipeline/`. Once it has produced a real Clinch asset set end-to-end, lift
`art/pipeline/` + the `art-director` skill into a standalone repo/skill and have
each game depend on it — the per-game `style-bible.json` + `manifest.json`
contract means nothing about the games changes when it moves.
