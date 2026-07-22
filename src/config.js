// Central tuning knobs — see design doc Part 11. Change numbers here, not in game logic.
export const CONFIG = {
  ARENA: {
    WIDTH: 960,
    HEIGHT: 540,
    WALL_MARGIN: 16, // outer wall thickness the player/enemies are clamped inside
  },

  PLAYER: {
    SPEED: 220, // px/s
    RADIUS: 12,
    HEALTH: 4,
    INVULN_MS: 800,
    STARTER_STUB_LENGTH: 0, // trail points kept immediately after a reset (Part 11 default: 0)
  },

  TRAIL: {
    LIFETIME_MS: 6000, // master knob (Design Law 1)
    MIN_POINT_SPACING: 5, // px moved before a new trail point is sampled
    MIN_LOOP_AREA: 4200, // px^2 — below this, a self-crossing is an inert no-op
    SELF_INTERSECT_IGNORE_RECENT_MS: 250, // ignore this many ms of trail nearest the head when testing for self-intersection
  },

  ENEMIES: {
    CHASER: {
      SPEED: 130, // must stay below PLAYER.SPEED
      RADIUS: 11,
      CONTACT_DAMAGE: 1,
      COLOR: 0xe74c3c,
    },
    SHOOTER: {
      SPEED: 40,
      RADIUS: 13,
      CONTACT_DAMAGE: 1,
      COLOR: 0xf39c12,
      FIRE_INTERVAL_MS: 1800,
      PROJECTILE_SPEED: 260,
      PROJECTILE_RADIUS: 4,
      MIN_RANGE: 90, // won't fire if player is closer than this (avoids melee-range absurdity)
    },
    CUTTER: {
      SPEED: 150,
      RADIUS: 10,
      COLOR: 0x9b59b6,
    },
    SPAWN_MIN_DIST_FROM_PLAYER: 180,
  },

  SCORING: {
    BASE_PER_ENEMY: 100,
    EXPONENT: 2, // superlinear (quadratic-ish) — Part 6
    COMBO_WINDOW_MS: 4000,
    COMBO_STEP: 0.5,
    COMBO_MAX: 4,
  },

  WAVES: {
    // Phased introduction — Part 9. Times are ms from run start.
    PHASE_SHOOTERS_AT: 120000,
    PHASE_CUTTERS_AT: 240000,
    PHASE_ESCALATION_AT: 360000,
    PULSE_INTERVAL_START_MS: 4800,
    PULSE_INTERVAL_MIN_MS: 2000,
    PULSE_SIZE_START: 2,
    PULSE_SIZE_MAX: 5,
    ESCALATION_RAMP_MS: 300000, // time after PHASE_ESCALATION_AT to reach max density
  },
};
