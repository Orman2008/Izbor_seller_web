import {createTelegramWebLogin} from './telegram-auth.js';
export async function mountTelegramLink(root,{client,request,language='ru'}){
 const labels=language==='en'?['Link Telegram','Telegram connected','Check connection','Could not link Telegram. Retry.']:language==='uz'?['Telegramni ulash','Telegram ulandi','Ulanishni tekshirish','Telegramni ulab bo‘lmadi. Qayta urining.']:['Связать Telegram','Telegram подключён','Проверить привязку','Не удалось связать Telegram. Повторите попытку.'];
 const login=createTelegramWebLogin({client,request,linkAccount:true});
 try{
  const account=await request('/auth/account',{method:'GET'});
  if(!root.isConnected)return;
  if(account.identities?.some(identity=>identity.provider==='telegram')){root.textContent=labels[1];return;}
  const button=document.createElement('button'),message=document.createElement('p');button.type='button';button.className='button soft';button.textContent=login.pending()?labels[2]:labels[0];message.setAttribute('role','status');root.replaceChildren(button,message);
  button.onclick=async()=>{
   button.disabled=true;
   const popup=login.pending()?null:window.open('about:blank','_blank');
   try{
    if(!login.pending()){
     if(!popup)throw Error(labels[3]);
     popup.opener=null;popup.location.replace(await login.start());
    }
    message.textContent=labels[2];
    const result=await login.waitForCompletion({isActive:()=>root.isConnected});
    if(result?.success){button.remove();message.textContent=labels[1];}
   }catch{popup?.close();message.textContent=labels[3];}
   finally{button.disabled=false;}
  };
 }catch{if(root.isConnected)root.textContent=labels[3];}
}
