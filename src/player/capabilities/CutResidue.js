import { default as PlayerCapability } from './PlayerCapability.js?v=20260901135929';
import { CONFIG } from '../../config.js?v=20260901135929';

// Cut-Residue (tutorial spec §1.3). Story mode only.
//
// 'cut' is distinct from 'close' (fire): it abandons the current trail WITHOUT
// closing a loop. Close (the locked rule) resets the trail to zero and leaves
// nothing behind. Cut instead drops a residue object at the abandoned path,
// which lingers for a fixed duration before expiring. The player may begin a
// new trail immediately; a short cooldown only gates back-to-back cuts.
//
// Residue is a detection trigger for cutters and a movement obstacle for
// chasers (those consumers are added with their AI, later). This capability
// owns only producing the residue and resetting the trail.
export default class CutResidue extends PlayerCapability {
  static key = 'cut';

  constructor() {
    super();
    this.cooldownUntil = 0;
  }

  canCut(now) {
    return this.enabled && now >= this.cooldownUntil;
  }

  // Abandon the current trail, leaving residue behind. Returns true if a cut
  // happened. A trail too short to have a path just resets with no residue.
  cut(now) {
    if (!this.canCut(now)) return false;
    const points = this.player.trail.points;
    if (points.length >= 2) {
      this.sim.spawnResidue(points, now);
    }
    this.player.resetTrail(now);
    this.cooldownUntil = now + CONFIG.STORY.CUT_RESIDUE.COOLDOWN_MS;
    return true;
  }
}
