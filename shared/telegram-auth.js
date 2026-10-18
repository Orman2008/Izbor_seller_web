// Only the initiating browser tab holds the completion capability.
// URL parameters never supply a Telegram token or an application session.
export function createTelegramWebLogin({client, request, storage=globalThis.sessionStorage, now=Date.now,linkAccount=false}) {
  if (!['buyer','seller'].includes(client)) throw Error('Некорректное приложение.');
  const key=`izbor.telegram.pending.${client}${linkAccount?'.link':''}`;
  let generation=0, inFlight=null;
  function pending(){try{const value=JSON.parse(storage.getItem(key)||'null');if(value&&value.expires_at>now())return value;storage.removeItem(key);}catch{storage.removeItem(key);}return null;}
  async function start(){const value=await request(linkAccount?'/auth/account/telegram/start':'/auth/telegram/start',{method:'POST',auth:linkAccount,body:{client,return_target:`${client}${linkAccount?'_link':''}_web`}});const url=new URL(value.authorization_url);if(url.protocol!=='https:'||url.hostname!=='oauth.telegram.org'||url.port||url.username||url.password||url.pathname!=='/auth')throw Error('Не удалось открыть Telegram.');generation++;storage.setItem(key,JSON.stringify({...value,expires_at:now()+300000}));return url.href;}
  function finish(){
    if(inFlight)return inFlight;
    const run=async()=>{
      const value=pending(),version=generation;
      if(!value)throw Error('Вход истёк. Начните снова.');
      const active=()=>version===generation&&pending()?.transaction_id===value.transaction_id;
      const proof={transaction_id:value.transaction_id,completion_secret:value.completion_secret};
      const status=await request('/auth/telegram/status',{method:'POST',auth:false,body:proof});
      if(!active())return null;
      if(status.status==='completed'){
        const payload=await request(linkAccount?'/auth/account/telegram/complete':'/auth/telegram/complete',{method:'POST',auth:linkAccount,body:{...proof,accept_privacy:true,accept_terms:true}});
        if(!active())return null;
        storage.removeItem(key);return payload;
      }
      if(['failed','cancelled','consumed'].includes(status.status)){storage.removeItem(key);throw Error('Вход не завершён. Повторите или войдите по номеру.');}
      return null;
    };
    inFlight=run().finally(()=>{inFlight=null;});return inFlight;
  }
  async function waitForCompletion({isActive=()=>true,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
    const version=generation;
    while(isActive()&&version===generation){
      let result;
      try{result=await finish();}catch(error){if(!isActive()||version!==generation)return null;throw error;}
      if(!isActive()||version!==generation)return null;
      if(result)return result;
      await wait(1500);
    }
    return null;
  }
  async function cancel(){const value=pending();generation++;storage.removeItem(key);if(value)await request('/auth/telegram/cancel',{method:'POST',auth:false,body:{transaction_id:value.transaction_id,completion_secret:value.completion_secret}}).catch(()=>{});}
  return{start,finish,waitForCompletion,cancel,pending};
}
