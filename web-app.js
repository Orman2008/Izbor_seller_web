import { installImageSkeletons } from './shared/skeleton.js';
installImageSkeletons();
import {sellerCan,sellerHasWarranties,sellerRouteAllowed,sellerMenuRoutes,sellerNavigationParent} from './shared/seller-navigation.js';
import {createSellerWorkspace,workspaceRoutes,qrTools,splitConnections} from './shared/seller-workspace.js';
import { attributeEditorMarkup, mountAttributeEditor } from "./shared/product-attributes-editor.js";
import {pricingPreview,bindPricing} from './shared/pricing.js';
import {posPage,bindPos} from './seller-pos.js';
import {branchesPage,bindBranches,mapPosLocations} from './seller-branches.js';
import {ensureLegalAcceptance,sellerComplianceView,bindSellerCompliance,rankingHelp} from './shared/compliance.js';
import { appearanceSettings } from "./shared/appearance.js";
import { mountNavigationMotion } from "./shared/motion.js?v=20261024-nav";
import {
  createApiClient,
  resolveApiBaseUrl,
  mediaUrl,
  query,
  rows,
  installPrivateMediaImages,
} from "./shared/api.js?v=20261023-session";
import {
  $,
  esc,
  money,
  heading,
  button,
  empty,
  loading,
  errorView,
  field,
  select,
  textarea,
  dialog,
  submit,
  toast,
} from "./shared/ui.js";
import { authFlow, specializations } from "./shared/auth.js?v=20261023-otp";
import { locationPicker } from "./shared/maps.js";
import { mountChats } from "./shared/chats.js";
import { editAccount, deleteAccount, supportLinks } from "./shared/account.js";

import { mountPhotoEditor } from "./shared/photo-navigation.js";
import { productFormData } from "./shared/products.js";
const base = resolveApiBaseUrl(window.IZBOR_CONFIG?.PUBLIC_API_BASE_URL || window.MAPMARKET_CONFIG?.PUBLIC_API_BASE_URL);
const api = createApiClient({
  baseUrl: base,
  deviceId: `seller-web:${crypto.randomUUID()}`,
  timeout: 30000,
  webClient: "seller",
  sessionStorageKey: "izbor.seller.web.session",
});
installPrivateMediaImages({request: api.request, baseUrl: base});
let user = null,
  shop = null,
  shops = [],
  route = "dashboard",
  generation = 0,
  cleanup = () => {},
  tree = {},
  items = [],
  page = 0,
  filter = "",
  productSort = "new",
  productCategory = "",
  importBatch;
let allBranches=false,branchPageData=null;
const rootId=()=>Number(shop?.root_shop_id||shop?.business_id||shop?.id);
const sellerSymbols={dashboard:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',products:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',qr:'<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6M9 9h6v6H9z"/>',broadcasts:'<path d="m4 10 15-6v16L4 14Z"/><path d="M7 15v5h4l-2-4"/>',clients:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0m0-17a4 4 0 0 1 0 8m3 3a7 7 0 0 1 3 6"/>',ai:'<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z"/>',profile:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',chats:'<path d="M21 15H8l-5 5V4h18Z"/>',analytics:'<path d="M4 20V10m8 10V4m8 16v-8M2 22h20"/>',store:'<path d="M3 10h18l-2-7H5Z"/><path d="M4 10v11h16V10M9 21v-7h6v7"/>'};
Object.assign(sellerSymbols,{
 warranties:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/>',discounts:'<path d="M20 13 11 22 2 13V3h10l8 8Z"/><circle cx="7" cy="8" r="1"/>',loyalty:'<path d="M3 7h18v14H3ZM2 3h20v4H2ZM12 3v18"/><path d="M12 3C4-4 3 7 12 3c9 4 8-7 0 0"/>',promotion:'<path d="m3 10 17-6v16L3 14ZM7 15v6h4l-2-5"/>',invitations:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2m3-13v8m-4-4h8"/>',reviews:'<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',plan:'<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 10h18M7 15h5"/>',team:'<circle cx="8" cy="8" r="4"/><circle cx="18" cy="9" r="3"/><path d="M1 21v-2a7 7 0 0 1 14 0v2m2-7a6 6 0 0 1 6 7"/>',imports:'<path d="M12 3v12m-5-5 5 5 5-5M3 15v6h18v-6"/>',branches:'<path d="M12 3v8M4 21v-5h16v5M4 16v-5h16v5"/><circle cx="12" cy="3" r="2"/>'});
function sellerIcon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${sellerSymbols[name]||sellerSymbols.products}</svg>`;}
const nav = [
  ["dashboard", "Главная"],
  ["products", "Товары"],
  ["catalog", "Каталог Izbor Seller"],
  ["imports", "Системы учёта"],
  ["pos", "Синхронизация и сопоставление"],
  ...workspaceRoutes,
  ["chats", "Чаты"],
  ["reviews", "Отзывы"],
  ["broadcasts", "Рассылка"],
  ["qr", "QR"],
  ["clients", "Клиенты"],
  ["analytics", "Аналитика"],
  ["plan", "Тариф"],
  ["photo-navigation", "Фото-маршрут"],
  ["store", "Магазин"],
  ["team", "Команда"],
  ["branches", "Филиалы"],
  ["profile", "Аккаунт"],
  ["compliance", "Проверка продавца"],
  ["ranking", "Как формируется выдача"],
];
$("#app").outerHTML =
  `<a class="skip-link" href="#view">К содержимому</a><div class="web-shell"><aside class="web-sidebar" id="workspaceSidebar"><a class="web-brand" href="#dashboard"><img src="assets/izbor-icon-192.png?v=20261027" alt="Izbor Seller"><span>Izbor Seller<br><small class="muted">Бизнес-центр</small></span></a><nav aria-label="Кабинет продавца">${nav.filter(([key])=>sellerMenuRoutes(null).includes(key)).map(([key, title]) => `<a href="#${key}" data-nav="${key}"><span class="seller-nav-icon">${sellerIcon(key)}</span><span>${title}</span></a>`).join("")}</nav><div class="sidebar-footer">${supportLinks(base, "seller")}</div></aside><button type="button" class="workspace-backdrop" data-workspace-dismiss aria-label="Закрыть меню" hidden></button><main class="web-main"><header class="web-header"><button type="button" class="button soft workspace-menu-button" data-workspace-menu aria-expanded="false" aria-controls="workspaceSidebar">☰ <span>Все разделы</span></button><span id="storeName">Кабинет продавца</span><div id="branchContext"></div><label class="site-language"><span class="sr-only">Язык</span><select data-site-language aria-label="Язык"><option value="ru">RU</option><option value="uz">UZ</option><option value="en">EN</option></select></label><div class="actions">${button("Войти", "login")}${button("Выйти", "logout")}</div></header><section id="view" class="web-content" aria-live="polite"></section></main><nav class="seller-mobile-tabs" aria-label="Основные разделы">${[["dashboard","Главная"],["products","Товары"],["qr","QR"],["clients","Клиенты"],["profile","Профиль"]].map(([key,title])=>`<a href="#${key}" data-nav="${key}">${sellerIcon(key)}<span>${title}</span></a>`).join("")}</nav></div>`;
function syncSellerNavigation(){
 const visible=sellerMenuRoutes(shop);
 const sidebar=document.querySelector('.web-sidebar nav');
 const current=[...sidebar.querySelectorAll('[data-nav]')].map(link=>link.dataset.nav).join(',');
 const entries=visible.map(key=>nav.find(([name])=>name===key)).filter(Boolean);
 if(current!==entries.map(([key])=>key).join(',')){
  sidebar.querySelectorAll('[data-nav]').forEach(link=>link.remove());
  sidebar.insertAdjacentHTML('beforeend',entries.map(([key,title])=>`<a href="#${key}" data-nav="${key}"><span class="seller-nav-icon">${sellerIcon(key)}</span><span>${title}</span></a>`).join(''));
 }
 const mobile=document.querySelector('.seller-mobile-tabs');
 const preferred=[...new Set(['dashboard','products','chats','qr','clients','analytics',...visible])];
 const tabs=preferred.filter(key=>key!=='profile'&&visible.includes(key)).slice(0,4).concat('profile');
 if([...mobile.querySelectorAll('[data-nav]')].map(link=>link.dataset.nav).join(',')!==tabs.join(',')){
  mobile.querySelectorAll('[data-nav]').forEach(link=>link.remove());
  mobile.insertAdjacentHTML('beforeend',tabs.map(key=>`<a href="#${key}" data-nav="${key}">${sellerIcon(key)}<span>${esc(key==='profile'?'Профиль':nav.find(([name])=>name===key)?.[1]||key)}</span></a>`).join(''));
 }
 document.querySelectorAll('[data-nav]').forEach(link=>{
  const allowed=sellerRouteAllowed(shop,link.dataset.nav);
  link.hidden=!allowed;link.style.display=allowed?'':'none';
  const parent=sellerNavigationParent(route);
  link.classList.toggle('active',link.dataset.nav===(visible.includes(route)?route:parent));
 });
}
function sellerSectionLinks(entries){
 const allowed=entries.filter(([key])=>sellerRouteAllowed(shop,key));
 return allowed.length?`<div class="actions section">${allowed.map(([key,title])=>`<a class="button soft" href="#${key}">${esc(title||nav.find(([name])=>name===key)?.[1]||key)}</a>`).join('')}</div>`:'';
}
const image = (url, title = "Фото товара") => {
  const src = mediaUrl(url, base, true);
  return src
    ? `<img src="${esc(src)}" alt="${esc(title)}" loading="lazy">`
    : "";
};
const endpoint = (suffix) => `/shops/${Number(shop.id)}${suffix}`;
export async function resumeSellerSession() {
  if (!await api.restore()) return false;
  const me = await api.request('/users/me');
  user = me.user;
  shops = rows(await api.request('/users/me/shops'));
  shop = shops.find(s => Number(s.id) === Number(me.shop?.id)) || (shops.length === 1 ? shops[0] : null);
  const requested = nav.some(([key]) => key === location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard';
  await go(requested);
  window.dispatchEvent(new window.Event('seller-authenticated'));
  return true;
}
export function beginSellerLogin(mode) { login(mode); }
function login(mode) {
  const requestedRoute = nav.some(([key]) => key === location.hash.slice(1)) ? location.hash.slice(1) : "dashboard";
  authFlow({
    api,
    client: "seller",
    initialMode: mode,
    baseUrl: base,
    locationPicker,
    onSession: async (payload) => {
      user = payload.user;
      shop = payload.shop;
      route = requestedRoute;
      window.history.replaceState(null, "", location.pathname + location.search + "#" + route);
      try {
        if (!shop) {
    $("#view").removeAttribute("aria-busy");
          const me = await api.request("/users/me");
          user = me.user;
          shop = me.shop;
        }
        shops = rows(await api.request("/users/me/shops"));
        shop = shops.find((s) => Number(s.id) === Number(shop?.id)) || shop;
        await go(requestedRoute);
      window.dispatchEvent(new window.Event("seller-authenticated"));
      } catch (error) {
        $("#view").innerHTML = errorView(error);
        window.dispatchEvent(new window.Event("seller-authenticated"));
      }
    },
  });
}
function bindForm(id, task) {
  const form = $(id);
  if (form)
    form.onsubmit = (event) => {
      event.preventDefault();
      submit(form, task);
    };
}
const metricLabels = {
  store_views: "Просмотры магазина",
  product_views: "Просмотры товаров",
  clicks: "Открытия",
  calls: "Звонки",
  routes: "Маршруты",
  catalog_views: "Каталог",
  favorites: "Избранное",
  chats: "Чаты",
  qr_deals: "QR магазина",
  current_plan: "Текущий тариф",
  product_usage: "Товаров",
  product_limit: "Лимит товаров",
  ai_credits: "AI-кредиты",
  found: "Найдено строк",
  valid: "Корректные строки",
  errors: "Ошибки",
};
let integrationProviders = [];
let analyticsDays = 7;
function timelineChart(points) {
  const data = rows(points).filter(point => Number.isFinite(Number(point.value)));
  if (!data.length) return '<p class="empty">За этот период нет данных для графика.</p>';
  const max = Math.max(1,...data.map(point => Number(point.value)));
  return '<div class="dashboard-bars" role="img" aria-label="Просмотры магазина по дням">' + data.map(point => `<div title="${esc(point.day)}: ${Number(point.value)}"><span class="chart-bar" style="height:${Math.max(0,Number(point.value))*100/max}%"></span><small>${esc(point.day)}</small></div>`).join('') + '</div>';
}
function quickActions(){
  if(!sellerCan(shop,'products')&&!sellerRouteAllowed(shop,'qr'))return '';
  return `<section class="section app-quick-section"><h2>Быстрые действия</h2><div class="app-quick-actions">${sellerCan(shop,'products')?`<button data-action="new-product">${sellerIcon('products')}<span>Добавить</span></button>`:''}${sellerRouteAllowed(shop,'qr')?`<a href="#qr">${sellerIcon('qr')}<span>QR</span></a>`:''}</div></section>`;
}
function sellerHome(data,plan,products){
  const overview=data.overview||{}, detailed=Number(data.access?.priority)>0;
  const shown=value=>value===undefined||value===null?'—':esc(value);
  const attention=(products||[]).filter(p=>p.in_stock===false||p.stock_status==='UNCONFIRMED');
  const greeting=new Date().getHours()<12?'Доброе утро':new Date().getHours()<18?'Добрый день':'Добрый вечер';
  return `<header class="dashboard-top"><div><p class="eyebrow"><span>БИЗНЕС-ЦЕНТР</span> · ${esc(shop.name)}</p><h1>${greeting}</h1><p>Вот что происходит с бизнесом сегодня</p></div>${sellerRouteAllowed(shop,'store')?'<a class="button soft" href="#store">Мой магазин</a>':''}</header>
  <section class="app-primary-metric"><div><span>Просмотры магазина</span><strong>${shown(overview.store_views)}</strong><small><span>За период</span> · ${analyticsDays} <span>дней</span></small></div>${sellerIcon('analytics')}</section>
  <div class="app-secondary-metrics"><article><span>Клиенты</span><strong>${detailed?shown(overview.unique_visitors):'—'}</strong>${!detailed?'<small>Доступно с PRO</small>':''}</article><article><span>Маршруты</span><strong>${detailed?shown(overview.routes):'—'}</strong>${!detailed?'<small>Доступно с PRO</small>':''}</article><article><span>Внимание</span><strong>${products?attention.length:'—'}</strong><small>Среди последних товаров</small></article></div>
  ${quickActions()}
  <div class="dashboard-grid"><section class="card dashboard-chart"><div class="section-head"><h2>Динамика</h2><a href="#analytics">Аналитика ↗</a></div><p class="muted"><span>Интерес покупателей к магазину</span> · ${analyticsDays} <span>дней</span></p>${detailed?timelineChart(data.timeline):'<p class="notice">Расширенная аналитика доступна с PRO.</p>'}</section><section class="card dashboard-store-state"><h2>Мой магазин</h2><p>${esc(shop.name)}</p><p class="muted">${esc(shop.address||'Адрес не указан')}</p><dl><div><dt>Тариф</dt><dd>${esc(String(plan.current_plan||'FREE').replaceAll('_',' '))}</dd></div><div><dt>Товары</dt><dd>${shown(plan.product_usage)} / ${Number(plan.product_limit)===-1?'Без лимита':shown(plan.product_limit)}</dd></div></dl>${sellerRouteAllowed(shop,'store')?'<a class="button soft" href="#store">Настройки магазина</a>':''}</section></div>
  <section class="section"><div class="section-head"><h2>Требуют внимания</h2>${sellerRouteAllowed(shop,'products')?'<a href="#products">Все товары ↗</a>':''}</div>${!products?'<p class="notice">Выберите доступный филиал и откройте товары для проверки наличия.</p>':attention.length?table(attention,[["Товар",p=>esc(p.title)],["Наличие",p=>p.stock_status==='UNCONFIRMED'?'Не подтверждено':'Нет в наличии']]):'<div class="card"><p class="muted">Среди последних загруженных товаров нет неподтверждённых или отсутствующих.</p></div>'}</section>`;
}
function infoCards(data) {
  return `<div class="stats">${Object.entries(data || {})
    .filter(([, v]) => typeof v === "number" || typeof v === "string")
    .slice(0, 16)
    .map(
      ([key, value]) =>
        `<article class="card stat"><span class="muted">${esc(metricLabels[key] || key.replaceAll("_", " "))}</span><b>${esc(key === "current_plan" ? String(value).replaceAll("_", " ") : key === "product_limit" && Number(value) === -1 ? "Без лимита" : value)}</b></article>`,
    )
    .join("")}</div>`;
}
function table(values, columns, productRows = false) {
  return values.length
    ? `<div class="table-wrap"><table><thead><tr>${columns.map(([name]) => `<th scope="col">${esc(name)}</th>`).join("")}</tr></thead><tbody>${values.map((item) => `<tr${productRows ? ' data-product-row' : ''}>${columns.map(([name, render]) => `<td>${productRows ? '<span class="product-mobile-label">'+esc(name)+'</span>' : ''}${render(item)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
    : empty();
}
function productTable() {
  return table(items, [
    [
      "Товар",
      (p) =>
        `${image(p.image_url, p.title)}<b>${esc(p.title)}</b><p class="muted">${esc(p.barcode || p.gtin || "Без штрихкода")}</p>`,
    ],
    ["Филиал",p=>`${esc(p.branch_name||shop.name)}<p class="muted">${esc(p.branch_code||shop.store_code)}</p>`],
    ["Цена", (p) => money(p.price)],
    ["Остаток", (p) => esc(p.stock_quantity ?? "Не указан")],
    [
      "Наличие",
      (p) =>
        `<span class="status">${esc(({AVAILABLE:"В наличии",OUT_OF_STOCK:"Нет в наличии",UNCONFIRMED:"Наличие не подтверждено"})[p.stock_status || (p.in_stock ? "AVAILABLE" : "OUT_OF_STOCK")]||p.stock_status)}</span>`,
    ],
    [
      "Действия",
      (p) =>
        `<div class="actions">${shop.position==='owner'||shop.permissions?.products?button("Изменить", "edit-product", `data-id="${Number(p.id)}"`)+button("Наличие", "stock", `data-id="${Number(p.id)}"`):""}${shop.position==='owner'?button("Удалить", "delete-product", `data-id="${Number(p.id)}"`):""}</div>`,
    ],
  ], true);
}
async function loadProducts() {
  const version = generation;
  if (!Object.keys(tree).length) tree = await api.request("/products/category-tree");
  const fetched = rows(
    await api.request(
      `/products?${query({ shop_id: shop.id, q: filter, category: productCategory, sort: productSort, limit: 24, offset: page * 24 })}`,
    ),
  );
  if (version !== generation) throw new Error("Запрос устарел");
  items = fetched;
  return `${heading("Каталог товаров", shop.name)}<div class="toolbar">${sellerCan(shop,'products')?button("Добавить вручную", "new-product"):""}${sellerRouteAllowed(shop,'catalog')?'<a class="button soft" href="#catalog">Из общего каталога</a>':""}</div>${sellerSectionLinks([['imports','Импорт товаров'],['ai','Izbor AI']])}<form id="productSearch" class="toolbar">${field("Поиск", "q", filter)}${select("Категория", "category",[["","Все категории"],...Object.keys(tree)],productCategory)}${select("Сортировка","sort",[["new","Сначала новые"],["price_asc","Сначала дешевле"],["price_desc","Сначала дороже"],["rating","По рейтингу"]],productSort)}<button class="button">Применить</button></form>${productTable()}<div class="actions">${page ? button("Назад", "previous") : ""}${items.length === 24 ? button("Далее", "next") : ""}</div>`;
}
async function editor(product = {}) {
  if (shop.position !== 'owner') {
    if (!product.id || shop.permissions?.products === false) return;
    const modal=dialog(`<form class="form">${field('Цена','price',product.price,'number','min="0" step="any" required')}${field('Скидка, %','discount_percent',product.discount_percent||0,'number','min="0" max="99.99" step="any"')}${field('Остаток','stock_quantity',product.stock_quantity??0,'number','min="0"')}${select('Наличие','stock_status',['AVAILABLE','OUT_OF_STOCK','UNCONFIRMED'],product.stock_status||'AVAILABLE')}<button class="button">Сохранить предложение филиала</button></form>`,product.title);
    const form=modal.querySelector('form');form.onsubmit=event=>{event.preventDefault();submit(form,async values=>{await api.request(`/products/${Number(product.id)}`,{method:'PUT',body:values});modal.close();await go();});};
    return;
  }
  if(allBranches&&!product.id){toast("Выберите филиал для добавления товара");return;}
  if (!Object.keys(tree).length)
    tree = await api.request("/products/category-tree");
  const modal = dialog(
    `<form class="form">${field("Название", "title", product.title || "", "text", 'required maxlength="220"')}${textarea("Описание", "description", product.description)}<div class="form-row">${field("Цена, сум", "price", product.price ?? "", "number", 'required min="0.01" step="0.01"')}${field("Старая цена", "old_price", product.old_price || "", "number", 'min="0" step="0.01"')}${field("Скидка, %", "discount_percent", product.discount_percent || 0, "number", 'min="0" max="99" step="0.01"')}</div><div class="form-row">${field("Количество", "stock_quantity", product.stock_quantity ?? "", "number", 'min="0" step="1"')}${select("Наличие", "stock_status", ["AVAILABLE", "OUT_OF_STOCK", "UNCONFIRMED"], product.stock_status || "AVAILABLE")}</div><div class="form-row">${field("Штрихкод / GTIN", "barcode", product.barcode || product.gtin || "", "text", 'inputmode="numeric"')}${field("Артикул", "sku", product.sku || "")}</div><div class="form-row">${field("Бренд", "brand", product.brand || "")}${field("Модель", "model", product.model || "")}</div><details><summary>Варианты и характеристики</summary><div class="form">${field("Цвет", "color", product.color || "")}${field("Размер", "size", product.size || "")}${field("Длина", "length", product.length || "")}${["available_colors", "available_sizes", "unavailable_colors", "unavailable_sizes"].map((key, index) => field(["Цвета через запятую", "Размеры через запятую", "Недоступные цвета", "Недоступные размеры"][index], key, Array.isArray(product[key]) ? product[key].join(", ") : "")).join("")}${attributeEditorMarkup()}</div></details>${select("Категория", "category", Object.keys(tree), product.category)}<div id="subcategories"></div><p class="field-note">AI: не отправляйте фото документов, банковских карт, PINFL и других персональных или платёжных данных. Изображения не проходят OCR/DLP-проверку.</p>${field("Приложить фото", "image", "", "file", 'accept="image/jpeg,image/png,image/webp"')}<div class="gallery">${(
      product.image_urls || [product.image_url]
    )
      .filter(Boolean)
      .map((url) => image(url))
      .join(
        "",
      )}</div><p class="muted">Фотография загружается в существующее хранилище Izbor Seller. Удаление фона доступно в Seller App; браузер не запускает мобильный ML-процесс.</p><div class="actions"><button type="button" class="button soft" data-editor-ai="photo">AI: заполнить по фото</button><button type="button" class="button soft" data-editor-ai="description">AI: описание</button></div><p class="muted">Перед AI-запросом покажем стоимость из действующего тарифа. Поля можно проверить до сохранения.</p><button class="button">Сохранить товар</button></form>`,
    product.id ? "Изменить товар" : "Добавить товар",
  );
  const form = $("form", modal),
    category = $("[name=category]", modal);
  const readAttributes = mountAttributeEditor(form, product.attributes);
  function sub() {
    const children = tree[category.value] || {};
    $("#subcategories", modal).innerHTML =
      select(
        "Подкатегория",
        "sub_category",
        Object.keys(children),
        product.sub_category,
      ) + '<div id="leaf"></div>';
    function leaf() {
      const s = $("[name=sub_category]", modal);
      $("#leaf", modal).innerHTML = select(
        "Раздел",
        "leaf_category",
        children[s.value] || [],
        product.leaf_category,
      );
    }
    leaf();
    $("[name=sub_category]", modal).onchange = leaf;
  }
  sub();
  category.onchange = sub;
  if (!product.id) {
    category.closest("label").hidden = true;
    $("#subcategories", modal).hidden = true;
    category
      .closest("label")
      .insertAdjacentHTML(
        "afterend",
        '<p class="muted">Категорию нового товара определяет сервер по названию и описанию. Её можно изменить после сохранения.</p>',
      );
  }
  for (const control of modal.querySelectorAll("[data-editor-ai]"))
    control.onclick = async () => {
      control.disabled = true;
      try {
        const costs = await api.request(
          "/seller-ai/messages?" + query({ shop_id: shop.id }),
        );
        const operation =
          control.dataset.editorAi === "photo"
            ? "product_analysis"
            : "product_description";
        const cost = Number(costs.ai_operation_costs?.[operation]);
        if (!Number.isFinite(cost)) throw new Error("Стоимость AI недоступна");
        if (
          !window.confirm(
            "Запрос использует " + cost + " AI-кредитов. Продолжить?",
          )
        )
          return;
        let result;
        if (operation === "product_analysis") {
          const file = form.elements.image.files[0];
          if (!file) throw new Error("Сначала выберите фото товара");
          const data = new FormData();
          data.append("image", file);
          result = await api.request(endpoint("/ai/analyze-product-image"), {
            method: "POST",
            body: data,
          });
          for (const key of [
            "title",
            "description",
            "brand",
            "model",
            "stock_status",
          ])
            if (result.draft?.[key] != null)
              form.elements[key].value = result.draft[key];
          if (result.draft?.category && tree[result.draft.category]) {
            category.value = result.draft.category;
            sub();
          }
        } else {
          result = await api.request(endpoint("/ai/describe-product"), {
            method: "POST",
            body: {
              title: form.elements.title.value,
              description: form.elements.description.value,
              category: product.id ? category.value : "товар",
            },
          });
          form.elements.description.value = result.description || "";
        }
        toast("Проверьте предложенные AI поля перед сохранением");
      } catch (error) {
        $(".form-error", modal).textContent = error.message;
      } finally {
        control.disabled = false;
      }
    };
  form.onsubmit = (event) => {
    event.preventDefault();
    submit(form, async (values) => {
      values.attributes = readAttributes();
      const data = productFormData(product, values, product.shop_id||shop.id);
      await api.request(
        product.id ? `/products/${Number(product.id)}` : "/products",
        { method: product.id ? "PUT" : "POST", body: data },
      );
      modal.close();
      page = 0;
      route = "products";
      location.hash = "products";
      await go();
      toast("Товар сохранён в Izbor Seller");
    });
  };
}
async function catalog() {
  return `${heading("Каталог Izbor Seller", "Общий каталог для всех магазинов")}<form id="lookup" class="toolbar">${field("Штрихкод или название", "q", filter, "text", "required")}<button class="button">Найти</button>${button("Считать камерой", "barcode")}</form><div id="catalogResults">${empty("Введите штрихкод или название")}</div>`;
}
async function lookup(value) {
  filter = value;
  $("#catalogResults").innerHTML = loading("products");
  try {
    let data;
    if (/^\d{8,14}$/.test(value)) {
      const found = await api.request(
        `/catalog/gtin/${encodeURIComponent(value)}`,
      );
      data = found.product ? [found.product] : rows(found);
    } else
      data = rows(
        await api.request(
          `/seller/catalog/search?${query({ q: value, limit: 24 })}`,
        ),
      );
    $("#catalogResults").innerHTML = table(data, [
      [
        "Товар",
        (p) =>
          `${image(p.canonical_image_url || p.image_url)}<b>${esc(p.canonical_name || p.title)}</b><p>${esc(p.gtin || p.barcode)}</p>`,
      ],
      [
        "Добавить",
        (p) =>
          button(
            "Добавить предложение",
            "offer",
            `data-id="${Number(p.master_product_id || p.id)}"`,
          ),
      ],
    ]);
  } catch (error) {
    $("#catalogResults").innerHTML =
      errorView(error) + button("Добавить новый товар", "new-product");
  }
}
async function imports() {
  if(allBranches)throw new Error("Выберите филиал для импорта");
  const [providers, integrations] = await Promise.all([
    api.request("/api/integrations/providers"),
    api.request(`/api/stores/${shop.id}/integrations`),
  ]);
  integrationProviders = rows(providers);
  const connectionGroups=splitConnections(rows(integrations));
  const connectionSections=[['connected','Подключённые'],['attention','Требуют настройки'],['disconnected','Не подключённые']];
  return `${heading("Системы учёта", "Импорт товаров, цен и остатков")}<div class="card"><h2>Excel / CSV</h2><form id="importFile" class="form">${field("Файл", "file", "", "file", 'required accept=".csv,.xlsx,.xls"')}<button class="button">Проверить и посмотреть</button></form><div id="importPreview"></div></div>${connectionSections.map(([groupKey,groupTitle])=>connectionGroups[groupKey].length?`<section class="section"><h2>${esc(groupTitle)}</h2>${table(
    connectionGroups[groupKey],
    [
      ["Провайдер", (i) => esc(i.provider_name || i.provider)],
      ["Статус", (i) => esc(({connected:'Подключено',syncing:'Синхронизация',degraded:'Требует внимания',disconnected:'Отключено',configuring:'Настройка',error:'Ошибка'})[i.status]||i.status)],
      [
        "Действия",
        (i) =>
          `<div class="actions">${["test", "connect", "sync", "status", "health", "errors", "sync-history", "locations"].map((action) => button(({test:"Проверить",connect:"Подключить",sync:"Синхронизировать",status:"Состояние",health:"Диагностика",errors:"Ошибки","sync-history":"История",locations:"Точки продаж"})[action], "integration", `data-id="${esc(i.id)}" data-operation="${action}"`)).join("")}${button("Отключить", "disconnect", `data-id="${esc(i.id)}"`)}</div>`,
      ],
    ],
  )}</section>`:'').join('')}${!connectionGroups.connected.length?'<p class="notice">Подключённых систем пока нет.</p>':''}<p><a class="button soft" href="#pos">Синхронизация и сопоставление →</a></p><section class="card"><h2>Подключить API</h2><form id="integrationCreate" class="form">${select(
    "Провайдер",
    "provider",
    rows(providers)
      .filter(
        (p) =>
          p.is_enabled &&
          (p.availability === "available" || p.setup_supported) &&
          p.connection_type !== "file_import",
      )
      .map((p) => [p.code, p.name]),
  )}${textarea("Credentials JSON (не сохраняются в браузере)", "credentials", "{}")}${textarea("Configuration JSON", "configuration", "{}")}<p class="muted">Секреты отправляются только backend и очищаются после запроса. Не вставляйте ключи в адрес сайта.</p><button class="button">Сохранить подключение</button></form></section>`;
}
async function previewImport(values) {
  const data = new FormData();
  data.append("file", values.file);
  importBatch = await api.request(
    `/api/stores/${shop.id}/integration-imports/preview`,
    { method: "POST", body: data },
  );
  $("#importPreview").innerHTML =
    `<p class="notice">Предпросмотр: ${esc(importBatch.summary?.found || importBatch.preview_rows?.length || 0)} строк. До подтверждения товары не импортируются.</p><div class="table-wrap"><table><thead><tr>${importBatch.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows(
      importBatch,
      "preview_rows",
    )
      .map(
        (row) =>
          `<tr>${(Array.isArray(row) ? row : Object.values(row)).map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`,
      )
      .join(
        "",
      )}</tbody></table></div><form id="importMapping" class="form">${["name", "price", "barcode", "sku", "stock", "discount_price", "category", "brand", "image_url", "description"].map((key) => select(key, key, [["", "Не использовать"], ...importBatch.headers], importBatch.suggested_mapping?.[key])).join("")}<button class="button">Проверить сопоставление</button></form><div id="importValidation"></div>`;
  bindForm("#importMapping", async (mapping) => {
    const result = await api.request(
      `/api/stores/${shop.id}/integration-imports/${importBatch.import_id}/mapping`,
      { method: "POST", body: { mapping } },
    );
    $("#importValidation").innerHTML =
      infoCards({
        found: result.found,
        valid: result.valid,
        errors: result.errors_count,
        new_products:result.new_products,existing_products:result.existing_products,updates:result.updates,skipped:result.skipped,
      }) +
      `<p>${esc(rows(result, "first_errors").join("; "))}</p>${result.valid && !result.errors_count && !result.skipped ? button("Подтвердить импорт", "confirm-import") : ""}`;
  });
}
async function storePage() {
  if(allBranches)throw new Error("Выберите филиал для настройки магазина");
  return `${heading("Мой магазин", shop.name)}${sellerSectionLinks([['photo-navigation','Маршрут к магазину'],['reviews','Отзывы']])}<div class="card"><form id="storeForm" class="form">${field("Название", "name", shop.name, "text", shop.position==='owner'||shop.root_shop_id?"required":"readonly")}${field("Адрес", "address", shop.address, "text", "required")}${field("Телефон", "phone", shop.phone || "", "tel")}${field("Telegram", "telegram", shop.telegram || "")}${field("Часы работы", "working_hours", shop.working_hours || "")}${shop.position==='owner'?textarea("Описание", "description", shop.description)+select("Сфера", "specialization_code", specializations, shop.specialization_code):""}<div id="storePicker" class="web-map picker-map"></div><div class="form-row">${field("Широта", "latitude", shop.latitude, "number", 'required step="any" min="-90" max="90"')}${field("Долгота", "longitude", shop.longitude, "number", 'required step="any" min="-180" max="180"')}</div>${shop.position==='owner'?field("Логотип", "logo", "", "file", 'accept="image/jpeg,image/png,image/webp"'):""}<button class="button">Сохранить магазин</button></form></div>`;
}
async function team() {
  const [members, applications] = await Promise.all([
    api.request(endpoint("/team")),
    api.request(endpoint("/staff-applications")),
  ]);
  let permissionForm='';
  if(shop.position==='owner'){
    const setting=await api.request(endpoint('/staff-permissions'));
    const labels={products_view:'Просмотр товаров',products:'Изменение предложений',profile:'Профиль филиала',staff:'Управление командой',chats:'Чаты',analytics:'Аналитика',reviews:'Отзывы',qr:'QR',broadcasts:'Рассылки',sales:'Продажи',ai:'AI'};
    permissionForm='<p><a class="button" href="#invitations">Пригласить сотрудника</a></p><section class="card"><h2>Права этого филиала</h2><form id="branchPermissions" class="form">'+['seller','manager'].map(role=>'<fieldset class="permission-group"><legend>'+esc(role==='manager'?'Менеджер':'Сотрудник')+'</legend><div class="permission-options">'+Object.entries(labels).map(([key,label])=>'<label><input type="checkbox" data-permission-role="'+role+'" data-permission="'+key+'" '+(setting.permissions?.[role]?.[key]?'checked':'')+'>'+esc(label)+'</label>').join('')+'</div></fieldset>').join('')+'<button class="button">Сохранить права</button></form></section>';
  }
  return `${permissionForm}${heading("Команда", "Права проверяются сервером для выбранного филиала")}<p class="notice">Код магазина: ${esc(shop.store_code || "Откройте профиль магазина в приложении")}</p>${table(
    rows(members, "members"),
    [
      ["Сотрудник", (m) => esc(m.name || m.user_name)],
      ["Роль", (m) => esc(m.role)],
      [
        "Действия",
        (m) =>
          button("Изменить роль", "team-role", `data-id="${Number(m.id)}"`) +
          button("Удалить доступ", "team-delete", `data-id="${Number(m.id)}"`),
      ],
    ],
  )}<section class="section"><h2>Заявки</h2>${table(
    rows(applications, "applications"),
    [
      ["Имя", (a) => esc(a.name)],
      ["Статус", (a) => esc(a.status)],
      [
        "Действия",
        (a) =>
          (a.status || "pending") === "pending"
            ? button("Одобрить", "approve", `data-id="${Number(a.id)}"`) +
              button("Отклонить", "reject", `data-id="${Number(a.id)}"`)
            : "",
      ],
    ],
  )}</section>`;
}
async function broadcasts() {
  const data = await api.request(endpoint("/broadcasts"));
  return `${heading("Рассылка", `Подписчиков: ${Number(data.audience_count) || 0}`)}<form id="broadcastForm" class="form card">${textarea("Текст уведомления", "text")}${field("Приложить фото", "image", "", "file", 'accept="image/jpeg,image/png,image/webp"')}<button class="button">Отправить всем</button></form><section class="section"><h2>История рассылок</h2><div class="store-grid">${
    rows(data, "broadcasts")
      .map(
        (b) =>
          `<article class="card">${image(b.media_url, "Фото рассылки")}<p>${esc(b.text)}</p><p class="muted">${esc(b.created_at)} · получателей ${Number(b.recipients_count) || 0}</p></article>`,
      )
      .join("") || empty()
  }</div></section>`;
}
async function go(next = route) {
  if (!nav.some(([name]) => name === next)) next = "dashboard";
  route = next;
  const backdrop=document.querySelector('[data-workspace-dismiss]');if(backdrop)backdrop.hidden=true;
  document.querySelector('.web-sidebar')?.classList.remove('workspace-open');
  document.querySelector('[data-workspace-menu]')?.setAttribute('aria-expanded','false');
  syncSellerNavigation();
  const version = ++generation;
  document.querySelectorAll('dialog[open]').forEach(modal=>modal.close());
  $('#view').setAttribute('aria-busy','true');
  const disposePrevious = cleanup;
  cleanup = () => {};
  disposePrevious();
  document.title = `${nav.find((n) => n[0] === route)?.[1] || "Кабинет"} · Izbor Seller`;
  $("#view").innerHTML = loading(route === "products" ? "table" : route === "store" ? "profile" : route);
  $("[data-action=login]").hidden = api.authenticated;
  $("[data-action=logout]").hidden = !api.authenticated;
  if (!api.authenticated) {
    $("#view").removeAttribute("aria-busy");
    $("#view").innerHTML =
      `${heading("Управляйте магазином в Izbor Seller", "Тот же аккаунт и каталог, что в Seller App")}<div class="card"><h2>Вход по номеру телефона</h2><p>Код в Telegram или SMS. Владелец создаёт магазин, сотрудник присоединяется по коду магазина.</p>${button("Войти / зарегистрироваться", "login")}</div>`;
    return;
  }
  if (!shop) {
    $("#view").removeAttribute("aria-busy");
    $("#view").innerHTML = `${empty("Нет доступного магазина")}${button("Продолжить настройку или присоединиться", "login")}`;
    return;
  }
  $("#storeName").textContent=shop.business_name||shop.name;
  const owner=shop.position==='owner';
  syncSellerNavigation();
  const network=shops.filter(s=>Number(s.root_shop_id||s.business_id||s.id)===rootId());
  $("#branchContext").innerHTML=owner?select("Филиал","active_branch",[["all","Все филиалы"],...network.filter(s=>!s.subscription_locked&&s.branch_status!=='archived').map(s=>[s.id,(s.root_shop_id?s.branch_display_name||s.name:'Основной')+' — '+(s.store_code||'')+' · '+(s.address||'')])],allBranches?'all':shop.id):'<span>Филиал: '+esc(shop.name)+' · '+esc(shop.store_code)+'</span>';
  const branchSelect = $("[name=active_branch]");
  if (branchSelect) {
    branchSelect.hidden = true;
    const picker = document.createElement("details");
    picker.className = "branch-picker";
    picker.innerHTML = `<summary><span>${esc(branchSelect.selectedOptions[0]?.textContent || "Выберите филиал")}</span><span aria-hidden="true">⌄</span></summary><div class="branch-picker-menu" role="group" aria-label="Выбор филиала">${Array.from(branchSelect.options).map(option => `<label class="branch-picker-option"><input type="radio" name="branch_picker" value="${esc(option.value)}" ${option.selected ? "checked" : ""}><span>${esc(option.textContent)}</span></label>`).join("")}</div>`;
    const branchField = document.createElement("div");
    branchField.className = "field";
    const caption = document.createElement("span");
    caption.textContent = "Филиал";
    branchSelect.parentElement.replaceWith(branchField);
    branchField.append(caption, branchSelect, picker);
    picker.addEventListener("change", event => {
      if (!event.target.matches('input[name="branch_picker"]')) return;
      branchSelect.value = event.target.value;
      picker.open = false;
      branchSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    picker.addEventListener("keydown", event => {
      if (event.key === "Escape") { picker.open = false; picker.querySelector("summary").focus(); }
    });

  }
  $("[name=active_branch]")?.addEventListener("change",async e=>{allBranches=e.target.value==='all';if(!allBranches)shop=shops.find(s=>Number(s.id)===Number(e.target.value));else shop=shops.find(s=>Number(s.id)===rootId())||shop;page=0;await go();});
  try {

    if(!sellerRouteAllowed(shop,route))throw new Error('Раздел недоступен для категории магазина или вашей роли.');
    if(!await ensureLegalAcceptance(api.request)){$('#view').innerHTML='<section class="card"><h2>Необходимо принять новые версии документов</h2>'+button('Открыть документы','retry')+'</section>';return;}
    let html = "",workspace=null;
    
    if(route==='compliance'){
      if(!owner)throw new Error('Проверку продавца заполняет владелец бизнеса.');
      if(allBranches)html='<p class="notice">Выберите филиал для проверки его лицензии.</p>';
      else html=await sellerComplianceView(api.request,endpoint('/compliance'));
    }
    else if(route==='ranking')html=rankingHelp();
    else if(route==='branches'){
      if(!owner)throw new Error('Управление филиалами доступно владельцу бизнеса.');
      branchPageData=await branchesPage(api,rootId());html=branchPageData.html;
    }
    else if(allBranches&&['products','team','reviews','qr','imports'].includes(route)){
      const sections={products:'products',team:'team',reviews:'reviews',qr:'qr',imports:'imports'};
      const data=await api.request('/shops/'+rootId()+'/network/'+sections[route]+'?branch_id=all&limit=24&offset='+page*24);
      items=rows(data);html=heading(nav.find(n=>n[0]===route)[1],'Все филиалы · выберите конкретный филиал для создания записи');
      if(route==='products')html+=productTable();
      else html+=table(items,[['Филиал',p=>esc(p.branch_name)+' · '+esc(p.branch_code)],['Запись',p=>esc(p.name||p.product_name||p.text||p.id)],['Статус / роль',p=>esc(p.status||p.role||'')]]);
      html+='<div class="actions">'+(page?button('Назад','previous'):'')+(data.has_more?button('Далее','next'):'')+'</div>';
    }
    else if(allBranches&&['catalog','store','photo-navigation','broadcasts','clients',...workspaceRoutes.map(([name])=>name)].includes(route)) html=heading(nav.find(n=>n[0]===route)?.[1]||'Магазин')+'<p class="notice">Выберите конкретный филиал в поле «Филиал» для этой операции.</p>';
    else if(workspaceRoutes.some(([key])=>key===route)){workspace=createSellerWorkspace({api,shop,base,reload:()=>go(route)});html=await workspace.render(route);}
    else if (route === "products") html = await loadProducts();
    else if (route === "catalog") html = await catalog();
    else if (route === "imports") html = await imports();
    else if (route === "pos") html = allBranches ? heading('POS интеграции')+'<p>Выберите физический филиал.</p>' : await posPage(api,shop);
    else if (route === "store") html = await storePage();
    else if (route === "photo-navigation")
      html =
        heading(
          "Навигация по фото",
          "Тот же маршрут магазина, что в приложении",
        ) + '<div id="photoEditor"></div>';
    else if (route === "team") html = await team();
    else if (route === "broadcasts") html = await broadcasts();
    else if (route === "chats")
      html = heading("Чаты") + '<div id="chatView"></div>';
    else if (route === "reviews") {
      const data = await api.request(endpoint("/reviews/manage"));
      html =
        heading("Отзывы") +
        table(rows(data, "reviews"), [
          ["Покупатель", (r) => esc(r.buyer_name)],
          ["Оценка", (r) => `${Number(r.rating)} ★`],
          ["Текст", (r) => esc(r.text)],
          ["Товар", (r) => esc(r.product_title)],
        ]);
    } else if (route === "dashboard" && !sellerCan(shop,'analytics')) {
      html =
        heading("Главная", shop.name) +
        infoCards({ product_usage: shop.product_count || 0 }) +
        '<p>Выберите доступный раздел для работы с магазином.</p>'+sellerSectionLinks([['products','Открыть товары'],['chats','Чаты'],['qr','QR магазина']]);
    } else if (route === "analytics" || route === "dashboard") {
      const data = await api.request(
        `/analytics/${shop.id}?days=${analyticsDays}${allBranches?"&branch_id=all":""}`,
      );
      html =
        heading(
          route === "dashboard" ? "Обзор магазина" : "Аналитика",
          `Последние ${analyticsDays} дней · данные сервера`,
        ) +
        infoCards(data.overview || data) +
        `<section class="section"><h2>Популярные товары</h2>${table(
          rows(data, "popular_products"),
          [
            ["Товар", (p) => esc(p.title || p.product_title)],
            ["Просмотры", (p) => esc(p.views ?? p.view_count ?? "—")],
          ],
        )}</section>`;
      if (route === "dashboard") {
        const plan = await api.request(endpoint("/plan"));
        const recentProducts=!allBranches&&(shop.position==='owner'||shop.permissions?.products_view===true)?rows(await api.request(`/products?${query({shop_id:shop.id,limit:24,sort:'new'})}`)):null;
        html = sellerHome(data,plan,recentProducts);
      }
      if (route === "analytics") {
        html +=
          `<form id="analyticsPeriod" class="toolbar">${select(
            "Период",
            "days",
            [
              [1, "Сегодня"],
              [7, "7 дней"],
              [30, "30 дней"],
              [90, "90 дней"],
              [365, "Год"],
            ],
            analyticsDays,
          )}<button class="button">Показать</button></form>` +
          [
            ["timeline", "Динамика"],
            ["traffic", "Источники"],
            ["search_queries", "Поисковые запросы"],
            ["routes", "Маршруты"],
          ]
            .map(([key, title]) => {
              const entries = rows(data, key);
              if (!entries.length) return "";
              const columns = Object.keys(entries[0])
                .filter((k) => typeof entries[0][k] !== "object")
                .slice(0, 8)
                .map((k) => [
                  metricLabels[k] || k.replaceAll("_", " "),
                  (row) => esc(row[k]),
                ]);
              return (
                '<section class="section"><h2>' +
                title +
                "</h2>" +
                table(entries, columns) +
                "</section>"
              );
            })
            .join("");
      }
    } else if (route === "plan") {
      const data = await api.request(endpoint("/plan"));
      html =
        heading(
          "Тариф бизнеса и общий AI-кошелёк",
          "Тарифы и ограничения из действующего backend",
        ) +
        infoCards({
          current_plan: data.current_plan || data.plan,
          product_usage: data.product_usage,
          product_limit: data.product_limit,
          ai_credits: data.ai_credits_remaining,
        }) +
        table(
          Array.isArray(data.plans)
            ? data.plans
            : Object.entries(data.plans || {}).map(([name, p]) => ({
                name,
                ...p,
              })),
          [
            ["План", (p) => esc(String(p.display_name || p.name || "").replaceAll("_", " "))],
            [
              "Лимит товаров",
              (p) => Number(p.productLimit ?? p.product_limit ?? p.max_products) === -1 ? "Без лимита" : esc(p.productLimit ?? p.product_limit ?? p.max_products),
            ],
            ["Стоимость", (p) => money(p.price || p.monthly_price)],
          ],
        ) +
        pricingPreview() + `<div class="notice"><p>Для подключения или изменения тарифа обратитесь в поддержку.</p>${supportLinks(base, "seller")}</div>`;
    } else if (route === "clients") {
      const data=await api.request(endpoint("/qr/customers"));
      html=heading("Клиенты","Подписчики вашего магазина")+`${sellerSectionLinks([['discounts','Скидки и предложения'],['broadcasts','Рассылка'],['loyalty','Программа лояльности'],['promotion','Реклама в каталоге']])}`+table(rows(data,"customers"),[["Подписчик",p=>esc(p.name||p.buyer_name)],...(sellerHasWarranties(shop)?[["Гарантии",p=>esc(p.warranties_count||0)]]:[])]);
    } else if (route === "qr") {
      const data = await api.request(endpoint("/qr/customers"));
      html =
        heading("QR магазина", "Каталог и подписка без покупки") +
        `${qrTools(shop)}<section class="card store-qr-card"><h2>${esc(shop.name)}</h2><canvas id="storeQr"></canvas><p><a href="https://izbor.uz/shop/?id=${Number(shop.id)}" target="_blank" rel="noopener">https://izbor.uz/shop/?id=${Number(shop.id)}</a></p><p>Покажите QR покупателю. Рассылки не требуют оплаты или сканирования продавцом.</p></section>${sellerHasWarranties(shop)?`<form id="qrScan" class="form card"><h2>Погасить гарантию</h2>${textarea("QR гарантии (текст кода)", "qr_token")}${button("Сканировать QR камерой", "barcode", 'data-format="qr"')}<p>Гарантия будет использована один раз и станет недействительной.</p><button class="button">Погасить гарантию</button></form>`:''}` +
        table(rows(data, "customers"), [
          ["Подписчик", (p) => esc(p.name || p.buyer_name)],
          ...(sellerHasWarranties(shop)?[["Гарантии", (p) => esc(p.warranties_count || 0)]]:[]),
        ]);
    } else if (route === "profile")
      html =
        heading("Аккаунт") +
        sellerSectionLinks([['team','Команда'],['branches','Филиалы'],['plan','Тариф'],['compliance','Проверка продавца'],['ranking','Как формируется выдача']]) +
        appearanceSettings() +
        `<div class="card"><h2>${esc(user.name)}</h2><p>${esc(user.phone)}</p><p class="muted">Роль: ${esc(shop.position || shop.role || user.role)}</p><div class="actions">${button("Редактировать профиль", "account")}${button("Удалить аккаунт", "delete-account")}${button("Выйти", "logout")}</div></div>`;
    else html = empty("Страница не найдена");
    if (version !== generation) return;
    $("#view").innerHTML = html;
    // Apply the same policy to shortcuts, not only the sidebar and direct routes.
    document.querySelectorAll('#view a[href^="#"]').forEach(link=>{
      const target=link.getAttribute('href').slice(1);
      if(nav.some(([key])=>key===target)&&!sellerRouteAllowed(shop,target))link.remove();
    });
    $("#view").removeAttribute("aria-busy");
    if(workspace)cleanup=workspace.bind($("#view"));
    if(route==='plan')bindPricing($("#view"));
    if(route==='qr' && window.QRCode) await window.QRCode.toCanvas(document.querySelector('#storeQr'),`https://izbor.uz/shop/?id=${Number(shop.id)}`,{width:250,margin:4});
    if(route==='pos'&&!allBranches)bindPos(api,shop,()=>go('pos'));
    if(route==='compliance')bindSellerCompliance(api.request,endpoint('/compliance'),()=>go('compliance'));
    if (route === "chats") {
      const dispose = await mountChats($("#chatView"), {
        api,
        baseUrl: base,
        role: "seller",
        threadQuery:allBranches?{root_store_id:rootId(),branch_id:"all"}:{shop_id:shop.id,branch_id:shop.id},
      });
      if (version !== generation) dispose();
      else cleanup = dispose;
    }
    if (route === "photo-navigation" && !allBranches) {
      const dispose = await mountPhotoEditor($("#photoEditor"), {
        api,
        base,
        shopId: shop.id,
      });
      if (version !== generation) dispose();
      else cleanup = dispose;
    }

    if(route==='branches')bindBranches($("#view"),{api,root:rootId(),branches:branchPageData.branches,reload:async()=>{shops=rows(await api.request('/users/me/shops'));await go();}});
    if (route === "store" && !allBranches) {
      cleanup = locationPicker(
        $("#storePicker"),
        (p) => {
          $("[name=latitude]").value = p.lat;
          $("[name=longitude]").value = p.lng;
        },
        { lat: Number(shop.latitude), lng: Number(shop.longitude) },
      );
    }
    bindForm("#productSearch", async (values) => {
      filter = values.q;
      productCategory = values.category;
      productSort = values.sort;
      page = 0;
      await go();
    });
    bindForm("#analyticsPeriod", async (values) => {
      analyticsDays = [1, 7, 30, 90, 365].includes(Number(values.days))
        ? Number(values.days)
        : 30;
      await go();
    });
    bindForm("#lookup", (values) => lookup(values.q.trim()));
    bindForm("#importFile", previewImport);
    bindForm("#integrationCreate", async (values) => {
      const form = $("#integrationCreate");
      try {
        const credentials = JSON.parse(values.credentials || "{}");
        for (const [key, value] of Object.entries(values))
          if (key.startsWith("credential_")) credentials[key.slice(11)] = value;
        const configuration=JSON.parse(values.configuration || '{}');
        const provider=integrationProviders.find(p=>p.code===values.provider);
        for(const descriptor of rows(provider?.configuration_schema,'configuration_fields')){
          const value=values['config_'+descriptor.key];
          if(value)configuration[descriptor.key]=descriptor.type==='json'?JSON.parse(value):descriptor.type==='boolean'?value==='true':value;
        }
        await api.request(`/api/stores/${shop.id}/integrations`, {
          method: "POST",
          body: {
            provider: values.provider,
            credentials,
            configuration,
          },
        });
        await go();
      } finally {
        if (form?.isConnected) {
          form.elements.credentials.value = "{}";
          form.elements.configuration.value = "{}";
          for (const input of form.querySelectorAll("[type=password]"))
            input.value = "";
        }
      }
    });
    const integrationForm = $("#integrationCreate");
    if (integrationForm) {
      const providerSelect = integrationForm.elements.provider;
      const holder = document.createElement("div");
      holder.className = "form";
      integrationForm.insertBefore(
        holder,
        providerSelect.closest("label").nextSibling,
      );
      const renderProvider = () => {
        const provider = integrationProviders.find(
          (p) => p.code === providerSelect.value,
        );
        holder.innerHTML = `<p class="muted">${esc(provider?.ui_metadata?.instructions || provider?.instructions || "")}</p>${rows(
          provider?.configuration_schema,
          "fields",
        )
          .map((descriptor) =>
            field(
              descriptor.label || descriptor.key,
              "credential_" + descriptor.key,
              "",
              descriptor.type === "secret" ? "password" : "text",
              `${descriptor.required ? "required" : ""} autocomplete="off"`,
            ),
          )
          .join("")}${rows(provider?.configuration_schema,'configuration_fields').map(descriptor=>descriptor.type==='json'?textarea(descriptor.label,'config_'+descriptor.key,''):field(descriptor.label,'config_'+descriptor.key,'','text',`${descriptor.required?'required':''} autocomplete="off"`)).join('')}`;
      };
      providerSelect.onchange = renderProvider;
      renderProvider();
      const status = document.createElement("section");
      status.className = "section";
      status.innerHTML =
        '<h2>Доступность провайдеров</h2><div class="store-grid">' +
        integrationProviders
          .map(
            (provider) =>
              '<article class="card"><h3>' +
              esc(provider.name) +
              '</h3><span class="status">' +
              esc(provider.availability) +
              "</span><p>" +
              esc(
                provider.blocking_message ||
                  provider.instructions ||
                  provider.description ||
                  "",
              ) +
              "</p></article>",
          )
          .join("") +
        "</div>";
      $("#view").append(status);
    }
    bindForm('#branchPermissions',async()=>{
      const permissions={seller:{},manager:{}};
      document.querySelectorAll('[data-permission-role]').forEach(input=>{permissions[input.dataset.permissionRole][input.dataset.permission]=input.checked;});
      await api.request(endpoint('/staff-permissions'),{method:'PUT',body:{permissions}});
      await go();
    });
    bindForm("#storeForm", async (values) => {
      const data = new FormData();
      if(!owner){const allowed=['address','phone','latitude','longitude','working_hours','telegram',...(Number(shop.root_shop_id)?['name']:[])];for(const key of Object.keys(values))if(!allowed.includes(key))delete values[key];}
      for (const [key, value] of Object.entries(values))
        if (key !== "logo") data.append(key, value);
      if(owner)data.append("specialization", shop.specialization || "");
      if (values.logo?.size) data.append("logo", values.logo);
      const result = await api.request(endpoint(""), {
        method: "PUT",
        body: data,
      });
      shop = { ...shop, ...result.shop };
      shops=shops.map(entry=>Number(entry.id)===Number(shop.id)?{...entry,...shop}:entry);
      await go();
      toast("Магазин сохранён");
    });
    bindForm("#broadcastForm", async (values) => {
      if (!values.text.trim()) throw new Error("Введите текст рассылки");
      let media_url = "";
      if (values.image?.size) {
        const data = new FormData();
        data.append("image", values.image);
        const upload = await api.request("/upload", {
          method: "POST",
          body: data,
        });
        media_url = upload.media_ref || upload.url;
      }
      await api.request(endpoint("/broadcasts"), {
        method: "POST",
        body: { text: values.text, media_url },
      });
      await go();
      toast("Рассылка отправлена");
    });
    bindForm("#qrScan", async (values) => {
      await api.request(endpoint("/qr/warranties/redeem"), {
        method: "POST", body: { qr_token: values.qr_token.trim() },
      });
      toast("Гарантия использована и больше не действует");
      await go();
    });
  } catch (error) {
    if (version === generation){$("#view").removeAttribute("aria-busy");$("#view").innerHTML = errorView(error);}
  }
}
document.addEventListener('keydown',event=>{if(event.key==='Escape'){const backdrop=document.querySelector('[data-workspace-dismiss]');if(backdrop)backdrop.hidden=true;document.querySelector('.web-sidebar')?.classList.remove('workspace-open');const menu=document.querySelector('[data-workspace-menu]');if(menu?.getAttribute('aria-expanded')==='true'){menu.setAttribute('aria-expanded','false');menu.focus();}}});
document.addEventListener("click", async (event) => {
  if(event.target.closest('[data-workspace-menu]')){const sidebar=document.querySelector('.web-sidebar'),menu=document.querySelector('[data-workspace-menu]');const open=sidebar.classList.toggle('workspace-open');menu.setAttribute('aria-expanded',String(open));document.querySelector('[data-workspace-dismiss]').hidden=!open;if(open)sidebar.querySelector('a')?.focus();return;}
    if(event.target.closest('[data-workspace-dismiss]')){document.querySelector('.web-sidebar').classList.remove('workspace-open');document.querySelector('[data-workspace-dismiss]').hidden=true;const menu=document.querySelector('[data-workspace-menu]');menu.setAttribute('aria-expanded','false');menu.focus();return;}
    const navLink=event.target.closest('[data-nav]');if(navLink){document.querySelector('.web-sidebar').classList.remove('workspace-open');document.querySelector('[data-workspace-dismiss]').hidden=true;document.querySelector('[data-workspace-menu]').setAttribute('aria-expanded','false');if(location.hash==='#'+navLink.dataset.nav){event.preventDefault();await go(navLink.dataset.nav);}return;}
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action,
    id = target.dataset.id;
  try {
    if (action === "login") return login();
    if (action === "retry") return go();
    if (action === "logout") {
      await api.logout();
      user = shop = null;
      shops = [];
      const disposePrevious = cleanup;
      cleanup = () => {};
      disposePrevious();
      $("#view").replaceChildren();
      window.dispatchEvent(new window.Event("seller-signed-out"));
      return;
    }
    if (action === "new-product")
      return editor(filter.match(/^\d{8,14}$/) ? { barcode: filter } : {});
    if (action === "edit-product")
      return editor(await api.request(`/products/${Number(id)}`));
    if (action === "delete-product") {
      const modal = dialog(
        `<p>Удалить товар из этого магазина? Он исчезнет из активных предложений покупателям.</p>${button("Удалить товар", "confirm-delete-product", `data-id="${Number(id)}"`)}`,
        "Удалить товар",
      );
      return;
    }
    if (action === "confirm-delete-product") {
      await api.request(`/products/${Number(id)}`, { method: "DELETE" });
      $("dialog").close();
      return go();
    }
    if (action === "stock") {
      const modal = dialog(
        `<form class="form">${select("Наличие", "stock_status", ["AVAILABLE", "OUT_OF_STOCK", "UNCONFIRMED"])}<button class="button">Сохранить</button></form>`,
        "Наличие товара",
      );
      const form = $("form", modal);
      form.onsubmit = (e) => {
        e.preventDefault();
        submit(form, async (values) => {
          await api.request(`/products/${Number(id)}/stock-status`, {
            method: "PUT",
            body: values,
          });
          modal.close();
          await go();
        });
      };
    }
    if (action === "offer") {
      const modal = dialog(
        `<form class="form">${field("Цена, сум", "price", "", "number", 'required min="0.01" step="0.01"')}${field("Количество", "stock_quantity", "", "number", 'min="0" step="1"')}<button class="button">Добавить в магазин</button></form>`,
        "Предложение магазина",
      );
      const form = $("form", modal);
      form.onsubmit = (e) => {
        e.preventDefault();
        submit(form, async (values) => {
          await api.request(endpoint("/catalog-offers"), {
            method: "POST",
            body: { ...values, master_product_id: Number(id) },
          });
          modal.close();
          toast("Предложение добавлено");
        });
      };
    }
    if (action === "next" || action === "previous") {
      page += action === "next" ? 1 : -1;
      return go();
    }
    if (action === "confirm-import") {
      const modal = dialog(
        `<p>Импорт создаст или обновит товары магазина после проверки сопоставления.</p>${button("Начать импорт", "run-import")}`,
        "Подтверждение импорта",
      );
      return;
    }
    if (action === "run-import") {
      await api.request(
        `/api/stores/${shop.id}/integration-imports/${importBatch.import_id}/confirm`,
        { method: "POST", body: {} },
      );
      $("dialog").close();
      $("#importValidation").innerHTML = button(
        "Обновить статус импорта",
        "import-status",
      );
      toast("Импорт поставлен в очередь");
    }
    if (action === "import-status") {
      const data = await api.request(
        `/api/stores/${shop.id}/integration-imports/${importBatch.import_id}/status`,
      );
      $("#importValidation").innerHTML =
        infoCards(data) + button("Обновить статус импорта", "import-status");
    }
    if (action === "integration") {
      const operation = target.dataset.operation;
      if(operation === "locations"){await mapPosLocations({api,shop,shops,id});return;}
      const data = await api.request(
        `/api/stores/${shop.id}/integrations/${encodeURIComponent(id)}/${operation}`,
        {
          method: ["test", "connect", "sync"].includes(operation)
            ? "POST"
            : "GET",
          body: ["test", "connect", "sync"].includes(operation)
            ? {}
            : undefined,
        },
      );
      dialog(
        `<pre>${esc(JSON.stringify(data, null, 2))}</pre>`,
        "Результат подключения",
      );
    }
    if (action === "disconnect") {
      dialog(
        `<p>Отключить синхронизацию этой интеграции?</p>${button("Отключить", "confirm-disconnect", `data-id="${esc(id)}"`)}`,
        "Отключение",
      );
    }
    if (action === "confirm-disconnect") {
      await api.request(
        `/api/stores/${shop.id}/integrations/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      $("dialog").close();
      await go();
    }
    if (action === "approve" || action === "reject") {
      dialog(
        `<p>Подтвердить ${action === "approve" ? "одобрение" : "отклонение"} заявки?</p>${button("Подтвердить", "team-application", `data-id="${Number(id)}" data-operation="${action}"`)}`,
        "Заявка сотрудника",
      );
    }
    if (action === "team-application") {
      await api.request(
        endpoint(
          `/staff-applications/${Number(id)}${target.dataset.operation === "approve" ? "/approve" : ""}`,
        ),
        {
          method: target.dataset.operation === "approve" ? "POST" : "DELETE",
          body: target.dataset.operation === "approve" ? {} : undefined,
        },
      );
      $("dialog").close();
      await go();
    }
    if (action === "team-role") {
      const modal = dialog(
        `<form class="form">${select("Роль", "role", ["seller", "manager"])}<button class="button">Сохранить</button></form>`,
        "Права сотрудника",
      );
      const form = $("form", modal);
      form.onsubmit = (e) => {
        e.preventDefault();
        submit(form, async (values) => {
          await api.request(endpoint(`/team/${Number(id)}/role`), {
            method: "PATCH",
            body: values,
          });
          modal.close();
          await go();
        });
      };
    }
    if (action === "team-delete")
      dialog(
        `<p>Удалить доступ сотрудника к магазину?</p>${button("Удалить доступ", "confirm-team-delete", `data-id="${Number(id)}"`)}`,
        "Удаление доступа",
      );
    if (action === "confirm-team-delete") {
      await api.request(endpoint(`/team/${Number(id)}`), { method: "DELETE" });
      $("dialog").close();
      await go();
    }
    if (action === "account")
      editAccount(api, user, (value) => {
        user = value;
        go();
      });
    if (action === "delete-account")
      deleteAccount(api, () => {
        user = shop = null;
        go();
      });
    if (action === "barcode") {
      if (!window.BarcodeDetector)
        throw new Error(
          "Этот браузер не поддерживает чтение штрихкода камерой. Введите GTIN вручную или используйте Seller App.",
        );
      const qr = target.dataset.format === "qr";
      const modal = dialog(
        '<video autoplay playsinline muted style="width:100%"></video><p>Наведите камеру на штрихкод</p>',
        "Штрихкод",
      );
      let stream,
        stopped = false,
        timer;
      modal.addEventListener("close", () => {
        stopped = true;
        clearTimeout(timer);
        stream?.getTracks().forEach((t) => t.stop());
      });
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = $("video", modal);
      video.srcObject = stream;
      const detector = new BarcodeDetector({
        formats: qr
          ? ["qr_code"]
          : ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });
      const scan = async () => {
        if (stopped) return;
        try {
          const found = await detector.detect(video);
          if (found[0]) {
            const code = found[0].rawValue;
            modal.close();
            if (qr) {
              $("[name=qr_token]").value = code;
              return;
            }
            $("[name=q]").value = code;
            await lookup(code);
            return;
          }
        } catch {}
        timer = setTimeout(scan, 300);
      };
      scan();
    }
  } catch (error) {
    toast(error.message);
  }
});
$(".skip-link").onclick = (event) => {
  event.preventDefault();
  $("#view").tabIndex = -1;
  $("#view").focus();
};
mountNavigationMotion(document.querySelector(".web-sidebar nav"));
mountNavigationMotion(document.querySelector(".seller-mobile-tabs"),{compact:true});
window.addEventListener("hashchange", () =>
  { const next = location.hash.slice(1); if (nav.some(([name]) => name === next)) go(next); },
);
window.addEventListener("offline", () =>
  toast("Нет соединения. Изменения ещё не отправлены на сервер."),
);
go(location.hash.slice(1) || "dashboard");
