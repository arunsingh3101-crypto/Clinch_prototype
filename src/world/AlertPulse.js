import { CONFIG } from '../config.js?v=20260901114844';

// A transient alert signal emitted when the player toggles the trail OFF→ON
// (tutorial spec §1.1). It occupies a fixed radius for a fixed duration; any
// pulse-aware enemy within that radius during the window can react (consumers
// arrive with the detection state machine). Radius is exposed through a method
// so a future design can grow/shrink it without touching consumers.
export default class AlertPulse {
  constructor(scene, x, y, now) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.startRadius = CONFIG.STORY.ALERT_PULSE.START_RADIUS;
    this.duration = CONFIG.STORY.ALERT_PULSE.DURATION_MS;
    this.tStart = now;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(1500);
  }

  currentRadius(now) {
    return this.startRadius;
  }

  contains(x, y, now) {
    const dx = x - this.x;
    const dy = y - this.y;
    const r = this.currentRadius(now);
    return dx * dx + dy * dy <= r * r;
  }

  alive(now) {
    return now - this.tStart < this.duration;
  }

  draw(now) {
    const progress = Math.min(1, (now - this.tStart) / this.duration);
    const g = this.graphics;
    g.clear();
    // Expanding, fading ring so the "you were noticed" moment reads clearly.
    g.lineStyle(3, 0xf1c40f, 0.6 * (1 - progress));
    g.strokeCircle(this.x, this.y, this.startRadius * (0.4 + 0.6 * progress));
  }

  destroy() {
    this.graphics.destroy();
  }
}
