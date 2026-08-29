# RESUME — continue this work locally (temporary file)

> **This is a throwaway handoff note. Delete it once you've done a real Grok run
> locally and the pipeline is working** — `git rm art/pipeline/RESUME.md`.
> The lasting docs are [`docs/art-pipeline.md`](../../docs/art-pipeline.md) and
> the `art-director` skill; this file only exists to bridge the cloud→local jump.

## Why you're here

The pipeline was built in a **cloud** Claude Code session where the grok-image
MCP isn't reachable. The generator (stage 2) only works where the MCP is
connected — your PC. Everything else (conform, verify, adapters, docs, skill)
is done and pushed to branch
`claude/grok-image-generation-games-u8fq6h`.

You don't "resume the cloud conversation" — a web session isn't in your local
`claude --resume` history and won't appear there. You resume the **work**, which
lives in git. The `art-director` skill + `docs/art-pipeline.md` carry the full
context, so a fresh local Claude picks up exactly where this left off.

## Steps

1. **Get the branch**
   ```bash
   cd /path/to/Clinch_prototype
   git fetch origin claude/grok-image-generation-games-u8fq6h
   git checkout claude/grok-image-generation-games-u8fq6h
   git pull
   ```

2. **Install pipeline deps** (stages 3–4 are Python)
   ```bash
   pip install -r art/pipeline/requirements.txt   # add rembg for clean bg-removal
   ```

3. **Confirm the Grok MCP is connected in this repo**
   ```bash
   claude mcp list        # your grok-image server should show as connected
   ```

4. **Start Claude in the repo and hand it the context**
   ```bash
   claude
   ```
   Then paste:
   > Read `docs/art-pipeline.md` and the `art-director` skill. The grok-image
   > MCP is now connected locally. Wire the skill's stage-2 generate step to the
   > real Grok tool, then run `arena-floor` from `art/manifest.json` end-to-end
   > and stop at the verify verdict.

   The local Claude will see the Grok tool names (the cloud session couldn't) and
   fill in that one seam. `conform.py`, `verify.py`, and the adapters already run.

## Expect to tune

The conform defaults (background-removal threshold, seamless-blend band, palette
tolerance) were set against synthetic test images, not real Grok output. The
first real `arena-floor` generation is the tuning pass — adjust, re-run, then
this note has served its purpose. **Delete it.**
