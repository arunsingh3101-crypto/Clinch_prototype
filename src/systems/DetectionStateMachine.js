import { CONFIG } from '../config.js?v=20260901140734';
import { dist } from '../utils/geometry.js?v=20260901140734';

// Enemy detection state machine (tutorial spec §1.4). A single reusable
// component — Idle → Investigating → Engaged, decaying back down — configured
// per enemy type via data, not hand-coded per class. The per-type differences
// from the spec table are expressed as which SIGNALS drive each transition:
//
//   type      Idle→Investigating       Investigating→Engaged
//   chaser    proximity                 line of sight
//   shooter   trail-on alert pulse      sustained alert / player in range
//   cutter    trail present (live/res.) trail leads to player
//
// The caller computes those signals with senseDetection(enemy, config, ctx)
// and feeds the resulting {detect, engage} booleans to update(). Decay back to
// Investigating/Idle is time-based (trigger times out / contact grace).
export const DETECT_STATE = { IDLE: 'idle', INVESTIGATING: 'investigating', ENGAGED: 'engaged' };

export default class DetectionStateMachine {
  constructor(decay = {}) {
    this.state = DETECT_STATE.IDLE;
    this.investigateDecayMs = decay.investigateMs ?? 1600;
    this.engageGraceMs = decay.engageGraceMs ?? 400;
    this.lastDetectAt = -Infinity;
    this.lastEngageAt = -Infinity;
  }

  update(now, { detect, engage }) {
    if (detect) this.lastDetectAt = now;
    if (engage) this.lastEngageAt = now;

    switch (this.state) {
      case DETECT_STATE.IDLE:
        if (engage) this.state = DETECT_STATE.ENGAGED;
        else if (detect) this.state = DETECT_STATE.INVESTIGATING;
        break;
      case DETECT_STATE.INVESTIGATING:
        if (engage) this.state = DETECT_STATE.ENGAGED;
        else if (now - this.lastDetectAt > this.investigateDecayMs) this.state = DETECT_STATE.IDLE;
        break;
      case DETECT_STATE.ENGAGED:
        // A brief grace so a momentary blip out of contact doesn't drop pursuit.
        if (!engage && now - this.lastEngageAt > this.engageGraceMs) this.state = DETECT_STATE.INVESTIGATING;
        break;
    }
    return this.state;
  }
}

// Evaluate the configured signals for an enemy against the world context.
// ctx: { player, trail, now, pulses, residues }. Missing world lists default
// empty, so a chaser (proximity/sight only) needs no pulses/residues.
export function senseDetection(enemy, config, ctx) {
  const investigateOn = config.investigateOn || [];
  const engageOn = config.engageOn || [];
  return {
    detect: investigateOn.some((k) => signal(k, enemy, config, ctx)),
    engage: engageOn.some((k) => signal(k, enemy, config, ctx)),
  };
}

function signal(kind, e, cfg, ctx) {
  const p = ctx.player;
  switch (kind) {
    case 'proximity':
      return dist(e.x, e.y, p.x, p.y) < (cfg.proximityRadius ?? 160);
    case 'lineOfSight':
      // No interior geometry in the prototype, so line of sight reduces to
      // being within the sight radius. Real occlusion arrives with room walls.
      return dist(e.x, e.y, p.x, p.y) < (cfg.sightRadius ?? 140);
    case 'playerInRange':
      return dist(e.x, e.y, p.x, p.y) < (cfg.rangeRadius ?? 200);
    case 'alertPulse':
      return (ctx.pulses || []).some((pulse) => pulse.contains(e.x, e.y, ctx.now));
    case 'trailPresent':
      return (ctx.trail && !ctx.trail.isEmpty()) || (ctx.residues || []).length > 0;
    case 'trailLeadsToPlayer':
      // The live trail's head is the player, so a present live trail leads to them.
      return ctx.trail && !ctx.trail.isEmpty();
    default:
      return false;
  }
}
