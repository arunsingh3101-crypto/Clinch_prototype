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
    DORMANT: {
      SPEED: 130, // must stay below PLAYER.SPEED, same as chaser
      RADIUS: 11,
      CONTACT_DAMAGE: 1,
      COLOR: 0x3498db,
      ACTIVATE_MIN_DIST: 60, // stays stationary if player is closer than this
      ACTIVATE_MAX_DIST: 220, // stays stationary if player is farther than this
    },
    FLEER: {
      SPEED: 140, // runs directly away from the player at all times
      RADIUS: 10,
      CONTACT_DAMAGE: 1,
      COLOR: 0x1abc9c,
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

  // Story-mode systems (tutorial spec §1). Story mode only — arcade never
  // reads these. All values here are best-guess defaults to refine via
  // playtest, kept out of game logic per the config-not-prose convention.
  STORY: {
    // Toggling trail OFF→ON emits an alert pulse (§1.1). Radius is the reach of
    // the signal; duration is how long the pulse lingers for enemies to notice.
    ALERT_PULSE: {
      START_RADIUS: 160, // px
      DURATION_MS: 1500,
    },
    // The player 'cut' action (§1.3): abandons the current trail, leaving a
    // residue that persists then expires; a short cooldown gates re-cutting.
    CUT_RESIDUE: {
      DURATION_MS: 4000, // how long an abandoned-trail residue lingers
      COOLDOWN_MS: 300, // min gap between cuts (new trail may start immediately)
    },
    // Tutorial sheep (§1.6): zero-aggro chaser-variants that graze and scatter.
    SHEEP: {
      RADIUS: 10,
      COLOR: 0xecf0f1, // off-white
      PENNED_COLOR: 0xb0bec5, // greyed once penned
      GRAZE_SPEED: 24, // slow idle wander
      GRAZE_RETARGET_MS: 1800, // how often a grazing sheep picks a new drift point
      SCATTER_RADIUS: 110, // player must be within this to possibly scare a sheep
      SCATTER_CLOSING_SPEED: 120, // px/s of approach toward the sheep to trigger scatter
      SCATTER_SPEED: 170, // flee-burst speed (stays below player speed)
      SCATTER_DURATION_MS: 700,
    },
    // Tutorial shepherd dog (§2 beat 2): autonomous assist that drives the most
    // isolated sheep back toward the flock. Speed cap stays <= player speed.
    DOG: {
      RADIUS: 9,
      COLOR: 0x8d6e63, // brown
      SPEED: 190,
      NUDGE_RANGE: 46, // distance to a sheep at which the dog nudges it
      NUDGE_COOLDOWN_MS: 500,
      STANDOFF: 60, // how far past the target sheep (away from the flock) the dog aims
    },
  },

  // Playtest-only overrides, set from the start screen (src/menu.js). Not part
  // of the design spec — purely for fine-tuning/testing convenience.
  DEBUG: {
    GOD_MODE: false,
    ENEMY_SPAWNING: true,
    ENEMY_TYPES: { chaser: true, shooter: true, cutter: true, dormant: true, fleer: true },
    // 'nearest_to_player' | 'nearest_to_cutter' | 'trail_midpoint' — see Cutter.js
    CUTTER_TARGETING: 'nearest_to_player',
  },
};
