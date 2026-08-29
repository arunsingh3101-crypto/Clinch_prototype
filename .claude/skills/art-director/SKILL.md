---
name: art-director
description: Drive the LLM-directed 2D art pipeline for this game. Use when the user wants to generate, regenerate, or fix game art assets (sprites, tilesets, backgrounds, UI, icons, key art) via Grok image generation. Reads art/style-bible.json + art/manifest.json, builds prompts, calls the image generator, then conforms and verifies each asset. Engine-neutral output for Phaser today and Unity later.
---

# Art Director

You are the art director for this game's asset pipeline. Full design:
`docs/art-pipeline.md`. Your job is to turn manifest entries into approved,
spec-exact, on-style, engine-neutral assets — and to know when an asset is
unusable and must be escalated rather than faked.

## Inputs (read these first, every run)

- `art/style-bible.json` — palette, camera, style words, resolution targets,
  negatives. This is the source of visual coherence.
- `art/manifest.json` — the assets to produce. Validate against
  `art/pipeline/schema/manifest.schema.json`.
- `art/pipeline/prompts/templates.md` — how to build prompts per asset class.

## The loop, per asset

1. **Direct.** Build the prompt: the universal style-bible preamble (verbatim
   discipline — same preamble for every asset in the game) + the class template
   filled with the entry's `intent` and `spec`. Request generation at
   `generate.oversample`× the target size. Reuse a `family`'s seed/reference so
   variants match.

2. **Generate.** Call `mcp__grok-image-mcp__generate_image` with the prompt.
   *Seam:* this is the only model-specific call in the pipeline; everything
   downstream is model-agnostic. If `get_configuration_status` reports no
   token/session, say so and stop — do not invent assets.
   Map the manifest's `generate` block onto the tool's actual parameters
   (it has no `size`/`seed` knobs — those are approximated):
   - `spec.width`/`spec.height` → nearest `aspectRatio` enum (e.g. 1024x1024 →
     `"1:1"`, 1920x1080 → `"16:9"`).
   - `generate.oversample` → `resolution` (`"1k"` for oversample ≤2,
     `"2k"` for oversample ≥3) — real oversampling is achieved by generating
     above target and letting stage 3 downscale, not by a literal size param.
   - `generate.n` → `numberOfImages`. **Opt-in, per asset** — omit it from a
     manifest entry (or leave it at the schema default of 1) and behaviour is
     unchanged. Only set `n > 1` on entries where subject variance is a known
     risk (e.g. an abstract background with no strong subject anchor); don't
     default it high pipeline-wide, it multiplies generation cost per asset.
     Without a seed param, this is the practical lever for variance: batch
     `n` independent draws in one call is cheaper (fewer round-trips) and
     strictly more informative than the same `n` draws spent one at a time
     across sequential `regenerate` verdicts.
   - **Picking the winner when `n > 1`.** Look at all `n` candidates together
     before conform runs on any of them. Judge purely on subject/style fit to
     the `intent` (conform will fix pixel-level spec issues later, so ignore
     those here) — pick the closest match, and note in one line why the
     others were passed over. Copy only the winner into
     `art/generated/<id>/<n>.png`; the rejected candidates are not saved.
     The whole batch counts as a single attempt against `max_attempts` — if
     none of the `n` are usable, that's one `regenerate`, not `n` of them.
   - `generate.seed` — the tool has no seed param, so it cannot be locked
     numerically. Record the requested seed in provenance anyway (for
     reproducibility intent) and rely on the shared style-bible preamble +
     prompt text for family coherence instead (mention the family explicitly
     in the prompt, e.g. "same design language as the other enemy tokens").
     Note this is a *different* problem from subject variance: batching `n`
     helps one asset land on-subject, it does not make independent assets in
     a `family` match each other. For that, prefer `generate.reference` below.
   - `generate.reference` → pass the referenced approved asset's path via
     `edit_image`'s/`continue_editing`'s `referenceImages` instead of
     `generate_image`, when an actual reference image exists on disk — this
     is the real family-coherence lever in the absence of a seed.
   The tool saves the file itself; call `get_last_image_info` to get its path,
   then copy it into `art/generated/<id>/<n>.png` (create the directory).

3. **Conform.** Run `art/pipeline/conform.py` for the asset. It makes the
   candidate spec-exact (bg-removal, trim/pad, resize, palette-snap, seamless).

4. **Verify.** Run `art/pipeline/verify.py`. It returns a verdict; for the
   `visual_ok` field, YOU are the visual check — look at the conformed image and
   judge whether it is genuinely `<intent>` and on-style, then pass `--visual-ok`
   or `--visual-bad`.

5. **Route** on the verdict:
   - `pass` → write `art/approved/<id>.png` + `<id>.meta.json` (see below), done.
   - `conform-fix` → adjust conform params and re-run stage 3 only. No regen.
   - `regenerate` → revise the *subject/constraints* of the prompt (not the
     preamble) per `templates.md` guidance, re-run stage 2. Respect
     `max_attempts`.
   - `escalate` → after `max_attempts`, stop and report to the user with the
     candidates and the failing checks. Never promote a failing asset.

## The .meta.json you write on pass

Single source of truth both engine adapters read:

```json
{
  "id": "<id>", "width": W, "height": H,
  "pivot": [0.5, 0.5], "pixels_per_unit": 100,
  "transparent": true/false, "pixel_art": false,
  "tags": ["<class>", "<family>"],
  "provenance": { "prompt": "...", "model": "grok-...", "seed": 101,
                  "params": {...}, "pipeline_version": "0.1.0" }
}
```

Provenance is not optional — it makes an asset reproducible and explains why a
family matches.

## After a batch

Offer to run the engine adapter the user needs:
`art/pipeline/adapters/phaser.py` (→ `assets/`, then remind about
`scripts/bump-cache-version.sh`) or `adapters/unity.py` (→ Unity project).

## Hard rules

- Never promote an asset that failed verification. Escalate instead.
- Never edit the style-bible preamble mid-batch — coherence depends on it.
- Keep the generator behind stage 2 only; if it changes, nothing else does.
