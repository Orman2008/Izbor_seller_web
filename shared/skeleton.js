// Presentation only: no timers, network requests or cached user data.
const shape = (cls, style = '') => `<span class="iz-skeleton ${cls}" style="${style}" aria-hidden="true"></span>`;
export const Skeleton = ({width='100%', height='16px', radius='6px'}={}) => {
  // Values are presentation dimensions, never raw API or user strings.
  const safe = value => /^(?:[0-9.]+(?:px|rem|%|vh|vw)?|auto)$/.test(String(value)) ? value : '100%';
  return shape('', `width:${safe(width)};height:${safe(height)};border-radius:${safe(radius)}`);
};
export const SkeletonText = () => shape('iz-sk-text');
export const SkeletonTitle = () => shape('iz-sk-title');
export const SkeletonAvatar = () => shape('iz-sk-avatar');
export const SkeletonImage = () => shape('iz-sk-image');
export const SkeletonButton = () => shape('iz-sk-button');
export const SkeletonCard = () => `<div class="iz-sk-card">${SkeletonImage()}${SkeletonTitle()}${SkeletonText()}${SkeletonText()}${SkeletonButton()}</div>`;
export const SkeletonListItem = () => `<div class="iz-sk-row">${SkeletonAvatar()}<div>${SkeletonTitle()}${SkeletonText()}</div></div>`;
export const SkeletonMessage = (mine=false) => `<div class="iz-sk-message ${mine?'mine':''}">${SkeletonText()}${SkeletonText()}</div>`;
export const SkeletonTable = () => `<div class="iz-sk-table">${Array.from({length:5},()=>`<div class="iz-sk-table-row">${SkeletonListItem()}${SkeletonText()}${SkeletonText()}${SkeletonButton()}</div>`).join('')}</div>`;
export const SkeletonProfile = () => `<div class="iz-sk-profile">${SkeletonAvatar()}${SkeletonTitle()}${SkeletonText()}${SkeletonListItem()}${SkeletonListItem()}</div>`;
export const SkeletonGroup = (content) => `<section class="iz-sk-group" aria-busy="true" role="status" aria-label="${({ru:'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430',uz:'Yuklanmoqda'})[globalThis.document?.documentElement?.lang]||'Loading'}"><div aria-hidden="true">${content}</div></section>`;
export function SkeletonSection(kind='list') {
  if(kind==='table')return SkeletonGroup(`${SkeletonTitle()}${SkeletonButton()}${SkeletonTable()}`);
  if (['products','home','catalog','search','favorites'].includes(kind)) return SkeletonGroup(`<div class="product-grid iz-sk-grid">${Array.from({length:6},SkeletonCard).join('')}</div>`);
  if (['product','detail','store'].includes(kind)) return SkeletonGroup(`<div class="iz-sk-detail">${SkeletonImage()}<div>${SkeletonTitle()}${SkeletonText()}${SkeletonText()}${SkeletonButton()}</div></div>`);
  if (['profile','account','settings'].includes(kind)) return SkeletonGroup(SkeletonProfile());
  if (kind==='messages') return SkeletonGroup(Array.from({length:5},(_,i)=>SkeletonMessage(i%2)).join(''));
  if (['dashboard','analytics','pos'].includes(kind)) return SkeletonGroup(`${SkeletonTitle()}<div class="iz-sk-stats">${Array.from({length:4},()=>`<div class="iz-sk-card">${SkeletonText()}${SkeletonTitle()}</div>`).join('')}</div>${SkeletonImage()}${SkeletonListItem()}`);
  if (['wallet','coupons','discounts','warranties','offers','loyalty'].includes(kind)) return SkeletonGroup(Array.from({length:3},()=>`<div class="iz-sk-card">${SkeletonText()}${SkeletonListItem()}${SkeletonText()}</div>`).join(''));
  return SkeletonGroup(Array.from({length:5},SkeletonListItem).join(''));
}
export const SkeletonPage = SkeletonSection;

// The same image element and URL remain in place. Existing fallback handlers
// keep ownership of failed images. Cached images never get a loading class.
export function installImageSkeletons(root=document) {
  const pending = new WeakSet();
  const prepare = node => {
    if (node.nodeType !== 1) return;
    const images = node.matches('img') ? [node] : node.querySelectorAll('img');
    for (const img of images) {
      if (img.complete || pending.has(img)) continue;
      pending.add(img);
      img.classList.add('iz-image-pending');
      const done = () => {pending.delete(img);img.removeEventListener('load',done);img.removeEventListener('error',done);img.classList.remove('iz-image-pending');img.classList.add('iz-content-ready');};
      img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});
    }
  };
  prepare(root.documentElement || root);
  const observer = new MutationObserver(records => {for(const record of records){if(record.type==='attributes')prepare(record.target);else for(const node of record.addedNodes)prepare(node);}});
  observer.observe(root.documentElement || root,{childList:true,subtree:true,attributes:true,attributeFilter:['src','srcset']});
  return () => observer.disconnect();
}
