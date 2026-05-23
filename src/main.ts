import * as ex from "excalibur";
import { GAME_HEIGHT, GAME_WIDTH } from "./config/gameBalance";
import { GameScene } from "./scenes/GameScene";
import { enemyImageSources } from "./assets/enemySprites";
import { bulletImageSource } from "./assets/bulletSprite";
import { xpImageSource } from "./assets/xpSprite";
import "./style.css";

const hudElement = document.querySelector<HTMLElement>("#hud");
const levelUpElement = document.querySelector<HTMLElement>("#level-up");
const messageElement = document.querySelector<HTMLElement>("#message");
const statsPanelElement = document.querySelector<HTMLElement>("#stats-panel");
const moneyElement = document.querySelector<HTMLElement>("#money-display");
const bankruptcyButton = document.querySelector<HTMLButtonElement>("#bankruptcy");
const gainLevelButton = document.querySelector<HTMLButtonElement>("#gain-level");
const xpFillElement = document.querySelector<HTMLElement>("#xp-fill");
const xpLevelElement = document.querySelector<HTMLElement>("#xp-level");
const bottomUiElement = document.querySelector<HTMLElement>("#bottom-ui");

if (!hudElement || !levelUpElement || !messageElement || !statsPanelElement || !moneyElement || !bankruptcyButton || !gainLevelButton || !xpFillElement || !xpLevelElement || !bottomUiElement) {
  throw new Error("INVESTation UI roots are missing from index.html.");
}

let tabEnabled = true;

document.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    if (tabEnabled) statsPanelElement.hidden = false;
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Tab") {
    statsPanelElement.hidden = true;
  }
});

const game = new ex.Engine({
  canvasElementId: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  displayMode: ex.DisplayMode.Fixed,
  suppressPlayButton: true
});

game.add("game", new GameScene({
  hudElement,
  levelUpElement,
  messageElement,
  statsPanelElement,
  moneyElement,
  bottomUiElement,
  bankruptcyButton,
  gainLevelButton,
  xpFillElement,
  xpLevelElement,
  setTabEnabled: (enabled) => {
    tabEnabled = enabled;
    if (!enabled) statsPanelElement.hidden = true;
  },
}));

const loader = new ex.Loader([...Object.values(enemyImageSources), bulletImageSource, xpImageSource]);
loader.suppressPlayButton = true;
loader.backgroundColor = "#0e1118";
loader.logoWidth = 0;
loader.logoHeight = 0;

void game.start(loader).then(() => {
  void game.goToScene("game");
});
