import type { UpgradeChoice } from "../types";

export class LevelUpMenu {
  constructor(private readonly element: HTMLElement) {}

  public show(upgrades: UpgradeChoice[], onChoose: (upgrade: UpgradeChoice) => void): void {
    this.element.innerHTML = `
      <div class="level-panel">
        <h1 class="level-heading">Level Up</h1>
        <div class="upgrade-grid">
          ${upgrades
            .map(
              (upgrade, index) => `
                <button class="upgrade-button" data-index="${index}" type="button">
                  <span class="upgrade-title">${upgrade.title}</span>
                  <span class="upgrade-description">${upgrade.description}</span>
                </button>
              `
            )
            .join("")}
        </div>
      </div>
    `;

    this.element.hidden = false;

    this.element.querySelectorAll<HTMLButtonElement>(".upgrade-button").forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const index = Number(button.dataset.index);
          const upgrade = upgrades[index];
          if (upgrade) {
            onChoose(upgrade);
          }
        },
        { once: true }
      );
    });
  }

  public hide(): void {
    this.element.hidden = true;
    this.element.innerHTML = "";
  }
}
