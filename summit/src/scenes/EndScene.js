import { VIEW_W, VIEW_H } from '../config.js';
import { controls } from '../globals.js';
import { makeBackground } from '../gfx/Art.js';
import { formatTime } from './GameScene.js';
import { sfx } from '../audio/Sfx.js';

export class EndScene extends Phaser.Scene {
  constructor() { super('end'); }
  create(data) {
    this.add.image(0, 0, makeBackground(this, 7)).setOrigin(0);
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x0d0e1a, 0.35).setOrigin(0);
    this.add.bitmapText(VIEW_W / 2, 70, 'pix', 'SUMMIT REACHED', 6).setScale(5).setOrigin(0.5).setTint(0xffd166);
    const lines = [
      ['TIME', formatTime(data.time ?? 0)],
      ['DEATHS', String(data.deaths ?? 0)],
      ['BERRIES', `${data.berries ?? 0}/${data.total ?? 0}`],
    ];
    lines.forEach(([k, v], i) => {
      this.add.bitmapText(VIEW_W / 2 - 20, 140 + i * 36, 'pix', k, 6).setScale(3).setOrigin(1, 0.5);
      this.add.bitmapText(VIEW_W / 2 + 20, 140 + i * 36, 'pix', v, 6).setScale(3).setOrigin(0, 0.5).setTint(0xd8fff0);
    });
    this.add.image(VIEW_W / 2 + 120, 212, 'berry').setScale(2);
    const press = this.add.bitmapText(VIEW_W / 2, 290, 'pix', 'PRESS JUMP TO CLIMB AGAIN', 6).setScale(2).setOrigin(0.5);
    this.tweens.add({ targets: press, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    window.__summitEnd = data;
    this.armed = false;
    this.time.delayedCall(800, () => (this.armed = true));
    controls.anyPress = (a) => {
      if (!this.armed || (a !== 'jump' && a !== 'Enter')) return;
      this.armed = false;
      sfx.play('select');
      this.scene.start('game', { room: 0 });
    };
  }
  update() { controls.sample(); }
}
