// Presentation only. Existing click, submit, camera and authentication handlers own all actions.
const selector = 'button, a.button, a.site-button, a[data-nav], a.category-card, summary';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let current = null, pointer = null, startX = 0, startY = 0;
const root = document.documentElement;
root.dataset.controlsMotion = 'true';
function release() {
  current?.removeAttribute('data-pressed');
  current = null; pointer = null;
}
function control(target) {
  const node = target instanceof window.Element ? target.closest(selector) : null;
  return node && !node.matches(':disabled, [aria-disabled="true"], [aria-busy="true"]') && !node.closest('[inert]') ? node : null;
}
function press(node) {
  release();
  if (!node || reduced.matches) return;
  current = node; node.setAttribute('data-pressed', 'true');
}
document.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  press(control(event.target));
  if (current) { pointer = event.pointerId; startX = event.clientX; startY = event.clientY; }
}, {passive:true});
document.addEventListener('pointermove', event => {
  if (pointer === event.pointerId && Math.hypot(event.clientX - startX, event.clientY - startY) > 8) release();
}, {passive:true});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  document.addEventListener(name, event => { if (pointer === event.pointerId) release(); }, {passive:true});
}
document.addEventListener('keydown', event => {
  if (event.repeat || !['Enter',' '].includes(event.key)) return;
  const node = control(event.target);
  if (event.key === ' ' && node?.matches('a:not([role="button"])')) return;
  press(node);
});
document.addEventListener('keyup', event => { if (['Enter',' '].includes(event.key)) release(); });
// A pointer press can begin before the old control loses focus.
document.addEventListener('focusout', event => {
  if (current && (event.target === current || current.contains(event.target))) release();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
window.addEventListener('blur', release);
window.addEventListener('pagehide', release);
reduced.addEventListener('change', release);
// If a form disables its button while held, remove the presentation state immediately.
new MutationObserver(() => {
  if (current && (!current.isConnected || !control(current))) release();
}).observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['disabled','aria-disabled','aria-busy']});
