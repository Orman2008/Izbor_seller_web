// Presentation policy. Server permissions remain authoritative.
const permissions = {
 products:'products_view', catalog:'products', imports:'owner', pos:'owner',
 chats:'chats', clients:'qr', qr:'qr', warranties:'qr', discounts:'qr',
 loyalty:'owner', promotion:'owner', invitations:'owner', broadcasts:'broadcasts',
 analytics:'analytics', reviews:'reviews', store:'profile', team:'staff',
 branches:'owner', plan:'owner', compliance:'owner', 'photo-navigation':'profile', ai:'ai'
};
export function sellerCan(shop, permission) {
 return Boolean(shop && (shop.position==='owner' || (permission!=='owner' && shop.permissions?.[permission]===true)));
}
export function sellerHasWarranties(shop) {
 return ['TECH','FURNITURE'].includes(shop?.specialization_code);
}
export function sellerRouteAllowed(shop, route) {
 if (!shop) return ['dashboard','profile'].includes(route);
 if (route==='warranties' && !sellerHasWarranties(shop)) return false;
 // Visits and stamp rewards are relevant to repeat-purchase businesses.
 if (route==='loyalty' && !['COFFEE','RESTAURANT','GROCERY','BEAUTY','HAIRDRESSER'].includes(shop.specialization_code)) return false;
 const permission=permissions[route];
 return !permission || sellerCan(shop,permission);
}
export const sellerPrimaryRoutes=['dashboard','products','clients','qr','chats','analytics','store','profile'];
export function sellerMenuRoutes(shop) {
 const routes=[...sellerPrimaryRoutes];
 if(sellerHasWarranties(shop))routes.splice(routes.indexOf('chats'),0,'warranties');
 // Keep independent staff grants reachable when their usual parent is unavailable.
 for(const route of ['reviews','ai','broadcasts']){
  if(sellerRouteAllowed(shop,route)&&!sellerRouteAllowed(shop,sellerNavigationParent(route)))routes.push(route);
 }
 return routes.filter(route=>sellerRouteAllowed(shop,route));
}
export function sellerNavigationParent(route) {
 if(['catalog','imports','pos','ai'].includes(route))return 'products';
 if(['discounts','loyalty','promotion','broadcasts'].includes(route))return 'clients';
 if(['reviews','photo-navigation'].includes(route))return 'store';
 if(['plan','team','branches','compliance','invitations','ranking'].includes(route))return 'profile';
 return route;
}
