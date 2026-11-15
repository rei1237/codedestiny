import { getBillingFeaturePricing } from '../../worker/lib/billing-feature-registry.js';
import { createHash } from 'node:crypto';
export const HEUKWOL_MOCK_PROFILE={id:'mock-heukwol-profile',profileId:'mock-heukwol-profile',name:'검수용 프로필',gender:'F',birth:{year:1990,month:7,day:15,hour:14,minute:30,calType:'solar',timeUnknown:false},birthDate:'1990-07-15',birthTime:'14:30',syncStatus:'synced'};
export const HEUKWOL_MOCK_SUBSCRIPTION={tier:'family',isActive:true,expiresAt:'2099-01-01T00:00:00.000Z',profileLimit:100};
// Opt-in fixture only. Never imported by the Worker or persisted to a database.
export function createHeukwolMock(){
 const rows=new Map(),events=[];
 const snapshot=row=>({ok:true,id:row.id,status:row.completed===27?'completed':'generating',completedChapters:row.completed,totalChapters:27,year:row.input.year,...(row.completed===27?{report:row.report}:{})});
 const metadata=row=>({id:row.id,source:'executions',key:'executions:'+row.id,serviceId:'heukwol-warning-consultation',serviceName:'흑월의 경고',title:row.report.title,question:row.input.question,createdAt:'2026-11-15T12:00:00Z',status:row.completed===27?'completed':'generating',character:'neo',group:'report',href:'/records/view/?source=executions&id='+encodeURIComponent(row.id),startHref:'/heukwol/',recoveryHref:'/heukwol/?result='+encodeURIComponent(row.id),nativeHref:''});
 return (route,body,owner,send,query)=>{
  if(route==='GET /api/mock/heukwol/events'){send(200,{events});return true;}
  const relevant=route.includes('/api/heukwol/')||route==='GET /api/records'||route==='GET /api/records/detail'||route==='POST /api/billing/coin-gate'||route==='GET /api/fortune/pig-coin/profile-subscription/status';
  if(!relevant||route==='GET /api/heukwol/pricing')return false;
  events.push({route,requestId:body.requestId,id:body.id});
  if(!owner){send(401,{message:'로그인이 필요해요.'});return true;}
  if(route.endsWith('/profile-subscription/status')){send(200,{ok:true,authenticated:true,...HEUKWOL_MOCK_SUBSCRIPTION});return true;}
  if(route==='POST /api/billing/coin-gate'){
   if(body.featureKey!=='heukwol-warning-consultation'){send(402,{ok:false});return true;}
   send(200,{ok:true,data:{allowed:true,accessType:'membership_pass',unlocked:true,deducted:0,transactionId:'mock-existing-pass',featureKey:body.featureKey}});return true;
  }
  if(route==='GET /api/records'){send(200,{ok:true,items:[...rows.values()].map(metadata),failures:[],nextCursor:null});return true;}
  if(route==='GET /api/records/detail'){const row=rows.get(query.get('id'));send(row?200:404,row?{ok:true,record:metadata(row),content:row.completed===27?row.report:{title:row.report.title,reportId:row.id}}:{ok:false});return true;}
  if(route==='GET /api/heukwol/result'||route==='POST /api/heukwol/continue'){
   const row=rows.get(body.id||query.get('id'));if(!row){send(404,{message:'저장된 결과가 없어요.'});return true;}
   if(route.endsWith('/continue'))row.completed=Math.min(27,row.completed+1);
   send(200,snapshot(row));return true;
  }
  if(route==='POST /api/heukwol/prepare'||route==='POST /api/heukwol/start'){
   if(body.profileId!==HEUKWOL_MOCK_PROFILE.profileId||String(body.question||'').trim().length<12){send(400,{message:'프로필과 질문을 확인해 주세요.'});return true;}
   const id='heukwol:'+createHash('sha256').update(String(body.requestId)).digest('hex');let row=rows.get(id);
   if(row){send(200,snapshot(row));return true;}
   if(route.endsWith('/prepare')){send(200,{ok:true,pricing:getBillingFeaturePricing({featureKey:'heukwol-warning-consultation'}).pricing});return true;}
   const bodyText='[검증용 응답] 실제 상담문이 아닙니다. 저장된 문장이 재열람과 PDF에도 그대로 표시되는지 확인합니다.';
   const chapters=Array.from({length:27},(_,i)=>({key:'mock-'+i,title:'검증용 '+(i+1)+'장',warning:bodyText,interpretation:bodyText,strategy:bodyText,checkpoints:['확인한 내용을 기록해요.'],content:bodyText,totalChars:bodyText.length*3,evidenceIds:[]}));
   const months=Array.from({length:12},(_,i)=>({month:i+1,start:'2027-01-01',end:'2027-02-01',saju:[],ziwei:[],domains:[{id:'work',title:'검증용 점검',sajuPriority:0,ziweiCautions:[],ziweiSupports:[],action:bodyText,sign:bodyText,change:bodyText}]}));
   row={id,input:body,completed:1,report:{title:'[검증용] 흑월의 경고',year:body.year,reportId:id,generatedAt:'2026-11-15',question:body.question,totalChars:chapters.reduce((n,c)=>n+c.totalChars,0),chapters,analysis:{months,limitation:bodyText,method:'UI 연결 검증용 고정 데이터',uncertainty:[]}}};rows.set(id,row);send(200,snapshot(row));return true;
  }
  send(501,{error:'MOCK_ROUTE_NOT_IMPLEMENTED'});return true;
 };
}
