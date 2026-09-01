// Reusable exit-criteria taxonomy (tutorial spec §1.7). Level/room data names a
// criterion (or an array of them, all of which must hold) and the story scene
// evaluates it each frame — no bespoke per-room completion logic.
//
// Each evaluator is a pure function (spec, ctx) => { complete, failed }, where
// ctx is the room context the scene assembles:
//   ctx.sim            — the ArenaSim (ctx.sim.player, ctx.sim.enemies)
//   ctx.targetsSpawned — how many resolvable targets the room started with
//   ctx.scriptedDone   — a scripted sequence has finished
//   ctx.escort         — { npc, npcAlive, npcReached, playerReached } (escort beats)
export const EXIT_CRITERIA = {
  ROOM_CLEAR: 'room-clear', // all targets resolved (killed or penned)
  REACH_POINT: 'reach-point', // traversal to a location
  SCRIPTED_TRIGGER: 'scripted-trigger', // cutscene/dialogue sequence completion
  SURVIVE_ESCORT: 'survive-escort', // player and escorted NPC both reach exit alive
};

// Circle zone membership. Zones are {x, y, radius}; abstract exit pads for the
// "arenas + exit zones" tutorial geometry.
export function pointInZone(x, y, zone) {
  if (!zone) return false;
  const dx = x - zone.x;
  const dy = y - zone.y;
  return dx * dx + dy * dy <= zone.radius * zone.radius;
}

const EVALUATORS = {
  [EXIT_CRITERIA.ROOM_CLEAR]: (spec, ctx) => ({
    // Guarded so a room can't count as "cleared" before its targets exist.
    complete: ctx.targetsSpawned > 0 && ctx.sim.enemies.length === 0,
    failed: false,
  }),

  [EXIT_CRITERIA.REACH_POINT]: (spec, ctx) => ({
    complete: pointInZone(ctx.sim.player.x, ctx.sim.player.y, spec.zone),
    failed: false,
  }),

  [EXIT_CRITERIA.SCRIPTED_TRIGGER]: (spec, ctx) => ({
    complete: !!ctx.scriptedDone,
    failed: false,
  }),

  [EXIT_CRITERIA.SURVIVE_ESCORT]: (spec, ctx) => {
    const e = ctx.escort;
    return {
      complete: !!(e && e.npcAlive && e.npcReached && e.playerReached),
      failed: !!(e && !e.npcAlive),
    };
  },
};

// Evaluate one criterion.
export function evaluateExitCriterion(type, spec, ctx) {
  const fn = EVALUATORS[type];
  if (!fn) throw new Error(`Unknown exit criterion: ${type}`);
  return fn(spec, ctx);
}

// Evaluate a criterion or list of criteria: complete when all complete, failed
// if any single one fails.
export function evaluateExit(exit, ctx) {
  const list = Array.isArray(exit) ? exit : [exit];
  let complete = true;
  let failed = false;
  for (const c of list) {
    const r = evaluateExitCriterion(c.type, c, ctx);
    if (!r.complete) complete = false;
    if (r.failed) failed = true;
  }
  return { complete, failed };
}
