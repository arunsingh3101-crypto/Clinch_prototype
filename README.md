# Cinch — Prototype

A browser-based prototype of **Cinch**: you leave a solid, decaying trail as
you move; closing that trail into a loop around enemies instantly kills
everything inside it. No gun — the path *is* the weapon. Full design spec:
[`docs/design-spec.md`](docs/design-spec.md).

Built with [Phaser 3](https://phaser.io) (vendored locally, no build step,
no external CDN dependency) so it runs as plain static files — easy to host
on GitHub Pages and test on a phone.

## Play it on your phone (GitHub Pages)

1. In this repo on GitHub: **Settings → Pages**.
2. Under "Build and deployment", set **Source: Deploy from a branch**.
3. Branch: pick this branch (or `main` once merged) → folder `/ (root)` → **Save**.
4. GitHub gives you a URL like `https://<user>.github.io/<repo>/`. Open it on
   your phone (rotate to landscape for the best fit) and play. Every push to
   that branch redeploys automatically within a minute or two — just reload.

## Run it locally

No build step — any static file server works:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Controls

- **Touch:** drag anywhere on screen — a virtual joystick appears under your
  finger; the direction you drag is the direction you move.
- **Desktop:** WASD or arrow keys.
- Tap/click anywhere to restart after death.

## What's implemented (prototype scope — design doc Parts 1–10)

- Player movement with a trail that grows at the head and decays at the tail
  (default 6s lifetime) — standing still lets your weapon dissolve.
- Trail is solid to enemies and their projectiles, passable to the player.
- Closing a loop (trail head crossing the player's own live trail) kills
  every enemy whose center lies inside the enclosed polygon, then resets the
  whole trail. Loops below a minimum area are inert no-ops.
- Three enemies, each with a distinct trail relationship: **Chaser** (pure
  pursuit, blocked by the trail), **Shooter** (fires trail-blockable
  projectiles), **Cutter** (passes through the trail and severs it from the
  crossing point back to the tail).
- Superlinear (quadratic) scoring by enemies-caught-per-loop, plus a combo
  multiplier for fast consecutive loops.
- Phased, pulsed wave spawning that escalates over ~10 minutes, per Part 9.
- Health, hit invulnerability window, game-over screen with kill count and
  best combo, restart.

Part 11 tuning knobs live in one place: `src/config.js`. Part 12 (stealth,
capture, upgrades, alternate close mechanics) is intentionally not built —
see the design doc.

## Project structure

```
index.html              entry point, mobile viewport/meta setup
vendor/phaser.min.js     vendored Phaser 3 build (no CDN dependency)
src/config.js            all tuning knobs (Part 11)
src/utils/geometry.js    segment intersection, polygon area, point-in-polygon
src/entities/            Player, Trail (the core verb), Projectile
src/entities/enemies/    Chaser, Shooter, Cutter
src/systems/             VirtualJoystick, Spawner (waves), ScoreManager
src/scenes/GameScene.js  ties it all together — the main update loop
```

## Known simplifications (fine for a prototype, worth knowing about)

- Enemy "pathing around" the trail is a simple wall-slide steering behavior,
  not real pathfinding — good enough to read as "blocked by the trail" but
  not a nav-mesh.
- Rendering is flat-colored rectangles ("cubes"/squares) and circles, exactly
  per the spec's brief ("nothing but cubes and placeholder art").
