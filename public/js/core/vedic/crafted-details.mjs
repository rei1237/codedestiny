import {renderCraftedDetail,revealCraftedTranscript} from '../../feature-detail-panels.mjs';

// Presentation only; the existing consultation form retains all access and payment handling.
export function mountVedicCraftedDetails(area){
 if(!area||!/^ko\b/i.test(document.documentElement.lang||'ko'))return;
 if(!document.getElementById('vedicCraftedDetailStyles')){
  const style=document.createElement('style');style.id='vedicCraftedDetailStyles';
  style.textContent='.vedic-crafted{margin:20px 0;border:1px solid #a99780;border-radius:12px;color:#f8eddb;background:#292235;overflow:hidden}.vedic-crafted>summary{padding:16px;cursor:pointer;min-height:48px;line-height:1.6}.vedic-crafted .craftedDetail{max-width:540px;margin:auto;color:#463a31;background:#eee7dc}.vedic-crafted .craftedDetail img{display:block;width:100%;height:auto}.vedic-crafted .craftedDetailNotice,.vedic-crafted .craftedDetailTranscript{padding:16px;color:#463a31;font-size:16px;line-height:1.8;word-break:keep-all}.vedic-crafted .craftedDetailTranscript p{white-space:pre-line;color:#463a31}.vedic-crafted .craftedDetailTranscript h3{color:#463a31}.vedic-crafted [role=status]{padding:16px}';
  document.head.append(style);
 }
 const targets=[{target:area.querySelector('#vedicConsultation'),id:'vedic-question-ai',title:'베다 질문 AI 상담'}];
 targets.push({target:area.querySelector('#c-name')?.closest('.glass'),id:'vedic-compatibility',title:'베다 아쉬타쿠타 궁합'});
 targets.push({target:area.querySelector('#vedicPrashnaQuestion')?.closest('.glass'),id:'vedic-prashna-prompt',title:'베다 프라슈나 프롬프트'});
 const sections=area.querySelectorAll('.tab-panel');
 for(const section of sections.length?sections:[area]){
  targets.push({target:section.querySelector('[data-vedic-lock]'),id:'vedic-basic-reading',title:'베다 기본 해석'});
 }
 for(const {target,id,title} of targets){
 if(!target||target.previousElementSibling?.dataset.vedicCrafted===id)continue;
 const disclosure=document.createElement('details');disclosure.className='vedic-crafted';disclosure.dataset.vedicCrafted=id;
 const summary=document.createElement('summary');summary.textContent=title+' 상세 안내';
 const host=document.createElement('div');disclosure.append(summary,host);target.before(disclosure);
 let loading=false,loaded=false;
 disclosure.addEventListener('toggle',async()=>{
  if(!disclosure.open||loading||loaded)return;
  loading=true;host.innerHTML='<p role="status">상세 안내를 준비하고 있어요.</p>';
  try{
   const response=await fetch('/feature-details/crafted/'+id+'/manifest.json');if(!response.ok)throw Error('DETAIL_UNAVAILABLE');
   const detail=await response.json();if(!disclosure.isConnected)return;
   host.innerHTML=renderCraftedDetail(detail);loaded=true;
  }catch{host.innerHTML='<p role="status">상세 안내를 불러오지 못했어요. 접었다 다시 펼쳐 주세요.</p>';}
  finally{loading=false;}
 });
 host.addEventListener('error',revealCraftedTranscript,true);
 }
}
