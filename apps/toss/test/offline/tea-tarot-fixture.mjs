// Private/offline only. Reuse web deck/card rules, never a generated sample identity.
import {commitDeck,selectDeckSlots} from '../../../../lib/tarot/committed-deck.mjs';
import {teaSpread,spreadSnapshot,teaDrawCards,TEA_TAROT_VERSION} from '../../../../lib/fortune-tea-house/tarot-contract.mjs';
const fail=(code,status=409)=>{throw Object.assign(new Error(code),{code,status})};
const fingerprint=input=>JSON.stringify({question:String(input.question||'').trim().replace(/\r\n/g,'\n'),spreadId:input.tarotSpreadId,cupId:input.selectedTeaCupId,topic:input.concernTopic||''});
const publicDraft=doc=>({version:doc.version,attemptId:doc.attemptId,status:doc.status,spread:doc.spread,deckSize:doc.deck.order.length,...(doc.draw?{draw:doc.draw,cards:doc.cards}:{})});
export function readMockTeaDraw(state,input){
 const doc=state.teaDrafts.get(input.attemptId||'');
 if(!doc?.draw)fail('TAROT_DRAW_REQUIRED',422);
 if(doc.fingerprint!==fingerprint(input))fail('TAROT_DRAFT_CHANGED');
 if(input.tarotSpread!==(doc.spread.cardCount===5?'five':'three'))fail('TAROT_PRODUCT_MISMATCH',422);
 return doc;
}
export async function teaTarotRequest(request,path,state,save,now=()=>new Date()){
 if(request.method!=='POST'||!['/canonical/fortune-tea-house/tarot/prepare','/canonical/fortune-tea-house/tarot/draw'].includes(path))return null;
 try{
  const input=await request.json();let doc=state.teaDrafts.get(input.attemptId||'');
  if(path.endsWith('/prepare')){
   const spread=teaSpread(input.tarotSpreadId),question=String(input.question||'').trim();
   if(!spread||!(/^[a-zA-Z0-9_-]{8,180}$/.test(input.attemptId||''))||question.length<4||question.length>1200)fail('INVALID_TAROT_REQUEST',400);
   const identity=fingerprint(input);
   if(doc&&doc.fingerprint!==identity)fail('TAROT_DRAFT_CHANGED');
   if(!doc){doc={attemptId:input.attemptId,fingerprint:identity,version:TEA_TAROT_VERSION,spread:spreadSnapshot(spread),deck:commitDeck(),createdAt:now().toISOString(),status:'awaiting_draw'};state.teaDrafts.set(input.attemptId,doc);save();}
  }else{
   if(!doc)fail('TAROT_DRAFT_NOT_FOUND',404);
   if(!doc.draw){
    let draw;try{draw=selectDeckSlots(input,doc.spread.cardCount)}catch{fail('INVALID_TAROT_PICKS',400)}
    doc.cards=teaDrawCards(doc.spread,doc.deck,draw.picks);doc.draw={...draw,drawnAt:now().toISOString()};doc.status='drawn';save();
   }
  }
  return Response.json({ok:true,draft:publicDraft(doc)});
 }catch(error){if(!error.code)throw error;return Response.json({ok:false,error:error.code},{status:error.status});}
}
