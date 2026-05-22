import { formatMoney } from "./Hud";
import type { StatsDelta, StatsSnapshot, UpgradeChoice } from "../types";

export class LevelUpMenu {
  constructor(private readonly element: HTMLElement) {}

  public show(
    upgrades: UpgradeChoice[],
    snapshot: StatsSnapshot,
    previewFn: (choice: UpgradeChoice) => StatsDelta,
    onChoose: (upgrade: UpgradeChoice) => void
  ): void {
    this.element.innerHTML = `
      <div class="level-panel">
        <h1 class="level-heading">Level Up</h1>
        <div class="upgrade-grid">
          ${upgrades.map((upgrade, index) => `
            <button class="upgrade-button" data-index="${index}" type="button">
              <span class="upgrade-title">${upgrade.title}</span>
              <span class="upgrade-description">${upgrade.description}</span>
            </button>
          `).join("")}
        </div>
      </div>
      <div class="stats-preview">
        ${renderStats(snapshot, null)}
      </div>
    `;

    this.element.hidden = false;

    const previewEl = this.element.querySelector<HTMLElement>(".stats-preview")!;

    this.element.querySelectorAll<HTMLButtonElement>(".upgrade-button").forEach((button) => {
      const index = Number(button.dataset.index);
      const upgrade = upgrades[index]!;

      button.addEventListener("mouseenter", () => {
        previewEl.innerHTML = renderStats(snapshot, previewFn(upgrade));
      });

      button.addEventListener("mouseleave", () => {
        previewEl.innerHTML = renderStats(snapshot, null);
      });

      button.addEventListener("click", () => onChoose(upgrade), { once: true });
    });
  }

  public hide(): void {
    this.element.hidden = true;
    this.element.innerHTML = "";
  }
}

function renderStats(snap: StatsSnapshot, delta: StatsDelta | null): string {
  return [
    row("Income/sec",    formatMoney(snap.incomePerSecond),              delta?.incomePerSecond,    v => formatMoney(v)),
    row("Bullet cost",   formatMoney(snap.bulletCost),                   delta?.bulletCost,         v => formatMoney(v), true),
    row("Bullet damage", formatMoney(snap.bulletDamage),                 delta?.bulletDamage,       v => formatMoney(v)),
    row("Fire rate",     `${snap.fireRatePerSecond.toFixed(2)}/sec`,     delta?.fireRatePerSecond,  v => `${v.toFixed(2)}/sec`),
    row("Bullets",       String(snap.bulletCount),                       delta?.bulletCount,        v => String(Math.round(v))),
    row("Cashback",      pct(snap.cashbackRate),                         delta?.cashbackRate,       v => pct(v)),
    row("XP gain",       xpMult(snap.xpGainMultiplier),                 delta?.xpGainMultiplier,   v => `${v.toFixed(2)}x`),
    emergencyRow(snap.emergencyFundReady, delta?.emergencyFundReady),
  ].join("");
}

function row(
  label: string,
  value: string,
  delta: number | undefined,
  fmt: (v: number) => string,
  lowerIsBetter = false
): string {
  let deltaHtml = "";
  if (delta !== undefined && Math.abs(delta) > 0.0001) {
    const isBuff = lowerIsBetter ? delta < 0 : delta > 0;
    const cls = isBuff ? "delta-positive" : "delta-negative";
    const sign = delta > 0 ? "+" : "−";
    deltaHtml = ` <span class="${cls}">(${sign}${fmt(Math.abs(delta))})</span>`;
  }
  return `<div class="hud-row"><span>${label}</span><span>${value}${deltaHtml}</span></div>`;
}

function emergencyRow(ready: boolean, delta: boolean | undefined): string {
  const value = ready ? "Ready" : "None";
  const deltaHtml = !ready && delta ? ` <span class="delta-positive">(Ready)</span>` : "";
  return `<div class="hud-row"><span>Emergency Fund</span><span>${value}${deltaHtml}</span></div>`;
}

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function xpMult(mult: number): string {
  if (mult === 1) return "1.0x";
  return `${mult.toFixed(2)}x`;
}
