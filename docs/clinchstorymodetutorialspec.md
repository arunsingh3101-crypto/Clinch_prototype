# Clinch — Story Mode: Tutorial Level Spec

**Scope:** New/extended systems for story mode's stealth-and-narrative layer, plus a full beat-by-beat spec for Level 1 (the village/tutorial level) and a placeholder for Level 2's opening beat. Existing core mechanics (trail decay, self-intersection loop-close, kill/reward scoring, chaser/shooter/cutter roles) are assumed unchanged and are not re-specified here except where a new system modifies them.

**Mode scope:** Everything below is **story mode only** unless stated otherwise. Arcade mode keeps the current always-on trail and existing upgrade draft, untouched by this spec.

---

## 1. New/Extended Systems

### 1.1 Trail On/Off Toggle
- Player can toggle trail drawing on/off via input.
- **Trail ON:** behaves exactly as the existing core loop (decay timer, self-intersection close, kill on close above area threshold).
- **Trail OFF:** no trail is drawn or exists. Player is not subject to trail-based detection triggers. Player defaults into Sneak Mode (see 1.2).
- **Toggling OFF → ON emits an alert pulse:** a signal with a starting radius that decays over a fixed duration. Any enemy whose detection logic is configured to respond to the pulse (see 1.4) and who is within the pulse's current radius during that window transitions toward Investigating/Engaged.
- Not available in arcade mode — trail is always-on there.

### 1.2 Sneak Mode
- Active by default whenever trail is OFF.
- Player is not subject to trail-based detection triggers while active.
- Whether a room can be fully cleared via sneak alone (no combat) is a **per-room/per-mission flag**, set by the mission's objective type:
  - Objective = rescue/traversal → stealth clear allowed (bonus flag possible for zero-alert clears).
  - Objective = clear-area-of-enemies → stealth clear not valid; combat required regardless of sneak capability.

### 1.3 Cut-Residue Trail
- New action distinct from "close" (fire): **cut**, which abandons the current trail without closing a loop.
- **Close** behavior is unchanged from the existing locked rule: resets the full trail to zero on fire, no lingering walls.
- **Cut** leaves a residue object behind at the abandoned trail's path, persisting for a limited duration (constant TBD, data file) before expiring.
- Residue is a detection trigger for cutters (they path toward it) and a movement obstacle/detour for chasers (they route around/through it as a physical blocker, not a detection cue).
- Player may begin a new trail immediately after cutting, or after a short cooldown (TBD, data file).

### 1.4 Detection State Machine (Enemies)
Shared three-state machine: **Idle → Investigating → Engaged**, decay back down through the same states when contact is lost. Implement as a single reusable component configured per enemy type via data, not hand-coded per enemy class.

| State transition | Chasers | Shooters | Cutters |
|---|---|---|---|
| Idle → Investigating | Proximity/movement in radius | Trail-on alert pulse only | Trail present (live or cut-residue) |
| Investigating → Engaged | Direct line of sight | Sustained alert / player in range | Trail leads to player |
| Investigating → Idle | Trigger times out (decay) | Pulse expires, no follow-up | Trail/residue expires |
| Engaged → Investigating | Breaks line of sight | Player exits effective range | Player breaks contact |

### 1.5 NPC Reaction State Machine
Same three-state pattern, applied to NPCs, as an **optional per-NPC/per-mission flag** — not every NPC uses this.

| State | Behavior |
|---|---|
| Idle | Normal mission behavior (grazing, waiting, pacing, etc.) |
| Alert | Triggered when a nearby enemy reaches Investigating/Engaged: freeze, seek cover, or scatter (herd-type NPCs) |
| Distressed/Fleeing | Enemy directly engaged near NPC, or NPC directly threatened: actively flees, may move faster/less predictably, may itself trigger nearby enemy detection |

### 1.6 Sheep Behavior (Tutorial-specific)
- Instantiated as a **chaser-variant**: reuses chaser movement/AI code, not a new system.
- Zero aggro — no threat to player.
- **Movement-style reaction (new, distinct from 1.4):** fast/direct player approach scatters nearby sheep; slow/careful approach does not. This is a separate, simpler trigger from the trail-based alert pulse — thematically linked (your actions have consequences) but mechanically its own logic, since the trail system doesn't exist yet at this point in the tutorial.
- **Loop-close resolution = pen, not kill.** Implement as a resolution-type flag on the target (kill vs. pen) rather than a separate mechanic — same loop-close trigger, different outcome handler.

### 1.7 Exit Criteria Taxonomy
Reusable set, consumed by level/room data rather than bespoke per-room logic:
- **Room-clear** — all targets resolved (killed or penned)
- **Reach-point** — traversal to a location
- **Scripted-trigger** — cutscene/dialogue sequence completion
- **Survive-escort** — player and escorted NPC both reach exit alive

---

## 2. Level 1 — Tutorial (Village)

| Beat | Room(s) | Enemies | Player agency | Exit criteria |
|---|---|---|---|---|
| 1. Sheep pen | Small arena, sized via existing spatial-unit formula (player speed × trail lifetime) | None | Core trail draw/close/decay (always-on, toggle not yet introduced); sheep react to movement style (1.6) | Room-clear (all sheep penned) |
| 2. Dog assist | Same space as Beat 1 | None | Autonomous dog assists; no new player input | Room-clear (same as Beat 1) |
| 3. Dialogue bridge | Reuse farm/village common space — no new room | None | Walk to dialogue triggers; no mechanic use | Scripted-trigger (dialogue complete → ships appear) |
| 4. Escape village | 2–3 connected rooms/corridors | Chasers only | Movement/positioning evasion only — **trail fully disabled**, no toggle, no draw | Reach-point (end of chain); caught = reset to Beat 4 start |
| 5. Captured → containment | Single small room/corridor, scripted | None (or one non-interactive guard) | Minimal/no control | Scripted-trigger (cutscene ends) |
| 6. Lab escape — first kill | One room, generous space, sized per spatial-unit formula | 1–2 chasers only | Full trail draw/close, first time resolution = kill; NPC (same character as Beat 7) present | Room-clear (enemies eliminated) + reach exit |
| 7. Escort to exit | Corridor/room chain | Chasers only, manageable count | Escort — NPC calm, Distressed/Fleeing state (1.5) not active for this instance | Survive-escort (both reach exit alive) |

**Notes:**
- Enemy roster for the entire tutorial level is chasers-only. Shooters/cutters are introduced in a later level (phased ramp applied at level scale, matching the existing arcade phased-ramp pattern).
- Beat 4 enemies must be tuned easy: generous detection radius/timing, predictable patrol patterns — first time the player is vulnerable with zero combat option.
- Beat 3 is likely a scripted sequence rather than a room in the level-data sense — flag accordingly rather than building it as a combat/objective room.
- Beat 6's NPC and Beat 7's escorted NPC are the same character.

**Open tuning constants (belong in a data file, not spec prose — set as best-guess defaults, refine via playtest):**
- Beat 1 sheep count/cluster arrangement (starting estimate: 6–8 sheep, 2–3 clusters)
- Beat 2 dog: nudge cooldown duration, cluster-detection radius, target-selection rule (most isolated sheep → nearest cluster), speed cap (≤ player speed), must not path through active player trail
- Cut-residue duration, new-trail cooldown after cut
- Alert pulse starting radius and decay duration
- Detection/NPC-reaction state timers (Investigating decay, Alert/Distressed thresholds)

---

## 3. Level 2 — Opening Beat (Toggle Teaching) — Placeholder

- **Purpose:** first deliberate teaching moment for the trail on/off toggle, held back from the tutorial deliberately so it isn't crammed alongside first-kill/first-escort.
- **Enemy:** single, easy chaser — reacts to the trail-on alert pulse, giving the player direct, low-stakes feedback that toggling trail on has a consequence.
- **Framing:** the consequence should read as a natural extension of Beat 1's sheep-reaction pattern — player is already primed to expect "my actions get noticed," so this isn't presented as a brand-new rule.
- **Room, exact trigger, and full detail:** TBD — to be expanded in a follow-up design pass, not required to unblock the tutorial build.

---

## 4. Deferred / Not Yet Addressed
- Skill trees, meta-progression currency
- Arcade upgrade draft — explicitly staying as-is, no changes
- Level 2 beyond the opening beat
- Shepherd dog "point"/command interaction — deferred until a mission where directing an assist-NPC is a real tactical choice
- AI-generated art/sprite asset pipeline — available in the Claude Code project when needed; current build continues with placeholder shapes until characters/tiles are actually designed
- Full numeric tuning constants (see open constants list above)

---

## 5. Architecture Notes for Claude Code
- Implement trail toggle, sneak mode, and cut-residue as discrete, composable player-capability modules with clear enable/disable interfaces, so they can be toggled per game mode (story vs. arcade) without duplicating core trail logic.
- Implement the detection state machine (1.4) as a single reusable component, configured per enemy type via data — not hand-coded per enemy class.
- Implement the NPC reaction state machine (1.5) the same way, with a per-instance flag to enable/disable Distressed/Fleeing behavior.
- Sheep = existing chaser behavior class, instantiated with: aggro disabled, movement-style-reaction trigger enabled (1.6), resolution type = pen.
- Exit criteria types (1.7) should be a shared enum/type consumed by level/room data, not bespoke per-room logic.
