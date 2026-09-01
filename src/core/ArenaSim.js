import { CONFIG } from '../config.js?v=20260901110438';
import { dist, pointInPolygon } from '../utils/geometry.js?v=20260901110438';
import Player from '../entities/Player.js?v=20260901110438';
import AlertPulse from '../world/AlertPulse.js?v=20260901110438';
import Residue from '../world/Residue.js?v=20260901110438';

// The shared core simulation: player + trail + enemies + projectiles, loop
// resolution, contact damage, and projectile stepping — the verb itself, with
// no mode-specific policy baked in. Both the arcade GameScene and (later) the
// story scenes own their own spawning, scoring, UI, and input; they drive an
// ArenaSim instance each frame and read its state.
//
// What lives here vs. in a mode scene:
//   ArenaSim  — player, enemies, projectiles, loop close/kill/pen, damage,
//               drawing, and story-mode world objects (alert pulses, residues)
//   scene     — spawning policy, scoring, HUD/overlay, input source, walls,
//               game-over / restart
//
// Loop resolution reports out through the onLoopResolved hook rather than
// touching a score manager directly, so scoring stays a mode concern.
export default class ArenaSim {
  constructor(scene, options = {}) {
    this.scene = scene;
    const spawn = options.spawn || {
      x: CONFIG.ARENA.WIDTH / 2,
      y: CONFIG.ARENA.HEIGHT / 2,
    };
    this.player = new Player(scene, spawn.x, spawn.y);
    this.enemies = [];
    this.projectiles = [];

    // Story-mode world objects (§1.1, §1.3). Empty and inert in arcade, so the
    // per-frame update/draw over them costs nothing there.
    this.pulses = [];
    this.residues = [];

    // Compose player capabilities the mode asked for (spec §5). Arcade passes
    // none; story passes TrailToggle / SneakMode / CutResidue instances.
    for (const cap of options.capabilities || []) {
      this.player.addCapability(cap, this);
    }

    // (result, time) => void, result = {caughtCount, killedCount, pennedCount}.
    // Fired once per loop that fires (including empty large-enough loops); the
    // scoring layer decides what an empty loop means.
    this.onLoopResolved = options.onLoopResolved || (() => {});
  }

  // Advance one frame. moveVec is the normalized-ish movement input {x, y};
  // the scene decides where it comes from (joystick, script, etc.).
  step(moveVec, time, deltaSeconds) {
    this.player.move(moveVec.x, moveVec.y, deltaSeconds, time);
    this.player.trail.update(time);
    this.player.updateCapabilities(time, deltaSeconds);
    this.resolveLoop(time);

    this.updateEnemies(time, deltaSeconds);
    this.updateProjectiles(time, deltaSeconds);
    this.updateWorld(time);

    this.player.trail.draw(time);
    this.player.syncSprite();
  }

  resolveLoop(time) {
    const hit = this.player.trail.checkSelfIntersection(time);
    if (!hit) return;

    const area = this.player.trail.areaFrom(hit.index, hit.point);
    if (area < CONFIG.TRAIL.MIN_LOOP_AREA) {
      // Inert no-op (Part 4.2): below minimum area, nothing happens — the trail continues.
      return;
    }

    const polygon = this.player.trail.polygonFrom(hit.index, hit.point);
    const caught = this.enemies.filter((e) => e.alive && pointInPolygon(e.x, e.y, polygon));

    // Same loop-close trigger, different outcome per target (spec §1.6): a
    // target flagged resolution:'pen' is penned, everything else is killed.
    let killedCount = 0;
    let pennedCount = 0;
    for (const e of caught) {
      e.alive = false;
      if (e.resolution === 'pen') {
        pennedCount++;
        if (typeof e.onPenned === 'function') e.onPenned(this, time);
        else e.destroy();
      } else {
        killedCount++;
        e.destroy();
      }
    }
    this.enemies = this.enemies.filter((e) => e.alive);

    this.onLoopResolved({ caughtCount: caught.length, killedCount, pennedCount }, time);
    this.player.resetTrail(time);
  }

  updateEnemies(time, deltaSeconds) {
    for (const enemy of this.enemies) {
      if (enemy.constructor.type === 'shooter') {
        enemy.update(this.player, this.player.trail, time, deltaSeconds, this.projectiles);
      } else {
        enemy.update(this.player, this.player.trail, deltaSeconds);
      }

      if (enemy.constructor.type !== 'cutter') {
        const d = dist(enemy.x, enemy.y, this.player.x, this.player.y);
        if (d < enemy.radius + CONFIG.PLAYER.RADIUS) {
          this.player.takeDamage(1, time);
        }
      }
    }
  }

  updateProjectiles(time, deltaSeconds) {
    const survivors = [];
    for (const p of this.projectiles) {
      const stillAlive = p.update(this.player.trail, deltaSeconds);
      if (!stillAlive) {
        p.destroy();
        continue;
      }
      if (dist(p.x, p.y, this.player.x, this.player.y) < p.radius + CONFIG.PLAYER.RADIUS) {
        this.player.takeDamage(1, time);
        p.destroy();
        continue;
      }
      survivors.push(p);
    }
    this.projectiles = survivors;
  }

  // Age out expired alert pulses / residues and redraw the live ones.
  updateWorld(time) {
    this.pulses = this.filterAndDraw(this.pulses, time);
    this.residues = this.filterAndDraw(this.residues, time);
  }

  filterAndDraw(list, time) {
    const survivors = [];
    for (const obj of list) {
      if (obj.alive(time)) {
        obj.draw(time);
        survivors.push(obj);
      } else {
        obj.destroy();
      }
    }
    return survivors;
  }

  // --- Story-mode world spawns (called by player capabilities) ---------------
  spawnAlertPulse(x, y, now) {
    const pulse = new AlertPulse(this.scene, x, y, now);
    this.pulses.push(pulse);
    return pulse;
  }

  spawnResidue(points, now) {
    const residue = new Residue(this.scene, points, now);
    this.residues.push(residue);
    return residue;
  }
}
