import { CONFIG } from '../config.js?v=20260901104346';

// Reward scales superlinearly with enemies-per-loop, never with area (Part 6).
// Combo multiplier rewards fast consecutive qualifying loops and decays on stall.
export default class ScoreManager {
  constructor() {
    this.score = 0;
    this.kills = 0;
    this.multiplier = 1;
    this.bestMultiplier = 1;
    this.lastQualifyingLoopAt = -Infinity;
  }

  update(now) {
    const sinceLast = now - this.lastQualifyingLoopAt;
    if (sinceLast > CONFIG.SCORING.COMBO_WINDOW_MS && this.multiplier > 1) {
      // Step decay rather than a hard reset — "decays if you stall" (Part 6).
      const stepsElapsed = Math.floor(sinceLast / CONFIG.SCORING.COMBO_WINDOW_MS);
      this.multiplier = Math.max(1, this.multiplier - stepsElapsed * CONFIG.SCORING.COMBO_STEP);
    }
  }

  // Called once per fired loop, including empty-but-large-enough loops (count === 0),
  // which cost the trail but do not extend combo or award score.
  registerLoop(count, now) {
    if (count === 0) return;

    const sinceLast = now - this.lastQualifyingLoopAt;
    if (sinceLast <= CONFIG.SCORING.COMBO_WINDOW_MS) {
      this.multiplier = Math.min(CONFIG.SCORING.COMBO_MAX, this.multiplier + CONFIG.SCORING.COMBO_STEP);
    } else {
      this.multiplier = 1;
    }
    this.lastQualifyingLoopAt = now;
    this.bestMultiplier = Math.max(this.bestMultiplier, this.multiplier);

    const base = CONFIG.SCORING.BASE_PER_ENEMY * Math.pow(count, CONFIG.SCORING.EXPONENT);
    this.score += Math.round(base * this.multiplier);
    this.kills += count;
  }
}
