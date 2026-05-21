import * as ex from "excalibur";
import type { EnemyTypeDefinition } from "../types";

const enemyFont = new ex.Font({
  family: "Arial",
  size: 10,
  unit: ex.FontUnit.Px,
  textAlign: ex.TextAlign.Center,
  baseAlign: ex.BaseAlign.Middle,
  bold: true
});

export class BillEnemyActor extends ex.Actor {
  public readonly definition: EnemyTypeDefinition;
  public remainingValue: number;
  public maxValue: number;
  public readonly xpValue: number;
  public readonly hitRadius: number;
  public alive = true;

  private readonly targetProvider: () => ex.Vector;
  private readonly canChase: () => boolean;
  private readonly label: ex.Label;
  private displayedLabel = "";

  constructor(
    definition: EnemyTypeDefinition,
    position: ex.Vector,
    valueMultiplier: number,
    targetProvider: () => ex.Vector,
    canChase: () => boolean
  ) {
    const startingValue = Math.max(1, Math.round(definition.baseValue * valueMultiplier));

    super({
      pos: position,
      width: definition.size,
      height: definition.size,
      color: ex.Color.fromHex(definition.color),
      z: 10
    });

    this.definition = definition;
    this.remainingValue = startingValue;
    this.maxValue = startingValue;
    this.xpValue = Math.max(1, Math.round(definition.xpValue * Math.sqrt(valueMultiplier)));
    this.hitRadius = definition.size * 0.56;
    this.targetProvider = targetProvider;
    this.canChase = canChase;

    this.label = new ex.Label({
      text: "",
      pos: ex.vec(0, 0),
      color: ex.Color.White,
      font: enemyFont
    });
    this.label.z = 12;
    this.addChild(this.label);
    this.refreshLabel();
  }

  public onPreUpdate(): void {
    if (!this.canChase() || !this.alive) {
      this.vel.setTo(0, 0);
      return;
    }

    const target = this.targetProvider();
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 1) {
      this.vel.setTo(0, 0);
      return;
    }

    this.vel.setTo((dx / distance) * this.definition.speed, (dy / distance) * this.definition.speed);
  }

  public onPostUpdate(_engine: ex.Engine, elapsedMs: number): void {
    if (!this.canChase() || !this.definition.growthPerSecond || !this.alive) {
      return;
    }

    const growth = this.definition.growthPerSecond * (elapsedMs / 1000);
    this.remainingValue += growth;
    this.maxValue += growth;
    this.refreshLabel();
  }

  public applyDamage(amount: number): boolean {
    this.remainingValue = Math.max(0, this.remainingValue - amount);
    this.refreshLabel();
    return this.remainingValue <= 0;
  }

  public destroy(): void {
    this.alive = false;
    this.kill();
  }

  private refreshLabel(): void {
    const value = Math.max(0, Math.ceil(this.remainingValue));
    const text = `${this.definition.name} $${value}`;
    if (text !== this.displayedLabel) {
      this.displayedLabel = text;
      this.label.text = text;
    }
  }
}
