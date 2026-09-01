import { EXIT_CRITERIA } from '../ExitCriteria.js?v=20260901140734';

// Level 2 — Opening beat (toggle teaching), spec §3. Deliberately held back from
// the tutorial so the trail on/off toggle gets its own low-stakes teaching
// moment. Just the opening beat is built here (a stub); the rest of Level 2 is
// a later design pass.
//
// The single easy chaser reacts to the trail-on ALERT PULSE only (its detection
// investigates on 'alertPulse', not proximity), so the lesson reads cleanly:
// sneak past with the trail OFF and it stays unaware; toggle the trail ON and
// the pulse makes it notice — a natural extension of the sheep "your actions get
// noticed" pattern from Beat 1.
export const LEVEL_2 = {
  id: 'level-2',
  name: 'The Ship',
  beats: [
    {
      id: 'l2-beat-1',
      name: 'The Toggle',
      kind: 'traversal',
      trail: 'toggle', // composes TrailToggle + SneakMode + CutResidue
      objective: 'Trail OFF to sneak past the guard. Toggle it ON and it notices. (T toggle, C cut)',
      enemies: [
        {
          type: 'chaser',
          x: 500,
          y: 270,
          patrol: { axis: 'y', range: 70 },
          // Reacts ONLY to the alert pulse → toggling the trail ON is the sole
          // consequence this beat teaches. Mere presence (sneaking past) never
          // wakes it; the notice is temporary and decays when the pulse expires.
          detection: {
            investigateOn: ['alertPulse'],
            engageOn: [],
          },
        },
      ],
      spawn: { x: 90, y: 270 },
      exit: { type: EXIT_CRITERIA.REACH_POINT, zone: { x: 900, y: 270, radius: 44 } },
    },
  ],
};
