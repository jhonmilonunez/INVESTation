import type { EnemyTypeDefinition, UpgradeDefinition } from "../types";

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const SURVIVAL_TIME_SECONDS = 60 * 15;

export const PLAYER_STARTING_MONEY = 500;
export const PLAYER_MAXIMUM_MONEY = 1000;
export const PLAYER_PARENT_LOAN_AMOUNT = 300;
export const PLAYER_INCOME_PER_SECOND = 7.5;
export const PLAYER_MOVE_SPEED = 220;
export const PLAYER_SIZE = 42;

export const STARTING_BULLET_COST = 7;
export const STARTING_BULLET_DAMAGE = 7;
export const STARTING_FIRE_RATE = 1.15;
export const BULLET_SPEED = 360;
export const BULLET_RADIUS = 5;

export const STARTING_XP_THRESHOLD = 24;
export const XP_THRESHOLD_MULTIPLIER = 1.18;
export const XP_PICKUP_RADIUS = 18;
export const XP_MAGNET_RADIUS = 110;

export const ENEMY_SPAWN_MARGIN = 48;
export const ENEMY_BASE_SPAWN_INTERVAL = 3.0;
export const ENEMY_MIN_SPAWN_INTERVAL = 0.60;

export const ENEMY_TYPES: EnemyTypeDefinition[] = [
  {
    id: "phone-bill",
    name: "Phone Bill",
    baseValue: 25,
    speed: 72,
    size: 42,
    xpValue: 8,
    weight: 4,
    color: "#3f86f7"
  },
  {
    id: "rent",
    name: "Rent",
    baseValue: 90,
    speed: 42,
    size: 58,
    xpValue: 18,
    weight: 1.15,
    color: "#e65666",
    minSurvivalSeconds: 20
  },
  {
    id: "subscription",
    name: "Subscription",
    baseValue: 18,
    speed: 78,
    size: 34,
    xpValue: 7,
    weight: 3.2,
    color: "#6ac279"
  },
  {
    id: "credit-card-debt",
    name: "Credit Card Debt",
    baseValue: 48,
    speed: 54,
    size: 50,
    xpValue: 14,
    weight: 1.8,
    color: "#b875ff",
    minSurvivalSeconds: 35,
    growthPerSecond: 1.2
  }
];

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: "job-promotion",
    title: "Job Promotion",
    tiers: [
      { description: "Income/sec +10%.", effects: { incomeBonus: 0.10 } },
      { description: "Income/sec +20%.", effects: { incomeBonus: 0.20 } },
      { description: "Income/sec +25%.", effects: { incomeBonus: 0.25 } }
    ]
  },
  {
    id: "fatter-stacks",
    title: "Fatter Stacks",
    tiers: [
      { description: "Bullet damage +5%, bullet cost +10%.", effects: { damageBonus: 0.05, costBonus: 0.10 } },
      { description: "Bullet damage +10%, bullet cost +20%.", effects: { damageBonus: 0.10, costBonus: 0.20 } },
      { description: "Bullet damage +25%, bullet cost +50%.", effects: { damageBonus: 0.25, costBonus: 0.50 } }
    ]
  },
  {
    id: "coupon-clipper",
    title: "Coupon Clipper",
    tiers: [
      { description: "Bullet cost -10%.", effects: { costBonus: -0.10, costFloor: 0.25 } },
      { description: "Bullet cost -15%.", effects: { costBonus: -0.15, costFloor: 0.25 } },
      { description: "Bullet cost -20%.", effects: { costBonus: -0.20, costFloor: 0.25 } }
    ]
  },
  {
    id: "bulk-payment",
    title: "Bulk Payment",
    tiers: [
      { description: "Fire 2 bullets per shot. Each bullet costs money.", effects: { extraBullets: 1 } },
      { description: "Fire 3 bullets per shot. Each bullet costs money.", effects: { extraBullets: 1 } }
    ]
  },
  {
    id: "emergency-fund",
    title: "Emergency Fund",
    infinite: true,
    tiers: [
      { description: "Next bill collision damage -50%.", effects: { emergencyFund: 1 } }
    ]
  },
  {
    id: "auto-pay",
    title: "Auto-Pay",
    tiers: [
      { description: "Fire rate +10%.", effects: { fireRateBonus: 0.10 } },
      { description: "Fire rate +20%.", effects: { fireRateBonus: 0.20 } },
      { description: "Fire rate +30%.", effects: { fireRateBonus: 0.30 } }
    ]
  },
  {
    id: "cashback",
    title: "Cashback",
    tiers: [
      { description: "Refund 5% of bullet cost on hit.", effects: { cashbackRate: 0.05 } },
      { description: "Refund 7.5% of bullet cost on hit.", effects: { cashbackRate: 0.075 } },
      { description: "Refund 10% of bullet cost on hit.", effects: { cashbackRate: 0.10 } }
    ]
  },
  {
    id: "career-switch",
    title: "Career Switch",
    tiers: [
      { description: "Set income to $10/sec. Resets Job Promotion Ranks.", effects: { setIncome: 10 } },
      { description: "Set income to $15/sec. Resets Job Promotion Ranks.", effects: { setIncome: 15 } },
      { description: "Set income to $20/sec. Resets Job Promotion Ranks.", effects: { setIncome: 20 } }
    ]
  },
  {
    id: "professional-development",
    title: "Professional Development",
    tiers: [
      { description: "XP gain +10%.", effects: { xpBonus: 0.10 } },
      { description: "XP gain +15%.", effects: { xpBonus: 0.15 } },
      { description: "XP gain +25%.", effects: { xpBonus: 0.25 } }
    ]
  },
  {
    id: "stipend",
    title: "Stipend",
    infinite: true,
    fallbackOnly: true,
    tiers: [
      { description: "Gain $100, no questions asked.", effects: { flatMoney: 100 } }
    ]
  }
];
