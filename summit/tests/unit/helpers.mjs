import { Sim } from '../../src/sim/Sim.js';

export const I = (o = {}) => ({ x: 0, y: 0, jump: false, jumpPressed: false, dash: false, dashPressed: false, grab: false, ...o });

// Build a 40x22 room from a few rows placed at the bottom of an otherwise walled box.
export function room(rows, extra = {}) {
  const map = [];
  for (let i = 0; i < 22; i++) map.push(rows[i] ?? (i === 0 || i >= 20 ? '#'.repeat(40) : '#' + '.'.repeat(38) + '#'));
  return { id: 't', name: 't', map, ...extra };
}

export function sim(def) { return new Sim([def], 0); }

// Run `frames` steps holding input o. jumpPressed/dashPressed fire on the first frame only.
export function hold(s, o, frames, each) {
  for (let f = 0; f < frames; f++) {
    const inp = I({ ...o, jumpPressed: f === 0 && !!o.jump && !o.noPress, dashPressed: f === 0 && !!o.dash });
    s.step(inp);
    each && each(s, f);
  }
}
