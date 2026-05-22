import { type HudState, formatMoney } from "./Hud";

export class StatsPanel {
  constructor(private readonly element: HTMLElement) {}

  get visible(): boolean {
    return !this.element.hidden;
  }

  hide(): void {
    this.element.hidden = true;
  }

  update(state: HudState): void {
    this.element.innerHTML = `
      <div class="stats-title">STATS PORTFOLIO</div>
      ${row("Bullet cost", formatMoney(state.bulletCost))}
      ${row("Bullet damage", formatMoney(state.bulletDamage))}
      ${row("XP gain", xpMult(state.xpGainMultiplier))}
    `;
  }
}

function row(label: string, value: string, className = ""): string {
  const valueClass = className ? ` class="${className}"` : "";
  return `<div class="hud-row"><span>${label}</span><span${valueClass}>${value}</span></div>`;
}

function xpMult(mult: number): string {
  // Show "1.0x" for base, "1.10x" / "1.25x" / "1.50x" for bonuses
  if (mult === 1) return "1.0x";
  return `${mult.toFixed(2)}x`;
}
