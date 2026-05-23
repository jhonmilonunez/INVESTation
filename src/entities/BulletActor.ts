import * as ex from "excalibur";
import { BULLET_RADIUS, BULLET_SPEED, GAME_HEIGHT, GAME_WIDTH } from "../config/gameBalance";
import type { BillEnemyActor } from "./BillEnemyActor";
import { createBulletAnimation } from "../assets/bulletSprite";

export class BulletActor extends ex.Actor {
  public readonly damage: number;
  public readonly hitRadius = BULLET_RADIUS;
  public alive = true;

  private readonly lockedTarget: BillEnemyActor;
  private readonly angleOffsetRadians: number;
  private readonly canMove: () => boolean;

  constructor(
    position: ex.Vector,
    damage: number,
    angleOffsetRadians: number,
    lockedTarget: BillEnemyActor,
    canMove: () => boolean
  ) {
    super({
      pos: position,
      radius: BULLET_RADIUS,
      color: ex.Color.Transparent,
      z: 15
    });

    this.graphics.use(createBulletAnimation());

    this.damage = damage;
    this.angleOffsetRadians = angleOffsetRadians;
    this.lockedTarget = lockedTarget;
    this.canMove = canMove;

    // Set initial velocity so the bullet has direction even if target dies on frame 1
    const dx = lockedTarget.pos.x - position.x;
    const dy = lockedTarget.pos.y - position.y;
    const angle = Math.atan2(dy, dx) + angleOffsetRadians;
    this.vel.setTo(Math.cos(angle) * BULLET_SPEED, Math.sin(angle) * BULLET_SPEED);
    this.rotation = angle - Math.PI;
  }

  public onPreUpdate(): void {
    if (!this.canMove() || !this.alive) {
      this.vel.setTo(0, 0);
      return;
    }

    if (!this.lockedTarget.alive) {
      return;
    }

    const dx = this.lockedTarget.pos.x - this.pos.x;
    const dy = this.lockedTarget.pos.y - this.pos.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 1) {
      this.vel.setTo(0, 0);
      return;
    }

    const angle = Math.atan2(dy, dx) + this.angleOffsetRadians;
    this.vel.setTo(Math.cos(angle) * BULLET_SPEED, Math.sin(angle) * BULLET_SPEED);
    this.rotation = angle - Math.PI;
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
