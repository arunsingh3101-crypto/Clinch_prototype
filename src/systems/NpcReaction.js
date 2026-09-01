import { CONFIG } from '../config.js?v=20260901134553';

// NPC reaction state machine (tutorial spec §1.5). Same three-state pattern as
// the enemy detection machine, applied to NPCs as an OPTIONAL per-instance
// feature — not every NPC uses it, and the Distressed/Fleeing state can be
// disabled per instance (spec §5). Reusable and data-configured, not hand-coded
// per NPC.
//
//   Idle       — normal mission behavior
//   Alert      — a nearby threat: freeze / seek cover / scatter
//   Distressed — directly threatened: actively flee (faster, less predictable)
//
// Transitions are currently driven by a simple threat proxy (distance to the
// nearest threat). Once the enemy detection state machine exists, that proxy is
// replaced by "a nearby enemy reached Investigating/Engaged" — the state set
// and per-instance flags here stay the same.
export const NPC_STATE = { IDLE: 'idle', ALERT: 'alert', DISTRESSED: 'distressed' };

export default class NpcReaction {
  constructor(config = {}) {
    const N = CONFIG.STORY.NPC;
    this.enableAlert = config.enableAlert !== false; // default on
    this.enableDistress = config.enableDistress !== false; // default on; off for a calm escort
    this.alertRadius = config.alertRadius ?? N.ALERT_RADIUS;
    this.distressRadius = config.distressRadius ?? N.DISTRESS_RADIUS;
    this.state = NPC_STATE.IDLE;
  }

  // threat: { nearestDist } — distance to the nearest threatening enemy.
  update(threat) {
    const d = (threat && threat.nearestDist != null) ? threat.nearestDist : Infinity;
    if (this.enableDistress && d < this.distressRadius) {
      this.state = NPC_STATE.DISTRESSED;
    } else if (this.enableAlert && d < this.alertRadius) {
      this.state = NPC_STATE.ALERT;
    } else {
      this.state = NPC_STATE.IDLE;
    }
    return this.state;
  }
}
