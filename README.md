# Clinch — Prototype

A browser-based prototype of **Clinch**: you leave a solid, decaying trail as
you move; closing that trail into a loop around enemies instantly kills
everything inside it. No gun — the path *is* the weapon. Full design spec:
[`docs/design-spec.md`](docs/design-spec.md). Art pipeline:
[`docs/art-pipeline.md`](docs/art-pipeline.md).

The current title screen still says "Cinch" — a leftover name, not a second title.

Built with [Phaser 3](https://phaser.io) (vendored locally, no build step,
no external CDN dependency) so it runs as plain static files — easy to host
on GitHub Pages and test on a phone.

## Play it on your phone (GitHub Pages)

GitHub Pages is already configured (**Settings → Pages → Source: Deploy from
a branch → `main` → `/ (root)`**) — no setup needed. GitHub gives you a URL
like `https://<user>.github.io/<repo>/`. Open it on your phone (rotate to
landscape for the best fit) and play. Every push to `main` redeploys
automatically within a minute or two — just reload.

Every internal script/import URL carries a `?v=...` cache-busting suffix
(same value everywhere). GitHub Pages doesn't hash filenames on deploy, so
without this a phone browser can end up with a torn mix of old and new
cached files across visits — one stale, one fresh — which breaks in
confusing ways. Run `./scripts/bump-cache-version.sh` before pushing any
change to `src/` or `index.html` so the whole module graph refetches
together; if a page ever fails right after a fresh deploy, this is the
first thing to check.

That `?v=` bump only helps once a fresh copy of `index.html` itself has been
fetched — but `index.html` is a plain unversioned URL, and mobile browsers
(Android Chrome especially) can keep serving a stale cached copy of it even
on a manual pull-to-refresh, with no hard-refresh gesture available to force
the issue. `index.html` carries a small inline script for this: on every
load it fetches `version.json` with the HTTP cache forced off and compares
it to the version embedded in the page; on a mismatch it reloads via a
never-before-seen `?v=...` URL, which the cache can't have an entry for.
This runs even from a stale cached copy of `index.html`, since the check
itself doesn't change across versions — so a phone that's stuck on an old
copy self-heals on its next load rather than needing to be told to hard
refresh. `scripts/bump-cache-version.sh` keeps `version.json` and the
embedded version in sync automatically; no separate step needed.

## Run it locally

No build step — any static file server works:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Start screen

Before the game boots you get an options screen (`src/menu.js`) to fine-tune
a run without editing code:

- **God mode** — take no damage, for isolating movement/trail testing from combat.
- **Enemy spawning** — turn off for an empty arena, just you and the trail.
- Sliders for player speed, trail lifetime, minimum loop area, player
  health, and enemy speed (a subset of the Part 11 tuning knobs). The enemy
  speed slider sets Chaser, Dormant, and Fleer speed together.
- **Enemy type toggles** — Chaser, Shooter, Cutter, Dormant, Fleer. Uncheck a
  type to exclude it; if only one type is left checked it spawns immediately
  rather than waiting for its normal wave phase, so you can isolate one
  enemy to test.
- **Cutter targeting mode** — playtest leftover. The locked design rule
  (Part 7) is **nearest to the player** (the live line). The other two
  modes (nearest to the cutter, middle of trail) remain on the start screen
  so you can compare against the superseded tail-chasing phrasing; they are
  not knobs in the spec.

Hit **Start** to apply your settings and launch. To change them again,
reload the page (settings aren't editable mid-run).

## Controls

- **Touch:** drag anywhere on screen — a virtual joystick appears under your
  finger; the direction you drag is the direction you move. There's a small
  dead zone near your touch point and the direction eases in smoothly, so
  minor thumb tremor doesn't register as movement.
- **Desktop:** WASD or arrow keys.
- Tap/click anywhere to restart after death.
- **Pause button** (gameplay screen) opens a Resume / Return to Configuration
  overlay — timers freeze while paused. Returning to configuration tears
  down the run so Start spins up a fresh one.

## What's implemented (prototype scope — design doc Parts 1–10)

- Player movement with a trail that grows at the head and decays at the tail
  (default 6s lifetime) — standing still lets your weapon dissolve.
- Trail is solid to enemies and their projectiles, passable to the player.
- Closing a loop (trail head crossing the player's own live trail) kills
  every enemy whose center lies inside the enclosed polygon, then resets the
  whole trail. Loops below a minimum area are inert no-ops.
- Five enemies, each with a distinct trail relationship (design spec Part 7):
  **Chaser** (pure pursuit, blocked by the trail), **Shooter** (fires
  trail-blockable projectiles), **Cutter** (passes through the trail, severs
  it from the cut back to the tail, seeks the live line nearest the player,
  deals no contact damage), **Dormant** (inert ambusher — only closes in
  while the player is within its activation band), **Fleer** (always flees
  the player; gets trapped once cornered).
- Superlinear (quadratic) scoring by enemies-caught-per-loop, plus a combo
  multiplier for fast consecutive *qualifying* loops (empty fired loops
  reset the trail but do not raise combo).
- Phased, pulsed wave spawning that escalates over ~10 minutes. Part 9 now
  gives Dormant and Fleer their own teaching beats (6–8 min / 8 min+); the
  current spawner still folds them into the 4 min+ mix — a known gap against
  the spec.
- Health, hit invulnerability window, game-over screen with kill count and
  best combo, restart.
- In-game pause (Resume / Return to Configuration) via native Phaser scene
  pause/resume.

Part 11 tuning knobs live in one place: `src/config.js`. Part 12 (stealth,
capture, upgrades, alternate close mechanics) is intentionally not built —
see the design doc.

## Project structure

```
index.html              entry point + start-screen markup, self-healing version check
version.json             deployed-version marker, read by index.html's version check
vendor/phaser.min.js     vendored Phaser 3 build (no CDN dependency)
src/menu.js              wires the start screen to CONFIG, then boots the game
src/main.js              exports startGame() — builds the Phaser.Game instance
src/config.js            all tuning knobs (Part 11) + debug overrides (god mode, spawning)
src/utils/geometry.js    segment intersection, polygon area, point-in-polygon
src/entities/            Player, Trail (the core verb), Projectile
src/entities/enemies/    Chaser, Shooter, Cutter, Dormant, Fleer
src/systems/             VirtualJoystick, Spawner (waves), ScoreManager
src/scenes/GameScene.js  ties it all together — the main update loop
```

## Known simplifications (fine for a prototype, worth knowing about)

- Enemy "pathing around" the trail is a simple wall-slide steering behavior,
  not real pathfinding — good enough to read as "blocked by the trail" but
  not a nav-mesh.
- Rendering is flat-colored rectangles ("cubes"/squares) and circles, exactly
  per the spec's brief ("nothing but cubes and placeholder art"). A few
  pipeline assets exist in `art/approved/` but are not loaded by the game.
