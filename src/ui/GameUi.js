import { VIEWPORT } from "../data/levels.js";

const STORAGE_KEY = "layers-platformer-progress-v1";

const getDefaultStorage = () => {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

export const formatTime = (timeMs) => {
  if (!Number.isFinite(timeMs)) return "--:--.--";
  const total = Math.max(0, Math.floor(timeMs));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const centiseconds = Math.floor((total % 1000) / 10);
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
};

export class ProgressStore {
  constructor(storage = getDefaultStorage()) {
    this.storage = storage;
    this.state = this.load();
  }

  load() {
    try {
      const parsed = JSON.parse(this.storage?.getItem(STORAGE_KEY) ?? "{}");
      return {
        completed: parsed.completed ?? {},
        leaderboard: parsed.leaderboard ?? {},
        lastLevelId: parsed.lastLevelId ?? null,
        checkpoints: parsed.checkpoints ?? {},
        trophy: Boolean(parsed.trophy),
        hubReached: Boolean(parsed.hubReached)
      };
    } catch {
      return { completed: {}, leaderboard: {}, lastLevelId: null, checkpoints: {}, trophy: false, hubReached: false };
    }
  }

  save() {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Progress is a convenience cache; the game still runs without storage.
    }
  }

  isCompleted(levelId) {
    return Boolean(this.state.completed[levelId]);
  }

  markCompleted(levelId) {
    this.state.completed[levelId] = true;
    this.save();
  }

  completedCount(levelIds) {
    return levelIds.filter((id) => this.isCompleted(id)).length;
  }

  hasReachedHub() {
    return Boolean(this.state.hubReached);
  }

  markHubReached() {
    if (this.state.hubReached) return;

    this.state.hubReached = true;
    this.save();
  }

  lastLevelId() {
    return this.state.lastLevelId;
  }

  setLastLevelId(levelId) {
    this.state.lastLevelId = levelId;
    this.save();
  }

  checkpoint(levelId) {
    return this.state.checkpoints[levelId] ?? null;
  }

  setCheckpoint(levelId, checkpoint) {
    this.state.checkpoints[levelId] = checkpoint;
    this.save();
  }

  clearCheckpoint(levelId) {
    delete this.state.checkpoints[levelId];
    this.save();
  }

  setTrophyCollected() {
    this.state.trophy = true;
    this.save();
  }

  hasTrophy() {
    return this.state.trophy;
  }

  bestTime(levelId) {
    return this.state.leaderboard[levelId]?.bestTimeMs ?? null;
  }

  fewestDeaths(levelId) {
    return this.state.leaderboard[levelId]?.fewestDeaths ?? null;
  }

  record(level, timeMs, deaths) {
    const current = this.state.leaderboard[level.id] ?? {};
    const time = Math.floor(timeMs);
    const bestTimeMs = current.bestTimeMs == null ? time : Math.min(current.bestTimeMs, time);
    const fewestDeaths = current.fewestDeaths == null ? deaths : Math.min(current.fewestDeaths, deaths);

    this.state.leaderboard[level.id] = {
      bestTimeMs,
      fewestDeaths,
      lastTimeMs: time,
      lastDeaths: deaths,
      updatedAt: new Date().toISOString()
    };
    this.markCompleted(level.id);
    return this.state.leaderboard[level.id];
  }
}

export class GameUi {
  constructor(scene) {
    this.scene = scene;
    this.text = {
      layer: scene.add.text(20, 18, "", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffffff"
      }),
      run: scene.add.text(20, 48, "", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#dce6df"
      }),
      hint: scene.add.text(20, 70, "", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#b9c8c2"
      }),
      notice: scene.add.text(20, VIEWPORT.height - 36, "", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#fff7bf"
      }),
      center: scene.add.text(VIEWPORT.width / 2, 120, "", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#fff7bf",
        align: "center"
      })
    };

    Object.values(this.text).forEach((item) => {
      item.setScrollFactor(0);
      item.setDepth(100);
    });
    this.text.center.setOrigin(0.5, 0);
  }

  update({ level, layerIndex, powers, timeMs, deaths, bestTime, fewestDeaths, notice, hubStatus, checkpointId }) {
    const layer = level.layers[layerIndex];
    this.text.layer.setText(`${level.title} | Layer ${layerIndex + 1}/${level.layers.length}: ${layer.name}`);

    const powerNames = Object.entries(powers)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);
    const best = bestTime == null ? "Best --:--.--" : `Best ${formatTime(bestTime)}`;
    const fewest = fewestDeaths == null ? "Fewest deaths --" : `Fewest deaths ${fewestDeaths}`;
    this.text.run.setText(
      `Time ${formatTime(timeMs)} | Deaths ${deaths} | ${best} | ${fewest} | Powers ${powerNames.length ? powerNames.join(", ") : "none"}`
    );

    const checkpoint = checkpointId ? ` | Checkpoint ${checkpointId}` : "";
    this.text.hint.setText(`${hubStatus ?? level.hint}${checkpoint}`);
    this.text.notice.setText(notice ?? "");
  }

  showCenter(message, durationMs = 2200) {
    this.text.center.setText(message);
    this.scene.time.delayedCall(durationMs, () => {
      if (this.text.center.text === message) {
        this.text.center.setText("");
      }
    });
  }

  leaderboardText(level, entry) {
    return [
      `${level.title}`,
      "Local bests",
      `Best time ${formatTime(entry.bestTimeMs)}`,
      `Fewest deaths ${entry.fewestDeaths}`,
      `Last run ${formatTime(entry.lastTimeMs)} D${entry.lastDeaths}`
    ].join("\n");
  }
}
