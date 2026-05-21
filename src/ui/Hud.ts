import type { GamePhase } from "../types";

export interface HudState {
  money: number;
  incomePerSecond: number;
  bulletCost: number;
  bulletDamage: number;
  xp: number;
  xpNeeded: number;
  level: number;
  timeSurvivedSeconds: number;
  parentLoanAvailable: boolean;
  emergencyFundReady: boolean;
  phase: GamePhase;
}

export class Hud {
  constructor(private readonly element: HTMLElement) {}

  public update(state: HudState): void {
    const loan = state.parentLoanAvailable ? "Available" : "Used";
    const emergencyFund = state.emergencyFundReady ? "Ready" : "None";
    const time = formatTimer(state.timeSurvivedSeconds);

    this.element.innerHTML = `
      <div class="hud-title">INVESTation</div>
      ${row("Money", formatMoney(Math.max(0, state.money)), state.money <= 75 ? "hud-alert" : "")}
      ${row("Income/sec", formatMoney(state.incomePerSecond))}
      ${row("Bullet cost", formatMoney(state.bulletCost))}
      ${row("Bullet damage", formatMoney(state.bulletDamage))}
      ${row("XP", `${Math.floor(state.xp)} / ${state.xpNeeded}`)}
      ${row("Level", String(state.level))}
      ${row("Time survived", time)}
      ${row("Parent loan", loan, state.parentLoanAvailable ? "" : "hud-alert")}
      ${row("Emergency Fund", emergencyFund, state.emergencyFundReady ? "hud-alert" : "")}
      ${state.phase !== "playing" ? row("Status", statusText(state.phase), "hud-alert") : ""}
    `;
  }
}

function row(label: string, value: string, className = ""): string {
  const valueClass = className ? ` class="${className}"` : "";
  return `<div class="hud-row"><span>${label}</span><span${valueClass}>${value}</span></div>`;
}

function statusText(phase: GamePhase): string {
  if (phase === "level-up") {
    return "Level up";
  }
  if (phase === "parent-loan") {
    return "Small loan";
  }
  if (phase === "won") {
    return "Survived";
  }
  if (phase === "lost") {
    return "Broke";
  }
  return "Playing";
}

export function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function formatTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
