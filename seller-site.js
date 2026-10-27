(() => {
  const publicPage = document.getElementById('sellerLanding');
  const dashboard = document.getElementById('sellerDashboardMount');
  const status = document.getElementById('sellerSiteStatus');
  const config = String(window.IZBOR_CONFIG?.PUBLIC_API_BASE_URL || window.MAPMARKET_CONFIG?.PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
  for (const link of document.querySelectorAll('[data-legal]')) {
    link.href = link.dataset.legal === 'support' ? 'https://t.me/izbor_support_bot' : `${config}/legal/seller/${link.dataset.legal}`;
  }
  const menu = document.querySelector('.menu-toggle');
  menu.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(expanded));
    document.getElementById('siteNav').classList.toggle('is-open', expanded);
  });
  document.getElementById('siteNav').addEventListener('click', () => {
    menu.setAttribute('aria-expanded', 'false');
    document.getElementById('siteNav').classList.remove('is-open');
  });
  let modulePromise;
  function stylesheet(path) {
    if (document.querySelector(`link[data-dashboard-css="${path}"]`)) return;
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = path; link.dataset.dashboardCss = path;
    document.head.insertBefore(link, document.getElementById('sellerStyles'));
  }
  async function loadDashboard() {
    if (modulePromise) return modulePromise;
    for (const path of ['shared/design.css','shared/appearance.css']) stylesheet(path);
    modulePromise = (async () => {
      return import('./web-app.bundle.js?v=20261024-seo');
    })().catch(error => { modulePromise = null; throw error; });
    return modulePromise;
  }
  let starting = false, pendingMode = null;
  async function begin(mode, automatic = false) {
    if(starting){if(!automatic)pendingMode=mode;return;}
    starting = true;
    status.hidden = true;
    const buttons = [...document.querySelectorAll('[data-seller-auth]')]; if(!automatic)buttons.forEach(b => b.disabled = true);
    let timer;
    try {
      const module = await Promise.race([loadDashboard(),new Promise((_,reject) => { timer = setTimeout(() => reject(new Error('Кабинет загружается слишком долго. Проверьте соединение и повторите.')),20000); })]);
      if(sessionStorage.getItem('izbor.telegram.pending.seller'))module.beginSellerLogin(mode);
      else if(!await module.resumeSellerSession() && !automatic)module.beginSellerLogin(mode);
    } catch (error) {
      status.querySelector('span').textContent = `Не удалось открыть кабинет. ${error.message}`;
      status.hidden = false;
    } finally { starting = false; clearTimeout(timer); buttons.forEach(b => b.disabled = false);const next=pendingMode;pendingMode=null;if(next)begin(next); }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-seller-auth]');
    if (button) begin(button.dataset.sellerAuth);
  });
  const seo=(options)=>import('./shared/seo.js').then(m=>m.setPageSeo(options||m.sellerHomeSeo));
  window.addEventListener('seller-authenticated', () => {
    seo({title:'Кабинет продавца — Izbor Seller',noindex:true});
    publicPage.hidden = true; dashboard.hidden = false; status.hidden = true; window.scrollTo(0,0);
  });
  window.addEventListener('seller-signed-out', () => {
    publicPage.hidden = false; dashboard.hidden = true;
    history.replaceState(null,'',location.pathname+location.search); window.scrollTo(0,0);
    seo();
  });
  begin('login', true);
})();
