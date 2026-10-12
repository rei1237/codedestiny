import {renderCraftedDetail,revealCraftedTranscript} from '../../feature-detail-panels.mjs';

// Presentation only; the existing consultation form retains all access and payment handling.
export function mountOracleCraftedDetails(area,options={}){
 if(!area||!/^ko\b/i.test(document.documentElement.lang||'ko'))return;
 if(!document.getElementById('oracleCraftedDetailStyles')){
  const style=document.createElement('style');style.id='oracleCraftedDetailStyles';
  style.textContent='#q-screen.geomancy-has-crafted{flex-direction:column;justify-content:flex-start;overflow-y:auto;padding:24px 16px}#q-screen.geomancy-has-crafted #q-box{flex-shrink:0;max-width:100%}.oracle-crafted{flex-shrink:0;width:min(540px,100%)}.oracle-crafted{margin:20px 0;border:1px solid #a99780;border-radius:12px;color:#f8eddb;background:#292235;overflow:hidden}#hormoneVibeResult>.oracle-crafted{width:min(540px,calc(100% + 32px));max-width:none;margin-left:-16px}.oracle-crafted>summary{padding:16px;cursor:pointer;min-height:48px;line-height:1.6}.oracle-crafted .craftedDetail{max-width:540px;margin:auto;color:#463a31;background:#eee7dc}.oracle-crafted .craftedDetail img{display:block;width:100%;height:auto}.oracle-crafted .craftedDetailNotice,.oracle-crafted .craftedDetailTranscript{padding:16px;color:#463a31;font-size:16px;line-height:1.8;word-break:keep-all}.oracle-crafted .craftedDetailTranscript p{white-space:pre-line;color:#463a31}.oracle-crafted .craftedDetailTranscript h3{color:#463a31}.oracle-crafted [role=status]{padding:16px}';
  document.head.append(style);
 }
 area.classList.add('geomancy-has-crafted');
 const targets=[{target:area.querySelector(options.target||'#q-box'),id:options.id||'geomancy-oracle',title:options.title||'지오맨시 흙점'}];
 for(const {target,id,title} of targets){
 if(!target||target.previousElementSibling?.dataset.oracleCrafted===id)continue;
 const disclosure=document.createElement('details');disclosure.className='oracle-crafted';disclosure.dataset.oracleCrafted=id;
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
