// OTP cells share one hidden form value; pasted/autofilled codes are distributed.
export function otpMarkup(length=6){
 const count=Math.min(8,Math.max(4,Number(length)||6));
 return `<div class="otp-cells" role="group" aria-label="SMS code"><input type="hidden" name="code">${Array.from({length:count},(_,i)=>`<input type="text" ${i===0?'id="authCode"':''} data-otp="${i}" aria-label="${i+1} / ${count}" inputmode="numeric" autocomplete="${i===0?'one-time-code':'off'}" pattern="[0-9]*" size="1">`).join('')}</div>`;
}
export function bindOtp(root){
 const cells=[...root.querySelectorAll('[data-otp]')],hidden=root.querySelector('[name=code]');
 const sync=()=>{hidden.value=cells.map(c=>c.value).join('');};
 cells.forEach((cell,index)=>{
  const distribute=text=>{const digits=String(text).replace(/\D/g,'').slice(0,cells.length-index);[...digits].forEach((d,n)=>cells[index+n].value=d);sync();cells[Math.min(cells.length-1,index+digits.length)]?.focus({preventScroll:true});};
  cell.addEventListener('paste',event=>{event.preventDefault();distribute(event.clipboardData.getData('text'));});
  cell.addEventListener('input',()=>{if(cell.value.length>1)distribute(cell.value);else{cell.value=cell.value.replace(/\D/g,'');sync();if(cell.value)cells[index+1]?.focus({preventScroll:true});}});
  cell.addEventListener('focus',()=>cell.select());
  cell.addEventListener('keydown',event=>{if(event.key==='Backspace'&&!cell.value)cells[index-1]?.focus({preventScroll:true});if(event.key==='ArrowLeft'){event.preventDefault();cells[index-1]?.focus({preventScroll:true});}if(event.key==='ArrowRight'){event.preventDefault();cells[index+1]?.focus({preventScroll:true});}});
 });
 cells[0]?.focus({preventScroll:true});
}
export function resendCountdown(button,seconds,{label='Send again',active=()=>button.isConnected}={}){
 const end=Date.now()+Math.max(1,Number(seconds)||60)*1000;
 const tick=()=>{const left=Math.max(0,Math.ceil((end-Date.now())/1000));button.disabled=left>0;button.textContent=left?`${label} (${left})`:label;if(!left||!active())clearInterval(timer);};
 const timer=setInterval(tick,250);tick();return()=>clearInterval(timer);
}
