import { esc } from "./ui.js";

function originalAttributes(raw) {
  if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { throw new Error("Не удалось прочитать характеристики товара. Обратитесь в поддержку."); } }
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}
export function mergeAttributeRows(raw, rows) {
  const original = originalAttributes(raw);
  const hidden = Object.entries(original).filter(([, value]) => value !== null && typeof value === "object");
  const entries = [...hidden];
  const names = new Set(hidden.map(([key]) => key));
  for (const [name, value] of rows) {
    const key = name.trim(), text = value.trim();
    if (!key && !text) continue;
    if (!key || !text) throw new Error("Заполните название и значение характеристики или удалите строку.");
    if (names.has(key)) throw new Error("Названия характеристик не должны повторяться.");
    names.add(key);
    entries.push([key, Object.hasOwn(original, key) && String(original[key]) === text ? original[key] : text]);
  }
  return Object.fromEntries(entries);
}
export function attributeEditorMarkup() {
  return '<fieldset class="attribute-editor"><legend>Характеристики товара</legend><p class="muted">Укажите свойства, которые помогут покупателю выбрать товар: материал, вес, производитель.</p><div data-attribute-rows></div><button type="button" class="button soft" data-add-attribute>Добавить характеристику</button></fieldset>';
}
export function mountAttributeEditor(form, raw) {
  const original = originalAttributes(raw), host = form.querySelector('[data-attribute-rows]');
  function append(key = "", value = "") {
    const row = document.createElement('div'); row.className = 'attribute-row';
    row.innerHTML = `<label class="field"><span>Название</span><input data-attribute-key maxlength="100" value="${esc(key)}" placeholder="Например, материал"></label><label class="field"><span>Значение</span><input data-attribute-value maxlength="2000" value="${esc(value)}" placeholder="Например, хлопок"></label><button type="button" class="icon-button" aria-label="Удалить характеристику">×</button>`;
    row.querySelector('button').onclick = () => { row.remove(); form.querySelector('[data-add-attribute]').focus(); };
    host.append(row); return row;
  }
  for (const [key, value] of Object.entries(original))
    if (value !== null && typeof value !== 'object') append(key, String(value));
  form.querySelector('[data-add-attribute]').onclick = () => append().querySelector('input').focus();
  return () => JSON.stringify(mergeAttributeRows(original, [...host.children].map(row => [row.querySelector('[data-attribute-key]').value, row.querySelector('[data-attribute-value]').value])));
}
