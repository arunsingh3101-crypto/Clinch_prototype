import { makeFont, makePlayer, makeObjects, makeBackground } from '../gfx/Art.js';
import { params } from '../globals.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  create() {
    makeFont(this);
    makePlayer(this);
    makeObjects(this);
    makeBackground(this, 0);
    // tests and ?room= links skip the title screen
    if (params.get('test') === '1' || params.get('room')) this.scene.start('game');
    else this.scene.start('title');
  }
}
