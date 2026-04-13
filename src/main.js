import Phaser from "phaser";
import { VIEWPORT } from "./data/levels.js";
import { LayerPlatformerScene } from "./scenes/LayerPlatformerScene.js";
import "./styles.css";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: VIEWPORT.width,
  height: VIEWPORT.height,
  backgroundColor: "#17191b",
  input: {
    gamepad: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: LayerPlatformerScene,
  pixelArt: false
};

new Phaser.Game(config);
