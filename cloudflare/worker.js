const APP_ORIGIN = "https://spikedthenuke.github.io";
const APP_URL = APP_ORIGIN + "/rep-atlas-free/";
const DEVICE_ID = "device";
const encoder = new TextEncoder();

function cors(origin) {
  const h = new Headers({"Vary":"Origin"});
  if (origin === APP_ORIGIN) {
    h.set("Access-Control-Allow-Origin", APP_ORIGIN);
    h.set("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
    h.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    h.set("Access-Control-Max-Age", "86400");
  }
  return h;
}
function json(data, status, headers) {
  const h = new Headers(headers);
  h.set("Content-Type", "application/json; charset=utf-8");
  h.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), {status:status, headers:h});
}
function b64url(bytes) {
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function fromB64url(value) {
  const text = value.replace(/-/g,"+").replace(/_/g,"/");
  const binary = atob(text + "=".repeat((4-text.length%4)%4));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}
function joinBytes() {
  const arrays = Array.from(arguments);
  const result = new Uint8Array(arrays.reduce((size, item) => size + item.length, 0));
  let offset = 0;
  for (const item of arrays) { result.set(item, offset); offset += item.length; }
  return result;
}
async function hkdf(input, salt, info, length) {
  const key = await crypto.subtle.importKey("raw", input, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({name:"HKDF", hash:"SHA-256", salt:salt, info:info}, key, length*8);
  return new Uint8Array(bits);
}
async function encrypt(subscription, payload) {
  const uaPublic = fromB64url(subscription.keys.p256dh);
  const auth = fromB64url(subscription.keys.auth);
  if (uaPublic.length !== 65 || auth.length !== 16) throw new Error("Invalid subscription keys.");
  const server = await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"}, true, ["deriveBits"]);
  const serverPublic = new Uint8Array(await crypto.subtle.exportKey("raw", server.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, {name:"ECDH",namedCurve:"P-256"}, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({name:"ECDH",public:uaKey},server.privateKey,256));
  const ikm = await hkdf(shared, auth, joinBytes(encoder.encode("WebPush: info\0"),uaPublic,serverPublic),32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(ikm,salt,encoder.encode("Content-Encoding: aes128gcm\0"),16);
  const nonce = await hkdf(ikm,salt,encoder.encode("Content-Encoding: nonce\0"),12);
  const key = await crypto.subtle.importKey("raw",cek,{name:"AES-GCM"},false,["encrypt"]);
  const body = joinBytes(encoder.encode(payload),new Uint8Array([2]));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:nonce,tagLength:128},key,body));
  const header = new Uint8Array(86);
  header.set(salt,0);
  new DataView(header.buffer).setUint32(16,4096);
  header[20] = serverPublic.length;
  header.set(serverPublic,21);
  return joinBytes(header,encrypted);
}
async function vapid(endpoint, env) {
  const url = new URL(endpoint);
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const key = await crypto.subtle.importKey("jwk",jwk,{name:"ECDSA",namedCurve:"P-256"},false,["sign"]);
  const now = Math.floor(Date.now()/1000);
  const head = b64url(encoder.encode(JSON.stringify({typ:"JWT",alg:"ES256"})));
  const claim = b64url(encoder.encode(JSON.stringify({aud:url.origin,exp:now+43200,sub:APP_URL})));
  const content = head + "." + claim;
  const signature = new Uint8Array(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},key,encoder.encode(content)));
  return "vapid t=" + content + "." + b64url(signature) + ", k=" + env.VAPID_PUBLIC_KEY;
}
async function sendPush(row, env) {
  const subscription = {endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}};
  const payload = JSON.stringify({title:"Rep Atlas workout reminder",body:"Your scheduled workout is ready.",url:APP_URL});
  const body = await encrypt(subscription,payload);
  return fetch(row.endpoint,{method:"POST",headers:{Authorization:await vapid(row.endpoint,env),"Content-Encoding":"aes128gcm","Content-Type":"application/octet-stream",TTL:"86400",Urgency:"normal",Topic:"rep-atlas-workout"},body:body});
}
function localNow(timezone) {
  const parts = new Intl.DateTimeFormat("en-US",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",weekday:"long",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter(item=>item.type!=="literal").map(item=>[item.type,item.value]));
  return {date:values.year+"-"+values.month+"-"+values.day,weekday:values.weekday,time:values.hour+":"+values.minute};
}
async function scheduled(env) {
  const row = await env.DB.prepare("SELECT endpoint,p256dh,auth,weekdays,time,timezone,last_sent_local_date FROM reminder_subscription WHERE id = ?").bind(DEVICE_ID).first();
  if (!row) return;
  let days;
  try { days = JSON.parse(row.weekdays); } catch { return; }
  const now = localNow(row.timezone);
  if (!days.includes(now.weekday) || row.last_sent_local_date === now.date) return;
  const selected = row.time.split(":").map(Number);
  const target = selected[0]*60 + selected[1];
  const minute = Number(now.time.slice(0,2))*60 + Number(now.time.slice(3,5));
  if (minute < target || minute > target+4) return;
  try {
    const response = await sendPush(row,env);
    if (response.status === 404 || response.status === 410) {
      await env.DB.prepare("DELETE FROM reminder_subscription WHERE id = ?").bind(DEVICE_ID).run();
      return;
    }
    if (!response.ok) return;
    await env.DB.prepare("UPDATE reminder_subscription SET last_sent_local_date = ? WHERE id = ?").bind(now.date,DEVICE_ID).run();
  } catch (error) { console.error("Reminder send failed.",error instanceof Error?error.message:"unknown error"); }
}
async function handle(request, env) {
  const origin = request.headers.get("Origin") || "";
  const headers = cors(origin);
  if (origin !== APP_ORIGIN) return json({error:"Origin not allowed."},403,headers);
  if (request.method === "OPTIONS") return new Response(null,{status:204,headers:headers});
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/config") return json({publicKey:env.VAPID_PUBLIC_KEY || ""},200,headers);
  if (!(["PUT","DELETE"].includes(request.method)) || url.pathname !== "/api/reminders") return json({error:"Not found."},404,headers);
  if (!env.APP_API_TOKEN || request.headers.get("Authorization") !== "Bearer " + env.APP_API_TOKEN) return json({error:"Cloudflare app token was not accepted."},401,headers);
  if (!env.DB) return json({error:"The D1 database binding is missing."},503,headers);
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM reminder_subscription WHERE id = ?").bind(DEVICE_ID).run();
    return json({ok:true},200,headers);
  }
  let body;
  try { body = await request.json(); } catch { return json({error:"Invalid JSON request."},400,headers); }
  const subscription = body && body.subscription;
  const days = Array.from(new Set(Array.isArray(body && body.weekdays) ? body.weekdays : []));
  const time = String(body && body.time || "");
  const timezone = String(body && body.timezone || "");
  if (!subscription || typeof subscription.endpoint !== "string" || !subscription.keys || typeof subscription.keys.p256dh !== "string" || typeof subscription.keys.auth !== "string") return json({error:"Push subscription is incomplete."},400,headers);
  try { if (new URL(subscription.endpoint).protocol !== "https:") throw new Error(); } catch { return json({error:"Push endpoint must use HTTPS."},400,headers); }
  const allowed = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  if (!days.length || days.some(day=>!allowed.includes(day))) return json({error:"Choose at least one valid workout day."},400,headers);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return json({error:"Reminder time must use HH:MM."},400,headers);
  try { new Intl.DateTimeFormat("en-US",{timeZone:timezone}).format(new Date()); } catch { return json({error:"A valid time zone is required."},400,headers); }
  const sql = "INSERT INTO reminder_subscription (id,endpoint,p256dh,auth,weekdays,time,timezone,last_sent_local_date) VALUES (?,?,?,?,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET endpoint=excluded.endpoint,p256dh=excluded.p256dh,auth=excluded.auth,weekdays=excluded.weekdays,time=excluded.time,timezone=excluded.timezone";
  await env.DB.prepare(sql).bind(DEVICE_ID,subscription.endpoint,subscription.keys.p256dh,subscription.keys.auth,JSON.stringify(days),time,timezone).run();
  return json({ok:true},200,headers);
}
export default {
  async fetch(request,env) {
    try { return await handle(request,env); }
    catch (error) { console.error("Reminder Worker request failed.",error instanceof Error?error.message:"unknown error"); return json({error:"The reminder service could not complete that request."},500,cors(request.headers.get("Origin") || "")); }
  },
  async scheduled(_controller,env,ctx) { ctx.waitUntil(scheduled(env)); }
};
