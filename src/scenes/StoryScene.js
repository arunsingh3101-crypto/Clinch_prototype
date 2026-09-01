import { CONFIG } from '../config.js?v=20260901134553';
import ArenaSim from '../core/ArenaSim.js?v=20260901134553';
import VirtualJoystick from '../systems/VirtualJoystick.js?v=20260901134553';
import Chaser from '../entities/enemies/Chaser.js?v=20260901134553';
import Sheep from '../entities/enemies/Sheep.js?v=20260901134553';
import Dog from '../story/Dog.js?v=20260901134553';
import Npc from '../story/Npc.js?v=20260901134553';
import NpcReaction from '../systems/NpcReaction.js?v=20260901134553';
import TrailToggle from '../player/capabilities/TrailToggle.js?v=20260901134553';
import SneakMode from '../player/capabilities/SneakMode.js?v=20260901134553';
import CutResidue from '../player/capabilities/CutResidue.js?v=20260901134553';
import ScriptSequence from '../story/ScriptSequence.js?v=20260901134553';
import { LEVEL_1 } from '../story/levels/level1.js?v=20260901134553';
import { EXIT_CRITERIA, evaluateExit, pointInZone } from '../story/ExitCriteria.js?v=20260901134553';

// Story mode. A beat/room state machine that walks through a level's beats:
// load a beat's room (arena + capabilities + spawns + exit criteria), drive the
// shared ArenaSim each frame, evaluate the exit criteria, and transition on
// completion (or reset on being caught). Beat-specific content that isn't built
// yet ('placeholder' / 'scripted' beats) is walked through with a visible
// caption so the whole level is traversable now; later steps replace those with
// real sheep/dog/dialogue/escort behavior.
export default class StoryScene extends Phaser.Scene {
  constructor() {
    super('StoryScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#12160e'); // village-ish, distinct from arcade
    this.level = LEVEL_1;
    this.beatIndex = this.devStartBeat();

    this.joystick = new VirtualJoystick(this);
    this.advanceKey = this.input.keyboard
      ? this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
      : null;

    // Per-beat objects to tear down on unload (walls, zone markers, sim).
    this.beatObjects = [];
    this.sim = null;
    this.state = 'idle'; // 'running' | 'transition' | 'done'

    this.hudText = this.add.text(12, 8, '', {
      fontFamily: 'monospace', fontSize: '15px', color: '#e8eef2',
    }).setDepth(2000);

    this.captionText = this.add.text(CONFIG.ARENA.WIDTH / 2, CONFIG.ARENA.HEIGHT / 2, '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', align: 'center',
      wordWrap: { width: CONFIG.ARENA.WIDTH - 120 },
    }).setOrigin(0.5).setDepth(2100).setVisible(false);

    // Dev-only handle for iterating/testing story beats from the console or a
    // headless driver (only when launched via the story dev hash).
    try {
      if ((location.hash || '').includes('story')) window.__story = this;
    } catch (e) { /* non-browser */ }

    this.loadBeat(this.beatIndex);
  }

  currentBeat() {
    return this.level.beats[this.beatIndex];
  }

  // Dev-only: '#story&beat=N' jumps straight to a beat for iteration/testing.
  // Ignored in the normal menu launch path.
  devStartBeat() {
    try {
      const m = (location.hash || '').match(/beat=(\d+)/);
      if (m) return Phaser.Math.Clamp(parseInt(m[1], 10), 0, this.level.beats.length - 1);
    } catch (e) { /* no location (non-browser) */ }
    return 0;
  }

  // ---- Beat lifecycle -------------------------------------------------------
  loadBeat(index) {
    this.teardownBeat();
    this.beatIndex = index;
    const beat = this.currentBeat();
    const now = this.time.now;

    // Arena walls (outer only — abstract-arena geometry).
    const walls = this.add.graphics();
    walls.lineStyle(3, 0x4a5540, 1);
    walls.strokeRect(
      CONFIG.ARENA.WALL_MARGIN, CONFIG.ARENA.WALL_MARGIN,
      CONFIG.ARENA.WIDTH - CONFIG.ARENA.WALL_MARGIN * 2,
      CONFIG.ARENA.HEIGHT - CONFIG.ARENA.WALL_MARGIN * 2
    );
    this.beatObjects.push(walls);

    // Build the sim with the capabilities this beat wants.
    this.sim = new ArenaSim(this, {
      spawn: beat.spawn || undefined,
      capabilities: this.capabilitiesFor(beat),
    });
    if (beat.trail === 'disabled') this.sim.player.trailActive = false;
    this.beatStartHealth = this.sim.player.health;

    // Spawn actors this beat needs (enemies, sheep flock, shepherd dog).
    this.targetsSpawned = 0;
    this.dog = null;
    for (const spec of beat.enemies || []) {
      const enemy = this.spawnEnemy(spec);
      if (enemy) {
        this.sim.enemies.push(enemy);
        this.targetsSpawned++;
      }
    }
    if (beat.pen) this.drawPen(beat.pen);
    if (beat.sheep) this.spawnSheep(beat);
    if (beat.dog) {
      const s = beat.spawn || { x: CONFIG.ARENA.WIDTH / 2, y: CONFIG.ARENA.HEIGHT / 2 };
      this.dog = new Dog(this, s.x + 44, s.y);
    }

    // Companion NPC (beats 6-7). Vulnerable + tracked only in survive-escort
    // beats; a bystander otherwise (spec §2).
    this.npc = null;
    this.escort = null;
    const exitList = Array.isArray(beat.exit) ? beat.exit : [beat.exit];
    this.escortCriterion = exitList.find((c) => c && c.type === EXIT_CRITERIA.SURVIVE_ESCORT) || null;
    if (beat.npc) {
      const s = beat.spawn || { x: CONFIG.ARENA.WIDTH / 2, y: CONFIG.ARENA.HEIGHT / 2 };
      const reaction = beat.npc.reaction ? new NpcReaction(beat.npc.reaction) : null;
      this.npc = new Npc(this, s.x + 30, s.y + 30, {
        reaction,
        vulnerable: !!this.escortCriterion,
      });
    }

    // Draw exit-zone markers for reach-point / escort beats.
    this.drawExitZones(beat);

    // Scripted beats run a dialogue/caption sequence; placeholder beats just
    // auto-advance on a timer (or SPACE) until their real system is built.
    this.scriptedDone = false;
    this.autoAdvanceAt = Infinity;
    if (this.script) { this.script.destroy(); this.script = null; }
    if (beat.kind === 'scripted') {
      this.script = new ScriptSequence(this, {
        lines: beat.script?.lines || [],
        advanceKey: this.advanceKey,
        onComplete: () => this.onScriptComplete(beat),
      });
      this.script.start(now);
    } else if (beat.kind === 'placeholder') {
      this.autoAdvanceAt = now + 3000;
    }

    this.state = 'running';
    this.captionText.setVisible(false);
    this.updateHud(now);
  }

  teardownBeat() {
    if (this.script) { this.script.destroy(); this.script = null; }
    if (this.dog) { this.dog.destroy(); this.dog = null; }
    if (this.npc) { this.npc.destroy(); this.npc = null; }
    if (this.sim) { this.sim.destroy(); this.sim = null; }
    for (const obj of this.beatObjects) obj.destroy();
    this.beatObjects = [];
  }

  // Place the flock in a few loose clusters, away from the pen and the player's
  // start. Each sheep is a penned-resolution chaser-variant (§1.6).
  spawnSheep(beat) {
    const { count, clusters } = beat.sheep;
    const margin = CONFIG.ARENA.WALL_MARGIN + 40;
    const avoid = [{ x: (beat.spawn || {}).x || 120, y: (beat.spawn || {}).y || 200, r: 120 }];
    if (beat.pen) avoid.push({ x: beat.pen.x, y: beat.pen.y, r: Math.max(beat.pen.w, beat.pen.h) });

    const centers = [];
    for (let i = 0; i < clusters; i++) centers.push(this.randomPoint(margin, avoid));
    for (let i = 0; i < count; i++) {
      const c = centers[i % clusters];
      const x = Phaser.Math.Clamp(c.x + Phaser.Math.Between(-40, 40), margin, CONFIG.ARENA.WIDTH - margin);
      const y = Phaser.Math.Clamp(c.y + Phaser.Math.Between(-40, 40), margin, CONFIG.ARENA.HEIGHT - margin);
      this.sim.enemies.push(new Sheep(this, x, y, { pen: beat.pen || null }));
      this.targetsSpawned++;
    }
  }

  randomPoint(margin, avoid) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const x = Phaser.Math.Between(margin, CONFIG.ARENA.WIDTH - margin);
      const y = Phaser.Math.Between(margin, CONFIG.ARENA.HEIGHT - margin);
      if (avoid.every((a) => Phaser.Math.Distance.Between(x, y, a.x, a.y) >= a.r)) return { x, y };
    }
    return { x: CONFIG.ARENA.WIDTH / 2, y: CONFIG.ARENA.HEIGHT / 2 };
  }

  drawPen(pen) {
    const g = this.add.graphics();
    g.fillStyle(0x3a2f1a, 0.35);
    g.fillRect(pen.x - pen.w / 2, pen.y - pen.h / 2, pen.w, pen.h);
    g.lineStyle(2, 0xcaa15a, 0.9);
    g.strokeRect(pen.x - pen.w / 2, pen.y - pen.h / 2, pen.w, pen.h);
    g.setDepth(250);
    this.beatObjects.push(g);
    const label = this.add.text(pen.x, pen.y - pen.h / 2 - 14, 'PEN', {
      fontFamily: 'monospace', fontSize: '13px', color: '#caa15a',
    }).setOrigin(0.5).setDepth(250);
    this.beatObjects.push(label);
  }

  // Scripted-trigger completion. Beat 3 reveals ships on the horizon before the
  // beat advances (spec §2 beat 3: dialogue complete → ships appear).
  onScriptComplete(beat) {
    if (this.script) { this.script.destroy(); this.script = null; }
    if (beat.script && beat.script.reveal === 'ships') {
      this.revealShips();
      this.showCaption('Ships appear on the horizon.');
      this.time.delayedCall(1500, () => { this.scriptedDone = true; });
    } else {
      this.scriptedDone = true;
    }
  }

  // Placeholder-shape ships along the top edge (horizon).
  revealShips() {
    const g = this.add.graphics();
    g.setDepth(200);
    const y = CONFIG.ARENA.WALL_MARGIN + 26;
    for (const x of [300, 470, 640]) {
      g.fillStyle(0x2c3e50, 1);
      g.fillRect(x - 26, y, 52, 14); // hull
      g.fillStyle(0x95a5a6, 1);
      g.fillRect(x - 2, y - 22, 4, 22); // mast
      g.fillTriangle(x + 2, y - 20, x + 2, y - 2, x + 24, y - 2); // sail
    }
    this.beatObjects.push(g);
  }

  // Compose capabilities per beat (spec §5): a 'toggle' beat gets the full
  // story kit; 'always-on' and 'disabled' beats attach none (arcade-identical
  // core), with 'disabled' just flipping trailActive off after construction.
  capabilitiesFor(beat) {
    if (beat.trail === 'toggle') {
      return [new TrailToggle(), new SneakMode(), new CutResidue()];
    }
    return [];
  }

  spawnEnemy(spec) {
    if (spec.type === 'chaser') return new Chaser(this, spec.x, spec.y);
    // sheep / dog / other NPCs land in later steps.
    console.warn(`StoryScene: enemy type '${spec.type}' not yet implemented`);
    return null;
  }

  drawExitZones(beat) {
    const zones = [];
    const list = Array.isArray(beat.exit) ? beat.exit : [beat.exit];
    for (const c of list) if (c && c.zone) zones.push(c.zone);
    for (const z of zones) {
      const marker = this.add.graphics();
      marker.fillStyle(0x2ecc71, 0.18);
      marker.fillCircle(z.x, z.y, z.radius);
      marker.lineStyle(2, 0x2ecc71, 0.8);
      marker.strokeCircle(z.x, z.y, z.radius);
      marker.setDepth(300);
      this.beatObjects.push(marker);
    }
  }

  // ---- Frame ----------------------------------------------------------------
  update(time, delta) {
    if (this.state !== 'running') return;
    const beat = this.currentBeat();
    const dt = delta / 1000;

    if (beat.kind === 'scripted') {
      if (this.script) this.script.update(time);
      if (this.scriptedDone) this.completeBeat(time);
      this.updateHud(time);
      return;
    }

    if (beat.kind === 'placeholder') {
      const skip = this.advanceKey && this.advanceKey.isDown;
      if (skip || time >= this.autoAdvanceAt) {
        this.scriptedDone = true;
        this.completeBeat(time);
      }
      this.updateHud(time);
      return;
    }

    // sim-driven beats (herding / combat / traversal): real sim.
    const vec = this.joystick.getVector(dt);
    this.sim.step(vec, time, dt);

    // Autonomous dog assist, driven after the sim step with the live flock.
    if (this.dog) {
      const flock = this.sim.enemies.filter((e) => e.constructor.type === 'sheep');
      this.dog.update(this.sim.player, this.sim.player.trail, flock, dt, time);
    }

    // Companion NPC: follow/react, take contact damage from enemies (only when
    // vulnerable), and expose escort progress for the survive-escort criterion.
    if (this.npc) {
      const player = this.sim.player;
      this.npc.update(player, player.trail, this.sim.enemies, dt, time);
      for (const e of this.sim.enemies) {
        if (e.dealsContactDamage === false) continue;
        if (Phaser.Math.Distance.Between(e.x, e.y, this.npc.x, this.npc.y) < e.radius + this.npc.radius) {
          this.npc.hurt(time);
        }
      }
      if (this.escortCriterion) {
        const zone = this.escortCriterion.zone;
        this.escort = {
          npcAlive: this.npc.alive,
          npcReached: pointInZone(this.npc.x, this.npc.y, zone),
          playerReached: pointInZone(player.x, player.y, zone),
        };
      }
    }

    // Caught / dead → reset the beat (beat 4 semantics; also our failsafe).
    const caught = beat.onFail === 'reset-beat' && this.sim.player.health < this.beatStartHealth;
    if (caught || this.sim.player.health <= 0) {
      this.reloadBeat(time, caught ? 'Caught! Restarting…' : 'Down! Restarting…');
      return;
    }

    const ctx = {
      sim: this.sim,
      targetsSpawned: this.targetsSpawned,
      scriptedDone: this.scriptedDone,
      escort: this.escort, // undefined until the escort step
    };
    const res = evaluateExit(beat.exit, ctx);
    if (res.failed) { this.reloadBeat(time, 'Objective failed. Restarting…'); return; }
    if (res.complete) { this.completeBeat(time); return; }

    this.updateHud(time);
  }

  // ---- Transitions ----------------------------------------------------------
  completeBeat(time) {
    this.state = 'transition';
    const last = this.beatIndex >= this.level.beats.length - 1;
    this.showCaption(last
      ? `${this.level.name} complete.`
      : `${this.currentBeat().name} — complete.`);
    this.time.delayedCall(1200, () => {
      if (last) { this.state = 'done'; return; }
      this.loadBeat(this.beatIndex + 1);
    });
  }

  reloadBeat(time, message) {
    this.state = 'transition';
    this.showCaption(message);
    this.time.delayedCall(900, () => this.loadBeat(this.beatIndex));
  }

  showCaption(text) {
    this.captionText.setText(text).setVisible(true);
  }

  updateHud(time) {
    const beat = this.currentBeat();
    let line3 = '';
    if (beat.kind === 'herding') {
      const left = this.sim.enemies.filter((e) => e.constructor.type === 'sheep').length;
      line3 = `Sheep to pen: ${left}`;
    } else if (beat.kind === 'escort') {
      const hp = this.npc && this.npc.alive ? this.npc.health : 0;
      line3 = `Get to the marker together — prisoner HP: ${hp}   Enemies: ${this.sim.enemies.length}`;
    } else if (beat.kind === 'combat') {
      line3 = `Enemies left: ${this.sim.enemies.length}`;
    } else if (beat.kind === 'traversal') {
      line3 = 'Reach the marker.';
    } else if (beat.kind === 'scripted') {
      line3 = ''; // the dialogue box carries the text
    } else if (beat.kind === 'placeholder') {
      line3 = `${beat.placeholderNote || ''} (SPACE / auto-continue)`;
    }
    this.hudText.setText(
      `Beat ${this.beatIndex + 1}/${this.level.beats.length} — ${beat.name}\n` +
      `${beat.objective}\n` +
      line3
    );
  }
}
