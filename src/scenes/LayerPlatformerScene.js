import Phaser from "phaser";
import { createGameTextures, SfxBus, TEXTURES } from "../assets.js";
import { LEVELS, POWER_COPY } from "../data/levels.js";
import { PlayerController, overlapsRect, PLAYER_SIZE } from "../player/PlayerController.js";
import { GameUi, ProgressStore } from "../ui/GameUi.js";

const MAIN_LEVEL_IDS = LEVELS.filter((level) => !level.isHub).map((level) => level.id);
const HUB_LEVEL_INDEX = LEVELS.findIndex((level) => level.isHub);

export class LayerPlatformerScene extends Phaser.Scene {
  constructor() {
    super("LayerPlatformerScene");
  }

  create() {
    this.levelIndex = 0;
    this.currentLayer = 0;
    this.layerShiftCooldown = 0;
    this.layerPulse = 0;
    this.powerNotice = "";
    this.powerNoticeTimer = 0;
    this.padPrevious = {};
    this.collected = new Set();
    this.levelElapsedMs = 0;
    this.levelDeaths = 0;
    this.enteredFromHub = false;
    this.doorCooldown = 0;
    this.powers = {
      doubleJump: false,
      dash: false,
      wallGrip: false,
      drift: false
    };

    this.sfx = new SfxBus(this);
    this.progress = new ProgressStore();
    this.ui = new GameUi(this);
    this.materials = createGameTextures(this);
    this.createControls();
    this.setLevel(this.getInitialLevelIndex(), true);

    this.input.gamepad?.once("connected", (pad) => {
      this.showNotice(`${pad.id} connected`, 2.2);
    });
  }

  setLevel(levelIndex, announce = false, options = {}) {
    this.destroyLevelViews();
    this.levelIndex = Phaser.Math.Clamp(levelIndex, 0, LEVELS.length - 1);
    this.level = LEVELS[this.levelIndex];
    this.progress.setLastLevelId(this.level.id);
    if (this.level.isHub && !options.shortcut) {
      this.progress.markHubReached();
    }
    this.activeCheckpoint = this.getSavedCheckpoint();
    this.currentLayer = this.activeCheckpoint.layer;
    this.layerShiftCooldown = 0;
    this.layerPulse = 0;
    this.levelElapsedMs = 0;
    this.levelDeaths = 0;
    this.enteredFromHub = Boolean(options.fromHub);
    this.doorCooldown = 0;

    this.createBackground();
    this.createLayers();
    this.createGoal();
    this.createHubObjects();
    this.createCheckpointObjects();

    if (!this.playerController) {
      this.playerController = new PlayerController(this, this.activeCheckpoint, this.powers, {
        solids: () => this.getCurrentSolids(),
        worldBounds: () => ({ width: this.level.width, height: this.level.height }),
        layerPulse: () => this.layerPulse,
        playSfx: (name) => this.sfx.play(name)
      });
    } else {
      this.playerController.reset(this.activeCheckpoint);
    }

    this.cameras.main.setBounds(0, 0, this.level.width, this.level.height);
    this.cameras.main.startFollow(this.playerController.sprite, true, 0.12, 0.1, 0, 86);
    this.cameras.main.setDeadzone(150, 92);

    if (announce) {
      this.showNotice(`${this.level.title} - ${this.level.hint}`, 4);
      this.ui.showCenter(this.level.title, 1400);
    }
  }

  getInitialLevelIndex() {
    const lastLevelId = this.progress.lastLevelId();
    const lastIndex = LEVELS.findIndex((level) => level.id === lastLevelId);
    return lastIndex >= 0 ? lastIndex : 0;
  }

  getSavedCheckpoint() {
    const stored = this.progress.checkpoint(this.level.id);
    if (stored) {
      return this.normalizeCheckpoint(stored, this.level.start);
    }
    return this.normalizeCheckpoint(this.level.start, this.level.start);
  }

  normalizeCheckpoint(checkpoint, fallback) {
    const source = checkpoint ?? fallback;
    const fallbackLayer = Number.isFinite(fallback?.layer) ? fallback.layer : 0;
    const layer = this.getCheckpointLayer(source, fallbackLayer);
    const vx = Number.isFinite(source.vx) ? source.vx : Number.isFinite(fallback.vx) ? fallback.vx : 0;
    const vy = Number.isFinite(source.vy) ? source.vy : Number.isFinite(fallback.vy) ? fallback.vy : 0;
    const facing = source.facing === -1 || fallback.facing === -1 || vx < 0 ? -1 : 1;

    return {
      id: source.id,
      x: Number.isFinite(source.x) ? source.x : fallback.x,
      y: Number.isFinite(source.y) ? source.y : fallback.y,
      layer,
      vx,
      vy,
      facing
    };
  }

  getCheckpointLayer(checkpoint, fallbackLayer = this.currentLayer) {
    const rawLayer = Number.isFinite(checkpoint?.layer) ? checkpoint.layer : fallbackLayer;
    return Phaser.Math.Clamp(Math.trunc(rawLayer), 0, this.level.layers.length - 1);
  }

  destroyLevelViews() {
    this.backgroundViews?.forEach((view) => view.destroy());
    this.goalView?.destroy();
    this.doorViews?.forEach((view) => view.destroy());
    this.checkpointViews?.forEach((view) => view.destroy());
    this.layerViews?.forEach((view) => view.destroy());
    this.trophyView?.destroy();
    this.backgroundViews = [];
    this.layerViews = [];
    this.movingPlatforms = [];
    this.doorViews = [];
    this.checkpointViews = [];
    this.goalView = null;
    this.trophyView = null;
  }

  createBackground() {
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x191b1c, 0x191b1c, 0x263033, 0x263033, 1);
    sky.fillRect(0, 0, this.level.width, this.level.height);
    sky.setScrollFactor(0.15, 0.1);
    sky.setDepth(-200);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x5fe0b8, 0.08);
    for (let x = 0; x < this.level.width; x += 120) {
      grid.lineBetween(x, 0, x - 220, this.level.height);
    }
    grid.lineStyle(1, 0xfff3b0, 0.06);
    for (let y = 100; y < this.level.height; y += 92) {
      grid.lineBetween(0, y, this.level.width, y + 40);
    }
    grid.setDepth(-190);
    grid.setScrollFactor(0.35, 0.1);
    this.backgroundViews = [sky, grid];
  }

  createLayers() {
    this.layerViews = this.level.layers.map((layer, layerIndex) => {
      const container = this.add.container(0, 0);
      container.setSize(this.level.width, this.level.height);

      layer.solids.forEach(([x, y, w, h], solidIndex) => {
        const block = this.add.image(
          x + w / 2,
          y + h / 2,
          this.materials.getPlatformTexture({
            levelId: this.level.id,
            layerIndex,
            solidIndex,
            width: w,
            height: h,
            color: layer.color,
            accent: layer.accent
          })
        );
        container.add(block);
      });

      layer.movingSolids.forEach((solid, movingIndex) => {
        const image = this.add.image(
          solid.x + solid.width / 2,
          solid.y + solid.height / 2,
          this.materials.getPlatformTexture({
            levelId: `${this.level.id}:moving`,
            layerIndex,
            solidIndex: movingIndex,
            width: solid.width,
            height: solid.height,
            color: layer.color,
            accent: layer.accent
          })
        );
        image.setTint(0xffffff);
        container.add(image);
        this.movingPlatforms.push({
          data: solid,
          layerIndex,
          image,
          rect: [solid.x, solid.y, solid.width, solid.height],
          previousRect: [solid.x, solid.y, solid.width, solid.height]
        });
      });

      const label = this.add
        .text(26, 38 + layerIndex * 28, `${layer.short} ${layer.name}`, {
          fontFamily: "monospace",
          fontSize: "18px",
          color: "#ffffff"
        })
        .setAlpha(0.36)
        .setScrollFactor(0);
      container.add(label);

      layer.pickups.forEach((pickup) => {
        const sprite = this.add.sprite(pickup.x, pickup.y, TEXTURES.pickup);
        sprite.setTint(layer.accent);
        sprite.setData("pickup", pickup);
        container.add(sprite);

        const halo = this.add.circle(pickup.x, pickup.y, 20, layer.accent, 0.14);
        halo.setData("pickupHalo", pickup);
        container.add(halo);
      });

      return container;
    });
  }

  createGoal() {
    if (!this.level.goal) return;

    const goal = this.level.goal;
    this.goalView = this.add.container(goal.x + goal.width / 2, goal.y + goal.height / 2);

    const field = this.add.image(
      0,
      0,
      this.materials.getGoalFieldTexture({ levelId: this.level.id, width: goal.width, height: goal.height })
    );
    const icon = this.add.sprite(0, -goal.height / 2 + 24, TEXTURES.goal);
    icon.setTint(0xfff7ad);
    const text = this.add.text(0, goal.height / 2 - 26, "EXIT", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#fff7ad"
    });
    text.setOrigin(0.5);

    this.goalView.add([field, icon, text]);
    this.goalView.setDepth(42);
  }

  createHubObjects() {
    this.doorViews = [];

    this.level.doors?.forEach((door) => {
      const unlocked = this.isDoorUnlocked(door);
      const view = this.add.container(door.x + door.width / 2, door.y + door.height / 2);
      const sprite = this.add.image(0, 0, unlocked ? TEXTURES.door : TEXTURES.lockedDoor);
      const label = this.add.text(0, 54, unlocked ? door.label : `${door.label} LOCKED`, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: unlocked ? "#fff7ad" : "#aeb8b7",
        align: "center"
      });
      label.setOrigin(0.5);
      view.add([sprite, label]);
      view.setData("door", door);
      view.setDepth(42);
      this.doorViews.push(view);
    });

    if (this.level.trophy && !this.progress.hasTrophy()) {
      const trophy = this.level.trophy;
      this.trophyView = this.add.sprite(trophy.x, trophy.y, TEXTURES.trophy);
      this.trophyView.setDepth(44);
    }
  }

  createCheckpointObjects() {
    this.checkpointViews = [];

    this.level.checkpoints?.forEach((checkpoint) => {
      const layerIndex = this.getCheckpointLayer(checkpoint);
      const layer = this.level.layers[layerIndex];
      const view = this.add.container(checkpoint.x, checkpoint.y - 28);
      const ring = this.add.circle(0, 0, 16, layer.accent, 0.18);
      ring.setStrokeStyle(2, layer.accent, 0.72);
      const pin = this.add.rectangle(0, 18, 4, 30, layer.accent, 0.72);
      view.add([ring, pin]);
      view.setData("checkpoint", checkpoint);
      view.setData("layerIndex", layerIndex);
      this.layerViews[layerIndex].add(view);
      this.checkpointViews.push(view);
    });
  }

  getSolidsForLayer(layerIndex) {
    const layer = this.level.layers[layerIndex];
    if (!layer) return [];
    return [
      ...layer.solids,
      ...this.movingPlatforms
        .filter((platform) => platform.layerIndex === layerIndex)
        .map((platform) => platform.rect)
    ];
  }

  getCurrentSolids() {
    return this.getSolidsForLayer(this.currentLayer);
  }

  isSpawnOverlappingSolid(px, py, solids) {
    return solids.some((solid) => overlapsRect(px, py, PLAYER_SIZE.width, PLAYER_SIZE.height, solid));
  }

  isGroundedAtCheckpoint(px, py, solids) {
    const footY = py + PLAYER_SIZE.height;
    for (const solid of solids) {
      const [sx, sy, sw] = solid;
      const solidTop = sy;
      if (footY <= solidTop + 1 && footY >= solidTop - 4) {
        if (px + PLAYER_SIZE.width > sx && px < sx + sw) {
          return true;
        }
      }
    }
    return false;
  }

  getMomentumForCheckpoint(checkpoint) {
    const state = this.playerController?.state;
    if (!state) return {};

    const px = Number.isFinite(checkpoint.x) ? checkpoint.x : state.x;
    const py = Number.isFinite(checkpoint.y) ? checkpoint.y : state.y;
    const layer = this.getCheckpointLayer(checkpoint);
    const solids = this.getSolidsForLayer(layer);

    let vx = state.vx;
    let vy = state.vy;

    if (this.isSpawnOverlappingSolid(px, py, solids)) {
      vx = 0;
      vy = 0;
    } else if (this.isGroundedAtCheckpoint(px, py, solids)) {
      vy = 0;
    }

    const facing = vx < 0 ? -1 : 1;
    return { vx, vy, facing };
  }

  updateMovingPlatforms(time) {
    const seconds = time / 1000;

    this.movingPlatforms.forEach((platform) => {
      const { data } = platform;
      const phase = (data.phase ?? 0) * Math.PI * 2;
      const offset = Math.sin(seconds * data.speed * Math.PI * 2 + phase) * data.distance * 0.5;
      const x = data.x + (data.axis === "x" ? offset : 0);
      const y = data.y + (data.axis === "y" ? offset : 0);

      platform.previousRect = [...platform.rect];
      platform.rect[0] = x;
      platform.rect[1] = y;
      platform.rect[2] = data.width;
      platform.rect[3] = data.height;
      platform.image.setPosition(x + data.width / 2, y + data.height / 2);
    });
  }

  carryPlayerOnMovingPlatforms() {
    const player = this.playerController?.state;
    if (!player) return;

    const playerBottom = player.y + PLAYER_SIZE.height;
    const platform = this.movingPlatforms.find((candidate) => {
      if (candidate.layerIndex !== this.currentLayer) return false;

      const [x, y, w] = candidate.previousRect;
      const overlapsX = player.x + PLAYER_SIZE.width > x + 4 && player.x < x + w - 4;
      const nearTop = playerBottom >= y - 8 && playerBottom <= y + 6;
      return overlapsX && nearTop && player.vy >= -40;
    });

    if (!platform) return;

    const dx = platform.rect[0] - platform.previousRect[0];
    const dy = platform.rect[1] - platform.previousRect[1];
    this.playerController.moveWithPlatform(dx, dy, platform.rect);
  }

  createControls() {
    const keyboard = this.input.keyboard;
    const key = (code) => keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[code]);
    keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.H);
    keyboard.on("keydown-H", (event) => this.handleHubShortcut(event));
    this.keys = {
      left: [key("A"), key("LEFT")],
      right: [key("D"), key("RIGHT")],
      up: [key("W"), key("UP"), key("NUMPAD_EIGHT")],
      down: [key("S"), key("DOWN"), key("NUMPAD_TWO")],
      jump: [key("SPACE"), key("Z")],
      dash: [key("SHIFT"), key("X")]
    };
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.033);
    const controls = this.readControls();

    this.tickTimers(dt);
    this.updateMovingPlatforms(time);
    this.carryPlayerOnMovingPlatforms();
    this.handleLayerShift(controls);

    const result = this.playerController.update(dt, controls);
    if (result.fell) {
      this.respawn();
    }

    this.collectPickups(time);
    this.checkCheckpoints();
    this.checkTrophy(time);
    this.checkDoors(controls);
    this.checkGoal();
    this.updateViews(time);
    this.playerController.updateVisuals(time, this.level.layers[this.currentLayer].accent);
    this.updateHud();
  }

  readControls() {
    const keyboardHeld = (name) => this.keys[name].some((key) => key.isDown);
    const keyboardEdge = (name) => this.keys[name].some((key) => Phaser.Input.Keyboard.JustDown(key));

    const pad = this.input.gamepad?.pad1;
    let padX = 0;
    let padY = 0;
    const padNow = {
      jump: false,
      dash: false,
      layerUp: false,
      layerDown: false
    };

    if (pad) {
      padX = pad.axes.length ? pad.axes[0].getValue() : 0;
      padY = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
      padNow.jump = Boolean(pad.buttons[0]?.pressed);
      padNow.dash = Boolean(pad.buttons[2]?.pressed || pad.buttons[5]?.pressed);
      padNow.layerUp = Boolean(pad.buttons[12]?.pressed || padY < -0.65);
      padNow.layerDown = Boolean(pad.buttons[13]?.pressed || padY > 0.65);
      if (pad.buttons[14]?.pressed) padX = -1;
      if (pad.buttons[15]?.pressed) padX = 1;
    }

    const edge = (name, value) => {
      const previous = this.padPrevious[name] ?? false;
      this.padPrevious[name] = value;
      return value && !previous;
    };

    const axisX = keyboardHeld("left") ? -1 : keyboardHeld("right") ? 1 : Math.abs(padX) > 0.22 ? padX : 0;

    return {
      x: Phaser.Math.Clamp(axisX, -1, 1),
      jumpHeld: keyboardHeld("jump") || padNow.jump,
      jumpPressed: keyboardEdge("jump") || edge("jump", padNow.jump),
      dashPressed: keyboardEdge("dash") || edge("dash", padNow.dash),
      layerUpPressed: keyboardEdge("up") || edge("layerUp", padNow.layerUp),
      layerDownPressed: keyboardEdge("down") || edge("layerDown", padNow.layerDown)
    };
  }

  handleHubShortcut(event) {
    if (!event.ctrlKey) return;

    event.preventDefault();

    if (!this.progress.hasReachedHub()) {
      this.showNotice("Hub shortcut locked until you reach the hub", 2.4);
      this.sfx.play("fail");
      return;
    }

    if (this.levelIndex === HUB_LEVEL_INDEX) {
      this.showNotice("Already in the hub", 1.5);
      return;
    }

    this.sfx.play("layer");
    this.setLevel(HUB_LEVEL_INDEX, true, { shortcut: true });
    this.ui.showCenter("Hub recall", 1400);
  }

  tickTimers(dt) {
    this.layerShiftCooldown = Math.max(0, this.layerShiftCooldown - dt);
    this.layerPulse = Math.max(0, this.layerPulse - dt);
    this.powerNoticeTimer = Math.max(0, this.powerNoticeTimer - dt);
    this.doorCooldown = Math.max(0, this.doorCooldown - dt);
    this.levelElapsedMs += dt * 1000;
  }

  handleLayerShift(controls) {
    if (this.layerShiftCooldown > 0) return;

    if (controls.layerUpPressed) {
      this.shiftLayer(1);
    } else if (controls.layerDownPressed) {
      this.shiftLayer(-1);
    }
  }

  shiftLayer(delta) {
    const next = Phaser.Math.Clamp(this.currentLayer + delta, 0, this.level.layers.length - 1);
    if (next === this.currentLayer) return;

    this.currentLayer = next;
    this.layerShiftCooldown = 0.16;
    this.layerPulse = 0.24;
    this.playerController.boostCoyote(0.08);

    const center = this.playerController.getCenter();
    this.playerController.emitSparks(center.x, center.y, 18);
    this.sfx.play("layer");

    if (this.playerController.overlapsAnySolid()) {
      const resolution = this.playerController.resolveLayerSwitchOverlap();
      if (resolution.status === "telefrag") {
        this.telefragPlayer();
      }
    }
  }

  collectPickups(time) {
    const layer = this.level.layers[this.currentLayer];
    layer.pickups.forEach((pickup) => {
      const key = `${this.level.id}:${this.currentLayer}:${pickup.type}`;
      if (this.collected.has(key)) return;

      if (this.playerController.overlaps([pickup.x - 17, pickup.y - 17, 34, 34])) {
        this.collected.add(key);
        this.powers[pickup.type] = true;
        this.showNotice(POWER_COPY[pickup.type], 3.4);
        this.playerController.emitSparks(pickup.x, pickup.y, 34);
        this.sfx.play("pickup");
        this.cameras.main.shake(130, 0.004);
      }
    });
  }

  checkCheckpoints() {
    const checkpoint = this.level.checkpoints?.find((candidate) => this.isCheckpointCollectable(candidate));

    if (!checkpoint) return;
    if (checkpoint.id === this.activeCheckpoint.id && this.getCheckpointLayer(checkpoint) === this.activeCheckpoint.layer) {
      return;
    }

    this.setActiveCheckpoint(checkpoint, true);
  }

  isCheckpointCollectable(checkpoint) {
    return (
      this.getCheckpointLayer(checkpoint) === this.currentLayer &&
      this.playerController.overlaps([checkpoint.x - 18, checkpoint.y - 42, 36, 84])
    );
  }

  setActiveCheckpoint(checkpoint, announce = false) {
    this.activeCheckpoint = this.normalizeCheckpoint({
      ...checkpoint,
      ...this.getMomentumForCheckpoint(checkpoint)
    }, {
      ...this.level.start,
      layer: this.currentLayer
    });
    this.progress.setCheckpoint(this.level.id, this.activeCheckpoint);
    this.currentLayer = this.activeCheckpoint.layer;

    if (announce) {
      this.sfx.play("pickup");
      this.showNotice("Checkpoint linked", 1.8);
    }
  }

  dropCheckpoint() {
    const { x, y } = this.playerController.state;
    this.setActiveCheckpoint({ id: "player-dropped", x, y, layer: this.currentLayer }, true);
  }

  clearDroppedCheckpoint() {
    if (this.activeCheckpoint.id !== "player-dropped") return;

    this.progress.clearCheckpoint(this.level.id);
    this.activeCheckpoint = this.normalizeCheckpoint(this.level.start, this.level.start);
    this.currentLayer = this.activeCheckpoint.layer;
    this.showNotice("Dropped checkpoint recovered", 1.8);
  }

  checkGoal() {
    if (!this.level.goal) return;

    const goal = this.level.goal;
    if (!this.playerController.overlaps([goal.x, goal.y, goal.width, goal.height])) return;

    this.completeLevel();
  }

  completeLevel() {
    this.sfx.play("goal");
    const completedLevel = this.level;
    const entry = this.progress.record(this.level, this.levelElapsedMs, this.levelDeaths);
    const boardText = this.ui.leaderboardText(completedLevel, entry);

    if (this.enteredFromHub || this.levelIndex === HUB_LEVEL_INDEX - 1) {
      this.setLevel(HUB_LEVEL_INDEX, true);
      this.ui.showCenter(boardText, 4200);
      return;
    }

    this.setLevel(this.levelIndex + 1, true);
    this.ui.showCenter(boardText, 4200);
  }

  checkTrophy(time) {
    if (!this.level.trophy || this.progress.hasTrophy()) return;

    const trophy = this.level.trophy;
    if (!this.playerController.overlaps([trophy.x - trophy.width / 2, trophy.y - trophy.height / 2, trophy.width, trophy.height])) {
      return;
    }

    this.progress.setTrophyCollected();
    this.trophyView?.destroy();
    this.trophyView = null;
    this.sfx.play("trophy");
    this.ui.showCenter("ROUTE COMPLETE\nTrophy claimed", 4200);
    this.showNotice("Well done. The hub doors are open for replay routes.", 4);
    this.emitFireworks(trophy.x, trophy.y, time);
  }

  emitFireworks(x, y, time) {
    for (let burst = 0; burst < 7; burst += 1) {
      this.time.delayedCall(burst * 180, () => {
        const angle = burst * 0.9;
        const px = x + Math.cos(angle) * (40 + burst * 22);
        const py = y - 30 - Math.sin(angle) * 70;
        this.playerController.emitSparks(px, py, 28);
        this.sfx.play("firework");
      });
    }
  }

  checkDoors(controls) {
    if (!this.level.isHub || !controls.jumpPressed || this.doorCooldown > 0) return;

    const doorView = this.doorViews.find((view) => {
      const door = view.getData("door");
      return this.playerController.overlaps([door.x, door.y, door.width, door.height]);
    });

    if (!doorView) return;

    const door = doorView.getData("door");
    this.doorCooldown = 0.35;

    if (!this.isDoorUnlocked(door)) {
      const reason = door.future ? `Locked: future route needs ${door.requiredPower}` : "Locked: complete this route first";
      this.showNotice(reason, 2.4);
      this.sfx.play("fail");
      return;
    }

    const targetIndex = LEVELS.findIndex((level) => level.id === door.levelId);
    if (targetIndex === -1) return;

    this.setLevel(targetIndex, true, { fromHub: true });
  }

  isDoorUnlocked(door) {
    return !door.future && this.progress.isCompleted(door.levelId);
  }

  updateViews(time) {
    this.layerViews.forEach((container, index) => {
      const rel = index - this.currentLayer;
      const front = rel < 0;
      const behind = rel > 0;
      const distance = Math.abs(rel);
      const yOffset = rel === 0 ? 0 : front ? distance * 32 : -distance * 24;
      const alpha = front ? Math.max(0.13, 0.34 - distance * 0.08) : 1;

      container.y = rel === 0 ? 0 : yOffset;
      container.setAlpha(alpha);
      container.setDepth(rel === 0 ? 40 : front ? 56 - distance : 16 - distance);
      this.setLayerBlur(container, behind ? distance : 0);
      this.setLayerTone(container, behind ? distance : 0);
      container.list.forEach((child) => this.updatePickupVisual(child, index, time));
    });

    if (this.goalView) {
      this.goalView.setDepth(43);
      this.goalView.setAlpha(0.7 + Math.sin(time / 220) * 0.12);
    }

    if (this.trophyView) {
      this.trophyView.y = this.level.trophy.y + Math.sin(time / 180) * 6;
      this.trophyView.setAngle(Math.sin(time / 240) * 5);
    }
  }

  setLayerBlur(container, distance) {
    const existing = container.getData("blurFx");

    if (distance <= 0) {
      this.clearLayerEffects(container);
      return;
    }

    const strength = 0.45 + distance * 0.32;

    if (existing) {
      existing.x = strength;
      existing.y = strength;
      existing.strength = strength;
      return;
    }

    try {
      container.setData("blurFx", container.postFX.addBlur(0, strength, strength, strength, 0xffffff, 3));
    } catch {
      container.setData("blurFx", null);
    }
  }

  setLayerTone(container, distance) {
    const existing = container.getData("toneFx");

    if (distance <= 0) {
      this.clearLayerEffects(container);
      return;
    }

    const desaturation = Math.min(0.58, 0.2 + distance * 0.1);
    const brightness = Math.max(0.62, 0.9 - distance * 0.07);
    const fx = existing ?? container.postFX.addColorMatrix();

    fx.reset();
    fx.saturate(-desaturation);
    fx.brightness(brightness, true);

    if (!existing) {
      container.setData("toneFx", fx);
    }
  }

  clearLayerEffects(container) {
    if (!container.getData("blurFx") && !container.getData("toneFx")) return;

    try {
      container.clearFX();
    } catch {
      const blur = container.getData("blurFx");
      const tone = container.getData("toneFx");
      if (blur) container.postFX.remove(blur);
      if (tone) container.postFX.remove(tone);
    }

    container.setData("blurFx", null);
    container.setData("toneFx", null);
  }

  updatePickupVisual(child, layerIndex, time) {
    const pickup = child.getData?.("pickup");
    const pickupHalo = child.getData?.("pickupHalo");
    if (!pickup && !pickupHalo) return;

    const targetPickup = pickup ?? pickupHalo;
    const pickupKey = `${this.level.id}:${layerIndex}:${targetPickup.type}`;

    if (this.collected.has(pickupKey)) {
      child.setVisible(false);
      return;
    }

    child.setVisible(true);
    if (pickup) {
      child.y = pickup.y + Math.sin(time / 180 + layerIndex) * 5;
      child.setRotation(time / 900);
    } else {
      child.setPosition(targetPickup.x, targetPickup.y);
      child.setScale(1 + Math.sin(time / 220 + layerIndex) * 0.08);
    }
  }

  updateHud() {
    const bestTime = this.progress.bestTime(this.level.id);
    const fewestDeaths = this.progress.fewestDeaths(this.level.id);
    const completed = this.progress.completedCount(MAIN_LEVEL_IDS);
    const hubStatus = this.level.isHub
      ? `Routes ${completed}/${MAIN_LEVEL_IDS.length} | Trophy ${this.progress.hasTrophy() ? "claimed" : "waiting"} | Jump into an unlocked door`
      : null;

    this.ui.update({
      level: this.level,
      layerIndex: this.currentLayer,
      powers: this.powers,
      timeMs: this.levelElapsedMs,
      deaths: this.levelDeaths,
      bestTime,
      fewestDeaths,
      notice: this.powerNoticeTimer > 0 ? this.powerNotice : "",
      hubStatus,
      checkpointId: this.activeCheckpoint.id
    });
  }

  telefragPlayer() {
    const center = this.playerController.getCenter();
    this.emitTelefragExplosion(center.x, center.y);
    this.sfx.play("telefrag");
    this.cameras.main.flash(130, 255, 116, 94);
    this.cameras.main.shake(220, 0.013);
    this.respawn({ sfx: false, notice: "Telefragged inside the new layer" });
  }

  emitTelefragExplosion(x, y) {
    this.playerController.emitSparks(x, y, 86);

    [0x48c7e8, 0xf15bb5, 0xffd166].forEach((color, index) => {
      const ring = this.add.circle(x, y, 12 + index * 5);
      ring.setStrokeStyle(3 - index * 0.45, color, 0.88);
      ring.setFillStyle(color, 0.04);
      ring.setDepth(80 + index);
      ring.setScale(0.18);

      this.tweens.add({
        targets: ring,
        alpha: 0,
        scale: 4.8 + index * 1.2,
        duration: 420 + index * 90,
        ease: "Cubic.easeOut",
        onComplete: () => ring.destroy()
      });
    });

    for (let i = 0; i < 10; i += 1) {
      const shard = this.add.rectangle(x, y, 3 + (i % 3), 14 + (i % 4) * 3, 0xffffff, 0.9);
      shard.setDepth(82);
      shard.setAngle(i * 36);

      this.tweens.add({
        targets: shard,
        x: x + Math.cos(i * 0.628) * (42 + (i % 4) * 16),
        y: y + Math.sin(i * 0.628) * (34 + (i % 3) * 15),
        alpha: 0,
        scaleY: 0.2,
        duration: 360 + (i % 5) * 35,
        ease: "Quad.easeOut",
        onComplete: () => shard.destroy()
      });
    }
  }

  respawn(options = {}) {
    this.levelDeaths += 1;
    if (options.sfx !== false) {
      this.sfx.play("fail");
    }
    this.currentLayer = this.activeCheckpoint.layer;
    this.playerController.reset(this.activeCheckpoint);
    this.showNotice(options.notice ?? `Returned to ${this.activeCheckpoint.id ? "checkpoint" : this.level.title}`, 2);
  }

  showNotice(message, duration) {
    this.powerNotice = message;
    this.powerNoticeTimer = duration;
  }
}
