# Layer Shift Platformer

Small ES module Vite + Phaser 3 sample for a layered 2D platformer.

It's surprisingly playable even in this very simple form. Good candidate.

## Run

```sh
yarn install
yarn dev
```

Open `http://localhost:5173/`.

## Controls

- Move: `A`/`D`, left/right arrows, gamepad left stick, or gamepad D-pad left/right.
- Jump: `Space`, `Z`, or gamepad A.
- Dash: `Shift`, `X`, gamepad X, or gamepad RB after collecting the Pulse Core.
- Layer shift: up moves backward, down moves forward. Numpad `8`/`2` and gamepad D-pad up/down also work.
- Hub doors: jump while overlapping an unlocked door to enter that route.

## Structure

- `src/data/levels.js`: manual screen data. The old five-layer prototype is now screen 5.
- `src/player/PlayerController.js`: movement, collision response, powers, and player effects.
- `src/assets.js`: generated texture keys and a small SFX bus that can be replaced with loaded assets later.
- `src/materials/MaterialFactory.js`: self-contained CanvasTexture material builder for player, pickup, platform, marker, goal, spark, and trail textures.
- `src/ui/GameUi.js`: HUD text, local progress, and per-level leaderboard storage.
- `src/scenes/LayerPlatformerScene.js`: room orchestration, layer rendering, pickups, goals, HUD, and input.

## Systems

- Five visible world layers with transparent foreground layers, blurred background layers, and vertical offsets around the active layer.
- Collision only checks the currently active layer.
- Movement supports buffered jumps, coyote time, short hops, double jump, dash jump, wall jump, and glide.
- Power-ups unlock double jump, dash, wall jump, and slower falling.
- Rooms are manual data, not procedural generation. The first room has two layers; later rooms add more.
- Procedural art is generated as cached Phaser canvas textures per material, not as per-frame procedural drawing.
- Per-level best time and fewest deaths are recorded anonymously to `localStorage`.
- The relay hub has moving platforms, a trophy pickup, replay doors for completed routes, and locked future-content doors.
- The last played level and per-level checkpoint are restored from local progress.
- Levels can define checkpoint markers now; future powers can call `dropCheckpoint()` and `clearDroppedCheckpoint()` in the scene.
