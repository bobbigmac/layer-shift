const toHex = (color) => `#${color.toString(16).padStart(6, "0")}`;

const parseHex = (color) => {
  const hex = typeof color === "number" ? toHex(color) : color;
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
};

const rgb = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`;
const rgba = ({ r, g, b }, a) => `rgba(${r}, ${g}, ${b}, ${a})`;

const mix = (a, b, t) => ({
  r: Math.round(a.r + (b.r - a.r) * t),
  g: Math.round(a.g + (b.g - a.g) * t),
  b: Math.round(a.b + (b.b - a.b) * t)
});

const mulberry32 = (seed) => {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hashString = (text) => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const roundRect = (ctx, x, y, w, h, r) => {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

export class MaterialFactory {
  constructor(scene) {
    this.scene = scene;
  }

  makeTexture(key, width, height, draw) {
    if (this.scene.textures.exists(key)) return key;

    const texture = this.scene.textures.createCanvas(key, width, height);
    const ctx = texture.context;
    ctx.clearRect(0, 0, width, height);
    draw(ctx, width, height, mulberry32(hashString(key)));
    texture.refresh();
    texture.setFilter(this.scene.textures.NEAREST);
    return key;
  }

  getPlayerTexture(key) {
    return this.makeTexture(key, 32, 44, (ctx, w, h, rand) => {
      const suit = parseHex(0xf7f9fb);
      const glass = parseHex(0x48c7e8);
      const shadow = parseHex(0x101417);

      ctx.fillStyle = rgba(shadow, 0.55);
      roundRect(ctx, 5, 0, 22, 17, 7);
      ctx.fill();

      const body = ctx.createLinearGradient(0, 9, 0, h);
      body.addColorStop(0, rgb(mix(suit, parseHex(0xffffff), 0.4)));
      body.addColorStop(1, rgb(mix(suit, parseHex(0x8b9aa0), 0.34)));
      ctx.fillStyle = body;
      roundRect(ctx, 3, 12, 26, 24, 6);
      ctx.fill();

      ctx.fillStyle = rgb(glass);
      roundRect(ctx, 8, 6, 16, 7, 4);
      ctx.fill();

      ctx.fillStyle = rgba(parseHex(0xffffff), 0.18);
      roundRect(ctx, 6, 15, 20, 5, 3);
      ctx.fill();

      ctx.fillStyle = rgb(parseHex(0xf15bb5));
      ctx.fillRect(7, 36, 6, 7);
      ctx.fillStyle = rgb(parseHex(0xff6b35));
      ctx.fillRect(19, 36, 6, 7);

      for (let i = 0; i < 16; i += 1) {
        ctx.fillStyle = `rgba(0,0,0,${0.05 + rand() * 0.08})`;
        ctx.fillRect(Math.floor(rand() * w), Math.floor(12 + rand() * 23), 1, 1);
      }
    });
  }

  getPickupTexture(key) {
    return this.makeTexture(key, 24, 24, (ctx, w, h) => {
      const glow = ctx.createRadialGradient(12, 12, 2, 12, 12, 12);
      glow.addColorStop(0, "rgba(255,255,255,1)");
      glow.addColorStop(0.62, "rgba(255,255,255,0.75)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(12, 12, 9, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#17191b";
      ctx.beginPath();
      ctx.arc(12, 12, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  getSparkTexture(key) {
    return this.makeTexture(key, 18, 18, (ctx) => {
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      roundRect(ctx, 0, 5, 18, 7, 4);
      ctx.fill();
      roundRect(ctx, 7, 0, 7, 18, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(4, 8, 10, 2);
    });
  }

  getTrailTexture(key) {
    return this.makeTexture(key, 4, 4, (ctx) => {
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      roundRect(ctx, 0, 0, 4, 4, 2);
      ctx.fill();
    });
  }

  getGoalTexture(key) {
    return this.makeTexture(key, 34, 34, (ctx) => {
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      roundRect(ctx, 4, 0, 8, 34, 4);
      ctx.fill();

      const flag = ctx.createLinearGradient(0, 10, 32, 24);
      flag.addColorStop(0, "rgba(255,255,255,0.95)");
      flag.addColorStop(1, "rgba(255,247,173,0.72)");
      ctx.fillStyle = flag;
      ctx.beginPath();
      ctx.moveTo(9, 8);
      ctx.lineTo(33, 16);
      ctx.lineTo(9, 25);
      ctx.closePath();
      ctx.fill();
    });
  }

  getTrophyTexture(key) {
    return this.makeTexture(key, 40, 38, (ctx) => {
      const gold = parseHex(0xffca3a);
      const shade = parseHex(0xb86f10);
      const shine = parseHex(0xffffff);

      const cup = ctx.createLinearGradient(0, 5, 0, 28);
      cup.addColorStop(0, rgb(mix(gold, shine, 0.4)));
      cup.addColorStop(0.58, rgb(gold));
      cup.addColorStop(1, rgb(shade));

      ctx.strokeStyle = rgba(shade, 0.8);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(9, 15, 7, Math.PI * 0.72, Math.PI * 1.42);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(31, 15, 7, Math.PI * 1.58, Math.PI * 0.28);
      ctx.stroke();

      ctx.fillStyle = cup;
      roundRect(ctx, 11, 4, 18, 20, 5);
      ctx.fill();
      ctx.fillStyle = rgb(shade);
      roundRect(ctx, 17, 23, 6, 7, 2);
      ctx.fill();
      roundRect(ctx, 12, 30, 16, 5, 2);
      ctx.fill();

      ctx.fillStyle = rgba(shine, 0.5);
      ctx.fillRect(15, 7, 3, 11);
      ctx.fillRect(19, 6, 2, 7);
    });
  }

  getDoorTexture(key, locked) {
    return this.makeTexture(key, 58, 86, (ctx, w, h) => {
      const base = locked ? parseHex(0x5d6367) : parseHex(0x48c7e8);
      const accent = locked ? parseHex(0xb7bec2) : parseHex(0xffd166);
      const dark = mix(base, parseHex(0x000000), 0.5);

      const panel = ctx.createLinearGradient(0, 0, 0, h);
      panel.addColorStop(0, rgb(mix(base, parseHex(0xffffff), 0.18)));
      panel.addColorStop(1, rgb(dark));
      ctx.fillStyle = panel;
      roundRect(ctx, 4, 2, w - 8, h - 4, 7);
      ctx.fill();

      ctx.strokeStyle = rgba(accent, locked ? 0.45 : 0.82);
      ctx.lineWidth = 3;
      roundRect(ctx, 8, 7, w - 16, h - 14, 5);
      ctx.stroke();

      ctx.fillStyle = rgba(accent, locked ? 0.25 : 0.72);
      ctx.fillRect(17, 18, 24, 5);
      ctx.fillRect(17, 31, 24, 5);
      ctx.fillRect(17, 44, 24, 5);

      if (locked) {
        ctx.strokeStyle = "rgba(0,0,0,0.58)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(17, 61);
        ctx.lineTo(41, 37);
        ctx.moveTo(41, 61);
        ctx.lineTo(17, 37);
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(39, 55, 4, 4);
      }
    });
  }

  getPlatformTexture({ levelId, layerIndex, solidIndex, width, height, color, accent }) {
    const key = [
      "mat",
      "platform",
      levelId,
      layerIndex,
      solidIndex,
      width,
      height,
      color.toString(16),
      accent.toString(16)
    ].join(":");

    return this.makeTexture(key, width, height, (ctx, w, h, rand) => {
      const base = parseHex(color);
      const line = parseHex(accent);
      const top = mix(base, parseHex(0xffffff), 0.24);
      const bottom = mix(base, parseHex(0x000000), 0.35);
      const radius = Math.min(8, Math.floor(h / 4));

      const body = ctx.createLinearGradient(0, 0, 0, h);
      body.addColorStop(0, rgb(top));
      body.addColorStop(0.58, rgb(base));
      body.addColorStop(1, rgb(bottom));
      ctx.fillStyle = body;
      roundRect(ctx, 0, 0, w, h, radius);
      ctx.fill();

      ctx.fillStyle = rgba(line, 0.5);
      roundRect(ctx, 4, 3, Math.max(1, w - 8), 5, 3);
      ctx.fill();

      ctx.strokeStyle = rgba(line, 0.24);
      ctx.lineWidth = 1;
      for (let x = 28 + Math.floor(rand() * 16); x < w - 12; x += 44 + Math.floor(rand() * 20)) {
        ctx.beginPath();
        ctx.moveTo(x, 10);
        ctx.lineTo(x + 10, h - 9);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(6, Math.max(12, h - 11), Math.max(1, w - 12), 4);

      const specks = Math.min(240, Math.floor(w * h * 0.012));
      for (let i = 0; i < specks; i += 1) {
        const bright = rand() > 0.48;
        ctx.fillStyle = bright ? `rgba(255,255,255,${rand() * 0.08})` : `rgba(0,0,0,${rand() * 0.1})`;
        ctx.fillRect(Math.floor(rand() * w), Math.floor(rand() * h), 1, 1);
      }

      ctx.strokeStyle = "rgba(0,0,0,0.32)";
      ctx.lineWidth = 2;
      roundRect(ctx, 1, 1, w - 2, h - 2, Math.max(0, radius - 1));
      ctx.stroke();
    });
  }

  getGoalFieldTexture({ levelId, width, height }) {
    const key = ["mat", "goal-field", levelId, width, height].join(":");

    return this.makeTexture(key, width, height, (ctx, w, h, rand) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, "rgba(255,255,255,0.1)");
      gradient.addColorStop(1, "rgba(255,247,173,0.03)");
      ctx.fillStyle = gradient;
      roundRect(ctx, 0, 0, w, h, 7);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.48)";
      ctx.lineWidth = 2;
      roundRect(ctx, 1, 1, w - 2, h - 2, 6);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,247,173,0.2)";
      ctx.lineWidth = 1;
      for (let y = 12; y < h - 8; y += 13 + Math.floor(rand() * 6)) {
        ctx.beginPath();
        ctx.moveTo(8, y);
        ctx.lineTo(w - 8, y + 4);
        ctx.stroke();
      }
    });
  }
}
