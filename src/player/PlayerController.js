import Phaser from "phaser";
import { TEXTURES } from "../assets.js";

export const PLAYER_SIZE = { width: 30, height: 42 };

const moveTowards = (value, target, maxDelta) => {
  if (Math.abs(target - value) <= maxDelta) return target;
  return value + Math.sign(target - value) * maxDelta;
};

export const overlapsRect = (x, y, width, height, rect) =>
  x < rect[0] + rect[2] && x + width > rect[0] && y < rect[1] + rect[3] && y + height > rect[1];

export class PlayerController {
  constructor(scene, start, powers, environment) {
    this.scene = scene;
    this.powers = powers;
    this.environment = environment;
    this.state = this.createState(start);
    this.fellOut = false;
    this.ignoredSolids = new Set();
    this.createVisuals();
  }

  createState(start) {
    const vx = Number.isFinite(start.vx) ? start.vx : 0;
    const vy = Number.isFinite(start.vy) ? start.vy : 0;
    const facing = start.facing === -1 || vx < 0 ? -1 : 1;

    return {
      x: start.x,
      y: start.y,
      vx,
      vy,
      facing,
      onGround: false,
      coyote: 0,
      jumpBuffer: 0,
      airJumps: 0,
      dashTimer: 0,
      dashCooldown: 0,
      contacts: { left: false, right: false, ceiling: false }
    };
  }

  createVisuals() {
    const center = this.getCenter();
    this.sprite = this.scene.add.sprite(center.x, center.y, TEXTURES.player);
    this.sprite.setDepth(45);

    this.light = this.scene.add.circle(center.x, center.y, 48, 0xffffff, 0.12);
    this.light.setDepth(44);

    this.dashParticles = this.scene.add.particles(0, 0, TEXTURES.trail, {
      lifespan: 260,
      speed: { min: 60, max: 190 },
      scale: { start: 2.2, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0x48c7e8, 0xf15bb5, 0xffca3a],
      quantity: 0,
      emitting: false
    });
    this.dashParticles.setDepth(43);

    this.sparkParticles = this.scene.add.particles(0, 0, TEXTURES.spark, {
      lifespan: 320,
      speed: { min: 80, max: 260 },
      scale: { start: 0.9, end: 0 },
      rotate: { min: 0, max: 360 },
      alpha: { start: 0.85, end: 0 },
      tint: [0xffffff, 0x00f5d4, 0xffd166],
      quantity: 0,
      emitting: false
    });
    this.sparkParticles.setDepth(60);
  }

  reset(start) {
    this.state = this.createState(start);
    this.fellOut = false;
    this.ignoredSolids.clear();
    this.updateVisuals(0, 0xffffff);
  }

  update(dt, controls) {
    this.fellOut = false;
    this.refreshIgnoredSolids();
    this.tickTimers(dt);
    this.handleJumpInput(controls);
    this.handleDashInput(controls);
    this.integrate(dt, controls);
    return { fell: this.fellOut };
  }

  updateVisuals(time, layerAccent) {
    const p = this.state;
    const center = this.getCenter();

    this.sprite.setPosition(center.x, center.y);
    this.sprite.setFlipX(p.facing < 0);
    this.sprite.setAngle(p.dashTimer > 0 ? p.facing * 8 : 0);
    this.sprite.setTint(this.powers.drift && p.vy > 90 ? 0xa8dadc : 0xffffff);

    this.light.setPosition(center.x, center.y);
    this.light.setFillStyle(layerAccent, this.environment.layerPulse() > 0 ? 0.22 : 0.1);

    if (p.dashTimer > 0) {
      this.dashParticles.emitParticleAt(center.x - p.facing * 14, center.y, 4);
    }
  }

  tickTimers(dt) {
    const p = this.state;
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    p.coyote = Math.max(0, p.coyote - dt);
    p.dashTimer = Math.max(0, p.dashTimer - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  }

  handleJumpInput(controls) {
    const p = this.state;
    if (controls.jumpPressed) {
      p.jumpBuffer = 0.13;
    }

    if (!controls.jumpHeld && p.vy < -210) {
      p.vy *= 0.58;
    }

    if (p.jumpBuffer <= 0) return;

    const wallSide = this.getWallSide();
    if (p.onGround || p.coyote > 0) {
      this.doJump(-510, "jump");
    } else if (this.powers.wallGrip && wallSide !== 0) {
      p.vx = wallSide * -420;
      p.facing = wallSide * -1;
      this.doJump(-470, "jump");
    } else if (this.powers.doubleJump && p.airJumps < 1) {
      p.airJumps += 1;
      this.doJump(-475, "doubleJump");
    } else if (this.powers.dash && p.dashTimer > 0) {
      this.doJump(-560, "doubleJump");
      p.vx += p.facing * 190;
    }
  }

  doJump(force, sfxName) {
    const p = this.state;
    p.vy = force;
    p.onGround = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
    this.emitSparks(this.getCenter().x, p.y + PLAYER_SIZE.height, sfxName === "doubleJump" ? 16 : 10);
    this.environment.playSfx(sfxName);
  }

  handleDashInput(controls) {
    const p = this.state;
    if (!controls.dashPressed || !this.powers.dash || p.dashCooldown > 0) return;

    const xDir = controls.x !== 0 ? Math.sign(controls.x) : p.facing;
    p.vx = xDir * 760;
    p.vy = Math.min(p.vy, -55);
    p.dashTimer = 0.18;
    p.dashCooldown = 0.55;
    p.facing = xDir;
    this.emitSparks(this.getCenter().x, this.getCenter().y, 22);
    this.environment.playSfx("dash");
  }

  integrate(dt, controls) {
    const p = this.state;
    const previousWallSide = this.getWallSide();
    p.contacts = { left: false, right: false, ceiling: false };

    const wasGrounded = p.onGround;
    p.onGround = false;

    const accel = wasGrounded ? 2600 : 1500;
    const maxSpeed = p.dashTimer > 0 ? 780 : 265;
    const friction = wasGrounded ? 2200 : 420;

    if (Math.abs(controls.x) > 0.08 && p.dashTimer <= 0.04) {
      p.vx += controls.x * accel * dt;
      p.facing = controls.x > 0 ? 1 : -1;
    } else if (p.dashTimer <= 0) {
      p.vx = moveTowards(p.vx, 0, friction * dt);
    }

    p.vx = Phaser.Math.Clamp(p.vx, -maxSpeed, maxSpeed);

    const wantsWallSlide = this.powers.wallGrip && previousWallSide !== 0 && !wasGrounded && p.vy > 80;
    const gravity = p.dashTimer > 0.07 ? 0 : this.powers.drift && controls.jumpHeld && p.vy > 90 ? 520 : 1550;
    p.vy = Math.min(p.vy + gravity * dt, wantsWallSlide ? 180 : 900);

    this.moveAxis("x", p.vx * dt);
    this.moveAxis("y", p.vy * dt);

    if (p.onGround) {
      p.coyote = 0.1;
      p.airJumps = 0;
      if (!wasGrounded) {
        this.emitSparks(this.getCenter().x, p.y + PLAYER_SIZE.height, 8);
        this.environment.playSfx("land");
      }
    } else if (wasGrounded) {
      p.coyote = 0.1;
    }

    const bounds = this.environment.worldBounds();
    p.x = Phaser.Math.Clamp(p.x, 0, bounds.width - PLAYER_SIZE.width);
    p.y = Phaser.Math.Clamp(p.y, -120, bounds.height + 180);
    this.fellOut = p.y > bounds.height + 90;
  }

  moveAxis(axis, amount, ignoredSolids = []) {
    if (amount === 0) return;

    const p = this.state;
    p[axis] += amount;

    for (const solid of this.environment.solids()) {
      if (ignoredSolids.includes(solid) || this.ignoredSolids.has(solid)) continue;
      if (!overlapsRect(p.x, p.y, PLAYER_SIZE.width, PLAYER_SIZE.height, solid)) continue;

      if (axis === "x") {
        if (amount > 0) {
          p.x = solid[0] - PLAYER_SIZE.width;
          p.contacts.right = true;
        } else {
          p.x = solid[0] + solid[2];
          p.contacts.left = true;
        }
        p.vx = 0;
      } else if (amount > 0) {
        p.y = solid[1] - PLAYER_SIZE.height;
        p.vy = 0;
        p.onGround = true;
      } else {
        p.y = solid[1] + solid[3];
        p.vy = 0;
        p.contacts.ceiling = true;
      }
    }
  }

  boostCoyote(time) {
    this.state.coyote = Math.max(this.state.coyote, time);
  }

  resolveLayerSwitchOverlap(maxTopDepth = PLAYER_SIZE.height) {
    const overlappingSolids = this.getOverlappingSolids();
    if (!overlappingSolids.length) return { status: "clear" };

    const p = this.state;
    const landingSolids = overlappingSolids.filter((solid) => p.y - solid[1] <= maxTopDepth);
    if (!landingSolids.length) return { status: "telefrag" };

    const previousY = p.y;
    p.y = Math.min(...landingSolids.map((solid) => solid[1] - PLAYER_SIZE.height));
    p.vy = Math.min(p.vy, 0);
    p.onGround = true;
    p.coyote = 0.1;
    p.airJumps = 0;
    p.contacts = { left: false, right: false, ceiling: false };

    if (this.overlapsAnySolid()) {
      p.y = previousY;
      return { status: "telefrag" };
    }

    return { status: "landed" };
  }

  getOverlappingSolids() {
    const p = this.state;
    return this.environment
      .solids()
      .filter((solid) => overlapsRect(p.x, p.y, PLAYER_SIZE.width, PLAYER_SIZE.height, solid));
  }

  overlapsAnySolid() {
    return this.getOverlappingSolids().length > 0;
  }

  overlaps(rect) {
    const p = this.state;
    return overlapsRect(p.x, p.y, PLAYER_SIZE.width, PLAYER_SIZE.height, rect);
  }

  moveWithPlatform(dx, dy, platformRect) {
    const p = this.state;
    const wasGrounded = p.onGround;

    this.moveAxis("x", dx, [platformRect]);
    this.moveAxis("y", dy, [platformRect]);

    if (dy < 0 && p.contacts.ceiling) {
      p.onGround = false;
      p.coyote = Math.max(p.coyote, 0.05);
    } else {
      p.onGround = wasGrounded;
    }

    if (this.overlaps(platformRect)) {
      this.ignoredSolids.add(platformRect);
    }

    const bounds = this.environment.worldBounds();
    p.x = Phaser.Math.Clamp(p.x, 0, bounds.width - PLAYER_SIZE.width);
    p.y = Phaser.Math.Clamp(p.y, -120, bounds.height + 180);
  }

  refreshIgnoredSolids() {
    for (const solid of this.ignoredSolids) {
      if (!this.overlaps(solid)) {
        this.ignoredSolids.delete(solid);
      }
    }
  }

  getWallSide() {
    if (this.state.contacts.left) return -1;
    if (this.state.contacts.right) return 1;
    return 0;
  }

  getCenter() {
    return {
      x: this.state.x + PLAYER_SIZE.width / 2,
      y: this.state.y + PLAYER_SIZE.height / 2
    };
  }

  emitSparks(x, y, quantity) {
    this.sparkParticles.emitParticleAt(x, y, quantity);
  }
}
