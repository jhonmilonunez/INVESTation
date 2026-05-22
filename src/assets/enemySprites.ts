import * as ex from "excalibur";
import type { EnemyTypeId } from "../types";

interface EnemySpriteEntry {
  source: ex.ImageSource;
  scale: number;
  shadowOffsetY?: number; // fraction of displaySize from center, default 0.48
}

// Add an entry here when a sprite PNG is placed in public/
const enemySprites: Partial<Record<EnemyTypeId, EnemySpriteEntry>> = {
  "phone-bill": { source: new ex.ImageSource("/phone-bill.png"), scale: 1.5 },
  "rent":       { source: new ex.ImageSource("/rent.png"),       scale: 1.5, shadowOffsetY: 0.38 },
};

export const enemyImageSources = Object.values(enemySprites).map((e) => e!.source);

export function getEnemySpriteEntry(id: EnemyTypeId): EnemySpriteEntry | undefined {
  return enemySprites[id];
}
