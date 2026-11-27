const reminderKey = "rep-atlas-reminder-settings-v1";
let reminderSettings = {workerUrl:"",apiToken:"",publicKey:"",planId:"",time:"09:00",enabled:false};
try { reminderSettings = Object.assign(reminderSettings, JSON.parse(localStorage.getItem(reminderKey) || "{}")); } catch {}
function saveReminderState(){ localStorage.setItem(reminderKey,JSON.stringify(reminderSettings)); }
function reminderUrl(value){ const url=new URL(String(value||"").trim()); if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||url.pathname!=="/") throw new Error("Enter the root HTTPS Worker URL."); return url.origin; }
function reminderStatus(message){ const node=document.querySelector("#reminder-status"); if(node) node.textContent=message; }
function reminderOptions(){ if(!data.plans.length)return "<option value=''>Create a plan first</option>"; const selected=data.plans.some(p=>p.id===reminderSettings.planId)?reminderSettings.planId:data.plans[0].id; return data.plans.map(p=>"<option value=\""+escapeHTML(p.id)+"\" "+(p.id===selected?"selected":"")+">"+escapeHTML(p.goal)+" · "+escapeHTML(p.split)+"</option>").join(""); }
function addReminderPanel(){
  const host=document.querySelector("#modal .modal-content");
  if(!host||host.querySelector(".reminder-setting"))return;
  const box=document.createElement("section"); box.className="reminder-setting";
  box.innerHTML="<style>.reminder-setting{padding:14px;margin:0 0 14px;background:var(--paper);border:1px solid var(--line);border-radius:15px}.reminder-setting p{font-size:11px;line-height:1.5;color:var(--muted)}.reminder-setting label{display:block;font-size:12px;font-weight:700;margin:12px 0 5px}.reminder-setting input,.reminder-setting select{width:100%}.reminder-setting button{margin:4px 0}.reminder-actions{display:grid;gap:7px}</style>"+
    "<span class='eyebrow'>Push reminders</span><p>One reminder on each scheduled workout day. Cloudflare stores the push subscription, plan weekdays, time, and time zone. Workout logs stay on this phone.</p>"+
    "<form id='reminder-settings-form'><label for='reminder-worker-url'>Cloudflare Worker URL</label><input id='reminder-worker-url' name='workerUrl' type='url' placeholder='https://rep-atlas-reminders.your-name.workers.dev' value='"+escapeHTML(reminderSettings.workerUrl)+"' required>"+
    "<label for='reminder-api-token'>Cloudflare app token</label><input id='reminder-api-token' name='apiToken' type='password' autocomplete='off' value='"+escapeHTML(reminderSettings.apiToken)+"' required>"+
    "<label for='reminder-plan'>Plan</label><select id='reminder-plan' name='planId' "+(data.plans.length?"":"disabled")+">"+reminderOptions()+"</select>"+
    "<label for='reminder-time'>Reminder time</label><input id='reminder-time' name='time' type='time' value='"+escapeHTML(reminderSettings.time)+"' required>"+
    "<p id='reminder-status' role='status'>"+(reminderSettings.enabled?"Reminders enabled":"Not enabled")+"</p><div class='reminder-actions'><button class='button soft' type='submit'>Save Cloudflare settings</button><button class='button primary' type='button' data-reminder-enable "+(data.plans.length?"":"disabled")+">Enable or update reminders</button><button class='button soft' type='button' data-reminder-disable>Disable reminders</button></div></form>"+
    "<p>Requires iOS 16.4 or later. Add Rep Atlas to the Home Screen, open it there, and allow notifications. Follow the Cloudflare setup guide in the GitHub repository.</p>";
  host.append(box);
}
async function saveReminderSettings(form){
  const values=new FormData(form); let url;
  try{url=reminderUrl(values.get("workerUrl"));}catch(error){toast(error.message);return;}
  const token=String(values.get("apiToken")||"").trim(), planId=String(values.get("planId")||""), time=String(values.get("time")||"");
  if(!token||!data.plans.some(p=>p.id===planId)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)){toast("Enter a token, choose a plan, and set a valid time.");return;}
  if(reminderSettings.enabled&&(url!==reminderSettings.workerUrl||token!==reminderSettings.apiToken)){toast("Disable reminders before changing the Worker connection.");return;}
  reminderSettings=Object.assign(reminderSettings,{workerUrl:url,apiToken:token,planId:planId,time:time,publicKey:url===reminderSettings.workerUrl?reminderSettings.publicKey:""}); saveReminderState(); reminderStatus("Checking the Cloudflare Worker…");
  try{const response=await fetch(url+"/api/config");const result=await response.json();if(!response.ok||!result.publicKey)throw new Error(result.error||"Worker is not ready.");reminderSettings.publicKey=result.publicKey;saveReminderState();if(reminderSettings.enabled)await syncReminderSchedule();else reminderStatus("Connected · ready to enable");toast("Cloudflare connection saved.");}
  catch(error){reminderStatus("Worker connection failed: "+error.message);toast("Could not reach the Cloudflare Worker.");}
}
async function syncReminderSchedule(){
  const plan=data.plans.find(p=>p.id===reminderSettings.planId); if(!plan)throw new Error("Choose a saved plan.");
  const registration=await navigator.serviceWorker.ready;const subscription=await registration.pushManager.getSubscription();if(!subscription)throw new Error("This phone has no push subscription.");
  const weekdays=[...new Set(plan.days.map(day=>day.weekday).filter(day=>weekDays.includes(day)))];if(!weekdays.length)throw new Error("The selected plan has no scheduled weekdays.");
  const response=await fetch(reminderSettings.workerUrl+"/api/reminders",{method:"PUT",headers:{Authorization:"Bearer "+reminderSettings.apiToken,"Content-Type":"application/json"},body:JSON.stringify({subscription:subscription.toJSON(),weekdays:weekdays,time:reminderSettings.time,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC"})});
  const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||"Worker returned "+response.status+".");reminderSettings.enabled=true;saveReminderState();reminderStatus("Enabled · "+weekdays.join(", ")+" at "+reminderSettings.time);
}
async function enableReminders(){
  const form=document.querySelector("#reminder-settings-form");if(!form)return;const values=new FormData(form);let url="";try{url=reminderUrl(values.get("workerUrl"));}catch{}
  if(url!==reminderSettings.workerUrl||String(values.get("apiToken")||"").trim()!==reminderSettings.apiToken||String(values.get("planId")||"")!==reminderSettings.planId||String(values.get("time")||"")!==reminderSettings.time){toast("Save these reminder settings first.");return;}
  if(!reminderSettings.publicKey||!data.plans.some(p=>p.id===reminderSettings.planId)){toast("Save a working Worker connection and plan first.");return;}
  if(!( "serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){toast("Push reminders require an iOS 16.4+ Home Screen app.");return;}
  try{const permission=Notification.permission==="granted"?"granted":await Notification.requestPermission();if(permission!=="granted"){reminderStatus("Allow notifications in iPhone Settings for Rep Atlas.");return;}const reg=await navigator.serviceWorker.register("./sw.js");await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(atob(reminderSettings.publicKey.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-reminderSettings.publicKey.length%4)%4)),c=>c.charCodeAt(0))});await syncReminderSchedule();toast("Workout reminders enabled.");}
  catch(error){reminderSettings.enabled=false;saveReminderState();reminderStatus("Could not enable reminders: "+error.message);toast("Could not enable push reminders.");}
}
async function disableReminders(){try{if(reminderSettings.workerUrl&&reminderSettings.apiToken){const response=await fetch(reminderSettings.workerUrl+"/api/reminders",{method:"DELETE",headers:{Authorization:"Bearer "+reminderSettings.apiToken}});if(!response.ok)throw new Error("Worker returned "+response.status+".");}const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub)await sub.unsubscribe();reminderSettings.enabled=false;saveReminderState();reminderStatus("Reminders are off.");toast("Workout reminders disabled.");}catch(error){reminderStatus("Could not disable reminders: "+error.message);toast("Could not disable reminders.");}}
document.addEventListener("click",event=>{if(event.target.closest("#backup-button"))setTimeout(addReminderPanel,0);const button=event.target.closest("[data-reminder-enable]");if(button)void enableReminders();const off=event.target.closest("[data-reminder-disable]");if(off)void disableReminders();});
document.addEventListener("submit",event=>{if(event.target.id==="reminder-settings-form"){event.preventDefault();void saveReminderSettings(event.target);}if(event.target.id==="schedule-form"&&reminderSettings.enabled)setTimeout(()=>void syncReminderSchedule().catch(error=>toast(error.message)),0);});
