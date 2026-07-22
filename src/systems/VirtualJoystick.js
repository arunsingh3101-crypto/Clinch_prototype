// Minimal drag-vector touch joystick. Touch/click-drag anywhere on screen; the
// vector from the touch start to the current pointer position (clamped to a max
// radius) is the movement input. Also exposes keyboard WASD/arrow input for
// desktop testing — both can be used interchangeably.
export default class VirtualJoystick {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.originX = 0;
    this.originY = 0;
    this.vecX = 0;
    this.vecY = 0;
    this.maxRadius = 60;
    this.pointerId = null;

    this.baseGfx = scene.add.circle(0, 0, this.maxRadius, 0xffffff, 0.12).setVisible(false);
    this.thumbGfx = scene.add.circle(0, 0, 26, 0xffffff, 0.28).setVisible(false);
    this.baseGfx.setDepth(1000);
    this.thumbGfx.setDepth(1001);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);

    this.keys = scene.input.keyboard
      ? scene.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' })
      : null;
    this.cursors = scene.input.keyboard ? scene.input.keyboard.createCursorKeys() : null;
  }

  onDown(pointer) {
    if (this.active) return;
    this.active = true;
    this.pointerId = pointer.id;
    this.originX = pointer.x;
    this.originY = pointer.y;
    this.vecX = 0;
    this.vecY = 0;
    this.baseGfx.setPosition(pointer.x, pointer.y).setVisible(true);
    this.thumbGfx.setPosition(pointer.x, pointer.y).setVisible(true);
  }

  onMove(pointer) {
    if (!this.active || pointer.id !== this.pointerId) return;
    let dx = pointer.x - this.originX;
    let dy = pointer.y - this.originY;
    const len = Math.hypot(dx, dy);
    if (len > this.maxRadius) {
      dx = (dx / len) * this.maxRadius;
      dy = (dy / len) * this.maxRadius;
    }
    this.vecX = dx / this.maxRadius;
    this.vecY = dy / this.maxRadius;
    this.thumbGfx.setPosition(this.originX + dx, this.originY + dy);
  }

  onUp(pointer) {
    if (pointer.id !== this.pointerId) return;
    this.active = false;
    this.pointerId = null;
    this.vecX = 0;
    this.vecY = 0;
    this.baseGfx.setVisible(false);
    this.thumbGfx.setVisible(false);
  }

  getVector() {
    if (this.active && (this.vecX !== 0 || this.vecY !== 0)) {
      return { x: this.vecX, y: this.vecY };
    }

    let x = 0;
    let y = 0;
    if (this.cursors) {
      if (this.cursors.left.isDown || this.keys.left.isDown) x -= 1;
      if (this.cursors.right.isDown || this.keys.right.isDown) x += 1;
      if (this.cursors.up.isDown || this.keys.up.isDown) y -= 1;
      if (this.cursors.down.isDown || this.keys.down.isDown) y += 1;
    }
    return { x, y };
  }
}
