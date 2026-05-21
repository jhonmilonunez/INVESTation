export type EnemyTypeId = "phone-bill" | "rent" | "subscription" | "credit-card-debt";

export interface EnemyTypeDefinition {
  id: EnemyTypeId;
  name: string;
  baseValue: number;
  speed: number;
  size: number;
  xpValue: number;
  weight: number;
  color: string;
  minSurvivalSeconds?: number;
  growthPerSecond?: number;
}

export type UpgradeId =
  | "job-promotion"
  | "fatter-stacks"
  | "coupon-clipper"
  | "bulk-payment"
  | "emergency-fund"
  | "auto-pay"
  | "cashback";

export interface UpgradeTierDefinition {
  description: string;
  effects: Record<string, number>;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  title: string;
  tiers: [UpgradeTierDefinition, ...UpgradeTierDefinition[]];
  infinite?: boolean;
}

export interface UpgradeChoice {
  id: UpgradeId;
  title: string;
  description: string;
  tierIndex: number;
}

export type GamePhase = "playing" | "level-up" | "parent-loan" | "won" | "lost";
