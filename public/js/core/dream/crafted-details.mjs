import {renderCraftedDetail,revealCraftedTranscript} from '../../feature-detail-panels.mjs';

// Presentation only; the existing consultation form retains all access and payment handling.
export function mountDreamCraftedDetails(area){
 if(!area||!/^ko\b/i.test(document.documentElement.lang||'ko'))return;
 if(!document.getElementById('dreamCraftedDetailStyles')){
  const style=document.createElement('style');style.id='dreamCraftedDetailStyles';
  style.textContent='.dream-crafted{margin:20px 0;border:1px solid #a99780;border-radius:12px;color:#f8eddb;background:#292235;overflow:hidden}.dream-crafted>summary{padding:16px;cursor:pointer;min-height:48px;line-height:1.6}.dream-crafted .craftedDetail{max-width:540px;margin:auto;color:#463a31;background:#eee7dc}.dream-crafted .craftedDetail img{display:block;width:100%;height:auto}.dream-crafted .craftedDetailNotice,.dream-crafted .craftedDetailTranscript{padding:16px;color:#463a31;font-size:16px;line-height:1.8;word-break:keep-all}.dream-crafted .craftedDetailTranscript p{white-space:pre-line;color:#463a31}.dream-crafted .craftedDetailTranscript h3{color:#463a31}.dream-crafted [role=status]{padding:16px}';
  document.head.append(style);
 }
 const targets=[{target:area.querySelector('.ps-journal'),id:'dream-psycho',title:'정신분석 해몽'}];
 for(const {target,id,title} of targets){
 if(!target||target.previousElementSibling?.dataset.dreamCrafted===id)continue;
 const disclosure=document.createElement('details');disclosure.className='dream-crafted';disclosure.dataset.dreamCrafted=id;
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
