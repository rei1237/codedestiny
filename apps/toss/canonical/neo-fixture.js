const key='canonical-preview:neo-session';
export function neoPreviewRecord(row){return {id:row.id,key:'neo:'+row.id,source:'neo',serviceId:'neo-operation-room',serviceName:'네오의 팩폭 작전실',title:'[개발용 샘플] '+row.initialBriefing.operationTitle,question:row.concern||'',createdAt:row.createdAt,status:'completed',character:'neo',group:'chat',href:'/neo-operation-room/result/?id='+encodeURIComponent(row.id),startHref:'/neo-operation-room/'};}
export function readNeoPreview(){try{return JSON.parse(sessionStorage.getItem(key)||'null');}catch{return null;}}
export async function neoFixture(url,input,requestId){
 const route=url.pathname.split('/').pop();
 if(route==='badges')return {ok:true,badge:{authenticated:true,balance:0,disabled:true}};
 if(route==='strategy-books')return {ok:true,items:[],nextCursor:null};
 if(route==='ensure-access')return {ok:true,mock:true,accessType:'pass'};
 let row=readNeoPreview();
 if(route==='result'){const id=url.searchParams.get('attemptId')||url.searchParams.get('id');return row&&(!id||row.id===id)?row:{ok:false,reason:'RESULT_NOT_FOUND'};}
 if(!['start','refine'].includes(route))return null;
 const fixtures=await import('@/src/features/neo-war-room/NeoOperationRoomPage');
 if(route==='start'){
  const id=input.idempotencyKey||requestId||input.requestId;
  if(!id)return {ok:false,reason:'PREVIEW_REQUEST_ID_REQUIRED'};
  if(row?.id===id)return row;
  row={...input,ok:true,mock:true,id,sessionId:id,createdAt:new Date().toISOString(),status:'completed',initialBriefing:fixtures.localPreviewBriefing,refinedOrder:null,resultUrl:'/neo-operation-room/result/?id='+encodeURIComponent(id)};
 }else if(row&&row.id===input.sessionId)row={...row,refinedOrder:fixtures.localPreviewRefinedOrder,refinementStatus:'completed'};
 else return {ok:false,reason:'RESULT_NOT_FOUND'};
 if(!row)return {ok:false,reason:'PREVIEW_RESULT_MISSING'};
 sessionStorage.setItem(key,JSON.stringify(row));return row;
}
