export function setPageSeo({title,description,canonical,noindex=false}){
 document.title=title;
 const meta=(selector,attribute,key,value)=>{let el=document.head.querySelector(selector);if(!el){el=document.createElement('meta');el.setAttribute(attribute,key);document.head.append(el);}el.content=value;};
 meta('meta[name="robots"]','name','robots',noindex?'noindex, nofollow':'index, follow');
 if(description)meta('meta[name="description"]','name','description',description);
 let link=document.head.querySelector('link[rel="canonical"]');
 if(canonical){if(!link){link=document.createElement('link');link.rel='canonical';document.head.append(link);}link.href=canonical;}else link?.remove();
 for(const [key,value] of Object.entries({'og:title':title,'og:description':description,'og:url':canonical})){if(value)meta(`meta[property="${key}"]`,'property',key,value);else document.head.querySelector(`meta[property="${key}"]`)?.remove();}
 for(const [key,value] of Object.entries({'twitter:title':title,'twitter:description':description})){const el=document.head.querySelector(`meta[name="${key}"]`);if(el&&value)el.content=value;}
 for(const el of document.querySelectorAll('script[data-home-schema]'))el.type=noindex?'application/json':'application/ld+json';
}
export const buyerHomeSeo={title:'Izbor Market — товары и магазины рядом',description:'Найдите товары и магазины в Izbor Market: категории, предложения продавцов, адреса и расположение на карте.',canonical:'https://izbor.uz/'};
export const sellerHomeSeo={title:'Izbor Seller — каталог и управление магазином',description:'Разместите магазин и товары в Izbor. Адрес на карте, каталог, связь с покупателями и тарифы FREE, PRO, BUSINESS, BUSINESS PLUS.',canonical:'https://seller.izbor.uz/'};
