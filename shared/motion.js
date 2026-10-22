// Preserve one indicator per navigation; never wrap pages or recreate maps.
const tracks = new WeakMap();
export function mountNavigationMotion(nav, {compact = false} = {}) {
  if (!nav) return () => {};
  if (tracks.has(nav)) return tracks.get(nav);
  const indicator = document.createElement('span');
  indicator.className = 'nav-motion-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  nav.classList.add('izbor-navigation-track');
  nav.prepend(indicator);
  let frame = 0, ready = false;
  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const active = nav.querySelector('[data-nav].active, [data-route].active');
      indicator.hidden = !active || !nav.offsetWidth;
      for (const link of nav.querySelectorAll('[data-nav], [data-route]')) {
        if (link === active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
      if (!active || !nav.offsetWidth) return;
      const width = compact ? Math.min(42, active.offsetWidth) : active.offsetWidth;
      const height = compact ? 30 : active.offsetHeight;
      indicator.style.transform = `translate(${active.offsetLeft + (active.offsetWidth - width) / 2}px,${active.offsetTop + (compact ? 3 : 0)}px)`;
      indicator.style.width = `${width}px`;
      indicator.style.height = `${height}px`;
      if (!ready) {
        indicator.getBoundingClientRect();
        indicator.classList.add('motion-ready');
        ready = true;
      }
    });
  };
  const mutation = new MutationObserver(update);
  mutation.observe(nav, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
  const resize = new ResizeObserver(update);
  resize.observe(nav);
  update();
  const dispose = () => {
    mutation.disconnect(); resize.disconnect(); cancelAnimationFrame(frame);
    indicator.remove(); nav.classList.remove('izbor-navigation-track'); tracks.delete(nav);
  };
  tracks.set(nav, dispose);
  return dispose;
}
