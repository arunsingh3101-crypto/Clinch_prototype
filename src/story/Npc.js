import { CONFIG } from '../config.js?v=20260901134553';
import { dist } from '../utils/geometry.js?v=20260901134553';
import Chaser from '../entities/enemies/Chaser.js?v=20260901134553';
import NpcReaction, { NPC_STATE } from '../systems/NpcReaction.js?v=20260901134553';

// Escort/companion NPC (spec §2 beats 6-7). The same character is present in
// beat 6 (first kill) and escorted in beat 7. It extends Chaser only to reuse
// clampToArena and destroy; unlike enemies it passes freely through the
// player's trail (an ally, like the player), so it never gets walled off from
// you. Not an enemy: not in the sim's enemy list, deals no contact damage.
//
// Optional reaction state machine (§1.5) drives its demeanor. For the escort
// instance the Distressed/Fleeing state is disabled (spec §2 beat 7: NPC calm),
// so it stays Idle and simply follows. It's only damageable in survive-escort
// beats; elsewhere it's a safe bystander.
export default class Npc extends Chaser {
  static type = 'npc';

  constructor(scene, x, y, options = {}) {
    super(scene, x, y);
    const N = CONFIG.STORY.NPC;
    this.radius = N.RADIUS;
    this.dealsContactDamage = false;
    this.alive = true;
    this.health = options.health ?? N.HEALTH;
    this.vulnerable = !!options.vulnerable; // only true in survive-escort beats
    this.invulnUntil = 0;
    this.reaction = options.reaction || null; // NpcReaction or null
    this.sprite.setFillStyle(N.COLOR);
    this.sprite.setSize(this.radius * 2, this.radius * 2);
  }

  // Driven by StoryScene after the sim step. `enemies` is the live enemy list,
  // used both for the reaction machine's threat proxy and (when distressed) to
  // pick a flee direction.
  update(player, trail, enemies, deltaSeconds, now) {
    const N = CONFIG.STORY.NPC;

    // Nearest enemy → reaction state (threat proxy; replaced by enemy detection
    // states in a later step).
    let nearest = null;
    let nearestDist = Infinity;
    for (const e of enemies) {
      if (e.dealsContactDamage === false) continue;
      const d = dist(e.x, e.y, this.x, this.y);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    }
    const state = this.reaction ? this.reaction.update({ nearestDist }) : NPC_STATE.IDLE;

    let stepX = 0;
    let stepY = 0;
    if (state === NPC_STATE.DISTRESSED && nearest) {
      // Flee the threat, a touch faster than normal follow.
      const dx = this.x - nearest.x;
      const dy = this.y - nearest.y;
      const l = Math.hypot(dx, dy) || 1;
      stepX = (dx / l) * N.SPEED * 1.15 * deltaSeconds;
      stepY = (dy / l) * N.SPEED * 1.15 * deltaSeconds;
    } else {
      // Follow the player, keeping a standoff so it doesn't crowd them.
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > N.FOLLOW_DISTANCE) {
        stepX = (dx / d) * N.SPEED * deltaSeconds;
        stepY = (dy / d) * N.SPEED * deltaSeconds;
      }
    }

    // Allies pass through the trail (no trail-blocking); just clamp to arena.
    this.x += stepX;
    this.y += stepY;
    this.clampToArena();
    this.sprite.setPosition(this.x, this.y);

    // Reflect state as a tint so demeanor reads at a glance.
    const color = state === NPC_STATE.DISTRESSED ? N.DISTRESS_COLOR
      : state === NPC_STATE.ALERT ? N.ALERT_COLOR
        : N.COLOR;
    this.sprite.setFillStyle(color);
  }

  hurt(now) {
    if (!this.vulnerable || !this.alive || now < this.invulnUntil) return;
    this.health -= 1;
    this.invulnUntil = now + CONFIG.STORY.NPC.INVULN_MS;
    if (this.health <= 0) this.alive = false;
  }
}
