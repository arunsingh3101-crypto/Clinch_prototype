import { default as PlayerCapability } from './PlayerCapability.js?v=20260901134553';

// Sneak Mode (tutorial spec §1.2). Story mode only.
//
// Active by default whenever the trail is OFF. Rather than coupling directly to
// TrailToggle, it simply derives from player.trailActive each frame — so the
// two capabilities stay independent and coordinate only through player state.
// While sneaking, the player is not subject to trail-based detection triggers;
// detection consumers (the enemy detection state machine, added later) read
// player.trailActive / player.sneaking to honor that.
//
// Whether a room can be fully cleared by sneaking alone is a per-room mission
// flag (objective type), enforced by the room/exit-criteria layer — not here.
export default class SneakMode extends PlayerCapability {
  static key = 'sneak';

  update(now, deltaSeconds) {
    this.player.sneaking = !this.player.trailActive;
  }
}
