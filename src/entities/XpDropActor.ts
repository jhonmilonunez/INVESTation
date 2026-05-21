import * as ex from "excalibur";
import { XP_MAGNET_RADIUS, XP_PICKUP_RADIUS } from "../config/gameBalance";

const xpFont = new ex.Font({
  family: "Arial",
  size: 9,
  unit: ex.FontUnit.Px,
  textAlign: ex.TextAlign.Center,
  baseAlign: ex.BaseAlign.Middle,
  bold: true
});

export class XpDropActor extends ex.Actor {
  public readonly xpValue: number;
  public readonly hitRadius = XP_PICKUP_RADIUS;
  public alive = true;

  private readonly playerPosition: () => ex.Vector;
  private readonly canMove: () => boolean;

  constructor(position: ex.Vector, xpValue: number, playerPosition: () => ex.Vector, canMove: () => boolean) {
    super({
      pos: position,
      radius: XP_PICKUP_RADIUS,
      color: ex.Color.fromHex("#39d98a"),
      z: 8
    });

    this.xpValue = xpValue;
    this.playerPosition = playerPosition;
    this.canMove = canMove;

    const label = new ex.Label({
      text: "XP",
      pos: ex.vec(0, 0),
      color: ex.Color.fromHex("#052414"),
      font: xpFont
    });
    label.z = 9;
    this.addChild(label);
  }

  public onPreUpdate(): void {
    if (!this.canMove() || !this.alive) {
      this.vel.setTo(0, 0);
      return;
    }

    const player = this.playerPosition();
    const dx = player.x - this.pos.x;
    const dy = player.y - this.pos.y;
    const distance = Math.hypot(dx, dy);

    if (distance > XP_MAGNET_RADIUS || distance < 1) {
      this.vel.setTo(0, 0);
      return;
    }

    const speed = 90 + (1 - distance / XP_MAGNET_RADIUS) * 210;
    this.vel.setTo((dx / distance) * speed, (dy / distance) * speed);
  }

  public destroy(): void {
    this.alive = false;
    this.kill();
  }
}
