# Summit — Design

A small precision platformer in the spirit of classic mountain-climbing
platformers. All art is drawn procedurally at runtime and all names are original.

## World scale

| Item | Value |
|---|---|
| Tile size | 16 × 16 px |
| Room size | 40 × 22 tiles (640 × 352 px), one screen |
| Internal resolution | 640 × 352, pixel-art, integer-snapped positions, scaled to fit |
| Player hitbox | 12 × 20 px (drawn as a 16 × 24 sprite) |
| Simulation | Fixed timestep, 60 Hz (`dt = 1/60`), accumulator, max 5 steps per frame |
| Positions | Integer pixels + sub-pixel remainder; movement is resolved one pixel at a time against solids |

The constants are the classic 8-px-tile platformer values scaled ×2 for
16-px tiles (distances, speeds and accelerations ×2; times unchanged).

## Movement constants (`src/config.js`, all px and seconds)

### Running
| Constant | Value | Notes |
|---|---|---|
| `MAX_RUN` | 180 px/s | top ground speed |
| `RUN_ACCEL` | 2000 px/s² | toward target speed |
| `RUN_REDUCE` | 800 px/s² | when above max speed in the held direction |
| `AIR_MULT` | 0.65 | multiplier on accel/reduce while airborne |

### Gravity and jumping
| Constant | Value | Notes |
|---|---|---|
| `GRAVITY` | 1800 px/s² | |
| `HALF_GRAV_THRESHOLD` | 80 px/s | gravity halved near the apex while jump is held |
| `MAX_FALL` | 320 px/s | |
| `FAST_MAX_FALL` | 480 px/s | holding down |
| `FAST_FALL_ACCEL` | 600 px/s² | how fast max-fall rises to fast-fall |
| `JUMP_SPEED` | 210 px/s (up) | |
| `JUMP_H_BOOST` | 80 px/s | added horizontally in the held direction |
| `VAR_JUMP_TIME` | 0.20 s | upward speed held while jump stays pressed; release cuts it |
| `COYOTE_TIME` | 0.10 s | jump after leaving a ledge |
| `JUMP_BUFFER` | 0.10 s | jump pressed before landing still fires |

Full jump ≈ 56 px (3.5 tiles); a one-frame tap ≈ 15 px.

### Walls
| Constant | Value | Notes |
|---|---|---|
| `WALL_JUMP_CHECK_DIST` | 6 px | how close a wall must be to wall-jump |
| `WALL_JUMP_H_SPEED` | 260 px/s | `MAX_RUN + JUMP_H_BOOST` |
| `WALL_JUMP_FORCE_TIME` | 0.16 s | horizontal input locked away from wall (only if a direction was held) |
| `WALL_SLIDE_START_MAX` | 40 px/s | max fall at the start of a wall slide (pushing into wall) |
| `WALL_SLIDE_TIME` | 1.2 s | slide max-fall eases back to `MAX_FALL` over this time |

A **neutral wall jump** (no direction held) kicks away at full speed but
without the input lock, so the player can steer straight back to the wall.

### Climbing / stamina
| Constant | Value | Notes |
|---|---|---|
| `CLIMB_MAX_STAMINA` | 110 | refills on the ground |
| `CLIMB_UP_COST` | 45.45 /s | ≈ 2.4 s of climbing up |
| `CLIMB_STILL_COST` | 10 /s | 11 s of hanging |
| `CLIMB_JUMP_COST` | 27.5 | per climb-jump (straight up while grabbing) |
| `CLIMB_TIRED_THRESHOLD` | 20 | stamina bar flashes below this |
| `CLIMB_UP_SPEED` | 90 px/s | |
| `CLIMB_DOWN_SPEED` | 160 px/s | |
| `CLIMB_SLIP_SPEED` | 60 px/s | slow slide when stamina is empty |
| `CLIMB_ACCEL` | 1800 px/s² | |
| `CLIMB_GRAB_Y_MULT` | 0.2 | vertical speed kept when grabbing |
| `CLIMB_CHECK_DIST` | 4 px | how close a wall must be to grab |
| `CLIMB_HOP_X` / `CLIMB_HOP_Y` | 200 / 240 px/s | hop over a ledge when climbing past its top |
| `CLIMB_HOP_FORCE_TIME` | 0.2 s | |

Climb-jump with the direction held **away** from the wall turns into a
normal wall jump (no stamina cost).

### Dash
| Constant | Value | Notes |
|---|---|---|
| `DASH_SPEED` | 480 px/s | 8 directions, diagonals normalised |
| `DASH_TIME` | 0.15 s | ≈ 72 px (4.5 tiles) |
| `DASH_FREEZE` | 0.05 s | freeze-frame when the dash starts |
| `END_DASH_SPEED` | 320 px/s | momentum carried after a horizontal/upward dash |
| `END_DASH_UP_MULT` | 0.75 | extra damping on upward exit speed |
| `DASH_COOLDOWN` | 0.20 s | between dashes |
| `DASH_REFILL_COOLDOWN` | 0.10 s | ground can't refill right after a dash starts |
| `DASH_BUFFER` | 0.08 s | dash press is buffered this long |
| `MAX_DASHES` | 1 | |

No gravity during a dash. The direction comes from the held direction at
the moment the freeze ends (default: facing).

### Corner correction
| Constant | Value | Notes |
|---|---|---|
| `UPWARD_CORNER_CORRECTION` | 8 px | rising into a ceiling edge nudges sideways |
| `DASH_CORNER_CORRECTION` | 8 px | dashing sideways into a ledge lip nudges up/down |

### Objects
| Constant | Value |
|---|---|
| Crystal respawn | 2.5 s |
| Crumble block: shake before falling / respawn | 0.4 s / 2.0 s |
| Moving platform speed | per room, 50–90 px/s, ping-pong; riders carried; jump inherits platform velocity |
| Death → respawn | 0.40 s |
| Room transition | 0.30 s |

### Hair colour
`HAIR_DASH = #e0533d` (rust) with a dash available, `HAIR_NO_DASH = #4fb3e8`
(sky blue) when spent, white flash on refill.

## Rooms (ASCII, 40 × 22)

`#` solid, `P` spawn, `^ v < >` spikes (pointing up/down/left/right), `C` dash
crystal, `S` strawberry, `X` crumble block, `=` moving platform (path set in
room data), `F` summit flag. An open gap on the right or top boundary is the
exit; falling out of the bottom is death.

1. **Trailhead** – running and jumping (variable jump heights).
2. **Cliffside** – wall climbing, stamina, wall jumps up a chimney.
3. **Gap** – dashing across a pit, and an up-dash.
4. **Crystals** – chains of dash crystals over a long pit.
5. **Lift** – moving platforms and momentum jumps.
6. **Thorns** – spikes, precise jumps and a dash between spike rows.
7. **Rotten Ledge** – crumbling blocks.
8. **Summit** – everything combined, ending at the flag.

Each room hides one berry off the main path. Rooms 1–2 have **no dash**
yet (per-room `dashes: 0`), so the jump and climb lessons can't be skipped.

Rooms are authored with rectangle ops in `tools/build_rooms.py`, which
writes the ASCII maps into `src/world/rooms.js`. `tools/solver.mjs` runs a
best-first search over 4-frame input macros on the headless sim to prove
each room and each berry is reachable, and saves the routes to
`tests/routes.json` for the tests to replay.

## Controls

* Keyboard: arrows / WASD move, `Z` / `C` / Space jump, `X` dash, hold `Shift` / `V` grab.
* Touch: d-pad (8-way, slide your thumb) on the left; Jump, Dash, Grab on
  the right; each pointer is tracked independently (multi-touch).
* Gamepad not supported.

## Testing

* `npm test` – headless Node tests on the pure physics (jump heights, coyote,
  buffer, dash distance, wall climb/jump, corner correction, crystals,
  spikes) plus solver routes through every room, every berry, and a full run.
* `npm run e2e` – Playwright: loads the build, drives jump/dash/climb through
  the `window.__summit` test hook (`?test=1` = deterministic stepping), checks
  positions, plays every room's route, finishes a full run to the stats
  screen, tests real keyboard input, and tests multi-touch on an emulated
  phone in portrait and landscape. Screenshots go to `tests/screens/`.
