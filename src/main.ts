import * as ex from "excalibur";
import { GAME_HEIGHT, GAME_WIDTH } from "./config/gameBalance";
import { GameScene } from "./scenes/GameScene";
import "./style.css";

const hudElement = document.querySelector<HTMLElement>("#hud");
const levelUpElement = document.querySelector<HTMLElement>("#level-up");
const messageElement = document.querySelector<HTMLElement>("#message");
const bankruptcyButton = document.querySelector<HTMLButtonElement>("#bankruptcy");

if (!hudElement || !levelUpElement || !messageElement || !bankruptcyButton) {
  throw new Error("INVESTation UI roots are missing from index.html.");
}

const game = new ex.Engine({
  canvasElementId: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  displayMode: ex.DisplayMode.Fixed,
  suppressPlayButton: true
});

game.add("game", new GameScene({ hudElement, levelUpElement, messageElement, bankruptcyButton }));

void game.start().then(() => {
  void game.goToScene("game");
});
