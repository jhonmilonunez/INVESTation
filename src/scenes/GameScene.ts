import * as ex from "excalibur";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  SURVIVAL_TIME_SECONDS,
  UPGRADES
} from "../config/gameBalance";
import { BillEnemyActor } from "../entities/BillEnemyActor";
import { BulletActor } from "../entities/BulletActor";
import { PlayerActor } from "../entities/PlayerActor";
import { XpDropActor } from "../entities/XpDropActor";
import { CombatDirector } from "../systems/CombatDirector";
import { SpawnDirector } from "../systems/SpawnDirector";
import type { GamePhase, UpgradeChoice, UpgradeId } from "../types";
import { Hud, formatTimer } from "../ui/Hud";
import { LevelUpMenu } from "../ui/LevelUpMenu";

interface GameSceneUi {
  hudElement: HTMLElement;
  levelUpElement: HTMLElement;
  messageElement: HTMLElement;
  bankruptcyButton: HTMLButtonElement;
}

export class GameScene extends ex.Scene {
  private readonly hud: Hud;
  private readonly levelUpMenu: LevelUpMenu;
  private readonly messageElement: HTMLElement;
  private readonly bankruptcyButton: HTMLButtonElement;

  private player!: PlayerActor;
  private timerLabel!: ex.Label;
  private spawnDirector!: SpawnDirector;
  private combatDirector!: CombatDirector;
  private enemies: BillEnemyActor[] = [];
  private bullets: BulletActor[] = [];
  private xpDrops: XpDropActor[] = [];
  private phase: GamePhase = "playing";
  private survivalSeconds = 0;
  private parentLoanPauseSeconds = 0;
  private readonly upgradeTierCounts: Record<UpgradeId, number> = {
    "job-promotion": 0,
    "fatter-stacks": 0,
    "coupon-clipper": 0,
    "bulk-payment": 0,
    "emergency-fund": 0,
    "auto-pay": 0,
    "cashback": 0,
  };

  constructor(ui: GameSceneUi) {
    super();
    this.hud = new Hud(ui.hudElement);
    this.levelUpMenu = new LevelUpMenu(ui.levelUpElement);
    this.messageElement = ui.messageElement;
    this.bankruptcyButton = ui.bankruptcyButton;
    this.bankruptcyButton.addEventListener("click", () => this.endGame("lost"), { once: true });
  }

  public onInitialize(): void {
    this.backgroundColor = ex.Color.fromHex("#0e1118");

    this.player = new PlayerActor(ex.vec(GAME_WIDTH / 2, GAME_HEIGHT / 2), () => this.isPlaying());
    this.add(this.player);

    this.spawnDirector = new SpawnDirector(this.player, () => this.isPlaying(), (enemy) => {
      this.enemies.push(enemy);
      this.add(enemy);
    });
    this.combatDirector = new CombatDirector(() => this.isPlaying(), () => this.enemies);

    this.timerLabel = new ex.Label({
      text: "00:00",
      pos: ex.vec(400, 30),
      color: ex.Color.White,
      font: timerFont,
      z: 30,
    });
    this.add(this.timerLabel);

    this.updateHud();
  }

  public onPostUpdate(_engine: ex.Engine, elapsedMs: number): void {
    const elapsedSeconds = elapsedMs / 1000;

    if (this.phase === "playing") {
      this.survivalSeconds += elapsedSeconds;
      this.player.earn(elapsedSeconds);
      this.spawnDirector.update(elapsedMs, this.survivalSeconds);
      this.combatDirector.update({
        scene: this,
        player: this.player,
        bullets: this.bullets,
        enemies: this.enemies,
        xpDrops: this.xpDrops,
        elapsedMs,
        spawnXp: (position, amount) => this.spawnXp(position, amount),
        onLevelReady: () => this.startLevelUp(),
        onMoneyChanged: () => this.checkMoneyState()
      });

      this.checkMoneyState();

      if (this.survivalSeconds >= SURVIVAL_TIME_SECONDS) {
        this.endGame("won");
      }
    } else if (this.phase === "parent-loan") {
      this.parentLoanPauseSeconds -= elapsedSeconds;
      if (this.parentLoanPauseSeconds <= 0) {
        this.hideMessage();
        this.phase = "playing";
      }
    }

    this.cleanupActors();
    this.timerLabel.text = formatTimer(this.survivalSeconds);
    this.updateHud();
  }

  private isPlaying(): boolean {
    return this.phase === "playing";
  }

  private spawnXp(position: ex.Vector, amount: number): void {
    const drop = new XpDropActor(position, amount, () => this.player.pos, () => this.isPlaying());
    this.xpDrops.push(drop);
    this.add(drop);
  }

  private startLevelUp(): void {
    if (this.phase !== "playing") {
      return;
    }

    this.phase = "level-up";
    this.levelUpMenu.show(this.chooseUpgrades(), (choice) => {
      this.applyUpgrade(choice);
      this.player.finishLevelUp();
      this.levelUpMenu.hide();
      this.phase = "playing";
    });
  }

  private chooseUpgrades(): UpgradeChoice[] {
    const available = UPGRADES
      .filter((u) => {
        if (u.id === "emergency-fund") return !this.player.emergencyFundReady;
        return u.infinite || this.upgradeTierCounts[u.id] < u.tiers.length;
      })
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    return available.map((u) => {
      const tierIndex = u.infinite ? 0 : this.upgradeTierCounts[u.id];
      return {
        id: u.id,
        title: `${u.title}${TIER_SUFFIXES[tierIndex]}`,
        description: u.tiers[tierIndex].description,
        tierIndex,
      };
    });
  }

  private applyUpgrade(choice: UpgradeChoice): void {
    const e = UPGRADES.find((u) => u.id === choice.id)!.tiers[choice.tierIndex].effects;

    switch (choice.id) {
      case "job-promotion":
        this.player.incomePerSecond *= e.incomeMultiplier ?? 1;
        break;
      case "fatter-stacks":
        this.player.bulletDamage *= e.damageMultiplier ?? 1;
        this.player.bulletCost *= e.costMultiplier ?? 1;
        break;
      case "coupon-clipper":
        this.player.bulletCost = Math.max(e.costFloor ?? 0, this.player.bulletCost * (e.costMultiplier ?? 1));
        break;
      case "bulk-payment":
        this.player.bulletCount += e.extraBullets ?? 0;
        break;
      case "emergency-fund":
        this.player.emergencyFundReady = true;
        break;
      case "auto-pay":
        this.player.fireRatePerSecond *= e.fireRateMultiplier ?? 1;
        break;
      case "cashback":
        this.player.cashbackRate += e.cashbackRate ?? 0;
        break;
    }

    this.upgradeTierCounts[choice.id] += 1;
  }

  private checkMoneyState(): void {
    if (this.phase !== "playing" || this.player.money > 0) {
      return;
    }

    if (this.player.parentLoanAvailable) {
      this.player.useParentLoan();
      this.phase = "parent-loan";
      this.parentLoanPauseSeconds = 2.4;
      this.showMessage("Your parents gave you a small loan of $100.");
      return;
    }

    this.endGame("lost");
  }

  private endGame(result: "won" | "lost"): void {
    if (this.phase === "won" || this.phase === "lost") {
      return;
    }

    this.phase = result;
    this.levelUpMenu.hide();
    this.bankruptcyButton.hidden = true;

    if (result === "won") {
      this.showMessage("You survived adulthood.");
    } else {
      this.messageElement.innerHTML = `<span>You went broke.</span><button class="try-again-button" type="button">Try Again</button>`;
      this.messageElement.style.pointerEvents = "auto";
      this.messageElement.classList.add("visible");
      this.messageElement.querySelector(".try-again-button")!.addEventListener("click", () => location.reload());
    }
  }

  private showMessage(message: string): void {
    this.messageElement.textContent = message;
    this.messageElement.classList.add("visible");
  }

  private hideMessage(): void {
    this.messageElement.classList.remove("visible");
    this.messageElement.textContent = "";
  }

  private cleanupActors(): void {
    this.enemies = this.enemies.filter((enemy) => enemy.alive && !enemy.isKilled());
    this.bullets = this.bullets.filter((bullet) => bullet.alive && !bullet.isKilled());
    this.xpDrops = this.xpDrops.filter((drop) => drop.alive && !drop.isKilled());
  }

  private updateHud(): void {
    this.hud.update({
      money: this.player.money,
      incomePerSecond: this.player.incomePerSecond,
      bulletCost: this.player.bulletCost,
      bulletDamage: this.player.bulletDamage,
      xp: this.player.xp,
      xpNeeded: this.player.xpNeeded,
      level: this.player.level,
      timeSurvivedSeconds: this.survivalSeconds,
      parentLoanAvailable: this.player.parentLoanAvailable,
      emergencyFundReady: this.player.emergencyFundReady,
      phase: this.phase
    });
  }
}

const TIER_SUFFIXES = ["", "+", "++"] as const;

const timerFont = new ex.Font({
  family: "Arial",
  size: 20,
  unit: ex.FontUnit.Px,
  textAlign: ex.TextAlign.Center,
  baseAlign: ex.BaseAlign.Middle,
  bold: true,
});
