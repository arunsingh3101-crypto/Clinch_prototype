// Every movement / feel constant lives here. Units: pixels and seconds.
// See DESIGN.md for what each one does. Values are the classic 8-px-tile
// numbers scaled x2 for 16-px tiles.

export const TILE = 16;
export const ROOM_W = 40; // tiles
export const ROOM_H = 22; // tiles
export const VIEW_W = TILE * ROOM_W; // 640
export const VIEW_H = TILE * ROOM_H; // 352
export const STEP = 1 / 60; // fixed timestep

export const MOVE = {
  // hitbox
  HITBOX_W: 12,
  HITBOX_H: 20,

  // running
  MAX_RUN: 180,
  RUN_ACCEL: 2000,
  RUN_REDUCE: 800,
  AIR_MULT: 0.65,

  // gravity / jumping
  GRAVITY: 1800,
  HALF_GRAV_THRESHOLD: 80,
  MAX_FALL: 320,
  FAST_MAX_FALL: 480,
  FAST_FALL_ACCEL: 600,
  JUMP_SPEED: 210,
  JUMP_H_BOOST: 80,
  VAR_JUMP_TIME: 0.2,
  COYOTE_TIME: 0.1,
  JUMP_BUFFER: 0.1,

  // walls
  WALL_JUMP_CHECK_DIST: 6,
  WALL_JUMP_H_SPEED: 260,
  WALL_JUMP_FORCE_TIME: 0.16,
  WALL_SLIDE_START_MAX: 40,
  WALL_SLIDE_TIME: 1.2,

  // climbing
  CLIMB_MAX_STAMINA: 110,
  CLIMB_UP_COST: 100 / 2.2,
  CLIMB_STILL_COST: 100 / 10,
  CLIMB_JUMP_COST: 110 / 4,
  CLIMB_TIRED_THRESHOLD: 20,
  CLIMB_UP_SPEED: 90,
  CLIMB_DOWN_SPEED: 160,
  CLIMB_SLIP_SPEED: 60,
  CLIMB_ACCEL: 1800,
  CLIMB_GRAB_Y_MULT: 0.2,
  CLIMB_CHECK_DIST: 4,
  CLIMB_HOP_X: 200,
  CLIMB_HOP_Y: 240,
  CLIMB_HOP_FORCE_TIME: 0.2,

  // dash
  DASH_SPEED: 480,
  DASH_TIME: 0.15,
  DASH_FREEZE: 0.05,
  END_DASH_SPEED: 320,
  END_DASH_UP_MULT: 0.75,
  DASH_COOLDOWN: 0.2,
  DASH_REFILL_COOLDOWN: 0.1,
  DASH_BUFFER: 0.08,
  MAX_DASHES: 1,

  // dash tech: jumping out of a ground dash / up-dash next to a wall
  SUPER_JUMP_H: 520,
  DUCK_SUPER_JUMP_X_MULT: 1.25,
  DUCK_SUPER_JUMP_Y_MULT: 0.5,
  SUPER_WALL_JUMP_SPEED_Y: 320,
  SUPER_WALL_JUMP_H: 340,
  SUPER_WALL_JUMP_VAR_TIME: 0.25,
  WALL_BOOST_TIME: 0.2, // climb-jump then press away = refund + wall jump

  // corner correction
  UPWARD_CORNER_CORRECTION: 8,
  DASH_CORNER_CORRECTION: 8,
};

export const WORLD = {
  CRYSTAL_RESPAWN: 2.5,
  CRUMBLE_SHAKE: 0.4,
  CRUMBLE_RESPAWN: 2.0,
  DEATH_RESPAWN: 0.4,
  ROOM_TRANSITION: 0.3,
};

export const COLORS = {
  HAIR_DASH: 0xe0533d,
  HAIR_NO_DASH: 0x4fb3e8,
  HAIR_FLASH: 0xffffff,
};
