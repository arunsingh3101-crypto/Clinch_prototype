// Base class for a discrete, composable player capability (tutorial spec §5).
// Each capability is attached to a player, can be enabled/disabled independently,
// and gets a per-frame update hook. Game modes compose the set they want:
// arcade attaches none (trail is always on, no sneak, no cut); story attaches
// TrailToggle + SneakMode + CutResidue. Core trail logic is never duplicated —
// capabilities only gate and extend it through the player/sim they're given.
export default class PlayerCapability {
  // Subclasses override with a unique key used to look the capability up on the
  // player (e.g. 'trailToggle'). Kept separate from constructor.name so it
  // survives minification and never collides with the built-in Function.name.
  static key = 'capability';

  constructor() {
    this.enabled = false;
    this.player = null;
    this.sim = null;
  }

  // Wire up references before enable(). Called once by Player.addCapability.
  attach(ctx) {
    this.player = ctx.player;
    this.sim = ctx.sim;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  // Per-frame hook; only called while enabled. Override as needed.
  update(now, deltaSeconds) {}
}
