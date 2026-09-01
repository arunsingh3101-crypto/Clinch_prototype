import { default as PlayerCapability } from './PlayerCapability.js?v=20260901141602';

// Trail on/off toggle (tutorial spec §1.1). Story mode only.
//
//   Trail ON  — the existing core loop (decay, self-intersection close, kill).
//   Trail OFF — no trail exists or is drawn; the player is not subject to
//               trail-based detection and defaults into Sneak Mode (§1.2, which
//               follows player.trailActive on its own).
//
// Turning OFF wipes the live trail so nothing lingers. Turning OFF→ON emits an
// alert pulse (§1.1) at the player's position — a signal nearby, pulse-aware
// enemies can notice. This capability owns only the trail-state switch and the
// pulse emission; the core trail behavior stays in Trail/ArenaSim.
export default class TrailToggle extends PlayerCapability {
  static key = 'trailToggle';

  constructor() {
    super();
    this.trailOn = true;
  }

  enable() {
    super.enable();
    this.trailOn = true;
    this.player.trailActive = true;
  }

  // Sets the trail state. OFF clears the live trail; OFF→ON fires an alert
  // pulse. No-op if already in the requested state.
  setTrailOn(on, now) {
    if (on === this.trailOn) return;
    this.trailOn = on;
    this.player.trailActive = on;
    if (!on) {
      this.player.trail.reset([]);
    } else {
      this.sim.spawnAlertPulse(this.player.x, this.player.y, now);
    }
  }

  toggle(now) {
    this.setTrailOn(!this.trailOn, now);
  }
}
