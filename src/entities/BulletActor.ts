import * as ex from "excalibur";
import { BULLET_RADIUS, BULLET_SPEED, GAME_HEIGHT, GAME_WIDTH } from "../config/gameBalance";
import type { BillEnemyActor } from "./BillEnemyActor";

export class BulletActor extends ex.Actor {
  public readonly damage: number;
  public readonly hitRadius = BULLET_RADIUS;
  public alive = true;

  private readonly angleOffsetRadians: number;
  private readonly targetSelector: (from: ex.Vector) => BillEnemyActor | null;
  private readonly canMove: () => boolean;

  constructor(
    position: ex.Vector,
    damage: number,
    angleOffsetRadians: number,
    targetSelector: (from: ex.Vector) => BillEnemyActor | null,
    canMove: () => boolean
  ) {
    super({
      pos: position,
      radius: BULLET_RADIUS,
      color: ex.Color.fromHex("#ffdc5a"),
      z: 15
    });

    this.damage = damage;
    this.angleOffsetRadians = angleOffsetRadians;
    this.targetSelector = targetSelector;
    this.canMove = canMove;
  }

  public onPreUpdate(): void {
    if (!this.canMove() || !this.alive) {
      this.vel.setTo(0, 0);
      return;
    }

    const target = this.targetSelector(this.pos);
    if (!target) {
      return;
    }

    const dx = target.pos.x - this.pos.x;
    const dy = target.pos.y - this.pos.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 1) {
      this.vel.setTo(0, 0);
      return;
    }

    const angle = Math.atan2(dy, dx) + this.angleOffsetRadians;
    this.vel.setTo(Math.cos(angle) * BULLET_SPEED, Math.sin(angle) * BULLET_SPEED);
  }

  public onPostUpdate(): void {
    if (
      this.pos.x < -80 ||
      this.pos.x > GAME_WIDTH + 80 ||
      this.pos.y < -80 ||
      this.pos.y > GAME_HEIGHT + 80
    ) {
      this.destroy();
    }
  }

  public destroy(): void {
    this.alive = false;
    this.kill();
  }
}
