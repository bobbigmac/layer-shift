import { MaterialFactory } from "./materials/MaterialFactory.js";

export const TEXTURES = {
  player: "runner",
  pickup: "pickup-core",
  spark: "spark",
  trail: "trail-dot",
  goal: "goal-core",
  trophy: "trophy-core",
  door: "door-core",
  lockedDoor: "door-locked-core"
};

export const createGameTextures = (scene) => {
  const materials = new MaterialFactory(scene);
  materials.getPlayerTexture(TEXTURES.player);
  materials.getPickupTexture(TEXTURES.pickup);
  materials.getSparkTexture(TEXTURES.spark);
  materials.getTrailTexture(TEXTURES.trail);
  materials.getGoalTexture(TEXTURES.goal);
  materials.getTrophyTexture(TEXTURES.trophy);
  materials.getDoorTexture(TEXTURES.door, false);
  materials.getDoorTexture(TEXTURES.lockedDoor, true);
  return materials;
};

const SFX = {
  jump: { frequency: 420, endFrequency: 720, duration: 0.09, type: "triangle", gain: 0.035 },
  doubleJump: { frequency: 560, endFrequency: 920, duration: 0.12, type: "sine", gain: 0.04 },
  dash: { frequency: 120, endFrequency: 70, duration: 0.16, type: "sawtooth", gain: 0.025 },
  land: { frequency: 95, endFrequency: 48, duration: 0.08, type: "square", gain: 0.022 },
  layer: { frequency: 260, endFrequency: 520, duration: 0.1, type: "triangle", gain: 0.03 },
  pickup: { frequency: 700, endFrequency: 1150, duration: 0.18, type: "sine", gain: 0.045 },
  goal: { frequency: 360, endFrequency: 760, duration: 0.22, type: "triangle", gain: 0.035 },
  trophy: { frequency: 520, endFrequency: 1320, duration: 0.28, type: "triangle", gain: 0.05 },
  firework: { frequency: 900, endFrequency: 260, duration: 0.12, type: "square", gain: 0.024 },
  telefrag: { frequency: 110, endFrequency: 820, duration: 0.2, type: "sawtooth", gain: 0.036 },
  fail: { frequency: 140, endFrequency: 90, duration: 0.14, type: "sine", gain: 0.03 }
};

export class SfxBus {
  constructor(scene) {
    this.scene = scene;
    this.enabled = true;
  }

  play(name) {
    const ctx = this.scene.sound?.context;
    const sfx = SFX[name];
    if (!this.enabled || !ctx || !sfx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = sfx.type;
      osc.frequency.setValueAtTime(sfx.frequency, now);
      osc.frequency.exponentialRampToValueAtTime(sfx.endFrequency, now + sfx.duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(sfx.gain, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + sfx.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + sfx.duration + 0.02);
    } catch {
      this.enabled = false;
    }
  }
}
