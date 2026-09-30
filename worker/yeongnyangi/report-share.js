import {connectDb} from '../lib/db.js';
import {YeongnyangiReportShare} from '../lib/yeongnyangi-report-share-store.js';
import {readRequest,ownerId} from './repository.js';
import {presentFortune} from './service.ts';
import {buildSummaryReport,publicReportDraft,publicShareReport} from '../../app/yeongnyangi/_lib/summary-report.ts';
import {sajuReportCopy} from '../../app/yeongnyangi/_lib/saju-report-copy.ts';
import {chartTerm} from '../../app/yeongnyangi/_lib/reading-chart-copy.ts';

const tokenPattern=/^[a-f0-9]{64}$/;
const noStore={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
async function digest(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
function json(body,status=200){return Response.json(body,{status,headers:noStore});}
function missing(){return json({ok:false,code:'REPORT_SHARE_NOT_FOUND'},404);}

export async function createReportShare(env,userId,requestId,token){
 if(!/^[a-f0-9]{64}$/.test(requestId)||!tokenPattern.test(token||''))return json({ok:false},400);
 await connectDb(env);
 const row=await readRequest(env,userId,requestId);
 const report=buildSummaryReport(presentFortune(row));
 if(!report)return json({ok:false,code:'REPORT_NOT_READY'},409);
 const share=publicShareReport(report);
 const publicData={...publicReportDraft(share),summary:share.oneLineSummary,headline:share.headline,keywords:share.keywords};
 const id=await digest(token),expiresAt=new Date(Date.now()+30*86400000);
 const chartHash=await digest(JSON.stringify(report.chart));
 const stored=await YeongnyangiReportShare.findOneAndUpdate({_id:id},{$setOnInsert:{ownerId:ownerId(userId),requestId,public:publicData,chartHash,expiresAt,revoked:false}},{upsert:true,new:true}).lean();
 if(stored.revoked||String(stored.ownerId)!==String(ownerId(userId))||stored.requestId!==requestId||stored.chartHash!==chartHash||new Date(stored.expiresAt)<=new Date())return json({ok:false,code:'REPORT_SHARE_EXPIRED'},410);
 return json({ok:true,url:`https://code-destiny.com/api/yeongnyangi/report-shares/${token}`,token,expiresAt:new Date(stored.expiresAt).toISOString()},201);
}
export async function revokeReportShare(env,userId,token){
 if(!tokenPattern.test(token))return missing();
 await connectDb(env);
 const result=await YeongnyangiReportShare.updateOne({_id:await digest(token),ownerId:ownerId(userId)},{$set:{revoked:true},$unset:{public:1}});
 return result.matchedCount?json({ok:true}):missing();
}
export async function readReportShare(env,token){
 if(!tokenPattern.test(token))return missing();
 await connectDb(env);
 const row=await YeongnyangiReportShare.findOne({_id:await digest(token),revoked:false,expiresAt:{$gt:new Date()}}).select('public chartHash ownerId requestId').lean();
 if(!row?.public)return missing();
 try{
  const source=await readRequest(env,String(row.ownerId),row.requestId);
  const current=buildSummaryReport(presentFortune(source));
  if(!current||await digest(JSON.stringify(current.chart))!==row.chartHash)return missing();
 }catch{return missing();}
 const data=row.public;
 const saju=data.serviceType==='saju'?sajuReportCopy(data.locale):null;
 const first=data.chart?.groups?.[0],symbol=first?.items?.find(item=>item.value&&item.value!=='자료 없음')?.value;
 const title=escape(saju?.publicTitle||data.title),summary=escape(saju?`${chartTerm(first?.label||'',data.locale)}${symbol?` · ${chartTerm(symbol,data.locale)}`:''}`:data.summary),url=`https://code-destiny.com/api/yeongnyangi/report-shares/${token}`;
 const image=`https://code-destiny.com${data.mascot}`;
 const groups=(data.chart?.groups||[]).map(group=>`<li>${/^\/assets\/yeongnyangi\/tarot\/v1\/[\w-]+\.(webp|avif|png)$/.test(group.image||'')?`<img class="card" src="https://code-destiny.com${escape(group.image)}" alt="저장된 타로 카드">`:''}<strong>${escape(saju?chartTerm(group.label,data.locale):group.label)}</strong> ${group.items.map(item=>`${escape(saju?chartTerm(item.label,data.locale):item.label)}: ${escape(saju?chartTerm(item.value,data.locale):item.value)}`).join(' · ')}</li>`).join('');
 const html=`<!doctype html><html lang="${escape(data.locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta property="og:type" content="article"><meta property="og:url" content="${url}"><meta property="og:title" content="${title}"><meta property="og:description" content="${summary}"><meta property="og:image" content="${image}"><title>${title} | CODE DESTINY</title><style>body{margin:0;background:#f6efe4;color:#292336;font:16px/1.65 system-ui,sans-serif}main{max-width:700px;margin:4vw auto;background:#fffaf2;padding:clamp(22px,5vw,50px);border:1px solid #b89b6b;border-radius:18px}main>img{width:130px;height:130px;object-fit:contain;float:right}.card{display:block;width:100px;height:auto;float:none;margin:8px 0}h1{font-size:clamp(25px,5vw,39px);line-height:1.25}li{margin:12px 0}a{color:#684620}</style></head><body><main><img src="${image}" alt=""><p>CODE DESTINY · ${saju?'YEONGNYANGI':'영냥이'}</p><h1>${title}</h1><p>${summary}</p><h2>${escape(saju?chartTerm(data.chart?.title||saju.pillarTitle,data.locale):data.chart?.title||'나의 상징')}</h2><ul>${groups}</ul><p>${escape(saju?.publicNotice||'공유를 선택한 사람이 공개한 차트 요소입니다. 운세는 선택을 돕는 참고 이야기입니다.')}</p><a href="https://code-destiny.com/yeongnyangi/fortune/">${escape(saju?.viewReading||'내 운세 보기')}</a></main></body></html>`;
 return new Response(html,{headers:{...noStore,'Content-Type':'text/html; charset=utf-8'}});
}
