import {esc,heading,field,select,textarea,button,empty,dialog,submit,toast} from './ui.js';
import {rows,mediaUrl} from './api.js';
import {interfaceText as tr} from './ui-copy.js';
export const workspaceRoutes = [['ai','Izbor AI'],['warranties','Гарантии'],['discounts','Скидки и предложения'],['loyalty','Программа лояльности'],['promotion','Реклама в каталоге'],['invitations','Приглашения сотрудников']];
export function splitConnections(items){
 const connected=[],attention=[],disconnected=[];
 for(const item of items){
   if(item.connected===true&&['connected','syncing'].includes(item.status))connected.push(item);
   else if(item.status==='disconnected')disconnected.push(item);
   else attention.push(item);
 }
 return {connected,attention,disconnected};
}
const statusLabels={ACTIVE:'Действует',REDEEMED:'Использована',USED:'Использована',EXPIRED:'Истекла',CANCELLED:'Отменена',PENDING:'Ожидает подтверждения'};
const status=value=>tr(statusLabels[value]||value||'—');
const cardLink=(route,title,description)=>`<a class="workspace-tool" href="#${route}"><span><b>${esc(tr(title))}</b><small>${esc(tr(description))}</small></span><span aria-hidden="true">↗</span></a>`;
export function qrTools(shop){
 const warranty=['TECH','FURNITURE'].includes(shop.specialization_code);
 return `<div class="workspace-tools">${warranty?cardLink('warranties','Гарантии','Создать, найти или проверить гарантию'):''}${cardLink('discounts','Скидки и предложения','Отправить предложение вашим подписчикам')}${cardLink('broadcasts','Рассылка','Новости магазина без покупки и сканирования')}${cardLink('clients','Клиенты','Подписчики и история взаимодействий')}</div>`;
}
const actionNames={create_product:'Создать товар',update_store_profile:'Изменить магазин',send_customer_message:'Отправить сообщение покупателю'};
const actionFields={title:'Название',price:'Цена, сум',category:'Категория',description:'Описание',brand:'Бренд',model:'Модель',color:'Цвет',size:'Размер',in_stock:'Наличие',stock_quantity:'Количество',name:'Название магазина',address:'Адрес',working_hours:'Время работы',specialization:'Специализация',telegram:'Telegram',chat_id:'Диалог',message:'Сообщение'};
function actionPreview(action){return `<h3>${esc(tr(actionNames[action.type||action.action_type]||'Предложенное действие'))}</h3><dl class="workspace-action-fields">${Object.entries(action.payload||{}).map(([key,value])=>`<div><dt>${esc(tr(actionFields[key]||key.replaceAll('_',' ')))}</dt><dd>${esc(typeof value==='boolean'?tr(value?'Да':'Нет'):Array.isArray(value)?value.join(', '):typeof value==='object'?'—':value)}</dd></div>`).join('')}</dl>`;}
export function createSellerWorkspace({api,shop,base,reload}){
 const path=suffix=>`/shops/${Number(shop.id)}${suffix}`;
 let stopped=false;
 const customerOptions=async()=>rows(await api.request(path('/qr/customers')),'customers').map(c=>[c.id||c.buyer_id,c.name||c.buyer_name||String(c.id||c.buyer_id)]);
 const photo=url=>url?`<img loading="lazy" src="${esc(mediaUrl(url,base))}" alt="" class="workspace-photo">`:'';
 async function render(route){
  if(route==='invitations'){
   const data=await api.request(path('/employee-invitations'));data.invitations=rows(data,'invitations').map(i=>({...i,status:i.revoked_at?'CANCELLED':new Date(i.expires_at)<=new Date()?'EXPIRED':Number(i.used_count)>=Number(i.max_uses)?'USED':'ACTIVE'}));
   return `${heading('Приглашения сотрудников',tr('Пригласите сотрудника в выбранный магазин'))}<div class="workspace-split"><form id="workspaceInvite" class="form card">${select('Роль','role',[['seller',tr('Продавец')],['manager',tr('Менеджер')]])}${select('Срок действия','ttl_hours',[[24,tr('24 часа')],[72,tr('3 дня')],[168,tr('7 дней')]])}<p class="muted">${esc(tr('Приглашение действует для одного сотрудника. Роль и магазин проверяются сервером.'))}</p><button class="button">${esc(tr('Создать приглашение'))}</button><p class="form-error" role="alert"></p></form><div class="workspace-records">${rows(data,'invitations').map(i=>`<article class="workspace-record"><header><h3>${esc(tr(i.role==='manager'?'Менеджер':'Продавец'))}</h3><span class="status">${esc(status(i.status))}</span></header><p>${esc(tr('Действует до'))}: ${esc(new Date(i.expires_at).toLocaleString(document.documentElement.lang))}</p>${i.status==='ACTIVE'?button('Отозвать приглашение','work-invite-revoke',`data-id="${esc(i.id)}"`):''}</article>`).join('')||empty('Приглашений пока нет')}</div></div>`;
  }
  if(route==='warranties'){
   const data=await api.request(path('/qr/warranties'));
   return `${heading('Гарантии','Цифровые гарантии вашего магазина')}<div class="workspace-toolbar">${button('Создать гарантию','work-warranty')}<a class="button soft" href="#qr">${esc(tr('Сканировать QR'))}</a><label class="workspace-search">${field('Поиск по имени, IMEI или серийному номеру','warranty_query','','search')}</label></div><div class="workspace-records">${rows(data,'warranties').map(w=>`<article class="workspace-record" data-warranty-record><header><h3>${esc(w.device_name||w.item_type||'')}</h3><span class="status">${esc(status(w.status))}</span></header><p>${esc(w.buyer_name||'')}</p><dl><div><dt>IMEI</dt><dd>${esc(w.imei||'—')}</dd></div><div><dt>${esc(tr('Серийный номер'))}</dt><dd>${esc(w.serial_number||'—')}</dd></div><div><dt>${esc(tr('Действует до'))}</dt><dd>${esc(w.ends_at?new Date(w.ends_at).toLocaleDateString(document.documentElement.lang):'—')}</dd></div></dl><small>${esc(w.warranty_code||'')}</small></article>`).join('')||empty('Гарантий пока нет')}</div><p data-warranty-empty hidden>${esc(tr('Ничего не найдено'))}</p>`;
  }
  if(route==='discounts'){
   const customers=await customerOptions();
   return `${heading('Скидки и предложения','Покупатель получает предложение и приходит в магазин')}<div class="workspace-split"><form id="workspaceDiscount" class="form card">${field('Название предложения','title','','text','required maxlength="160"')}${textarea('Описание предложения','description')}${field('Скидка, %','discount_percent','','number','required min="1" max="99" step="0.01"')}${field('Срок действия, дней','valid_days','7','number','required min="1" max="365"')}${select('Аудитория','audience_type',[['ALL',tr('Все подписчики')],['SELECTED',tr('Выбранные покупатели')],['REGULAR',tr('Постоянные покупатели')]])}<fieldset id="discountCustomers" hidden><legend>${esc(tr('Выберите покупателей'))}</legend>${customers.map(([id,name])=>`<label class="workspace-check"><input type="checkbox" name="customer" value="${Number(id)}">${esc(name)}</label>`).join('')||`<p>${esc(tr('Подписчиков пока нет'))}</p>`}</fieldset><label class="workspace-check"><input type="checkbox" name="confirmed" required>${esc(tr('Подтверждаю отправку выбранной аудитории'))}</label><button class="button">${esc(tr('Отправить предложение'))}</button><p class="form-error" role="alert"></p></form><aside class="workspace-note"><h2>${esc(tr('Как это работает'))}</h2><p>${esc(tr('Предложение появится у подписчиков магазина. Для использования не нужны оплата в приложении и сканирование QR.'))}</p><a href="#clients">${esc(tr('Посмотреть подписчиков'))} →</a></aside></div>`;
  }
  if(route==='loyalty'){
   const data=await api.request(path('/qr/loyalty-program')),p=data.program||{};
   return `${heading('Программа лояльности','Настройки талона магазина')}<form id="workspaceLoyalty" class="form card">${field('Название программы','title',p.title||'','text','required maxlength="160"')}${field('Подарок','reward_name',p.reward_name||'','text','required maxlength="160"')}${field('Количество посещений','required_scans',p.required_scans||5,'number','required min="2" max="20"')}${field('Цвет оформления','design_color',p.design_color||'#0284c7','color')}<button class="button">${esc(tr('Сохранить'))}</button><p class="form-error" role="alert"></p></form>`;
  }
  if(route==='promotion'){
   const data=rows(await api.request(path('/catalog-banners')));
   return `${heading('Реклама в каталоге',tr('Размещения вашего магазина'))}<div class="workspace-records">${data.map(b=>`<article class="workspace-record"><h3>${esc(b.product_title||b.title||'')}</h3><span class="status">${esc(status(b.effective_status||b.status))}</span><dl><div><dt>${esc(tr('Переходы'))}</dt><dd>${Number(b.clicks_count)||0}</dd></div></dl></article>`).join('')||empty('Размещений пока нет')}</div><aside class="workspace-note"><h2>${esc(tr('Подключение размещения'))}</h2><p>${esc(tr('Для нового размещения обратитесь в поддержку.'))}</p><a class="button soft" href="https://t.me/izbor_support_bot" target="_blank" rel="noopener">${esc(tr('Поддержка'))}</a></aside>`;
  }
  if(route==='ai'){
   const data=await api.request('/seller-ai/messages?shop_id='+Number(shop.id));
   const balance=data.ai_credits_remaining??data.ai_credits??data.ai_credits_balance;
   return `${heading('Izbor AI','Ассистент для задач вашего магазина')}<div class="workspace-ai-head"><p>${esc(tr('AI-кредиты'))}: <b>${Number.isFinite(Number(balance))?Number(balance):'—'}</b></p>${button('Очистить историю','work-ai-clear')}</div>${data.configured===false?`<p class="notice">${esc(tr('AI временно недоступен. Провайдер не настроен на сервере.'))}</p>`:''}<div class="workspace-ai-messages" role="log" aria-label="${esc(tr('История AI-чата'))}">${rows(data,'messages').map(m=>`<article class="workspace-ai-message ${m.role==='user'?'from-user':''}"><b>${esc(m.role==='user'?tr('Вы'):'Izbor AI')}</b>${photo(m.media_url)}<p>${esc(m.text||'')}</p>${m.action?`<div class="workspace-ai-action"><b>${esc(tr('Предложенное действие'))}</b>${actionPreview(m.action)}${(m.action.status||'').toUpperCase()==='PENDING'?`${button('Проверить и подтвердить','work-ai-confirm',`data-id="${Number(m.action.id)}"`)} ${button('Отменить','work-ai-cancel',`data-id="${Number(m.action.id)}"`)}`:`<span>${esc(status(m.action.status))}</span>`}</div>`:''}</article>`).join('')||`<div class="workspace-ai-welcome"><h2>${esc(tr('Чем помочь вашему магазину?'))}</h2><p>${esc(tr('Описание товара, рекламный текст, перевод или идеи для бизнеса.'))}</p></div>`}</div><form id="workspaceAi" class="form card"><label class="field"><span>${esc(tr('Сообщение'))}</span><textarea name="text" rows="3" maxlength="4000" placeholder="${esc(tr('Спросите Izbor AI…'))}"></textarea></label>${field('Прикрепить фото','image','','file','accept="image/jpeg,image/png,image/webp"')}<label class="workspace-check"><input type="checkbox" name="credit_consent" required>${esc(tr('Согласен на расход AI-кредитов по действующему тарифу'))}</label><button class="button" ${data.configured===false?'disabled':''}>${esc(tr('Отправить'))}</button><p class="form-error" role="alert"></p></form>`;
  }
  return '';
 }
 function bind(root){
  const form=(selector,task)=>{const el=root.querySelector(selector);if(el)el.onsubmit=e=>{e.preventDefault();submit(el,task);};};
  form('#workspaceInvite',async values=>{
   const created=await api.request(path('/employee-invitations'),{method:'POST',body:{role:values.role,ttl_hours:Number(values.ttl_hours),max_uses:1}});if(stopped)return;
   const modal=dialog(`<p>${esc(tr('Передайте код только нужному сотруднику. Он вводит его при входе в Izbor Seller.'))}</p><p class="workspace-invite-code">${esc(created.code)}</p><p>${esc(tr('Код показывается только сейчас. Если потеряли код, создайте новое приглашение.'))}</p>`,'Код приглашения');
   modal.addEventListener('close',()=>{if(!stopped)reload();},{once:true});
  });
  form('#workspaceDiscount',async values=>{
   const customer_ids=[...root.querySelectorAll('[name=customer]:checked')].map(el=>Number(el.value));
   if(values.audience_type==='SELECTED'&&!customer_ids.length)throw new Error(tr('Выберите хотя бы одного покупателя'));
   const result=await api.request(path('/qr/discounts'),{method:'POST',body:{title:values.title.trim(),description:values.description.trim(),discount_percent:Number(values.discount_percent),valid_days:Number(values.valid_days),audience_type:values.audience_type,customer_ids}});
   toast(tr('Предложение отправлено')+' · '+Number(result.recipients_count||0));if(!stopped)await reload();
  });
  const audience=root.querySelector('[name=audience_type]');if(audience)audience.onchange=()=>{root.querySelector('#discountCustomers').hidden=audience.value!=='SELECTED';};
  form('#workspaceLoyalty',async values=>{await api.request(path('/qr/loyalty-program'),{method:'PUT',body:{title:values.title,reward_name:values.reward_name,required_scans:Number(values.required_scans),design_color:values.design_color}});toast(tr('Сохранено'));});
  form('#workspaceAi',async values=>{if(!values.text.trim()&&!values.image?.size)throw new Error(tr('Введите сообщение или прикрепите фото'));const body=new FormData();body.set('shop_id',shop.id);body.set('text',values.text.trim());if(values.image?.size)body.set('image',values.image);await api.request('/seller-ai/messages',{method:'POST',body});if(!stopped)await reload();});
  const search=root.querySelector('[name=warranty_query]');if(search)search.oninput=()=>{const q=search.value.trim().toLocaleLowerCase();let shown=0;root.querySelectorAll('[data-warranty-record]').forEach(card=>{card.hidden=!card.textContent.toLocaleLowerCase().includes(q);if(!card.hidden)shown++;});root.querySelector('[data-warranty-empty]').hidden=shown>0;};
  const click=async event=>{
   const target=event.target.closest('[data-action^="work-"]');if(!target)return;
   const action=target.dataset.action;if(target.disabled)return;target.disabled=true;
   try{
    if(action==='work-invite-revoke'){
     const modal=dialog(`<p>${esc(tr('Отозвать это приглашение?'))}</p><form class="form"><button class="button">${esc(tr('Подтвердить'))}</button><p class="form-error" role="alert"></p></form>`,'Подтверждение');const el=modal.querySelector('form');el.onsubmit=e=>{e.preventDefault();submit(el,async()=>{await api.request(path('/employee-invitations/'+encodeURIComponent(target.dataset.id)+'/revoke'),{method:'POST',body:{}});modal.close();if(!stopped)await reload();});};
    }
    if(action==='work-warranty'){
     const customers=await customerOptions();if(stopped)return;
     const modal=dialog(`<form class="form">${customers.length?select('Покупатель','customer_id',customers):`<p class="notice">${esc(tr('Подписчиков пока нет'))}</p>`}${select('Тип товара','item_type',(shop.specialization_code==='FURNITURE'?['Мебель','Сантехника','Другое']:['Телефон','Ноутбук','Наушники','Другое']).map(value=>[value,tr(value)]))}${field('Название товара','device_name','','text','required maxlength="160"')}${field('IMEI','imei')}${field('Серийный номер','serial_number')}${field('Гарантия, месяцев','warranty_months','12','number','required min="1" max="120"')}<button class="button" ${customers.length?'':'disabled'}>${esc(tr('Создать гарантию'))}</button><p class="form-error" role="alert"></p></form>`,'Создать гарантию');
     const el=modal.querySelector('form');el.onsubmit=e=>{e.preventDefault();submit(el,async values=>{await api.request(path('/qr/warranties'),{method:'POST',body:{...values,customer_id:Number(values.customer_id),warranty_months:Number(values.warranty_months)}});modal.close();toast(tr('Гарантия создана'));if(!stopped)await reload();});};
    }
    if(action==='work-ai-clear'||action==='work-ai-confirm'||action==='work-ai-cancel'){
     const confirm=dialog(`<p>${esc(tr(action==='work-ai-clear'?'Удалить историю AI-чата?':action==='work-ai-confirm'?'Выполнить предложенное AI действие? Изменения применятся к магазину.':'Отменить предложенное действие?'))}</p><form class="form"><button class="button">${esc(tr('Подтвердить'))}</button><p class="form-error" role="alert"></p></form>`,'Подтверждение');
     const el=confirm.querySelector('form');el.onsubmit=e=>{e.preventDefault();submit(el,async()=>{await api.request(action==='work-ai-clear'?'/seller-ai/messages?shop_id='+shop.id:`/seller-ai/actions/${Number(target.dataset.id)}/${action==='work-ai-confirm'?'confirm':'cancel'}`,{method:action==='work-ai-clear'?'DELETE':'POST',...(action==='work-ai-clear'?{}:{body:{shop_id:shop.id}})});confirm.close();if(!stopped)await reload();});};
    }
   }catch(error){toast(tr(error.message));}finally{if(target.isConnected)target.disabled=false;}
  };
  root.addEventListener('click',click);
  return()=>{stopped=true;root.removeEventListener('click',click);};
 }
 return {render,bind};
}
