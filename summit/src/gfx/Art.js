// All art is drawn procedurally here into canvas textures (16x16 pixel style).
import { TILE, ROOM_W, ROOM_H, VIEW_W, VIEW_H } from '../config.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  tex.refresh();
  return tex;
}

const px = (ctx, c, x, y, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

// ---------------------------------------------------------------- font ----
// 3x5 pixel font. Each glyph = 5 rows of 3 bits.
const GLYPHS = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001111',
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '1000111011101011000110001', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '1000110001101011101110001', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  ':': '000010000010000', '.': '000000000000010', '/': '001001010100100', '!': '010010010000010',
  '-': '000000111000000', '?': '111001010000010', ',': '000000000010100', "'": '010010000000000',
  ' ': '000000000000000', '+': '000010111010000', '(': '010100100100010', ')': '010001001001010',
  '%': '101001010100101', '*': '000101010101000', '<': '001010100010001', '>': '100010001010100',
};
export const FONT_CHARS = Object.keys(GLYPHS).join('');

// Glyphs are 3 px wide (15 bits) or 5 px wide (25 bits); cells are 6 px and
// each char's advance is trimmed to its real width + 1 (proportional font).
const glyphW = (g) => (g.length === 25 ? 5 : 3);

export function makeFont(scene) {
  const n = FONT_CHARS.length;
  canvasTex(scene, 'font-img', n * 6, 6, (ctx) => {
    [...FONT_CHARS].forEach((ch, i) => {
      const g = GLYPHS[ch], w = glyphW(g);
      for (let r = 0; r < 5; r++) for (let c = 0; c < w; c++) if (g[r * w + c] === '1') px(ctx, '#fff', i * 6 + c, r);
    });
  });
  const cfg = {
    image: 'font-img', width: 6, height: 6, chars: FONT_CHARS, charsPerRow: n,
    spacing: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, lineSpacing: 2,
  };
  const data = Phaser.GameObjects.RetroFont.Parse(scene, cfg);
  const texW = n * 6;
  for (const ch of FONT_CHARS) {
    const c = data.data.chars[ch.charCodeAt(0)];
    const w = glyphW(GLYPHS[ch]) + 1;
    c.width = w; c.xAdvance = w;
    c.u1 = c.u0 + w / texW;
  }
  scene.cache.bitmapFont.add('pix', data);
}

// -------------------------------------------------------------- player ----
// Facing right in a 16x24 cell; hitbox (12x20) sits at x 2..13, y 4..23.
const PAL = { o: '#17142a', skin: '#f3c6a0', jacket: '#3d9970', jacketD: '#2a6e50', pants: '#3a3550', boot: '#7a4a2e', eye: '#17142a' };

function figure(pose) {
  const b = pose.bob || 0;
  const hx = pose.lean || 0;
  const R = [];
  // legs
  for (const l of pose.legs) {
    R.push([PAL.pants, l[0], 18 + b, 2, l[1]]);
    R.push([PAL.boot, l[0] + (l[2] || 0), 18 + b + l[1], 3, 2]);
  }
  // torso
  R.push([PAL.jacket, 4 + hx, 12 + b, 8, 6]);
  R.push([PAL.jacketD, 4 + hx, 12 + b, 2, 6]);
  // back arm
  if (pose.armBack) R.push([PAL.jacketD, ...pose.armBack]);
  // head
  R.push([PAL.skin, 4 + hx, 5 + b, 8, 7]);
  // front arm
  if (pose.arm) { R.push([PAL.jacket, ...pose.arm]); R.push([PAL.skin, pose.hand[0], pose.hand[1], 2, 2]); }
  return { R, eye: [9 + hx, 8 + b], b, hx };
}

function drawFigure(ctx, ox, pose) {
  const { R, eye } = figure(pose);
  ctx.fillStyle = PAL.o;
  for (const [, x, y, w, h] of R) ctx.fillRect(ox + x - 1, y - 1, w + 2, h + 2);
  for (const [c, x, y, w, h] of R) px(ctx, c, ox + x, y, w, h);
  px(ctx, PAL.eye, ox + eye[0], eye[1], 1, 2);
  px(ctx, PAL.eye, ox + eye[0] + 2, eye[1], 1, 2);
}

export const PLAYER_FRAMES = ['idle', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'climb0', 'climb1', 'dash', 'slide'];
const POSES = {
  idle: { legs: [[5, 3], [9, 3]], arm: [7, 13, 2, 3], hand: [7, 16] },
  run0: { bob: 0, legs: [[3, 2, -1], [10, 3, 1]], arm: [9, 13, 2, 3], hand: [10, 15], armBack: [4, 13, 2, 3] },
  run1: { bob: 1, legs: [[6, 2], [8, 2]], arm: [7, 13, 2, 3], hand: [7, 16] },
  run2: { bob: 0, legs: [[9, 3, 1], [4, 2, -1]], arm: [5, 13, 2, 3], hand: [4, 15], armBack: [10, 13, 2, 3] },
  run3: { bob: 1, legs: [[8, 2], [6, 2]], arm: [7, 13, 2, 3], hand: [7, 16] },
  jump: { legs: [[5, 2, -1], [9, 1, 1]], arm: [10, 9, 2, 4], hand: [10, 8] },
  fall: { legs: [[4, 3, -1], [10, 3, 1]], arm: [11, 10, 2, 3], hand: [12, 9], armBack: [3, 10, 2, 3] },
  climb0: { legs: [[6, 2, 1], [9, 3, 1]], arm: [11, 7, 2, 5], hand: [12, 6], armBack: [10, 13, 2, 3] },
  climb1: { legs: [[6, 3, 1], [9, 2, 1]], arm: [11, 11, 2, 4], hand: [12, 10], armBack: [10, 8, 2, 4] },
  dash: { lean: 1, legs: [[3, 2, -2], [7, 3]], arm: [11, 12, 3, 2], hand: [13, 12] },
  slide: { legs: [[6, 3, 1], [9, 3, 1]], arm: [11, 9, 2, 4], hand: [12, 8] },
};

export function makePlayer(scene) {
  const n = PLAYER_FRAMES.length;
  const tex = canvasTex(scene, 'player', n * 16, 24, (ctx) => {
    PLAYER_FRAMES.forEach((f, i) => drawFigure(ctx, i * 16, POSES[f]));
  });
  PLAYER_FRAMES.forEach((f, i) => tex.add(f, 0, i * 16, 0, 16, 24));
  // white silhouette for dash afterimages
  const sil = canvasTex(scene, 'player-sil', n * 16, 24, (ctx) => {
    ctx.drawImage(tex.getSourceImage(), 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    px(ctx, '#ffffff', 0, 0, n * 16, 24);
  });
  PLAYER_FRAMES.forEach((f, i) => sil.add(f, 0, i * 16, 0, 16, 24));
}

// --------------------------------------------------------------- objects ---
export function makeObjects(scene) {
  // dash crystal (2 frames: active, outline)
  canvasTex(scene, 'crystal', 16, 16, (ctx) => {
    const rows = [
      '.......o........',
      '......oLo.......',
      '.....oLLGo......',
      '....oLLGGGo.....',
      '...oLLGGGGDo....',
      '..oLLGGGGGDDo...',
      '.oLGGGGGGGDDDo..',
      '..oGGGGGGDDDo...',
      '...oGGGGDDDo....',
      '....oGGDDDo.....',
      '.....oGDDo......',
      '......oDo.......',
      '.......o........',
    ];
    const C = { o: '#123a2c', L: '#d8fff0', G: '#5ee8a0', D: '#2fae74' };
    rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && px(ctx, C[ch], x + 0, y + 1)));
  });
  canvasTex(scene, 'crystal-off', 16, 16, (ctx) => {
    const pts = [[7, 1], [13, 7], [7, 13], [1, 7]];
    for (let i = 0; i < 4; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % 4];
      for (let t = 0; t <= 6; t += 2) px(ctx, '#5ee8a0', Math.round(x0 + ((x1 - x0) * t) / 6), Math.round(y0 + ((y1 - y0) * t) / 6) + 1);
    }
  });

  // summit berry
  canvasTex(scene, 'berry', 16, 16, (ctx) => {
    const rows = [
      '......gg.g......',
      '....ggGGgg......',
      '.....gGGg.......',
      '....oooooo......',
      '...oRRRRRRo.....',
      '..oRRyRRRyRo....',
      '..oRRRRRRRRo....',
      '..oRyRRRyRRo....',
      '..oRRRRRRRDo....',
      '...oRRyRRDo.....',
      '....oRRRDo......',
      '.....oDDo.......',
      '......oo........',
    ];
    const C = { o: '#3a0f1c', R: '#e8364f', D: '#a3203a', y: '#ffe08a', g: '#2f7d3a', G: '#59c45e' };
    rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && px(ctx, C[ch], x + 2, y + 2)));
  });

  // crumble block
  canvasTex(scene, 'crumble', 16, 16, (ctx) => {
    px(ctx, '#3b2617', 0, 0, 16, 16);
    px(ctx, '#9c6b3f', 1, 1, 14, 14);
    px(ctx, '#b8844f', 1, 1, 14, 2);
    px(ctx, '#6e4626', 1, 7, 14, 1);
    px(ctx, '#6e4626', 5, 1, 1, 6);
    px(ctx, '#6e4626', 10, 8, 1, 7);
    // cracks
    for (const [x, y] of [[3, 4], [4, 5], [12, 3], [11, 4], [7, 11], [8, 12], [3, 12], [13, 11]]) px(ctx, '#3b2617', x, y);
  });

  // moving platform segment
  canvasTex(scene, 'platform', 16, 16, (ctx) => {
    px(ctx, '#1d1b2c', 0, 0, 16, 16);
    px(ctx, '#6a7090', 0, 1, 16, 14);
    px(ctx, '#f2c14e', 0, 1, 16, 2);
    px(ctx, '#8b92b4', 0, 3, 16, 1);
    px(ctx, '#4a4f6a', 0, 12, 16, 3);
    px(ctx, '#2a2d40', 3, 7, 2, 2);
    px(ctx, '#2a2d40', 11, 7, 2, 2);
  });

  // summit flag (2 frames)
  const flag = canvasTex(scene, 'flag', 64, 32, (ctx) => {
    for (let f = 0; f < 2; f++) {
      const o = f * 32;
      px(ctx, '#d8d8e8', o + 3, 2, 2, 30);
      px(ctx, '#17142a', o + 2, 31, 4, 1);
      for (let x = 0; x < 14; x++) {
        const wave = Math.round(Math.sin((x / 14) * Math.PI * 2 + f * Math.PI) * 1.2);
        px(ctx, x % 5 === 4 ? '#ffd166' : '#e0533d', o + 5 + x, 3 + wave, 1, 9 - Math.floor(x / 4));
      }
    }
  });
  flag.add(0, 0, 0, 0, 32, 32);
  flag.add(1, 0, 32, 0, 32, 32);

  // single white pixel for particles
  canvasTex(scene, 'px', 2, 2, (ctx) => px(ctx, '#fff', 0, 0, 2, 2));
}

// ------------------------------------------------------------------ rooms --
// Two outlined triangles per tile, 8 px tall, pointing away from the wall.
function drawSpike(ctx, tx, ty, dir) {
  const x0 = tx * TILE, y0 = ty * TILE;
  // draw in local "pointing up" space: u along the base (0..15), v height (0 = tip row)
  const put = (c, u, v) => {
    let x, y;
    if (dir === 'up') { x = u; y = 8 + v; }
    else if (dir === 'down') { x = u; y = 7 - v; }
    else if (dir === 'left') { x = 8 + v; y = u; }
    else { x = 7 - v; y = u; }
    px(ctx, c, x0 + x, y0 + y);
  };
  for (let k = 0; k < 2; k++) {
    const cx = k * 8 + 3.5;
    for (let v = 0; v < 8; v++) {
      const half = (v / 7) * 4;
      for (let u = k * 8; u < k * 8 + 8; u++) {
        const d = Math.abs(u - cx);
        if (d > half + 0.01) continue;
        const edge = d > half - 1 || v === 7;
        put(edge ? '#17142a' : u < cx ? '#f4f6ff' : '#aab3d6', u, v);
      }
    }
  }
}

// Solid tiles: rock with lit edges and snow on top surfaces. One canvas per room.
export function makeRoomTexture(scene, world, index) {
  const key = `room-${world.def.id}`;
  const R = rng(1234 + index * 77);
  const hue = ROOM_TINTS[index % ROOM_TINTS.length];
  canvasTex(scene, key, VIEW_W, VIEW_H, (ctx) => {
    const solid = (tx, ty) => tx < 0 || tx >= ROOM_W || ty < 0 || ty >= ROOM_H ? true : world.grid[ty * ROOM_W + tx] === 1;
    for (let ty = 0; ty < ROOM_H; ty++) {
      for (let tx = 0; tx < ROOM_W; tx++) {
        if (!solid(tx, ty) || tx >= ROOM_W || ty >= ROOM_H) continue;
        if (world.grid[ty * ROOM_W + tx] !== 1) continue;
        const x = tx * TILE, y = ty * TILE;
        px(ctx, hue.rock, x, y, TILE, TILE);
        // speckle texture
        for (let i = 0; i < 6; i++) px(ctx, R() < 0.5 ? hue.dark : hue.mid, x + Math.floor(R() * 15), y + Math.floor(R() * 15), 2, 1);
        const up = solid(tx, ty - 1), dn = solid(tx, ty + 1), lf = solid(tx - 1, ty), rt = solid(tx + 1, ty);
        if (!lf) { px(ctx, hue.edge, x, y, 2, TILE); px(ctx, hue.o, x, y, 1, TILE); }
        if (!rt) { px(ctx, hue.mid, x + TILE - 2, y, 2, TILE); px(ctx, hue.o, x + TILE - 1, y, 1, TILE); }
        if (!dn) { px(ctx, hue.dark, x, y + TILE - 3, TILE, 3); px(ctx, hue.o, x, y + TILE - 1, TILE, 1); }
        if (!up) {
          // snow cap with a few drips
          px(ctx, hue.o, x, y, TILE, 1);
          px(ctx, '#eef3ff', x, y + 1, TILE, 3);
          px(ctx, '#b9c6e8', x, y + 4, TILE, 1);
          for (let i = 0; i < 3; i++) {
            const dx = Math.floor(R() * 14);
            px(ctx, '#dfe7fb', x + dx, y + 4, 2, 1 + Math.floor(R() * 3));
          }
          if (!lf) px(ctx, hue.o, x, y + 1, 1, 4);
          if (!rt) px(ctx, hue.o, x + TILE - 1, y + 1, 1, 4);
        }
        // inner corners
        if (up && lf && !solid(tx - 1, ty - 1)) px(ctx, hue.edge, x, y, 2, 2);
        if (up && rt && !solid(tx + 1, ty - 1)) px(ctx, hue.edge, x + TILE - 2, y, 2, 2);
      }
    }
    for (const s of world.spikes) drawSpike(ctx, s.tx, s.ty, s.dir);
  });
  return key;
}

// colour themes as the climb goes on: morning → noon → dusk → night
const ROOM_TINTS = [
  { rock: '#4b4e78', mid: '#5c6090', dark: '#3a3c60', edge: '#7a80b8', o: '#17142a', sky: ['#7fb5e8', '#cfe6f5'], m1: '#8fa7cf', m2: '#6a7fae' },
  { rock: '#4a5478', mid: '#5b6790', dark: '#383f5e', edge: '#7c8ab6', o: '#17142a', sky: ['#6aa8e0', '#d3ebf5'], m1: '#86a3cd', m2: '#5f78a8' },
  { rock: '#504a74', mid: '#635b8c', dark: '#3c3759', edge: '#8a7fb8', o: '#17142a', sky: ['#5f97d6', '#e6e7f0'], m1: '#8b97c8', m2: '#65689f' },
  { rock: '#56486e', mid: '#6a5886', dark: '#403554', edge: '#937db0', o: '#17142a', sky: ['#7b8fd0', '#f3d9c9'], m1: '#9a92c0', m2: '#6f6496' },
  { rock: '#5c466a', mid: '#71567f', dark: '#45334f', edge: '#9d7aa6', o: '#17142a', sky: ['#8d78c0', '#f6c7a5'], m1: '#a586b0', m2: '#77608e' },
  { rock: '#5a3f5f', mid: '#6f5074', dark: '#432e47', edge: '#9a7095', o: '#17142a', sky: ['#6f5aa8', '#f2a68a'], m1: '#8f6c9e', m2: '#634a7c' },
  { rock: '#463d62', mid: '#574c78', dark: '#332c4a', edge: '#7c6ca6', o: '#100e1e', sky: ['#3a3470', '#b9759a'], m1: '#5b4c86', m2: '#40366a' },
  { rock: '#3c3f63', mid: '#4b4f78', dark: '#2b2d4a', edge: '#6c72a8', o: '#0c0b18', sky: ['#151735', '#3d3a78'], m1: '#2e2f5c', m2: '#22234a' },
];

export function makeBackground(scene, index) {
  const key = `bg-${index}`;
  if (scene.textures.exists(key)) return key;
  const hue = ROOM_TINTS[index % ROOM_TINTS.length];
  const R = rng(99 + index * 13);
  canvasTex(scene, key, VIEW_W, VIEW_H, (ctx) => {
    // banded sky gradient (dithered steps look more pixel-art than a smooth ramp)
    const c0 = hex(hue.sky[0]), c1 = hex(hue.sky[1]);
    const bands = 12;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
      px(ctx, `rgb(${c})`, 0, Math.floor((i * VIEW_H) / bands), VIEW_W, Math.ceil(VIEW_H / bands) + 1);
    }
    if (index >= 6) for (let i = 0; i < 70; i++) px(ctx, R() < 0.8 ? '#cfd3ff' : '#ffffff', Math.floor(R() * VIEW_W), Math.floor(R() * VIEW_H * 0.6), 1, 1);
    // two mountain ranges
    ridge(ctx, R, hue.m1, VIEW_H * 0.45, 70, true);
    ridge(ctx, R, hue.m2, VIEW_H * 0.68, 50, false);
  });
  return key;
}

function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

function ridge(ctx, R, color, base, amp, snowy) {
  // midpoint displacement height line
  const n = 65;
  const hts = new Array(n).fill(0);
  hts[0] = R() * amp; hts[n - 1] = R() * amp;
  const sub = (a, b, d) => {
    if (b - a < 2) return;
    const m = (a + b) >> 1;
    hts[m] = (hts[a] + hts[b]) / 2 + (R() - 0.5) * d;
    sub(a, m, d * 0.55); sub(m, b, d * 0.55);
  };
  sub(0, n - 1, amp * 2.2);
  const step = VIEW_W / (n - 1);
  for (let x = 0; x < VIEW_W; x += 2) {
    const i = Math.min(n - 2, Math.floor(x / step));
    const t = x / step - i;
    const h = hts[i] + (hts[i + 1] - hts[i]) * t;
    const top = Math.floor(base - h);
    px(ctx, color, x, top, 2, VIEW_H - top);
    if (snowy && h > amp * 0.75) px(ctx, '#eef3ff', x, top, 2, Math.max(2, Math.floor((h - amp * 0.75) * 0.6)));
  }
}
