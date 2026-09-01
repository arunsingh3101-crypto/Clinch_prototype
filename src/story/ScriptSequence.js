import { CONFIG } from '../config.js?v=20260901141602';

// A minimal scripted dialogue/caption sequence for the tutorial's scripted-
// trigger beats (spec §2 beats 3 & 5). It shows a bottom dialogue box and steps
// through `lines` one at a time — advanced by a tap or SPACE, or auto-advanced
// after a short delay so the sequence always plays through unattended. When the
// last line is dismissed it calls onComplete (the beat then treats its
// scripted-trigger exit criterion as met).
//
// Placeholder text lives in the level data and is meant to be rewritten; this
// class only drives presentation and timing, not content.
export default class ScriptSequence {
  constructor(scene, { lines, onComplete, advanceKey = null, autoAdvanceMs = 2600 }) {
    this.scene = scene;
    this.lines = lines && lines.length ? lines : ['...'];
    this.onComplete = onComplete || (() => {});
    this.advanceKey = advanceKey;
    this.autoAdvanceMs = autoAdvanceMs;
    this.index = -1;
    this.done = false;
    this.pointerAdvance = false;
    this.autoAt = Infinity;

    const W = CONFIG.ARENA.WIDTH;
    const H = CONFIG.ARENA.HEIGHT;
    this.bg = scene.add.rectangle(W / 2, H - 70, W - 80, 92, 0x0a0d08, 0.9)
      .setStrokeStyle(2, 0x4a5540).setDepth(2200);
    this.txt = scene.add.text(62, H - 104, '', {
      fontFamily: 'monospace', fontSize: '17px', color: '#e8eef2',
      wordWrap: { width: W - 130 },
    }).setDepth(2201);
    this.hint = scene.add.text(W - 66, H - 40, '▸ tap / SPACE', {
      fontFamily: 'monospace', fontSize: '12px', color: '#7f8c8d',
    }).setOrigin(1, 0.5).setDepth(2201);

    this._onPointer = () => { this.pointerAdvance = true; };
    scene.input.on('pointerdown', this._onPointer);
  }

  start(now) {
    this.next(now);
  }

  next(now) {
    this.index++;
    if (this.index >= this.lines.length) {
      this.complete();
      return;
    }
    this.txt.setText(this.lines[this.index]);
    this.autoAt = now + this.autoAdvanceMs;
  }

  update(now) {
    if (this.done) return;
    const keyed = this.advanceKey && Phaser.Input.Keyboard.JustDown(this.advanceKey);
    if (keyed || this.pointerAdvance || now >= this.autoAt) {
      this.pointerAdvance = false;
      this.next(now);
    }
  }

  complete() {
    if (this.done) return;
    this.done = true;
    this.onComplete();
  }

  destroy() {
    this.scene.input.off('pointerdown', this._onPointer);
    this.bg.destroy();
    this.txt.destroy();
    this.hint.destroy();
  }
}
