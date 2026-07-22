// Floating drag-vector touch joystick: appears wherever you first touch, so
// there's nothing to reach for. The vector from touch-start to the current
// pointer position (clamped to a max radius) is the movement input. A dead
// zone near the origin ignores thumb tremor, and the output is exponentially
// smoothed so direction changes ease in rather than snapping frame-to-frame.
// Keyboard WASD/arrows work interchangeably for desktop testing.
export default class VirtualJoystick {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.originX = 0;
    this.originY = 0;
    this.rawX = 0; // last raw input from touch or keyboard, pre-smoothing
    this.rawY = 0;
    this.outX = 0; // smoothed output actually handed to the player
    this.outY = 0;
    this.maxRadius = 70;
    this.deadZone = 0.2; // fraction of maxRadius below which input is ignored
    this.smoothingTimeConstant = 0.06; // seconds; lower = snappier, higher = smoother
    this.pointerId = null;

    this.baseGfx = scene.add.circle(0, 0, this.maxRadius, 0xffffff, 0.14).setVisible(false);
    this.thumbGfx = scene.add.circle(0, 0, 30, 0xffffff, 0.32).setVisible(false);
    this.baseGfx.setStrokeStyle(2, 0xffffff, 0.25);
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
    this.rawX = 0;
    this.rawY = 0;
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
    this.thumbGfx.setPosition(this.originX + dx, this.originY + dy);

    if (len < this.deadZone * this.maxRadius) {
      this.rawX = 0;
      this.rawY = 0;
    } else {
      this.rawX = dx / this.maxRadius;
      this.rawY = dy / this.maxRadius;
    }
  }

  onUp(pointer) {
    if (pointer.id !== this.pointerId) return;
    this.active = false;
    this.pointerId = null;
    this.rawX = 0;
    this.rawY = 0;
    this.baseGfx.setVisible(false);
    this.thumbGfx.setVisible(false);
  }

  // deltaSeconds makes the smoothing frame-rate independent — call once per
  // game update with the frame's delta time.
  getVector(deltaSeconds = 1 / 60) {
    let targetX = this.rawX;
    let targetY = this.rawY;

    if (!this.active) {
      targetX = 0;
      targetY = 0;
      if (this.cursors) {
        if (this.cursors.left.isDown || this.keys.left.isDown) targetX -= 1;
        if (this.cursors.right.isDown || this.keys.right.isDown) targetX += 1;
        if (this.cursors.up.isDown || this.keys.up.isDown) targetY -= 1;
        if (this.cursors.down.isDown || this.keys.down.isDown) targetY += 1;
      }
    }

    // Exponential smoothing toward the target — frame-rate independent.
    const response = 1 - Math.exp(-deltaSeconds / this.smoothingTimeConstant);
    this.outX += (targetX - this.outX) * response;
    this.outY += (targetY - this.outY) * response;

    // Snap tiny residuals to exactly zero so the player fully stops instead
    // of drifting forever on an imperceptible smoothing tail.
    if (Math.abs(this.outX) < 0.001) this.outX = 0;
    if (Math.abs(this.outY) < 0.001) this.outY = 0;

    return { x: this.outX, y: this.outY };
  }
}
