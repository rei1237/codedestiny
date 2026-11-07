// Free FPTI results only. This is never an entitlement or proof of purchase.
export const FPTI_RESULT_PREFIX='toss:fpti-result:v1:';
const text=value=>typeof value==='string'&&value.length<=4000;
const list=value=>Array.isArray(value)&&value.length<=64&&value.every(text);
const exactRecord=(value,keys,predicate)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key)&&predicate(value[key]));
const finiteRecord=(value,keys)=>exactRecord(value,keys,Number.isFinite);
const stringRecord=(value,keys)=>exactRecord(value,keys,text);
export function fptiResultKey(owner){return typeof owner==='string'&&owner.length<=256&&owner===owner.trim()&&owner? FPTI_RESULT_PREFIX+encodeURIComponent('user:'+owner):'';}
export function validFptiResult(value){
 if(!value||typeof value!=='object'||typeof value.code!=='string'||!/^([AM][HL][FB][RV])$/.test(value.code))return false;
 if(!['typeName','oneLiner','summary','reliabilityMessage','elementSummary','behaviorSummary','relationshipSummary','strategySummary','loveSummary','careerMoneySummary'].every(key=>text(value[key])))return false;
 if(!['strengths','weaknesses','goodMatch','cautionMatch','growthTips','careerTips','loveTips'].every(key=>list(value[key])))return false;
 if(!stringRecord(value.axisMeanings,['energy','judgment','execution','vision'])||!finiteRecord(value.percentageElements,['wood','fire','earth','metal','water'])||!finiteRecord(value.tenGodGroupScores,['expression','officer','wealth','resource','peer']))return false;
 if(!(value.fallbackNotice==null||text(value.fallbackNotice)))return false;
 if(!value.source||!value.source.pillars||!['year','month','day'].every(key=>text(value.source.pillars[key]))||!(value.source.pillars.hour==null||text(value.source.pillars.hour)))return false;
 return Boolean(value.relationStyle&&text(value.relationStyle.description)&&value.evidence&&list(value.evidence.calculationNotes));
}
export function fptiStoredEnvelope(key,raw){
 if(typeof key!=='string'||!key.startsWith(FPTI_RESULT_PREFIX)||typeof raw!=='string'||raw.length>100000)return null;
 try{const saved=JSON.parse(raw);if(saved?.version!==1||typeof saved.owner!=='string'||fptiResultKey(saved.owner)!==key||!validFptiResult(saved.result))return null;return saved;}catch{return null;}
}
export function readFptiResult(storage,owner){try{const key=fptiResultKey(owner);if(!key)return null;return fptiStoredEnvelope(key,storage.getItem(key))?.result||null;}catch{return null;}}
export function saveFptiResult(storage,owner,result){try{const key=fptiResultKey(owner);if(!key||!validFptiResult(result))return false;const raw=JSON.stringify({version:1,owner,result});if(raw.length>100000)return false;storage.removeItem(key);storage.setItem(key,raw);return storage.getItem(key)===raw;}catch{return false;}}
