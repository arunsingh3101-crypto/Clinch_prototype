import { CONFIG } from '../config.js?v=20260901124225';

// The design's emergent unit: the max loop perimeter a player can draw is
// roughly speed × trail lifetime (design-spec Part 3). The tutorial sizes its
// arenas from this so a room is always big enough to actually draw a loop in.
// Rooms in this prototype render at the fixed canvas size; this value is the
// reference the room author reasons about (and a hook for per-room bounds once
// variable-sized rooms are threaded through the sim).
export function spatialUnit() {
  return CONFIG.PLAYER.SPEED * (CONFIG.TRAIL.LIFETIME_MS / 1000);
}
