import { dialog, esc } from "./ui.js";
import { translateUi } from "./ui-copy.js";
const tr = value => translateUi(value, document.documentElement.lang || "ru");
export const appearanceModes = {
  system: "Системная",
  light: "Светлая",
  dark: "Тёмная",
};
const system = window.matchMedia("(prefers-color-scheme: dark)");
export function applyAppearance(mode = "system", persist = false) {
  if (!Object.hasOwn(appearanceModes, mode)) mode = "system";
  document.documentElement.dataset.themeMode = mode;
  const theme = mode === "system" ? (system.matches ? "dark" : "light") : mode;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  if (persist) {
    try {
      localStorage.setItem("mapmarket.appearance", mode);
    } catch {}
  }
  for (const input of document.querySelectorAll('input[name="appearance"]')) input.checked = input.value === mode;
  for (const select of document.querySelectorAll('[data-site-theme]')) select.value = mode;
  for (const label of document.querySelectorAll("[data-appearance-value]"))
    label.textContent = tr(appearanceModes[mode]);
}
export function appearanceSettings() {
  return `<section class="card section appearance-settings"><h2>${esc(tr("Настройки"))}</h2><h3>${esc(tr("Оформление"))}</h3><button type="button" class="button soft" data-appearance-open>${esc(tr("Тема"))} · <span data-appearance-value>${esc(tr(appearanceModes[document.documentElement.dataset.themeMode] || appearanceModes.system))}</span></button></section>`;
}
document.addEventListener("izbor:appearance-changed", event => applyAppearance(event.detail?.mode));
document.addEventListener("izbor:language-changed", () => applyAppearance(document.documentElement.dataset.themeMode));
system.addEventListener("change", () =>
  applyAppearance(document.documentElement.dataset.themeMode),
);
window.addEventListener("storage", (event) => {
  if (event.key === "mapmarket.appearance") applyAppearance(event.newValue);
});
document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-appearance-open]")) return;
  const mode = document.documentElement.dataset.themeMode || "system";
  const modal = dialog(
    `<fieldset class="appearance-options"><legend>${esc(tr("Тема"))}</legend><div class="appearance-choices">${Object.entries(appearanceModes).map(([key, title]) =>
      `<label class="appearance-choice"><input type="radio" name="appearance" value="${key}" ${key === mode ? "checked" : ""}><span class="appearance-preview is-${key}" aria-hidden="true"><i></i><b></b><em></em></span><span class="appearance-choice-title">${esc(tr(title))}</span></label>`
    ).join("")}</div></fieldset>`,
    tr("Оформление"),
  );
  modal.classList.add("appearance-dialog");
  modal.addEventListener("change", (event) => {
    if (event.target.name === "appearance")
      applyAppearance(event.target.value, true);
  });
});
