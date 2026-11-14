import {chatProductId} from '../../../../lib/fortune/chat-products.js';
import {prepareSpread,drawFixture} from './yeongnyangi-contracts.mjs';
import {offlineLetterProduct,safetyResponse} from './review-fixture.mjs';

const respond=(value,status=200)=>Response.json(value,{status});
export async function letterRequest(request,url,path,state,save){
  const method=request.method;
  if(path==='/canonical/fortune-chat/consultations'&&method==='GET')return respond({ok:true,consultations:[...state.letters.values()].filter(row=>row.paid&&row.persona===(url.searchParams.get('persona')||'yeoni')).map(row=>({id:row.id,persona:row.persona,state:row.state,paid:true,domain:row.productId.split('_')[1],completedChapters:1,totalChapters:1,question:row.consultation.question,createdAt:row.createdAt})),nextCursor:null});
  if(path==='/canonical/fortune-chat/consultations'&&method==='POST'){const body=await request.json(),notice=safetyResponse(body);if(notice)return notice;const persona=body.persona||'yeoni',productId=chatProductId(body.domain||'saju',body.fishId);if((body.fishId!==undefined)!==(body.questionDecision?.confirmed===true))return respond({error:'QUESTION_SCOPE_REQUIRED'},400);if(!offlineLetterProduct(persona,productId))return respond({error:'TOSS_PRODUCT_NOT_APPROVED'},503);const inputDigest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body))))).join(',');const previous=body.consultationAttemptId&&[...state.letters.values()].find(row=>row.attempt===body.consultationAttemptId&&row.persona===persona);if(previous)return previous.productId===productId&&previous.inputDigest===inputDigest?respond({ok:true,consultation:previous}):respond({error:'REQUEST_INPUT_MISMATCH'},409);const id=(++state.sequence).toString(16).padStart(64,'0'),row={id,persona,productId,inputDigest,attempt:body.consultationAttemptId,state:'CREATED',paid:false,chapters:[],manifest:[{id:'test',title:'테스트 상담'}],consultation:{question:String(body.question||'테스트 질문')},createdAt:new Date().toISOString(),recovery:{canRetryNow:false,savedChapters:0,totalChapters:1}};if(body.fishId){row.product={id:productId,domain:body.domain,fishId:body.fishId};row.consultation.questionDecision=body.questionDecision;if(body.domain==='tarot'){try{prepareSpread(row,{...body,productId:'tarot_'+body.fishId,consultationKind:'spread'});}catch{return respond({error:'INVALID_TAROT_SPREAD'},400);}}}state.letters.set(id,row);save();return respond({ok:true,consultation:row});}
  const letter=/^\/canonical\/fortune-chat\/consultations\/([a-f0-9]{64})(?:\/(generate|draw|conversation))?$/.exec(path);
  if(letter){const row=state.letters.get(letter[1]);if(!row)return respond({error:'RESULT_NOT_FOUND'},404);if(letter[2]==='draw'&&method==='POST'){const record={fortune:row};const result=await drawFixture(request,record,()=>{state.letters.set(row.id,record.fortune);save();});return result.ok?respond({ok:true,consultation:record.fortune}):result;}if(letter[2]&&method==='POST'&&!row.paid)return respond({error:'PAYMENT_REQUIRED'},402);
   if(letter[2]==='conversation'&&method==='POST'){
    const body=await request.json(),notice=safetyResponse(body);if(notice)return notice;
    const c=row.conversation;if(!c?.ready)return respond({error:'QUESTION_CONVERSATION_UNAVAILABLE'},409);
    const previous=c.exchanges.find(item=>item.id===body.id);if(previous&&previous.question!==body.question)return respond({error:'IDEMPOTENCY_CONFLICT'},409);
    if(!previous){if(c.closed||!body.id||!body.question?.trim())return respond({error:'QUESTION_CONVERSATION_CLOSED'},409);
     c.exchanges.push({id:body.id,question:body.question,kind:'answer',text:'[테스트 전용] 저장된 추가 질문 답변'});c.used++;c.remaining--;c.closed=c.remaining===0;save();}
   }return respond({ok:true,consultation:row});}
  return null;
}
