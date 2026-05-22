import * as ex from "excalibur";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_INCOME_PER_SECOND,
  STARTING_BULLET_COST,
  STARTING_BULLET_DAMAGE,
  STARTING_FIRE_RATE,
  SURVIVAL_TIME_SECONDS,
  UPGRADES
} from "../config/gameBalance";
import { BillEnemyActor } from "../entities/BillEnemyActor";
import { BulletActor } from "../entities/BulletActor";
import { PlayerActor } from "../entities/PlayerActor";
import { XpDropActor } from "../entities/XpDropActor";
import { CombatDirector } from "../systems/CombatDirector";
import { SpawnDirector } from "../systems/SpawnDirector";
import type { GamePhase, StatsDelta, StatsSnapshot, UpgradeChoice, UpgradeId } from "../types";
import { Hud, formatMoney, formatTimer } from "../ui/Hud";
import { LevelUpMenu } from "../ui/LevelUpMenu";
import { StatsPanel } from "../ui/StatsPanel";

interface GameSceneUi {
  hudElement: HTMLElement;
  levelUpElement: HTMLElement;
  messageElement: HTMLElement;
  statsPanelElement: HTMLElement;
  moneyElement: HTMLElement;
  bottomUiElement: HTMLElement;
  bankruptcyButton: HTMLButtonElement;
  gainLevelButton: HTMLButtonElement;
  xpFillElement: HTMLElement;
  xpLevelElement: HTMLElement;
  setTabEnabled: (enabled: boolean) => void;
}

export class GameScene extends ex.Scene {
  private readonly hud: Hud;
  private readonly levelUpMenu: LevelUpMenu;
  private readonly statsPanel: StatsPanel;
  private readonly moneyElement: HTMLElement;
  private readonly bottomUiElement: HTMLElement;
  private readonly messageElement: HTMLElement;
  private readonly setTabEnabled: (enabled: boolean) => void;
  private readonly bankruptcyButton: HTMLButtonElement;
  private readonly gainLevelButton: HTMLButtonElement;
  private readonly xpFillElement: HTMLElement;
  private readonly xpLevelElement: HTMLElement;

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
  private isFiringToggled = false;
  private isMouseFiring = false;
  private readonly upgradeTierCounts: Record<UpgradeId, number> = {
    "job-promotion": 0,
    "fatter-stacks": 0,
    "coupon-clipper": 0,
    "bulk-payment": 0,
    "emergency-fund": 0,
    "auto-pay": 0,
    "cashback": 0,
    "career-switch": 0,
    "professional-development": 0,
    "stipend": 0,
  };

  private readonly baseIncomePerSecond = PLAYER_INCOME_PER_SECOND;
  private careerSwitchIncome: number | null = null;
  private jobPromotionBonus = 0;
  private fatStacksDamageBonus = 0;
  private fatStacksCostBonus = 0;
  private couponClipperBonus = 0;
  private couponClipperCostFloor = 0;
  private autoPayBonus = 0;
  private professionalDevBonus = 0;

  constructor(ui: GameSceneUi) {
    super();
    this.hud = new Hud(ui.hudElement);
    this.levelUpMenu = new LevelUpMenu(ui.levelUpElement);
    this.statsPanel = new StatsPanel(ui.statsPanelElement);
    this.moneyElement = ui.moneyElement;
    this.bottomUiElement = ui.bottomUiElement;
    this.messageElement = ui.messageElement;
    this.setTabEnabled = ui.setTabEnabled;
    this.bankruptcyButton = ui.bankruptcyButton;
    this.bankruptcyButton.addEventListener("click", () => this.endGame("lost"), { once: true });
    this.gainLevelButton = ui.gainLevelButton;
    this.gainLevelButton.addEventListener("click", () => this.startLevelUp());
    this.xpFillElement = ui.xpFillElement;
    this.xpLevelElement = ui.xpLevelElement;
  }

  public onInitialize(engine: ex.Engine): void {
    this.backgroundColor = ex.Color.fromHex("#c9a87c");

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

    engine.input.pointers.primary.on("down", (evt) => {
      if (evt.button === ex.PointerButton.Left) this.isMouseFiring = true;
    });
    engine.input.pointers.primary.on("up", (evt) => {
      if (evt.button === ex.PointerButton.Left) this.isMouseFiring = false;
    });

    this.updateHud();
  }

  public onPostUpdate(engine: ex.Engine, elapsedMs: number): void {
    const elapsedSeconds = elapsedMs / 1000;

    if (this.phase === "playing") {
      if (engine.input.keyboard.wasPressed(ex.Keys.Space)) {
        this.isFiringToggled = !this.isFiringToggled;
      }

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
        isFiring: this.isFiringToggled || this.isMouseFiring,
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
        this.setTabEnabled(true);
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
    this.isMouseFiring = false;
    this.statsPanel.hide();
    this.setTabEnabled(false);
    const snapshot: StatsSnapshot = {
      incomePerSecond: this.player.incomePerSecond,
      bulletCost: this.player.bulletCost,
      bulletDamage: this.player.bulletDamage,
      fireRatePerSecond: this.player.fireRatePerSecond,
      bulletCount: this.player.bulletCount,
      cashbackRate: this.player.cashbackRate,
      emergencyFundReady: this.player.emergencyFundReady,
      xpGainMultiplier: this.player.xpGainMultiplier,
    };
    this.levelUpMenu.show(
      this.chooseUpgrades(),
      snapshot,
      (choice) => this.previewUpgrade(choice),
      (choice) => {
        this.applyUpgrade(choice);
        this.player.finishLevelUp();
        this.levelUpMenu.hide();
        this.phase = "playing";
        this.setTabEnabled(true);
      }
    );
  }

  private previewUpgrade(choice: UpgradeChoice): StatsDelta {
    const e = UPGRADES.find((u) => u.id === choice.id)!.tiers[choice.tierIndex].effects;
    switch (choice.id) {
      case "job-promotion": {
        const base = this.careerSwitchIncome ?? this.baseIncomePerSecond;
        return { incomePerSecond: base * (e.incomeBonus ?? 0) };
      }
      case "fatter-stacks": {
        const newDamage = STARTING_BULLET_DAMAGE * (1 + this.fatStacksDamageBonus + (e.damageBonus ?? 0));
        const newCost = Math.max(
          this.couponClipperCostFloor,
          STARTING_BULLET_COST * (1 + this.fatStacksCostBonus + (e.costBonus ?? 0) + this.couponClipperBonus)
        );
        return {
          bulletDamage: newDamage - this.player.bulletDamage,
          bulletCost: newCost - this.player.bulletCost,
        };
      }
      case "coupon-clipper": {
        const newCost = Math.max(
          Math.max(this.couponClipperCostFloor, e.costFloor ?? 0),
          STARTING_BULLET_COST * (1 + this.fatStacksCostBonus + this.couponClipperBonus + (e.costBonus ?? 0))
        );
        return { bulletCost: newCost - this.player.bulletCost };
      }
      case "bulk-payment":
        return { bulletCount: e.extraBullets ?? 0 };
      case "emergency-fund":
        return { emergencyFundReady: true };
      case "auto-pay": {
        const newRate = STARTING_FIRE_RATE * (1 + this.autoPayBonus + (e.fireRateBonus ?? 0));
        return { fireRatePerSecond: newRate - this.player.fireRatePerSecond };
      }
      case "cashback":
        return { cashbackRate: e.cashbackRate ?? 0 };
      case "career-switch":
        return { incomePerSecond: (e.setIncome ?? 0) - this.player.incomePerSecond };
      case "professional-development": {
        const newMult = 1 + this.professionalDevBonus + (e.xpBonus ?? 0);
        return { xpGainMultiplier: newMult - this.player.xpGainMultiplier };
      }
      default:
        return {};
    }
  }

  private chooseUpgrades(): UpgradeChoice[] {
    const available = UPGRADES
      .filter((u) => !u.fallbackOnly)
      .filter((u) => {
        if (u.id === "emergency-fund") return !this.player.emergencyFundReady;
        return u.infinite || this.upgradeTierCounts[u.id] < u.tiers.length;
      })
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    if (available.length === 0) {
      const stipend = UPGRADES.find((u) => u.id === "stipend")!;
      return [{ id: "stipend", title: stipend.title, description: stipend.tiers[0].description, tierIndex: 0 }];
    }

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
        this.jobPromotionBonus += e.incomeBonus ?? 0;
        this.recomputeIncome();
        break;
      case "fatter-stacks":
        this.fatStacksDamageBonus += e.damageBonus ?? 0;
        this.fatStacksCostBonus += e.costBonus ?? 0;
        this.recomputeBulletStats();
        break;
      case "coupon-clipper":
        this.couponClipperBonus += e.costBonus ?? 0;
        this.couponClipperCostFloor = Math.max(this.couponClipperCostFloor, e.costFloor ?? 0);
        this.recomputeBulletStats();
        break;
      case "bulk-payment":
        this.player.bulletCount += e.extraBullets ?? 0;
        break;
      case "emergency-fund":
        this.player.emergencyFundReady = true;
        break;
      case "auto-pay":
        this.autoPayBonus += e.fireRateBonus ?? 0;
        this.player.fireRatePerSecond = STARTING_FIRE_RATE * (1 + this.autoPayBonus);
        break;
      case "cashback":
        this.player.cashbackRate += e.cashbackRate ?? 0;
        break;
      case "professional-development":
        this.professionalDevBonus += e.xpBonus ?? 0;
        this.player.xpGainMultiplier = 1 + this.professionalDevBonus;
        break;
      case "career-switch":
        this.careerSwitchIncome = e.setIncome ?? null;
        this.jobPromotionBonus = 0;
        this.upgradeTierCounts["job-promotion"] = 0;
        this.recomputeIncome();
        break;
      case "stipend":
        this.player.money = Math.min(this.player.maxMoney, this.player.money + (e.flatMoney ?? 0));
        break;
    }

    this.upgradeTierCounts[choice.id] += 1;
  }

  private recomputeIncome(): void {
    const base = this.careerSwitchIncome ?? this.baseIncomePerSecond;
    this.player.incomePerSecond = base * (1 + this.jobPromotionBonus);
  }

  private recomputeBulletStats(): void {
    this.player.bulletDamage = STARTING_BULLET_DAMAGE * (1 + this.fatStacksDamageBonus);
    const rawCost = STARTING_BULLET_COST * (1 + this.fatStacksCostBonus + this.couponClipperBonus);
    this.player.bulletCost = Math.max(this.couponClipperCostFloor, rawCost);
  }

  private checkMoneyState(): void {
    if (this.phase !== "playing" || this.player.money > 0) {
      return;
    }

    if (this.player.parentLoanAvailable) {
      this.player.useParentLoan();
      this.phase = "parent-loan";
      this.isMouseFiring = false;
      this.parentLoanPauseSeconds = 2.4;
      this.statsPanel.hide();
      this.setTabEnabled(false);
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
    this.isMouseFiring = false;
    this.statsPanel.hide();
    this.setTabEnabled(false);
    this.levelUpMenu.hide();
    this.bankruptcyButton.hidden = true;
    this.gainLevelButton.hidden = true;
    this.bottomUiElement.hidden = true;
    this.moneyElement.hidden = true;

    if (result === "won") {
      this.messageElement.innerHTML = `<span>You survived adulthood.</span><button class="end-button end-button--win" type="button">Play Again</button>`;
      this.messageElement.style.pointerEvents = "auto";
      this.messageElement.classList.add("visible");
      this.messageElement.querySelector(".end-button")!.addEventListener("click", () => location.reload());
    } else {
      this.messageElement.innerHTML = `<span>You went broke.</span><button class="end-button end-button--lose" type="button">Try Again</button>`;
      this.messageElement.style.pointerEvents = "auto";
      this.messageElement.classList.add("visible");
      this.messageElement.querySelector(".end-button")!.addEventListener("click", () => location.reload());
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
    const state = {
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
      xpGainMultiplier: this.player.xpGainMultiplier,
      phase: this.phase
    };
    this.hud.update(state);
    if (this.statsPanel.visible) {
      this.statsPanel.update(state);
    }
    const money = Math.max(0, this.player.money);
    this.moneyElement.innerHTML = `<span>$${Math.floor(money)}</span><span class="income-rate">+${formatMoney(this.player.incomePerSecond)}/s</span>`;
    this.moneyElement.classList.toggle("hud-alert", money <= 75);

    const xpPercent = Math.min(100, (this.player.xp / this.player.xpNeeded) * 100);
    this.xpFillElement.style.width = `${xpPercent}%`;
    this.xpLevelElement.textContent = String(this.player.level);
  }
}

const TIER_SUFFIXES = ["", "+", "++"] as const;

const timerFont = new ex.Font({
  family: "Silkscreen",
  size: 20,
  unit: ex.FontUnit.Px,
  textAlign: ex.TextAlign.Center,
  baseAlign: ex.BaseAlign.Middle,
  bold: true,
});
