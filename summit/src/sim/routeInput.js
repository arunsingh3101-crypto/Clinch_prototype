// Compact input tokens used by the route solver and tests.
// L/R/U/D direction, J = press+hold jump, j = keep holding jump,
// t = tap jump (1 frame), G = hold grab, X = press dash.
export function decode(tok, f) {
  const has = (c) => tok.includes(c);
  const x = has('R') ? 1 : has('L') ? -1 : 0;
  const y = has('U') ? -1 : has('D') ? 1 : 0;
  return {
    x, y,
    jump: has('J') || has('j') || (has('t') && f === 0),
    jumpPressed: (has('J') || has('t')) && f === 0,
    dash: has('X'), dashPressed: has('X') && f === 0,
    grab: has('G'),
  };
}
