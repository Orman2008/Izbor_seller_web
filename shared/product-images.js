import {mediaUrl} from './api.js';

// Keep the original first. A different gallery photo or server thumbnail may
// still work when one stored representation is missing. Never guess a host.
export function productImageSources(product, baseUrl) {
  const gallery = Array.isArray(product.image_urls) ? product.image_urls : [];
  return [...new Set([product.image_url, ...gallery, product.thumbnail_url]
    .map(raw => mediaUrl(raw, baseUrl)).filter(Boolean))];
}

const tried = new WeakMap();
export function fallbackProductImage(image) {
  if (!image.matches?.('img[data-product-photo]') || !image.isConnected) return;
  let seen = tried.get(image);
  if (!seen) { seen = new Set(); tried.set(image, seen); }
  seen.add(image.src);
  let sources = [];
  try { sources = JSON.parse(image.dataset.photoSources || '[]'); } catch { /* Invalid markup must not interrupt catalog browsing. */ }
  const next = sources.find(source => !seen.has(source));
  if (next) { seen.add(next); image.src = next; return; }
  image.dataset.photoState = 'unavailable';
  const placeholder = new URL('assets/product-placeholder.svg', document.baseURI).href;
  if (seen.has(placeholder)) { image.hidden = true; return; }
  seen.add(placeholder);
  image.src = placeholder;
}
