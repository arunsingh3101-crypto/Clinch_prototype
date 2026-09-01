import { EXIT_CRITERIA } from '../ExitCriteria.js?v=20260901134553';

// Level 1 — Tutorial (Village). Data-only description of the seven beats
// (tutorial spec §2), consumed by StoryScene.
//
// Beat `kind` drives how StoryScene runs it:
//   herding     — sim, flock of penned-resolution sheep (+ optional dog)
//   combat      — spawn enemies, real sim, room-clear / reach exit criteria
//   traversal   — reach a point; trail may be disabled; may reset on being caught
//   escort      — sim + companion NPC; survive-escort (both reach exit alive)
//   scripted    — cutscene/dialogue sequence (ScriptSequence)
//   placeholder — objective shown; auto-advances (generic fallback; unused now)
//
// `trail`: 'always-on' (arcade core, no toggle), 'disabled' (no trail at all),
// or 'toggle' (compose TrailToggle/SneakMode/CutResidue — used in Level 2).
//
// Narrative text is placeholder (to be rewritten): see spec §2 beat table.

export const LEVEL_1 = {
  id: 'level-1',
  name: 'The Village',
  beats: [
    {
      id: 'beat-1',
      name: 'Sheep Pen',
      kind: 'herding', // sim-driven; sheep as penned chaser-variants (§1.6)
      trail: 'always-on',
      objective: 'Approach gently, then loop the flock to pen them.',
      sheep: { count: 7, clusters: 3 },
      pen: { x: 820, y: 430, w: 200, h: 150 },
      spawn: { x: 120, y: 200 },
      exit: { type: EXIT_CRITERIA.ROOM_CLEAR },
    },
    {
      id: 'beat-2',
      name: 'Dog Assist',
      kind: 'herding',
      trail: 'always-on',
      objective: 'Your dog drives the strays in — loop the flock to pen them.',
      sheep: { count: 7, clusters: 3 },
      dog: true,
      pen: { x: 820, y: 430, w: 200, h: 150 },
      spawn: { x: 120, y: 200 },
      exit: { type: EXIT_CRITERIA.ROOM_CLEAR },
    },
    {
      id: 'beat-3',
      name: 'Dialogue Bridge',
      kind: 'scripted',
      trail: 'always-on',
      objective: 'Walk to the elder.',
      // Scripted sequence → ships appear on the horizon. Placeholder lines.
      script: {
        lines: [
          'ELDER: You handle the flock well, child.',
          'ELDER: Strange sails on the water this morning.',
          'ELDER: Nothing good has ever come from the sea.',
        ],
        reveal: 'ships',
      },
      exit: { type: EXIT_CRITERIA.SCRIPTED_TRIGGER },
    },
    {
      id: 'beat-4',
      name: 'Escape the Village',
      kind: 'traversal',
      trail: 'disabled', // no trail, no toggle, no draw (spec §2 beat 4)
      objective: 'Reach the docks — you have no trail here. Do not get caught.',
      // Easy chasers; predictable patrol / generous detection lands with the
      // detection state machine. Pure pursuit (slower than player) for now.
      enemies: [
        { type: 'chaser', x: 380, y: 150 },
        { type: 'chaser', x: 560, y: 400 },
        { type: 'chaser', x: 720, y: 200 },
      ],
      spawn: { x: 60, y: 270 },
      exit: { type: EXIT_CRITERIA.REACH_POINT, zone: { x: 900, y: 270, radius: 40 } },
      onFail: 'reset-beat', // caught = reset to Beat 4 start
    },
    {
      id: 'beat-5',
      name: 'Captured',
      kind: 'scripted',
      trail: 'disabled',
      objective: '',
      script: {
        lines: [
          'They came at dusk. There were too many.',
          'Iron doors. A cold room in the belly of the ship.',
          'When you wake, the village is a smudge on the horizon.',
        ],
      },
      exit: { type: EXIT_CRITERIA.SCRIPTED_TRIGGER },
    },
    {
      id: 'beat-6',
      name: 'Lab Escape — First Kill',
      kind: 'combat',
      trail: 'always-on',
      objective: 'Loop the guards to eliminate them, then reach the exit.',
      // 1–2 chasers, generous space. NPC (same character as beat 7) is present;
      // that NPC is added with the escort step.
      enemies: [
        { type: 'chaser', x: 340, y: 180 },
        { type: 'chaser', x: 620, y: 360 },
      ],
      spawn: { x: 120, y: 270 },
      npc: { id: 'prisoner' },
      // Compound: eliminate everyone AND reach the exit.
      exit: [
        { type: EXIT_CRITERIA.ROOM_CLEAR },
        { type: EXIT_CRITERIA.REACH_POINT, zone: { x: 900, y: 270, radius: 40 } },
      ],
    },
    {
      id: 'beat-7',
      name: 'Escort to Exit',
      kind: 'escort',
      trail: 'always-on',
      objective: 'Get you both to the exit alive — loop the guards off the prisoner.',
      // Same character as beat 6. Calm escort: Distressed/Fleeing disabled for
      // this instance (spec §2 beat 7).
      npc: { id: 'prisoner', reaction: { enableDistress: false } },
      enemies: [
        { type: 'chaser', x: 400, y: 150 },
        { type: 'chaser', x: 640, y: 380 },
      ],
      spawn: { x: 90, y: 270 },
      // survive-escort: both the player and the NPC must reach the exit alive.
      exit: { type: EXIT_CRITERIA.SURVIVE_ESCORT, zone: { x: 895, y: 270, radius: 60 } },
    },
  ],
};
