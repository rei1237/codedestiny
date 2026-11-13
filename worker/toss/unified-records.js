import {libraryPage} from './library.js';
import {TossError} from './policy.js';
import {tarotResultPath} from '../../lib/tarot/toss-library-links.mjs';

// Results come only from libraryPage after its owner and order checks. Unassigned
// rights remain in the purchase library until the buyer chooses an input.
const LABELS={naming:'사주 작명첩',dream:'정신분석 해몽',heukwol:'흑월의 경고',yeongnyangi:'영냥이',yeoni:'연이 상담',neo:'네오 상담','tarot-library':'타로 상담',tea:'연이의 운명 찻집',fusion:'초융합 운세','life-book':'인생의 책','love-secret':'연애 비책',astrology:'점성술 상담',vedic:'베다 상담',ziwei:'자미두수 상담','new-year':'신년운세 상담',karma:'운명의 업 전문가 상담',maya:'마야점 프롬프트',sukuyo:'숙요점 궁합 전문가 상담',relationship:'관계 경계 리포트'};
function text(value){return typeof value==='string'?value.trim().slice(0,200):'';}
function status(state){if(['COMPLETED','completed'].includes(state))return 'completed';if(state==='AWAITING_FOLLOWUP')return 'conversation';if(['PAID','GENERATING','PENDING','partial','generating','paid_pending_generation'].includes(state))return 'generating';return 'failed';}
function groupOf(purchase){return ['yeoni','neo'].includes(purchase.serviceId)&&!purchase.nativeService?'chat':'report';}
function nativeName(purchase){return purchase.nativeService==='life-book'&&purchase.featureKey==='life-fortune-ai-consultation'?'인생 총운':LABELS[purchase.nativeService]||LABELS[purchase.serviceId]||'상담';}

export async function unifiedRecordsPage(rows,read,readTarot,readNative,verify,{group='all',query='',source=''}={}){
 if(!['all','report','chat','chart'].includes(group))throw new TossError('RECORD_GROUP_INVALID',400);
 if(source&&!['tea','neo','naming','dream','heukwol','fusion','life-book','love-secret','astrology','vedic','ziwei','new-year','karma','maya','sukuyo','relationship'].includes(source))return {ok:true,items:[],failures:[],nextCursor:null};
 const snapshots=new Map();
 const page=await libraryPage(rows,async id=>{const row=await read(id);snapshots.set(id,row);return row;},readTarot,readNative,verify);
 if(page.purchases.some(row=>row.state==='READ_FAILED'))throw new TossError('RECORDS_UNAVAILABLE',503);
 const needle=text(query).toLocaleLowerCase('ko');
 const items=page.purchases.flatMap(row=>{
  if(['REFUNDED','ACCESS_REVIEW','UNASSIGNED'].includes(row.state)||row.status==='REFUNDED'||!row.requestId)return [];
  const groupName=groupOf(row);if(group!=='all'&&group!==groupName)return [];if(source&&row.nativeService!==source)return [];
  const original=snapshots.get(row.requestId),name=row.nativeService?nativeName(row):LABELS[row.serviceId]||'상담';
  const question=text(row.question||original?.snapshot?.analysis?.consultation?.question),title=question||name;
  if(needle&&!`${name} ${title} ${question}`.toLocaleLowerCase('ko').includes(needle))return [];
  const letter=['neo','yeoni'].includes(row.serviceId)&&/^chat_(saju|ziwei|sukuyo|vedic|astrology|tarot)$/.test(row.productId);
  const href=letter&&!row.nativeService?'/fortune-tea-house/?counsel=letter'+(row.serviceId==='neo'?'&persona=neo':'')+'&consultation='+encodeURIComponent(row.requestId):row.nativeService?row.href:row.serviceId==='tarot-library'?tarotResultPath(row.orderId):row.serviceId==='yeongnyangi'?'/yeongnyangi/result/?id='+encodeURIComponent(row.requestId):'/result?id='+encodeURIComponent(row.requestId);
  if(typeof href!=='string'||!/^\/(?!\/)[^\\\u0000-\u001f]*$/.test(href))throw new TossError('RECORDS_UNAVAILABLE',503);
  return [{id:row.resultId||row.requestId,key:`${row.serviceId}:${row.orderId}`,source:row.nativeService||row.serviceId,serviceId:row.nativeService||row.serviceId,serviceName:name,title,question,createdAt:row.createdAt,status:status(row.state),character:row.nativeService?(row.nativeService==='tea'?'yeoni':row.nativeService==='neo'?'neo':''):(row.serviceId==='yeoni'?'yeoni':row.serviceId==='neo'?'neo':''),group:groupName,href,nativeHref:href,startHref:'/'}];
 });
 return {ok:true,items,failures:[],nextCursor:page.nextCursor};
}
