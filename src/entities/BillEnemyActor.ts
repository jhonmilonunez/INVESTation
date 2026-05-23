import * as ex from "excalibur";
import type { EnemyTypeDefinition } from "../types";
import { getEnemySpriteEntry } from "../assets/enemySprites";

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
  private walkTimer = 0;

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

    const spriteEntry = getEnemySpriteEntry(definition.id);
    let displaySize = definition.size;
    if (spriteEntry) {
      const sprite = spriteEntry.source.toSprite();
      displaySize = definition.size * spriteEntry.scale;
      sprite.destSize = { width: displaySize, height: displaySize };
      this.graphics.use(sprite);
    }

    // Shadow ellipse rendered below the sprite
    const shadowW = displaySize * 0.75;
    const shadowH = displaySize * 0.18;
    const shadowGraphic = new ex.Canvas({
      width: Math.ceil(shadowW),
      height: Math.ceil(shadowH),
      draw(ctx) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
        ctx.beginPath();
        ctx.ellipse(shadowW / 2, shadowH / 2, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    const shadowOffsetY = spriteEntry?.shadowOffsetY ?? 0.48;
    const shadow = new ex.Actor({ pos: ex.vec(0, displaySize * shadowOffsetY), z: -1 });
    shadow.graphics.use(shadowGraphic);
    this.addChild(shadow);

    this.label = new ex.Label({
      text: "",
      pos: ex.vec(0, 0),
      color: ex.Color.White,
      font: enemyFont
    });
    this.label.z = 12;

    if (!spriteEntry) {
      this.addChild(this.label);
      this.refreshLabel();
    }
  }

  public onPreUpdate(_engine: ex.Engine, delta: number): void {
    if (!this.canChase() || !this.alive) {
      this.vel.setTo(0, 0);
      this.rotation = 0;
      return;
    }

    const target = this.targetProvider();
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 1) {
      this.vel.setTo(0, 0);
      this.rotation = 0;
      return;
    }

    this.vel.setTo((dx / distance) * this.definition.speed, (dy / distance) * this.definition.speed);

    this.walkTimer += delta;
    this.rotation = Math.sin(this.walkTimer / 280) * 0.035;
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
    this.actions.fade(0, 180).callMethod(() => this.kill());
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
