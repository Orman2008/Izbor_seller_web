import {loadYandexMaps,validPoint} from './maps.js';
import {esc} from './ui.js';
import {interfaceText as tr} from './ui-copy.js';

export function routeDistance(position,coordinates){
 const scale=Math.cos(position.lat*Math.PI/180),toXY=p=>[(p[0]-position.lng)*111320*scale,(p[1]-position.lat)*111320];
 let best=Infinity;
 for(let i=1;i<coordinates.length;i++){
  const a=toXY(coordinates[i-1]),b=toXY(coordinates[i]),dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
  const t=length?Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/length)):0;
  best=Math.min(best,Math.hypot(a[0]+t*dx,a[1]+t*dy));
 }
 return best;
}
export function routePreviewMarkup(shop){return `<section class="route-preview"><header><p class="eyebrow">IZBOR</p><h2>${esc(shop.business_name?shop.business_name+' — '+(shop.branch_name||shop.name):shop.name||tr('Магазин'))}</h2><p class="muted">${esc(shop.address||'')}</p></header><div class="route-modes" role="group" aria-label="${esc(tr('Способ передвижения'))}"><button class="button" data-route-mode="foot" aria-pressed="true">${esc(tr('Пешком'))}</button><button class="button soft" data-route-mode="car" aria-pressed="false">${esc(tr('На машине'))}</button></div><div class="route-map" data-route-map></div><div class="route-summary"><p data-route-status role="status">${esc(tr('Определяем ваше местоположение…'))}</p><p class="muted" data-route-gps role="status"></p><div class="actions"><button class="button" data-route-track disabled>${esc(tr('Следить за движением'))}</button><button class="button soft" data-route-center>${esc(tr('Моё местоположение'))}</button><button class="button soft" data-route-fit>${esc(tr('Весь маршрут'))}</button><button class="button soft" data-route-retry>${esc(tr('Повторить'))}</button></div></div></section>`;}
export async function mountRoutePreview(root,{shop,request}){
 let map,line,userMarker,gps=null,destroyed=false,requestVersion=0,controller=null,mode='foot',coordinates=[],watch=null,following=false,lastCamera=0,lastBuild=0,offRouteFixes=0,building=false;
 const status=root.querySelector('[data-route-status]'),gpsStatus=root.querySelector('[data-route-gps]'),track=root.querySelector('[data-route-track]');
 const tell=value=>{if(!destroyed)status.textContent=value;};
 function stop(){if(watch!==null)navigator.geolocation?.clearWatch(watch);watch=null;following=false;track.textContent=tr('Следить за движением');}
 const destroy=()=>{destroyed=true;stop();requestVersion++;controller?.abort();map?.destroy();root.removeEventListener('click',click);window.removeEventListener('offline',offline);window.removeEventListener('online',online);};
 const gpsError=e=>tr(e.code===1?'Разрешите доступ к геолокации в настройках браузера.':e.code===3?'Не удалось определить местоположение вовремя. Повторите попытку.':'GPS недоступен. Проверьте геолокацию и повторите попытку.');
 async function locate(){
  if(!navigator.geolocation)throw new Error(tr('Геолокация недоступна'));
  return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>validPoint(p.coords.latitude,p.coords.longitude)?resolve({lat:p.coords.latitude,lng:p.coords.longitude}):reject(new Error(tr('GPS недоступен. Проверьте геолокацию и повторите попытку.'))),e=>reject(new Error(gpsError(e))),{timeout:15000,maximumAge:15000,enableHighAccuracy:true}));
 }
 function fit(){if(line)map.setBounds(line.geometry.getBounds(),{checkZoomRange:true,zoomMargin:40,duration:300});}
 function position(p){
  if(destroyed||watch===null)return;
  if(!validPoint(p.coords.latitude,p.coords.longitude)||p.coords.accuracy>80){gpsStatus.textContent=tr('Слабый сигнал GPS. Ждём точное местоположение.');return;}
  gps={lat:p.coords.latitude,lng:p.coords.longitude};gpsStatus.textContent='';userMarker?.geometry.setCoordinates([gps.lat,gps.lng]);
  if(following&&Date.now()-lastCamera>1000){lastCamera=Date.now();map?.setCenter([gps.lat,gps.lng],undefined,{duration:500});}
  offRouteFixes=coordinates.length&&routeDistance(gps,coordinates)>Math.max(80,Number(p.coords.accuracy)*2)?offRouteFixes+1:0;
  if(offRouteFixes>=3&&!building&&Date.now()-lastBuild>20000&&navigator.onLine!==false){offRouteFixes=0;build();}
 }
 async function build(refreshGps=false){
  const version=++requestVersion;controller?.abort();controller=new AbortController();building=true;lastBuild=Date.now();track.disabled=true;
  tell(tr('Строим маршрут…'));root.querySelectorAll('[data-route-mode]').forEach(b=>{const selected=b.dataset.routeMode===mode;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('soft',!selected);});
  try{
   if(navigator.onLine===false)throw new Error(tr('Нет интернета. Проверьте соединение и повторите попытку.'));
   if(!validPoint(shop.latitude,shop.longitude))throw new Error(tr('У магазина не указаны координаты'));
   if(!gps||refreshGps){const result=await locate();if(destroyed||version!==requestVersion)return;gps=result;}
   const y=await loadYandexMaps();if(destroyed||version!==requestVersion)return;
   if(!map){const el=root.querySelector('[data-route-map]');el.replaceChildren();map=new y.Map(el,{center:[gps.lat,gps.lng],zoom:14,controls:['zoomControl']});map.geoObjects.add(new y.Placemark([Number(shop.latitude),Number(shop.longitude)],{hintContent:esc(shop.name)},{preset:'islands#blueDotIcon'}));el.addEventListener('pointerdown',()=>{following=false;});}
   if(!userMarker){userMarker=new y.Placemark([gps.lat,gps.lng],{hintContent:tr('Вы здесь')},{preset:'islands#blueCircleDotIcon'});map.geoObjects.add(userMarker);}else userMarker.geometry.setCoordinates([gps.lat,gps.lng]);
   const params=new URLSearchParams({start_lat:gps.lat,start_lng:gps.lng,end_lat:shop.latitude,end_lng:shop.longitude,mode});
   const data=await request('/route?'+params,{signal:controller.signal}),result=data.routes?.[0];
   if(destroyed||version!==requestVersion)return;
   const points=result?.geometry?.coordinates;
   if(!Array.isArray(points)||points.length<2||!points.every(p=>Array.isArray(p)&&validPoint(p[1],p[0]))||!Number.isFinite(Number(result.distance))||Number(result.distance)<0||!Number.isFinite(Number(result.duration))||Number(result.duration)<0)throw new Error(tr('Маршрут не найден'));
   coordinates=points;if(line)map.geoObjects.remove(line);line=new y.Polyline(points.map(p=>[p[1],p[0]]),{},{strokeColor:'#0874ab',strokeWidth:6,strokeOpacity:.95});map.geoObjects.add(line);if(watch===null)fit();
   const locale=document.documentElement.lang||'ru';tell(new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(result.distance/1000)+' '+({ru:'км',en:'km',uz:'km'}[locale]||'km')+' · '+Math.ceil(result.duration/60)+' '+({ru:'мин',en:'min',uz:'daq'}[locale]||'min'));track.disabled=false;
  }catch(error){if(!destroyed&&version===requestVersion)tell(error.name==='AbortError'?tr('Запрос отменён'):tr(error.message));}
  finally{if(version===requestVersion)building=false;}
 }
 function offline(){gpsStatus.textContent=tr('Нет интернета. Маршрут сохранён на экране; перестроение недоступно.');}
 function online(){gpsStatus.textContent=tr('Соединение восстановлено');if(!coordinates.length)build();}
 const click=event=>{const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-route-mode')&&button.dataset.routeMode!==mode){mode=button.dataset.routeMode;stop();coordinates=[];if(line){map.geoObjects.remove(line);line=null;}build();}
  if(button.hasAttribute('data-route-retry'))build(true);
  if(button.hasAttribute('data-route-fit')){following=false;fit();}
  if(button.hasAttribute('data-route-center')){if(gps&&map){following=true;map.setCenter([gps.lat,gps.lng],16,{duration:300});}else build(true);}
  if(button.hasAttribute('data-route-track')){if(watch!==null){stop();gpsStatus.textContent='';}else if(navigator.geolocation&&coordinates.length){following=true;track.textContent=tr('Завершить отслеживание');gpsStatus.textContent=tr('Отслеживание работает, пока эта страница открыта.');watch=navigator.geolocation.watchPosition(position,e=>{if(!destroyed)gpsStatus.textContent=gpsError(e);},{enableHighAccuracy:true,maximumAge:3000,timeout:15000});}}
 };
 root.addEventListener('click',click);window.addEventListener('offline',offline);window.addEventListener('online',online);
 build();return destroy;
}
