# Cinch — Prototype Design Specification

**Type:** Game design specification (pre-technical). **Engine- and language-agnostic.**
**Status:** Locked and buildable. Everything in Parts 1–10 is confirmed. Part 11 lists deliberate tuning knobs. Part 12 is future work — **do not build it for the prototype.**

---

## 0. What this document is (and is not)

This is a *design* spec. It states what the game **does** — rules, behaviors, cause and effect — in precise, unambiguous terms. It deliberately says **nothing** about *how* to build it: no collision handling, no loop-detection algorithm, no data structures, no engine or language specifics. Any precise-sounding rule here (e.g. "center point inside the closed region") describes a *behavior* to reproduce, not an implementation to copy. Build it in any engine, any language.

Where a number could reasonably go either way, it appears in **Part 11 (Tuning Knobs)** as a value to dial in playtest — not as a fixed requirement.

**The one question the prototype exists to answer:**
> Is looping a moving chaser, while a shooter denies you ground and a cutter threatens your open line, *fun* for 10 minutes — with nothing but cubes and placeholder art?

If the answer is yes, the verb is real and the rest of the game is worth building. If no, no amount of content saves it. Build the minimum that answers this honestly.

---

## 1. Core concept and design laws

**The verb — path-as-weapon.** The player has no gun. They leave a solid trail wherever they move. Closing that trail into a loop destroys everything enclosed. Combat is *routing*, not aiming. The skill is reading the shape you are drawing.

**Design Law 1 — the trail is finite and decays.** Trail lifetime is the master tuning knob of the whole game. An infinite trail trivializes enclosure; decay forces constant motion and makes loop size a genuine risk decision.

**Design Law 2 — anti-small-circle.** A tiny loop around a single enemy must never be the optimal play, or the verb dies. Reward scales *superlinearly* with the number of enemies caught in one loop, and loops below a minimum size do not fire at all.

**The core loop (the 3-second rhythm the prototype is testing):**
Kite a pack into a cluster → carve an arc around them while under fire → cross your own line to snap the loop shut → the enclosed enemies pop → your trail resets, forcing you to immediately reposition and start the next loop.

---

## 2. The player

- Top-down movement, moves freely in any direction at a set speed.
- Leaves a continuous trail behind them at all times while moving.
- **Survivability:** a small health pool (a few hits — see Part 11). Touching an enemy deals contact damage. After taking a hit, the player has a brief window of invulnerability so a single overlapping enemy cannot chain-drain them.
- **No second weapon.** Movement and the trail are the *entire* offensive and defensive toolkit. This is a hard design commitment, not a placeholder — see Part 3 for why the player is never actually helpless.

---

## 3. The trail — rules of the verb

The trail is the whole game. These rules are exhaustive.

**Decay — time-based.** The trail is a rolling window of the player's recent movement. Every point of the trail has an age; once a point reaches the trail's lifetime it disappears. While the player moves, the trail simultaneously grows at the head and dissolves at the oldest end. Standing still means no new trail is drawn while the existing trail keeps expiring — so **standing still dissolves your weapon.** This is the engine of Design Law 1.

- A consequence, free of any extra system: the **maximum loop perimeter you can draw ≈ your movement speed × the trail lifetime.** A loop too large to complete before its start point expires is physically impossible to close. This is a built-in, emergent cap on loop size — no separate rule needed.
- **Readability:** older trail segments should visibly fade (e.g. grow more transparent) as they near expiry, so the player can read their remaining "budget" spatially.

**Solidity — solid to threats, passable to the player.**
- The trail is a **solid wall to enemies and to enemy projectiles.** It blocks their movement and their shots.
- The trail is **passable to the player's own body.** The player can walk freely across their own trail. (Without this, closing a loop by crossing your own line would be impossible.)
- Because the trail blocks projectiles, an *open, unclosed* trail is already useful defensively: the player can drop a line between themselves and a shooter and re-gather behind it. **The trail is never a dead weight, even before it closes.**

**Closing a loop — self-intersection only.** A loop closes the instant the trail's head touches any earlier point of the player's own live trail. The enclosed region is the polygon formed from that intersection point around to the head. Nothing else closes a loop — touching an arena wall does **not** close a loop; there is no "return to safe territory" mechanic in the prototype.

*Worked example:* the player walks right, curls upward and back to the left, then downward — crossing the earlier rightward segment. The crossing point plus the curl form a closed polygon. Everything whose center lies inside that polygon is caught.

**What the player does during the "no-weapon" moment after a loop fires** (the trail resets to zero — see Part 4): they are never actually helpless, because (a) movement itself is the verb — the reset window *is* the kiting/herding phase where you gather the next pack; (b) the trail begins regrowing the instant they move, so "weaponless" really means "trail too short to enclose," which lasts under a second; and (c) even a short open trail still shields against projectiles. There is no backup weapon by design.

---

## 4. Loop resolution — what happens when the trail crosses itself

1. **Trigger:** the trail head touches the player's own live trail (self-intersection).
2. **Fire condition — minimum area.** The enclosed region must be at least a minimum area for the loop to *fire*. If it is smaller, the crossing is an **inert no-op**: nothing dies, nothing resets, the trail simply continues. This does two jobs at once — it prevents accidental micro-crossings during tight maneuvering from wiping your trail, and it hard-enforces Design Law 2 (a circle too small to matter does not merely underperform, it does nothing).
3. **Who is caught — center-point snapshot.** At the single instant of closing, an enemy is caught if **its center point lies inside the closed polygon.** Not whole-body; the center. Borderline cases resolve *generously* (a center right on the line counts as caught) so near-misses feel like hits, not coin-flips. Fast enemies are judged on this same instant — whatever is inside on the closing frame is caught, and whatever slipped out is not.
4. **On fire:**
   - Every caught enemy is **instantly killed** (see Part 5). No health, no chip damage.
   - **The entire trail is consumed** — the loop boundary *and* any lead-in trail before the intersection point. The player redraws from zero. (This is "full reset," chosen over keeping the lead-in.)
   - **No lingering wall or hazard is left behind.** The fired boundary vanishes cleanly. (Lingering walls and damage-zones are reserved for future upgrades — Part 12.)
5. **An empty-but-large-enough loop still fires and still resets the trail.** Drawing a big loop that catches nothing costs you your trail — a wasted loop has a real cost. This teaches "only close loops you mean to close."
6. **The player's own position is irrelevant to resolution.** Being inside your own loop when it fires is harmless.

---

## 5. Kill model

- Enclosing an enemy **kills it instantly** — a clean binary "pop." Enemies have **no health bars** and take **no partial damage**, ever. A loop either encloses an enemy's center (it dies) or it does not (it is untouched).
- All three prototype enemies die on a **single** enclosure.
- Enemy "toughness," for future enemy types, is expressed as *"requires N enclosures"* or *"requires a special condition"* (e.g. must be isolated) — never as a number chipped down over time. This keeps every kill a discrete, readable event. (No such tough enemies exist in the prototype.)

---

## 6. Reward and scoring

- **Reward scales superlinearly with the number of enemies caught in one loop** — roughly quadratic. Five enemies in one loop are worth dramatically more than five separate one-catch loops. This single relationship is what forces the core fantasy: herd the pack, then close one fat loop.
- The scaling is **bounded (quadratic-ish), not exponential** — otherwise the optimal play collapses into "kite forever, gather a huge mass, one god-loop." Decay and enemy pressure already discourage that; the reward curve must not encourage it.
- **Reward does not scale with enclosed area.** Area's only roles are the fire threshold (Part 4) and the emergent risk of a bigger loop (more time exposed). Rewarding area would pay players for drawing big empty circles.
- **Combo multiplier.** Closing your next qualifying loop within a few seconds of the last raises a multiplier (×1 → ×1.5 → ×2 → …). The multiplier decays if you stall. This deliberately rewards staying aggressive during the exposed reset window and fights the instinct to turtle.
- **In the prototype, "reward" is just score plus a kill counter.** There is no XP, currency, or upgrade economy yet. (Later, this same number feeds progression and capture rarity — Part 12.)

---

## 7. Enemies — the prototype's three

Each enemy has a **distinct relationship to the trail.** That relationship is its identity.

| Enemy | Trail is a wall to it? | Role |
|---|---|---|
| Chaser | Yes — paths around it | The herding engine |
| Shooter | Yes — paths around it; its shots are blocked too | Denies camping |
| Cutter | **No — passes through and destroys it** | The anti-verb |

**Chaser.** Pure pursuit — homes directly on the player. Moves *slower than the player*, so it is always kiteable. Because a group all homes on the same target, a pack naturally clumps behind you as you circle — this is your primary tool for building a fat loop. Deals contact damage. Blocked by the trail. Dies on a single enclosure.

**Shooter.** Stationary or slow. Fires an aimed projectile at the player on a cadence. The projectile is **blocked by the trail** (so the player can shield behind their own line). Its job is to punish camping — you cannot stand still to draw a tidy loop. Deals contact damage if touched. Blocked by the trail. Dies on a single enclosure.

**Cutter — the anti-verb.** The one enemy that ignores the trail-wall: it passes *through* the trail, and doing so **severs** it.
- **AI:** beeline for the nearest point of the player's live open trail and cross it. If the player has no meaningful trail (e.g. just after a reset), pursue the player directly.
- **Sever behavior — partial.** When a cutter crosses the trail, it destroys the trail from the crossing point **back to the tail** (the older portion). Only the fresh segment from the crossing to the head survives. This ruins the loop the player was mid-drawing (their anchor is gone) but lets them keep drawing immediately. It does **not** wipe the whole trail.
- Net effect: the cutter is a **timing threat.** It forces the player to either close fast, or route so the open line stays away from it. A cutter can itself be enclosed and killed like anything else — if you can loop it before it reaches your line.

---

## 8. Arena and run structure (prototype)

- **One persistent arena**, single open box. **Outer walls only — no interior geometry.**
- The outer wall **bounds player movement but is not a loop boundary.** Loops close by pure self-intersection only; touching the wall does nothing. (This keeps every loop fully player-drawn and unambiguous.)
- **Endless, escalating waves** in that one box. No rooms, no transitions.
- **No boss, no upgrades, no win state.** The player plays until they die. The kill counter and combo score are the entire chase. The "10 minutes" is your evaluation window, not a designed cap.

This single-arena, wave-based shape is chosen specifically to respect the solo-dev content constraint: content lives in enemy behavior, wave composition, and (later) upgrades — all systemic — never in handcrafted spatial layouts.

---

## 9. Difficulty and failure (the 10-minute curve)

**Phased enemy introduction — this doubles as a wordless tutorial.** Each phase teaches one pressure before stacking the next:

| Time | Enemies present | What the player learns |
|---|---|---|
| 0–2 min | Chasers only, low density | Herd a pack, close a loop |
| 2–4 min | + Shooters | Loop on the move; shield behind your line |
| 4–6 min | + Cutters | Close fast; keep your open line away from threats |
| 6 min → | All three, rising density and spawn cadence | Juggle all pressures; the optimal shape keeps shifting |

- **Spawn model — pulsed with short lulls**, *not* a constant trickle. The lull is what lets the player gather a pack into a fat loop; it is kept short enough that the combo timer can bridge it if the player keeps looping stragglers. This serves both the gather-a-big-loop beat and the combo-flow beat.
- **Escalation scales density, enemy mix, and spawn cadence only.** Per-enemy stats (speed, fire rate, etc.) stay **constant** across the run. This isolates the variable under test — "is the verb fun as *pressure* rises?" — and keeps the build honest and debuggable.
- **Failure state:** the player's health reaching zero ends the run → show final kill count and best combo → offer restart. No revives. No dynamic difficulty / rubber-banding — a fixed, time-based ramp tells you honestly whether the curve itself is fun.

---

## 10. Success criteria — how to read the prototype

The prototype has succeeded if, playing with cubes and no upgrades, a session is *hard to put down* and:
- The player is routinely choosing to **herd and commit to bigger loops** rather than spamming tiny ones (Law 2 holds in practice, not just on paper).
- The **reset-after-fire window feels like tension, not dead time** — the player is actively kiting and shielding, never just waiting.
- The **enemy mix genuinely changes the ideal shape** — a wave heavy on cutters plays differently from one heavy on shooters.
- Deaths feel *earned* (a sloppy route, a greedy loop), not random.

If any of these fail, that is the signal — tune the knobs in Part 11 before adding anything from Part 12.

---

## 11. Tuning knobs (values deliberately left open for playtest)

These are *numbers*, not design ambiguities. Expect to dial them in-engine. The design is unchanged whatever they land on.

- **Trail lifetime** (start point ~6 seconds) — the master knob; touch this first.
- **Player movement speed** — together with lifetime, sets max loop size.
- **Player health** (start ~3–5 hits) and **invulnerability duration** after a hit.
- **Minimum loop area to fire.**
- **Combo timer window** and the **multiplier curve** (how fast it climbs, how fast it decays).
- **Reward curve steepness** (how sharply count-of-enemies superlinearly scales).
- **Spawn cadence, per-wave density, and the density ramp rate.**
- **Per-enemy constants:** chaser speed (must stay below player), shooter fire rate and projectile speed, cutter speed.
- **Starter-stub length** — how much trail (if any) the player keeps on reset. **Default 0.** A cushion to raise only if the reset window playtests as helpless exposure.

**Optional difficulty mode (trivial to add):** *Hard mode = health of 1* (one-hit death). Selectable from options. Not the default.

---

## 12. Future / out of scope — **do not build for the prototype**

Everything below is deliberately excluded from the prototype. It is recorded here so the locked core rules above never contradict it later. None of it is required to answer the prototype's one question.

### Near-future features (built only after the verb is proven)

- **Feature A — Stealth (confirmed as an additive layer; verb unchanged).** Enemy vision cones and patrols exist only in stealth waves; normal waves keep direct pursuit. The **open trail acts as a scent track** — an enemy whose cone the trail crosses follows it toward its source (the player's head), generalizing the cutter's seek-the-trail behavior; enemies still treat the trail as a wall and path *along* it. Firing a loop is **"loud"** — an alert pulse in a radius, so a big kill wakes nearby enemies (clean risk/reward). "Weapon = exposure" becomes a **lure**: bait enemies onto your open line and into a loop. Nothing here contradicts the core.

- **Feature B — Capture (the "convert" branch of the kill model).** The *same* enclosure action kills a normal enemy and *captures* a capturable creature — the target's **type** decides which, with no new input or verb. Capture rarity scales with loop investment (bigger/riskier loops → rarer creatures). Capture-resistant behaviors (bolters, scattering herds, an alpha that must be isolated) fit the existing "special condition" rule.
  - **Undecided, pending playtest:** whether captured creatures are *active orbiting attackers* (a true second weapon in the meta-layer) or *augment / defend / sacrifice-and-deploy* only. This turns on where the fun lands once the core is playable.
  - **Firm guardrail either way:** captured-creature capabilities are always **constrained** — e.g. not always deployable, ineffective against certain enemies, single-use, or on a slow recharge. Never a free permanent auto-attacker. (This protects the "path is the only verb" pitch. If B ever adds a persistent independent attacker, that is a conscious break from a core commitment, not a default.)

- **Upgrade pool (principle only; pool deliberately deferred).** Designing ~15 routing-mutating upgrades now is premature for the same reason capture is — routing-mutating upgrades depend on how the routing *feels*, which is unknown until the prototype is played. **The one rule that is locked:** every upgrade must change a routing, shape, or rhythm decision — never merely a stat. If an upgrade can be fully described as "+X%" with no change to how you route or what shape is optimal, it is cut or reworked. A category sketch to design *within*, later: trail-shape mutators, loop-effect mutators (this is where lingering walls / damage-zones finally live), combo/chain mutators, enclosure-rule mutators, double-edged risk/reward, enemy-interaction mutators — tuned so any 3–4 picked together form an emergent build identity.

### Alternate close mechanics (possible future modes)

- **Territory-return (Splix-style).** You own a home region; leaving it starts a trail; returning to owned ground claims everything between. A natural fit for a future **"claim and hold"** mode. Not the prototype's mechanic.
- **Anchor-return (Qix-style).** A trail must start and end on an existing solid boundary. A natural fit for a future **"walled bunker"** mode. Not the prototype's mechanic.

### Other reserved systems, enemies, and modes

- **Double-edged-sword trail power** — a power that does something unique with the trail but also harms or affects the player. Later levels only.
- **Tower-defense mode** — claimed loops become decaying walls; defend an objective between waves. A future *mode*, never the default (turtling kills the verb).
- **Additional enemies** beyond the prototype three, from the established taxonomy: **splitters** (punish lazy loops), **armored** (need double-enclosure — the "cracked" state persists on the enemy across trail resets), **orbiters** (too fast for a conventional lasso; judged on the closing snapshot like everything else).
- **Full-game structure — deliberately undecided.** Whether the full game is an open arena, room-to-room, or waves is **left open on purpose**: once stealth, capturing unique characters, and story/characters enter, the game evolves in gameplay and design, so committing now is premature. Every locked verb rule above is structure-agnostic (works in an arena, in rooms, or in waves), so deferring this costs nothing. Revisit after the prototype validates the verb and after A/B's implications have themselves been prototyped.

---

## Appendix — one-line rule reference

- Trail decays by **time** (~6s), the master knob.
- Trail is **solid to enemies and projectiles, passable to the player.**
- Loops close by **self-intersection only.**
- A loop fires only if it encloses **≥ a minimum area**; below that, nothing happens.
- Caught = enemy **center inside the polygon at the instant of close.**
- Enclosing = **instant kill** (no health bars).
- On fire, the **whole trail resets to zero**; no lingering wall in the base game.
- Reward scales **superlinearly with enemy count per loop**, not area.
- **Combo** multiplier rewards fast consecutive loops.
- **Chaser** herds, **shooter** denies camping, **cutter** severs your open line (partial, from cut to tail) and is the only enemy the wall does not stop.
- **One arena**, walls-only, endless escalating pulsed waves; die at 0 HP.
