// OTP cells share one hidden form value; pasted/autofilled codes are distributed.
export function otpMarkup(length=6){
 const count=Math.min(8,Math.max(4,Number(length)||6));
 return `<div class="otp-cells" role="group" aria-label="SMS code" style="display:flex;gap:6px;max-width:420px"><input type="hidden" name="code">${Array.from({length:count},(_,i)=>`<input ${i===0?'id="authCode"':''} data-otp="${i}" aria-label="${i+1} / ${count}" inputmode="numeric" autocomplete="${i===0?'one-time-code':'off'}" pattern="[0-9]*" style="width:0;min-width:0;flex:1;text-align:center;font-size:1.25rem" ${i===0?'autofocus':''}>`).join('')}</div>`;
}
export function bindOtp(root){
 const cells=[...root.querySelectorAll('[data-otp]')],hidden=root.querySelector('[name=code]');
 const sync=()=>{hidden.value=cells.map(c=>c.value).join('');};
 cells.forEach((cell,index)=>{
  const distribute=text=>{const digits=String(text).replace(/\D/g,'').slice(0,cells.length-index);[...digits].forEach((d,n)=>cells[index+n].value=d);sync();cells[Math.min(cells.length-1,index+digits.length)]?.focus();};
  cell.addEventListener('paste',event=>{event.preventDefault();distribute(event.clipboardData.getData('text'));});
  cell.addEventListener('input',()=>{if(cell.value.length>1)distribute(cell.value);else{cell.value=cell.value.replace(/\D/g,'');sync();if(cell.value)cells[index+1]?.focus();}});
  cell.addEventListener('keydown',event=>{if(event.key==='Backspace'&&!cell.value)cells[index-1]?.focus();});
 });
}
export function resendCountdown(button,seconds,{label='Send again',active=()=>button.isConnected}={}){
 const end=Date.now()+Math.max(1,Number(seconds)||60)*1000;
 const tick=()=>{const left=Math.max(0,Math.ceil((end-Date.now())/1000));button.disabled=left>0;button.textContent=left?`${label} (${left})`:label;if(!left||!active())clearInterval(timer);};
 const timer=setInterval(tick,250);tick();return()=>clearInterval(timer);
}
