import { VIEW_W, VIEW_H } from '../config.js';
import { controls } from '../globals.js';
import { sfx } from '../audio/Sfx.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('title'); }
  create() {
    this.add.image(0, 0, 'bg-0').setOrigin(0);
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x0d0e1a, 0.25).setOrigin(0);
    this.add.bitmapText(VIEW_W / 2 + 3, 83, 'pix', 'SUMMIT', 6).setScale(10).setOrigin(0.5).setTint(0x17142a);
    this.add.bitmapText(VIEW_W / 2, 80, 'pix', 'SUMMIT', 6).setScale(10).setOrigin(0.5);
    this.add.bitmapText(VIEW_W / 2, 136, 'pix', 'A SMALL CLIMB', 6).setScale(2).setOrigin(0.5).setTint(0x17142a);
    const press = this.add.bitmapText(VIEW_W / 2, 250, 'pix', 'PRESS JUMP', 6).setScale(3).setOrigin(0.5);
    this.tweens.add({ targets: press, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    const touch = document.body.classList.contains('touch');
    const help = touch
      ? 'D-PAD MOVE  JUMP  DASH  HOLD GRAB'
      : 'ARROWS MOVE  Z/C JUMP  X DASH  SHIFT/V GRAB  M MUTE';
    this.add.bitmapText(VIEW_W / 2, 300, 'pix', help, 6).setScale(2).setOrigin(0.5).setTint(0x17142a);
    // the climber, with a hand-placed hair tuft
    const hx = VIEW_W / 2, hy = 220;
    const hair = this.add.graphics();
    hair.fillStyle(0x17142a, 1);
    [[0, 0, 13], [-9, 6, 11], [-17, 12, 9]].forEach(([dx, dy, r]) => hair.fillCircle(hx + dx - 2, hy - 54 + dy, r + 3));
    hair.fillStyle(0xe0533d, 1);
    [[0, 0, 13], [-9, 6, 11], [-17, 12, 9]].forEach(([dx, dy, r]) => hair.fillCircle(hx + dx - 2, hy - 54 + dy, r));
    this.add.sprite(hx, hy, 'player', 'idle').setScale(3).setOrigin(0.5, 1);
    this.add.graphics().fillStyle(0xe0533d, 1).fillRect(hx - 12, hy - 61, 24, 6).fillRect(hx - 12, hy - 55, 6, 6);

    this.started = false;
    controls.anyPress = (a) => {
      if (this.started) return;
      if (a === 'jump' || a === 'Enter') {
        this.started = true;
        sfx.unlock();
        sfx.play('select');
        this.cameras.main.fadeOut(250, 13, 14, 26);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('game'));
      }
    };
    // tapping the picture also starts
    this.game.canvas.addEventListener('pointerdown', this.tap = () => controls.anyPress && controls.anyPress('jump'));
    this.events.once('shutdown', () => this.game.canvas.removeEventListener('pointerdown', this.tap));
  }
  update() { controls.sample(); }
}
