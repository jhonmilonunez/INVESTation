import * as ex from "excalibur";
import { BulletActor } from "../entities/BulletActor";
import type { BillEnemyActor } from "../entities/BillEnemyActor";
import type { PlayerActor } from "../entities/PlayerActor";
import type { XpDropActor } from "../entities/XpDropActor";

interface CombatDirectorUpdate {
  scene: ex.Scene;
  player: PlayerActor;
  bullets: BulletActor[];
  enemies: BillEnemyActor[];
  xpDrops: XpDropActor[];
  elapsedMs: number;
  spawnXp: (position: ex.Vector, amount: number) => void;
  onLevelReady: () => void;
  onMoneyChanged: () => void;
}

export class CombatDirector {
  private fireCooldownSeconds = 0;

  constructor(
    private readonly canFight: () => boolean,
    private readonly getEnemies: () => BillEnemyActor[]
  ) {}

  public update({
    scene,
    player,
    bullets,
    enemies,
    xpDrops,
    elapsedMs,
    spawnXp,
    onLevelReady,
    onMoneyChanged
  }: CombatDirectorUpdate): void {
    if (!this.canFight()) {
      return;
    }

    const elapsedSeconds = elapsedMs / 1000;
    this.updateFiring(scene, player, bullets, elapsedSeconds);
    this.updateBulletHits(player, bullets, enemies, spawnXp);
    this.updateEnemyHitsPlayer(player, enemies, onMoneyChanged);
    this.updateXpPickups(player, xpDrops, onLevelReady);
  }

  private updateFiring(scene: ex.Scene, player: PlayerActor, bullets: BulletActor[], elapsedSeconds: number): void {
    this.fireCooldownSeconds -= elapsedSeconds;

    if (this.fireCooldownSeconds > 0 || !player.canAffordShot()) {
      return;
    }

    const target = this.findClosestEnemy(player.pos);
    if (!target) {
      return;
    }

    for (const angleOffset of bulletSpreadAngles(player.bulletCount)) {
      if (!player.payForShot()) {
        break;
      }
      const bullet = new BulletActor(
        player.pos.clone(),
        player.bulletDamage,
        angleOffset,
        (from) => this.findClosestEnemy(from),
        this.canFight
      );
      bullets.push(bullet);
      scene.add(bullet);
    }

    this.fireCooldownSeconds = player.fireIntervalSeconds;
  }

  private updateBulletHits(
    player: PlayerActor,
    bullets: BulletActor[],
    enemies: BillEnemyActor[],
    spawnXp: (position: ex.Vector, amount: number) => void
  ): void {
    for (const bullet of bullets) {
      if (!bullet.alive) {
        continue;
      }

      const enemy = enemies.find(
        (candidate) => candidate.alive && distanceBetween(bullet.pos, candidate.pos) <= bullet.hitRadius + candidate.hitRadius
      );

      if (!enemy) {
        continue;
      }

      bullet.destroy();

      if (player.cashbackRate > 0) {
        player.money = Math.min(player.maxMoney, player.money + player.bulletCost * player.cashbackRate);
      }

      if (enemy.applyDamage(bullet.damage)) {
        const dropPosition = enemy.pos.clone();
        const xpValue = enemy.xpValue;
        enemy.destroy();
        spawnXp(dropPosition, xpValue);
      }
    }
  }

  private updateEnemyHitsPlayer(player: PlayerActor, enemies: BillEnemyActor[], onMoneyChanged: () => void): void {
    for (const enemy of enemies) {
      if (!enemy.alive) {
        continue;
      }

      if (distanceBetween(player.pos, enemy.pos) > player.hitRadius + enemy.hitRadius) {
        continue;
      }

      player.takeBillHit(enemy.remainingValue);
      enemy.destroy();
      onMoneyChanged();
    }
  }

  private updateXpPickups(player: PlayerActor, xpDrops: XpDropActor[], onLevelReady: () => void): void {
    for (const drop of xpDrops) {
      if (!drop.alive) {
        continue;
      }

      if (distanceBetween(player.pos, drop.pos) > player.hitRadius + drop.hitRadius) {
        continue;
      }

      drop.destroy();
      if (player.collectXp(drop.xpValue)) {
        onLevelReady();
      }
    }
  }

  private findClosestEnemy(from: ex.Vector): BillEnemyActor | null {
    let closest: BillEnemyActor | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of this.getEnemies()) {
      if (!enemy.alive) {
        continue;
      }

      const distance = distanceBetween(from, enemy.pos);
      if (distance < closestDistance) {
        closest = enemy;
        closestDistance = distance;
      }
    }

    return closest;
  }
}

function distanceBetween(a: ex.Vector, b: ex.Vector): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function bulletSpreadAngles(count: number): number[] {
  if (count === 1) return [0];
  if (count === 2) return [-Math.PI / 8, Math.PI / 8]; // ±22.5° → 45° spread
  return [-33 * (Math.PI / 180), 0, 33 * (Math.PI / 180)]; // ±33° → 33° between each
}
