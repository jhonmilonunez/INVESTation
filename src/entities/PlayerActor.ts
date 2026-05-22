import * as ex from "excalibur";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_INCOME_PER_SECOND,
  PLAYER_MOVE_SPEED,
  PLAYER_PARENT_LOAN_AMOUNT,
  PLAYER_SIZE,
  PLAYER_STARTING_MONEY,
  PLAYER_MAXIMUM_MONEY,
  STARTING_BULLET_COST,
  STARTING_BULLET_DAMAGE,
  STARTING_FIRE_RATE,
  STARTING_XP_THRESHOLD,
  XP_THRESHOLD_MULTIPLIER
} from "../config/gameBalance";

const playerFont = new ex.Font({
  family: "Arial",
  size: 12,
  unit: ex.FontUnit.Px,
  textAlign: ex.TextAlign.Center,
  baseAlign: ex.BaseAlign.Middle,
  bold: true
});

export class PlayerActor extends ex.Actor {
  public money = PLAYER_STARTING_MONEY;
  public maxMoney = PLAYER_MAXIMUM_MONEY;
  public incomePerSecond = PLAYER_INCOME_PER_SECOND;
  public bulletCost = STARTING_BULLET_COST;
  public bulletDamage = STARTING_BULLET_DAMAGE;
  public bulletCount = 1;
  public fireRatePerSecond = STARTING_FIRE_RATE;
  public xp = 0;
  public xpNeeded = STARTING_XP_THRESHOLD;
  public level = 1;
  public parentLoanAvailable = true;
  public emergencyFundReady = false;
  public cashbackRate = 0;
  public xpGainMultiplier = 1;
  public readonly hitRadius = PLAYER_SIZE * 0.55;

  private readonly canMove: () => boolean;
  private readonly emergencyRing: ex.Actor;

  constructor(position: ex.Vector, canMove: () => boolean) {
    super({
      pos: position,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      color: ex.Color.fromHex("#1f9d7a"),
      z: 20
    });

    this.canMove = canMove;

    const label = new ex.Label({
      text: "PLAYER",
      pos: ex.vec(0, 1),
      color: ex.Color.White,
      font: playerFont
    });
    label.z = 21;
    this.addChild(label);

    const ringGraphic = new ex.Circle({
      radius: PLAYER_SIZE * 0.72,
      color: ex.Color.Transparent,
      strokeColor: ex.Color.fromHex("#75d8ff"),
      lineWidth: 2,
    });
    this.emergencyRing = new ex.Actor({ z: 21 });
    this.emergencyRing.graphics.use(ringGraphic);
    this.emergencyRing.graphics.visible = false;
    this.addChild(this.emergencyRing);
  }

  public onPreUpdate(engine: ex.Engine): void {
    if (!this.canMove()) {
      this.vel.setTo(0, 0);
      return;
    }

    let x = 0;
    let y = 0;
    const keyboard = engine.input.keyboard;

    if (keyboard.isHeld(ex.Keys.A) || keyboard.isHeld(ex.Keys.Left)) {
      x -= 1;
    }
    if (keyboard.isHeld(ex.Keys.D) || keyboard.isHeld(ex.Keys.Right)) {
      x += 1;
    }
    if (keyboard.isHeld(ex.Keys.W) || keyboard.isHeld(ex.Keys.Up)) {
      y -= 1;
    }
    if (keyboard.isHeld(ex.Keys.S) || keyboard.isHeld(ex.Keys.Down)) {
      y += 1;
    }

    if (x === 0 && y === 0) {
      this.vel.setTo(0, 0);
      return;
    }

    const magnitude = Math.hypot(x, y);
    this.vel.setTo((x / magnitude) * PLAYER_MOVE_SPEED, (y / magnitude) * PLAYER_MOVE_SPEED);
  }

  public onPostUpdate(): void {
    const half = PLAYER_SIZE / 2;
    this.pos.x = clamp(this.pos.x, half, GAME_WIDTH - half);
    this.pos.y = clamp(this.pos.y, half, GAME_HEIGHT - half);
    this.emergencyRing.graphics.visible = this.emergencyFundReady;
  }

  public earn(elapsedSeconds: number): void {
    if(this.money < this.maxMoney) {
      this.money += this.incomePerSecond * elapsedSeconds;
    }
  }

  public canAffordShot(): boolean {
    return this.money >= this.bulletCost;
  }

  public payForShot(): boolean {
    if (!this.canAffordShot()) {
      return false;
    }
    this.money -= this.bulletCost;
    return true;
  }

  public takeBillHit(value: number): number {
    const damage = this.emergencyFundReady ? value * 0.5 : value;
    this.emergencyFundReady = false;
    this.money -= damage;
    return damage;
  }

  public collectXp(amount: number): boolean {
    this.xp += amount * this.xpGainMultiplier;
    return this.xp >= this.xpNeeded;
  }

  public finishLevelUp(): void {
    this.xp = Math.max(0, this.xp - this.xpNeeded);
    this.xpNeeded = Math.ceil(this.xpNeeded * XP_THRESHOLD_MULTIPLIER + 6);
    this.level += 1;
  }

  public useParentLoan(): void {
    this.parentLoanAvailable = false;
    this.money = PLAYER_PARENT_LOAN_AMOUNT;
  }

  public get fireIntervalSeconds(): number {
    return 1 / this.fireRatePerSecond;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
