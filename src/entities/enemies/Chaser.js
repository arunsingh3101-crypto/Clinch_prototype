import { CONFIG } from '../../config.js?v=20260901140734';
import { clamp } from '../../utils/geometry.js?v=20260901140734';
import DetectionStateMachine, { DETECT_STATE, senseDetection } from '../../systems/DetectionStateMachine.js?v=20260901140734';

// Pure pursuit, slower than the player, blocked by the trail like a wall
// (basic wall-slide steering — enough for "paths around it" at prototype fidelity).
//
// Story mode can opt a chaser into the detection state machine (§1.4) via
// options.detection: it then patrols while Idle, approaches cautiously while
// Investigating, and pursues only while Engaged. Arcade constructs chasers with
// no options, so the pure-pursuit path below is unchanged.
export default class Chaser {
  static type = 'chaser';

  constructor(scene, x, y, options = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = CONFIG.ENEMIES.CHASER.RADIUS;
    this.alive = true;
    this.sprite = scene.add.rectangle(x, y, this.radius * 2, this.radius * 2, CONFIG.ENEMIES.CHASER.COLOR);

    // Optional gated detection (story mode). options.detection is either a type
    // key ('chaser') resolved against config, or an inline config object (used
    // by the Level 2 toggle-teaching chaser, which investigates on alert pulse).
    this.detection = options.detection
      ? new DetectionStateMachine(CONFIG.STORY.DETECTION.DECAY)
      : null;
    this.detectionConfig = typeof options.detection === 'string'
      ? CONFIG.STORY.DETECTION[options.detection.toUpperCase()]
      : (options.detection || null);
    this.world = options.world || null; // sim ref, for pulse/residue signals
    this.patrol = options.patrol || null; // { axis: 'x'|'y', range: px }
    this.spawnX = x;
    this.spawnY = y;
    this.patrolDir = 1;
  }

  update(player, trail, deltaSeconds) {
    if (this.detection) {
      this.updateWithDetection(player, trail, deltaSeconds);
      return;
    }
    this.pursue(player, trail, deltaSeconds, 1);
    this.sprite.setPosition(this.x, this.y);
  }

  updateWithDetection(player, trail, deltaSeconds) {
    const now = this.scene.time.now;
    const { detect, engage } = senseDetection(this, this.detectionConfig, {
      player, trail, now,
      pulses: this.world ? this.world.pulses : [],
      residues: this.world ? this.world.residues : [],
    });
    const state = this.detection.update(now, { detect, engage });
    const D = CONFIG.STORY.DETECTION;

    if (state === DETECT_STATE.ENGAGED) {
      this.pursue(player, trail, deltaSeconds, 1);
      this.sprite.setFillStyle(D.ENGAGED_COLOR);
    } else if (state === DETECT_STATE.INVESTIGATING) {
      this.pursue(player, trail, deltaSeconds, D.INVESTIGATE_SPEED_FACTOR);
      this.sprite.setFillStyle(D.INVESTIGATE_COLOR);
    } else {
      this.doPatrol(trail, deltaSeconds);
      this.sprite.setFillStyle(D.IDLE_COLOR);
    }
    this.sprite.setPosition(this.x, this.y);
  }

  pursue(player, trail, deltaSeconds, factor) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = CONFIG.ENEMIES.CHASER.SPEED * factor;
    this.tryMove(trail, (dx / len) * speed * deltaSeconds, (dy / len) * speed * deltaSeconds);
  }

  // Predictable back-and-forth pacing around the spawn point (spec §2 beat 4:
  // "predictable patrol patterns").
  doPatrol(trail, deltaSeconds) {
    const cfg = this.patrol || { axis: 'x', range: 70 };
    const speed = CONFIG.ENEMIES.CHASER.SPEED * CONFIG.STORY.DETECTION.PATROL_SPEED_FACTOR;
    let stepX = 0;
    let stepY = 0;
    if (cfg.axis === 'y') {
      stepY = this.patrolDir * speed * deltaSeconds;
      if ((this.y - this.spawnY) * this.patrolDir > cfg.range) this.patrolDir *= -1;
    } else {
      stepX = this.patrolDir * speed * deltaSeconds;
      if ((this.x - this.spawnX) * this.patrolDir > cfg.range) this.patrolDir *= -1;
    }
    this.tryMove(trail, stepX, stepY);
  }

  tryMove(trail, stepX, stepY) {
    const from = { x: this.x, y: this.y };
    const full = { x: this.x + stepX, y: this.y + stepY };
    if (!trail.blocksSegment(from, full)) {
      this.x = full.x;
      this.y = full.y;
      this.clampToArena();
      return;
    }
    // Slide: try each axis independently so the chaser flows along the wall.
    const onlyX = { x: this.x + stepX, y: this.y };
    if (!trail.blocksSegment(from, onlyX)) {
      this.x = onlyX.x;
      this.clampToArena();
      return;
    }
    const onlyY = { x: this.x, y: this.y + stepY };
    if (!trail.blocksSegment(from, onlyY)) {
      this.y = onlyY.y;
      this.clampToArena();
    }
  }

  clampToArena() {
    const margin = CONFIG.ARENA.WALL_MARGIN + this.radius;
    this.x = clamp(this.x, margin, CONFIG.ARENA.WIDTH - margin);
    this.y = clamp(this.y, margin, CONFIG.ARENA.HEIGHT - margin);
  }

  destroy() {
    this.sprite.destroy();
  }
}
