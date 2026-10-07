// Player movement: custom fixed-step physics with integer positions and
// sub-pixel remainders. No Phaser here — runs headless in Node tests.
import { MOVE as M } from '../config.js';

const approach = (v, target, amt) => (v > target ? Math.max(v - amt, target) : Math.min(v + amt, target));
const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const roundAway = (v) => (v < 0 ? -Math.round(-v) : Math.round(v));
const lerp = (a, b, t) => a + (b - a) * t;

export const ST_NORMAL = 'normal';
export const ST_CLIMB = 'climb';
export const ST_DASH = 'dash';

export class Player {
  constructor(world, x, y) {
    this.world = world;
    this.maxDashes = world.def.dashes ?? M.MAX_DASHES; // early rooms have no dash yet
    this.w = M.HITBOX_W;
    this.h = M.HITBOX_H;
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x; this.y = y; this.remX = 0; this.remY = 0;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.state = ST_NORMAL;
    this.dashes = this.maxDashes;
    this.stamina = M.CLIMB_MAX_STAMINA;
    this.onGround = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.dashBuffer = 0;
    this.varJumpTimer = 0;
    this.varJumpSpeed = 0;
    this.forceMoveX = 0;
    this.forceMoveXTimer = 0;
    this.dashCooldown = 0;
    this.dashRefillCooldown = 0;
    this.dashTimer = 0;
    this.dashDir = { x: 0, y: 0 };
    this.dashAimed = false;
    this.beforeDash = { x: 0, y: 0 };
    this.wallSlideTimer = M.WALL_SLIDE_TIME;
    this.maxFall = M.MAX_FALL;
    this.wallBoostTimer = 0;
    this.wallBoostDir = 0;
    this.liftX = 0; this.liftY = 0;
    this.hairFlash = 0;
    this.moveX = 0;
    this.dead = false;
    this.wasOnGround = true;
  }

  rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  collideAt(dx, dy) { return this.world.solidAt(this.x + dx, this.y + dy, this.w, this.h); }

  // wall within `dist` px on side `dir`
  wallCheck(dir, dist) {
    for (let d = 1; d <= dist; d++) if (this.collideAt(dir * d, 0)) return true;
    return false;
  }


  get tired() { return this.stamina <= 0; }
  canDash() { return this.dashes > 0 && this.dashCooldown <= 0; }

  // --- main step --------------------------------------------------------
  // in: {x, y, jump, jumpPressed, dash, dashPressed, grab}
  // sim: {freeze(t), events[]}
  update(dt, input, sim) {
    const ev = sim.events;
    this.input = input;

    this.onGround = this.vy >= 0 && this.collideAt(0, 1);

    // ground touches
    if (this.onGround) {
      this.coyote = M.COYOTE_TIME;
      this.wallSlideTimer = M.WALL_SLIDE_TIME;
      this.stamina = M.CLIMB_MAX_STAMINA;
      if (this.dashRefillCooldown <= 0 && this.dashes < this.maxDashes && this.state !== ST_DASH) {
        this.dashes = this.maxDashes;
        this.hairFlash = 0.1;
        ev.push({ type: 'refill' });
      }
      for (const o of this.world.objectsAt(this.x, this.y + 1, this.w, this.h)) if (o.state) this.world.touchCrumble(o);
    } else if (this.coyote > 0) this.coyote -= dt;

    // buffers
    if (input.jumpPressed) this.jumpBuffer = M.JUMP_BUFFER;
    else if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    if (input.dashPressed) this.dashBuffer = M.DASH_BUFFER;
    else if (this.dashBuffer > 0) this.dashBuffer -= dt;

    if (this.varJumpTimer > 0) this.varJumpTimer -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.dashRefillCooldown > 0) this.dashRefillCooldown -= dt;
    if (this.hairFlash > 0) this.hairFlash -= dt;
    if (this.wallBoostTimer > 0) {
      this.wallBoostTimer -= dt;
      if (input.x === this.wallBoostDir) {
        this.vx = M.WALL_JUMP_H_SPEED * input.x;
        this.stamina += M.CLIMB_JUMP_COST;
        this.wallBoostTimer = 0;
      }
    }
    if (this.forceMoveXTimer > 0) { this.forceMoveXTimer -= dt; this.moveX = this.forceMoveX; }
    else this.moveX = input.x;

    if (this.moveX !== 0 && this.state !== ST_CLIMB) this.facing = this.moveX;

    // lift speed from a platform we're riding
    this.updateLift();

    if (this.state === ST_NORMAL) this.normalUpdate(dt, input, sim);
    else if (this.state === ST_CLIMB) this.climbUpdate(dt, input, sim);
    else if (this.state === ST_DASH) this.dashUpdate(dt, input, sim);

    if (sim.frozen()) return; // dash freeze: don't move this step

    this.wasOnGround = this.onGround;
    this.moveH(this.vx * dt);
    this.moveV(this.vy * dt);

    const grounded = this.vy >= 0 && this.collideAt(0, 1);
    if (grounded && !this.wasOnGround && this.landSpeed > 120) ev.push({ type: 'land', speed: this.landSpeed });
    this.landSpeed = 0;
  }

  updateLift() {
    this.liftX = 0; this.liftY = 0;
    for (const p of this.world.platforms) {
      if (this.ridingPlatform(p)) { this.liftX = p.vx; this.liftY = p.vy; }
    }
  }

  ridingPlatform(p) {
    const r = this.rect();
    const hOverlap = r.x < p.x + p.w && r.x + r.w > p.x;
    const vOverlap = r.y < p.y + p.h && r.y + r.h > p.y;
    if (hOverlap && r.y + r.h === p.y) return true;
    if (this.state === ST_CLIMB && vOverlap) {
      if (this.facing > 0 && r.x + r.w === p.x) return true;
      if (this.facing < 0 && r.x === p.x + p.w) return true;
    }
    return false;
  }

  // --- states -------------------------------------------------------------
  normalUpdate(dt, input, sim) {
    // grab a wall
    if (input.grab && !this.tired && this.vy >= 0 && sign(this.vx) !== -this.facing &&
        this.wallCheck(this.facing, M.CLIMB_CHECK_DIST)) {
      this.startClimb();
      return this.climbUpdate(dt, input, sim);
    }

    if (this.dashBuffer > 0 && this.canDash()) return this.startDash(sim);

    // horizontal
    const mult = this.onGround ? 1 : M.AIR_MULT;
    if (Math.abs(this.vx) > M.MAX_RUN && sign(this.vx) === this.moveX)
      this.vx = approach(this.vx, M.MAX_RUN * this.moveX, M.RUN_REDUCE * mult * dt);
    else this.vx = approach(this.vx, M.MAX_RUN * this.moveX, M.RUN_ACCEL * mult * dt);

    // vertical: max fall (fast fall + wall slide)
    let mf = M.MAX_FALL;
    if (input.y === 1 && this.vy >= M.MAX_FALL) {
      this.maxFall = approach(this.maxFall, M.FAST_MAX_FALL, M.FAST_FALL_ACCEL * dt);
      mf = this.maxFall;
    } else {
      this.maxFall = approach(this.maxFall, M.MAX_FALL, M.FAST_FALL_ACCEL * dt);
      mf = this.maxFall;
    }
    if (this.moveX === this.facing && this.moveX !== 0 && input.y !== 1 && this.vy >= 0 &&
        this.wallSlideTimer > 0 && this.collideAt(this.facing, 0)) {
      const t = this.wallSlideTimer / M.WALL_SLIDE_TIME;
      mf = lerp(M.MAX_FALL, M.WALL_SLIDE_START_MAX, t);
      this.wallSlideTimer = Math.max(0, this.wallSlideTimer - dt);
      this.wallSliding = true;
    } else this.wallSliding = false;

    if (!this.onGround) {
      const half = Math.abs(this.vy) < M.HALF_GRAV_THRESHOLD && input.jump ? 0.5 : 1;
      this.vy = approach(this.vy, mf, M.GRAVITY * half * dt);
    }

    // variable jump
    if (this.varJumpTimer > 0) {
      if (input.jump) this.vy = Math.min(this.vy, this.varJumpSpeed);
      else this.varJumpTimer = 0;
    }

    // jumping
    if (this.jumpBuffer > 0) {
      if (this.coyote > 0) this.jump(sim);
      else if (this.wallCheck(1, M.WALL_JUMP_CHECK_DIST)) {
        if (this.facing === 1 && input.grab && !this.tired) this.climbJump(sim);
        else this.wallJump(-1, sim);
      } else if (this.wallCheck(-1, M.WALL_JUMP_CHECK_DIST)) {
        if (this.facing === -1 && input.grab && !this.tired) this.climbJump(sim);
        else this.wallJump(1, sim);
      }
    }
  }

  startClimb() {
    this.state = ST_CLIMB;
    this.vx = 0;
    this.vy *= M.CLIMB_GRAB_Y_MULT;
    this.wallBoostTimer = 0;
    // snap flush against the wall
    for (let d = 0; d < M.CLIMB_CHECK_DIST && !this.collideAt(this.facing, 0); d++) this.x += this.facing;
  }

  climbUpdate(dt, input, sim) {
    if (this.jumpBuffer > 0) {
      this.state = ST_NORMAL;
      if (this.moveX === -this.facing) this.wallJump(-this.facing, sim);
      else this.climbJump(sim);
      return;
    }
    if (this.dashBuffer > 0 && this.canDash()) return this.startDash(sim);
    if (!input.grab) { this.state = ST_NORMAL; return; }
    if (!this.wallCheck(this.facing, 1)) {
      // wall ended: hop over the ledge if climbing up, otherwise let go
      this.state = ST_NORMAL;
      if (this.vy < 0) this.climbHop(sim);
      return;
    }
    // reacting crumbles / platforms we're holding
    for (const o of this.world.objectsAt(this.x + this.facing, this.y, this.w, this.h)) if (o.state) this.world.touchCrumble(o);

    let target = 0;
    let cost = 0;
    if (input.y === -1) {
      if (this.tired) target = M.CLIMB_SLIP_SPEED;
      else if (this.collideAt(0, -1)) target = 0; // ceiling
      else { target = -M.CLIMB_UP_SPEED; cost = M.CLIMB_UP_COST; }
    } else if (input.y === 1) {
      target = M.CLIMB_DOWN_SPEED;
      if (this.onGround) { this.state = ST_NORMAL; return; }
    } else {
      target = this.tired ? M.CLIMB_SLIP_SPEED : 0;
      cost = M.CLIMB_STILL_COST;
    }
    if (!this.onGround) this.stamina = Math.max(0, this.stamina - cost * dt);
    this.vx = 0;
    this.vy = approach(this.vy, target, M.CLIMB_ACCEL * dt);
    // sliding off the bottom of a wall
    if (this.vy > 0 && !this.wallCheck(this.facing, 1)) this.state = ST_NORMAL;
  }

  climbHop(sim) {
    this.vx = this.facing * M.CLIMB_HOP_X;
    this.vy = Math.min(this.vy, -M.CLIMB_HOP_Y);
    this.forceMoveX = 0;
    this.forceMoveXTimer = M.CLIMB_HOP_FORCE_TIME;
    this.varJumpTimer = 0;
    sim.events.push({ type: 'hop' });
  }

  startDash(sim) {
    this.dashes--;
    this.dashBuffer = 0;
    this.jumpBuffer = 0;
    this.dashCooldown = M.DASH_COOLDOWN;
    this.dashRefillCooldown = M.DASH_REFILL_COOLDOWN;
    this.dashTimer = M.DASH_TIME;
    this.dashAimed = false;
    this.beforeDash = { x: this.vx, y: this.vy };
    this.vx = 0; this.vy = 0;
    this.varJumpTimer = 0;
    this.wallBoostTimer = 0;
    this.state = ST_DASH;
    sim.freeze(M.DASH_FREEZE);
  }

  aim(input) {
    let x = input.x, y = input.y;
    if (x === 0 && y === 0) x = this.facing;
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  dashUpdate(dt, input, sim) {
    if (!this.dashAimed) {
      // direction is read when the freeze ends
      this.dashAimed = true;
      const d = this.aim(input);
      this.dashDir = d;
      let nx = d.x * M.DASH_SPEED, ny = d.y * M.DASH_SPEED;
      if (sign(this.beforeDash.x) === sign(nx) && Math.abs(this.beforeDash.x) > Math.abs(nx)) nx = this.beforeDash.x;
      this.vx = nx; this.vy = ny;
      if (d.x !== 0) this.facing = sign(d.x);
      sim.events.push({ type: 'dash', dir: d });
    }

    // dash tech
    if (this.jumpBuffer > 0) {
      if (this.dashDir.y >= 0 && this.dashDir.x !== 0 && this.coyote > 0) return this.superJump(sim);
      if (this.dashDir.x === 0 && this.dashDir.y < 0) {
        if (this.wallCheck(1, M.WALL_JUMP_CHECK_DIST)) return this.superWallJump(-1, sim);
        if (this.wallCheck(-1, M.WALL_JUMP_CHECK_DIST)) return this.superWallJump(1, sim);
      }
    }

    this.dashTimer -= dt;
    if (this.dashTimer <= 0) {
      this.state = ST_NORMAL;
      if (this.dashDir.y <= 0) {
        this.vx = this.dashDir.x * M.END_DASH_SPEED;
        this.vy = this.dashDir.y * M.END_DASH_SPEED;
        if (this.vy < 0) this.vy *= M.END_DASH_UP_MULT;
      }
    }
  }

  // --- jumps ----------------------------------------------------------------
  jump(sim) {
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.varJumpTimer = M.VAR_JUMP_TIME;
    this.wallSlideTimer = M.WALL_SLIDE_TIME;
    this.vx += M.JUMP_H_BOOST * this.moveX + this.liftX;
    this.vy = -M.JUMP_SPEED + Math.min(0, this.liftY);
    this.varJumpSpeed = this.vy;
    sim.events.push({ type: 'jump' });
  }

  climbJump(sim) {
    if (!this.onGround) this.stamina = Math.max(0, this.stamina - M.CLIMB_JUMP_COST);
    this.state = ST_NORMAL;
    this.jump(sim);
    if (this.moveX === 0) { this.wallBoostDir = -this.facing; this.wallBoostTimer = M.WALL_BOOST_TIME; }
  }

  wallJump(dir, sim) {
    this.state = ST_NORMAL;
    this.jumpBuffer = 0;
    this.coyote = 0;
    this.varJumpTimer = M.VAR_JUMP_TIME;
    this.wallSlideTimer = M.WALL_SLIDE_TIME;
    if (this.moveX !== 0) { this.forceMoveX = dir; this.forceMoveXTimer = M.WALL_JUMP_FORCE_TIME; }
    this.vx = M.WALL_JUMP_H_SPEED * dir + this.liftX;
    this.vy = -M.JUMP_SPEED + Math.min(0, this.liftY);
    this.varJumpSpeed = this.vy;
    this.facing = dir;
    sim.events.push({ type: 'walljump', dir });
  }

  superJump(sim) {
    this.state = ST_NORMAL;
    this.jumpBuffer = 0; this.coyote = 0;
    this.varJumpTimer = M.VAR_JUMP_TIME;
    this.vx = M.SUPER_JUMP_H * this.facing;
    this.vy = -M.JUMP_SPEED;
    if (this.dashDir.y > 0) { this.vx *= M.DUCK_SUPER_JUMP_X_MULT; this.vy *= M.DUCK_SUPER_JUMP_Y_MULT; }
    this.vx += this.liftX;
    this.varJumpSpeed = this.vy;
    // a grounded super refunds the dash
    if (this.dashRefillCooldown <= 0 || this.onGround) this.dashes = this.maxDashes;
    sim.events.push({ type: 'jump', super: true });
  }

  superWallJump(dir, sim) {
    this.state = ST_NORMAL;
    this.jumpBuffer = 0; this.coyote = 0;
    this.varJumpTimer = M.SUPER_WALL_JUMP_VAR_TIME;
    this.vx = M.SUPER_WALL_JUMP_H * dir;
    this.vy = -M.SUPER_WALL_JUMP_SPEED_Y;
    this.varJumpSpeed = this.vy;
    this.facing = dir;
    sim.events.push({ type: 'walljump', dir, super: true });
  }

  // --- movement with collision ----------------------------------------------
  moveH(amount) {
    this.remX += amount;
    let move = roundAway(this.remX);
    this.remX -= move;
    const s = sign(move);
    while (move !== 0) {
      if (!this.collideAt(s, 0)) { this.x += s; move -= s; continue; }
      if (this.onCollideH(s)) { move -= s; continue; }
      this.remX = 0;
      return false;
    }
    return true;
  }

  moveV(amount) {
    this.remY += amount;
    let move = roundAway(this.remY);
    this.remY -= move;
    const s = sign(move);
    while (move !== 0) {
      if (!this.collideAt(0, s)) { this.y += s; move -= s; continue; }
      if (this.onCollideV(s)) { move -= s; continue; }
      this.remY = 0;
      return false;
    }
    return true;
  }

  // returns true if corner correction moved us past the obstacle
  onCollideH(s) {
    if (this.state === ST_DASH && this.dashDir.y <= 0) {
      // dash corner correction: slip over / under a ledge lip
      const dirs = this.dashDir.y < 0 ? [-1] : [-1, 1];
      for (let i = 1; i <= M.DASH_CORNER_CORRECTION; i++)
        for (const j of dirs)
          if (!this.collideAt(s, i * j)) { this.y += i * j; this.x += s; return true; }
    }
    this.vx = 0;
    return false;
  }

  onCollideV(s) {
    if (s < 0) {
      // upward corner correction
      const dist = this.state === ST_DASH ? M.DASH_CORNER_CORRECTION : M.UPWARD_CORNER_CORRECTION;
      if (this.vx <= 0)
        for (let i = 1; i <= dist; i++)
          if (!this.collideAt(-i, -1)) { this.x -= i; this.y -= 1; return true; }
      if (this.vx >= 0)
        for (let i = 1; i <= dist; i++)
          if (!this.collideAt(i, -1)) { this.x += i; this.y -= 1; return true; }
      this.varJumpTimer = 0;
    } else {
      this.landSpeed = this.vy;
    }
    this.vy = 0;
    return false;
  }
}
