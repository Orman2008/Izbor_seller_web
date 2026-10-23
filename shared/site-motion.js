// Shared presentation only: animate new content without changing focus, routes or API work.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const seen = new WeakSet();
const active = new Set();
const candidates = new Set();
const selector = [
 '#sellerLanding .lp-hero-copy > :is(.lp-kicker,h1,.lp-lead,.lp-cta,.lp-inline-link)',
 '#sellerLanding :is(.lp-hero-photo,.lp-workday-photo,.lp-section-heading,.lp-benefit-grid>article,.lp-story-heading,.lp-story-copy,.lp-manage-copy,.lp-connect>div,.lp-faq>h2,.lp-faq>details)',
 '#view :is(.catalog-intro,.page-head,.product-card,.store-card,.buyer-profile-heading,.buyer-profile-guest,.buyer-profile-wallet,.buyer-profile-menu)',
 '#sellerDashboardMount #view > :is(.page-head,.dashboard-top,.dashboard-grid,.card,.workspace-note)',
 'dialog[open],[role="dialog"]'
].join(',');
function run(element, keyframes, options) {
 if (reduced.matches || document.hidden || !element.isConnected || !element.getClientRects().length || typeof element.animate !== 'function') return;
 // Do not leave animated layers behind when an element or its route disappears.
 const animation = element.animate(keyframes, {...options,fill:'backwards'});
 const record = {element,animation}; active.add(record);
 animation.finished.then(()=>active.delete(record),()=>active.delete(record));
}
function reveal(element) {
 if (seen.has(element)) return;
 seen.add(element);candidates.delete(element);observer?.unobserve(element);
 if (element.matches('dialog,[role="dialog"]')) {
  run(element,[{opacity:0,transform:'translateY(10px) scale(.985)'},{opacity:1,transform:'none'}],{duration:230,easing:'cubic-bezier(.22,1,.36,1)'});
  return;
 }
 // Cards use less travel than landing photographs. Content remains visible if JS fails.
 const photo=element.matches('figure');
 const siblings=element.parentElement ? [...element.parentElement.children].filter(e=>e.matches(selector)) : [];
 const delay=Math.min(Math.max(siblings.indexOf(element),0),3)*45;
 run(element,[{opacity:0,transform:`translateY(${photo?22:12}px)`},{opacity:1,transform:'none'}],{duration:photo?620:440,delay,easing:'cubic-bezier(.22,1,.36,1)'});
}
const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries=>{
 for(const entry of entries)if(entry.isIntersecting)reveal(entry.target);
},{threshold:0,rootMargin:'0px 0px -28px 0px'}) : null;
function consider(element) {
 if (seen.has(element)||candidates.has(element)) return;
 if(reduced.matches){seen.add(element);return;}
 if(element.matches('dialog,[role="dialog"]')){reveal(element);return;}
 // Large, nested panels own their entrance; avoid animating text a second time inside them.
 if(element.parentElement?.closest('.lp-manage-copy,.lp-story-copy,.buyer-profile-wallet'))return;
 if(observer){candidates.add(element);observer.observe(element);}else seen.add(element);
}
function scan(root) {
 if(!(root instanceof Element))return;
 if(root.matches(selector))consider(root);
 for(const element of root.querySelectorAll(selector))consider(element);
}
let frame=0;
const pending=new Set();
function schedule(root){
 if(root)pending.add(root);
 if(frame)return;
 frame=requestAnimationFrame(()=>{
  frame=0;
  const roots=[...pending].filter(root=>root.isConnected);
  pending.clear();
  // Scan only the highest added roots; removals need cleanup, never a body rescan.
  for(const root of roots)if(!roots.some(parent=>parent!==root&&parent.contains(root)))scan(root);
  for(const element of candidates)if(!element.isConnected){observer?.unobserve(element);candidates.delete(element);}
  for(const record of active)if(!record.element.isConnected){record.animation.cancel();active.delete(record);}
 });
}
const changes=new MutationObserver(records=>{
 for(const record of records){
  if(record.type==='attributes')schedule(record.target);
  else for(const node of record.addedNodes)if(node instanceof Element)schedule(node);
 }
 // Clean up pending animations even when a route only removes nodes.
 if(records.some(r=>r.removedNodes?.length))schedule();
});
function stop(){for(const record of active)record.animation.cancel();active.clear();}
function motionPreference(){stop();if(reduced.matches){for(const element of candidates){observer?.unobserve(element);seen.add(element);}candidates.clear();}}
reduced.addEventListener('change',motionPreference);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',stop);
scan(document.body);
changes.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','open']});

// Header size changes with language, viewport and the expanded mobile menu.
const header=document.querySelector('#sellerLanding .site-header');
function headerHeight(){
 const height=header?.getBoundingClientRect().height||0;
 document.documentElement.style.setProperty('--seller-header-height',`${Math.ceil(height)}px`);
 return height;
}
if(header){
 headerHeight();
 if('ResizeObserver' in window)new ResizeObserver(headerHeight).observe(header);
 document.addEventListener('click',event=>{
  const link=event.target.closest('#sellerLanding a[href^="#"]');
  if(!link||link.matches('.seller-skip')||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const id=link.getAttribute('href').slice(1);
  const target=id&&document.getElementById(id);
  if(!target)return;
  event.preventDefault();
  requestAnimationFrame(()=>{
   const offset=headerHeight()+16;
   history.pushState(null,'',`#${id}`);
   window.scrollTo({top:Math.max(0,scrollY+target.getBoundingClientRect().top-offset),behavior:reduced.matches?'instant':'smooth'});
  });
 });
}
