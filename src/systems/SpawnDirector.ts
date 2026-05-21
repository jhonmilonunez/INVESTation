import * as ex from "excalibur";
import {
  ENEMY_BASE_SPAWN_INTERVAL,
  ENEMY_MIN_SPAWN_INTERVAL,
  ENEMY_SPAWN_MARGIN,
  ENEMY_TYPES,
  GAME_HEIGHT,
  GAME_WIDTH
} from "../config/gameBalance";
import { BillEnemyActor } from "../entities/BillEnemyActor";
import type { PlayerActor } from "../entities/PlayerActor";
import type { EnemyTypeDefinition } from "../types";

export class SpawnDirector {
  private nextSpawnInSeconds = 1;

  constructor(
    private readonly player: PlayerActor,
    private readonly canSpawn: () => boolean,
    private readonly addEnemy: (enemy: BillEnemyActor) => void
  ) {}

  public update(elapsedMs: number, survivalSeconds: number): void {
    if (!this.canSpawn()) {
      return;
    }

    this.nextSpawnInSeconds -= elapsedMs / 1000;

    if (this.nextSpawnInSeconds > 0) {
      return;
    }

    this.spawnEnemy(survivalSeconds);

    const interval = getSpawnInterval(survivalSeconds);
    this.nextSpawnInSeconds = interval * randomBetween(0.75, 1.18);

    if (survivalSeconds > 180 && Math.random() < Math.min(0.4, survivalSeconds / 1600)) {
      this.spawnEnemy(survivalSeconds);
    }
  }

  private spawnEnemy(survivalSeconds: number): void {
    const definition = chooseEnemyType(survivalSeconds);
    const valueMultiplier = 1 + survivalSeconds / 480;
    const enemy = new BillEnemyActor(
      definition,
      randomOffscreenPosition(),
      valueMultiplier,
      () => this.player.pos,
      this.canSpawn
    );

    this.addEnemy(enemy);
  }
}

function getSpawnInterval(survivalSeconds: number): number {
  const pressure = Math.min(1, survivalSeconds / 900);
  return Math.max(ENEMY_MIN_SPAWN_INTERVAL, ENEMY_BASE_SPAWN_INTERVAL - pressure * 1.05);
}

function chooseEnemyType(survivalSeconds: number): EnemyTypeDefinition {
  const available = ENEMY_TYPES.filter((enemy) => (enemy.minSurvivalSeconds ?? 0) <= survivalSeconds);
  const weightTotal = available.reduce((sum, enemy) => sum + enemy.weight, 0);
  let roll = Math.random() * weightTotal;

  for (const enemy of available) {
    roll -= enemy.weight;
    if (roll <= 0) {
      return enemy;
    }
  }

  return available[available.length - 1];
}

function randomOffscreenPosition(): ex.Vector {
  const edge = Math.floor(Math.random() * 4);
  const margin = ENEMY_SPAWN_MARGIN;

  if (edge === 0) {
    return ex.vec(randomBetween(0, GAME_WIDTH), -margin);
  }
  if (edge === 1) {
    return ex.vec(GAME_WIDTH + margin, randomBetween(0, GAME_HEIGHT));
  }
  if (edge === 2) {
    return ex.vec(randomBetween(0, GAME_WIDTH), GAME_HEIGHT + margin);
  }
  return ex.vec(-margin, randomBetween(0, GAME_HEIGHT));
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
