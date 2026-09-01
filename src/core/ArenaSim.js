import { CONFIG } from '../config.js?v=20260901104346';
import { dist, pointInPolygon } from '../utils/geometry.js?v=20260901104346';
import Player from '../entities/Player.js?v=20260901104346';

// The shared core simulation: player + trail + enemies + projectiles, loop
// resolution, contact damage, and projectile stepping — the verb itself, with
// no mode-specific policy baked in. Both the arcade GameScene and (later) the
// story scenes own their own spawning, scoring, UI, and input; they drive an
// ArenaSim instance each frame and read its state.
//
// What lives here vs. in a mode scene:
//   ArenaSim  — player, enemies, projectiles, loop close/kill, damage, drawing
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

    // (caughtCount, time) => void — fired once per loop that fires (including
    // empty large-enough loops, matching the existing reset-but-no-combo rule;
    // the scoring layer decides what an empty loop means).
    this.onLoopResolved = options.onLoopResolved || (() => {});
  }

  // Advance one frame. moveVec is the normalized-ish movement input
  // {x, y}; the scene decides where it comes from (joystick, script, etc.).
  step(moveVec, time, deltaSeconds) {
    this.player.move(moveVec.x, moveVec.y, deltaSeconds, time);
    this.player.trail.update(time);
    this.resolveLoop(time);

    this.updateEnemies(time, deltaSeconds);
    this.updateProjectiles(time, deltaSeconds);

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
    for (const e of caught) {
      e.alive = false;
      e.destroy();
    }
    this.enemies = this.enemies.filter((e) => e.alive);

    this.onLoopResolved(caught.length, time);
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
}
