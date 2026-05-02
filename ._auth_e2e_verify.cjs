const mongoose = require("mongoose");
const dotenv = require("dotenv");

const BASE = "https://code-destiny-web.bulegyung.workers.dev";
const PASS = "QaTest!23456";
const BAD_PASS = "WrongPass!23456";

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function req(method, path, body, token){
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw:text }; }
  return { status: res.status, ok: res.ok, body: json };
}

async function retry(label, fn, max=6){
  let last;
  for(let i=1;i<=max;i++){
    try{
      const r = await fn();
      if(r.ok) return { attempt:i, ...r };
      last = r;
    }catch(e){
      last = { ok:false, status:-1, body:{ message: String(e?.message || e) } };
    }
    await sleep(400);
  }
  throw new Error(`${label} failed after retries: ${JSON.stringify(last)}`);
}

(async()=>{
  const email = `qa.auth.${Date.now()}@example.com`;
  const regPayload = { name:"QA User", email, password:PASS, birthDate:"1992-06-15", birthTime:"12:30", gender:"OTHER" };

  const reg = await retry("register", ()=>req("POST","/api/auth/register",regPayload));

  const dup = await req("POST","/api/auth/register",regPayload);
  const wrong = await req("POST","/api/auth/login",{ email, password: BAD_PASS });

  const login = await retry("login", ()=>req("POST","/api/auth/login",{ email, password: PASS }));
  const token = String(login.body?.token || "");
  if(!token) throw new Error("login token missing");

  const me = await retry("me", ()=>req("GET","/api/auth/me",null,token));

  dotenv.config({ path: ".env.cloudflare.local" });
  const uri = String(process.env.MONGO_URI || "").replace(/^"|"$/g,"");
  const dbName = String(process.env.MONGO_DB_NAME || "").replace(/^"|"$/g,"") || undefined;
  if(!uri) throw new Error("MONGO_URI missing for verification");

  await mongoose.connect(uri,{ serverSelectionTimeoutMS:12000, dbName });
  const User = mongoose.model("UserAuthVerify", new mongoose.Schema({ email:String }, { collection:"users" }));
  const doc = await User.findOne({ email: email.toLowerCase() }).lean();
  await mongoose.disconnect();

  console.log(`TEST_EMAIL=${email}`);
  console.log(`REGISTER_STATUS=${reg.status}`);
  console.log(`REGISTER_OK_ATTEMPT=${reg.attempt}`);
  console.log(`DUPLICATE_REGISTER_STATUS=${dup.status}`);
  console.log(`WRONG_PASSWORD_LOGIN_STATUS=${wrong.status}`);
  console.log(`LOGIN_STATUS=${login.status}`);
  console.log(`LOGIN_OK_ATTEMPT=${login.attempt}`);
  console.log(`JWT_RETURNED=${token ? "yes" : "no"}`);
  console.log(`ME_STATUS=${me.status}`);
  console.log(`MONGO_USER_DOC_EXISTS=${doc ? "yes" : "no"}`);
})();