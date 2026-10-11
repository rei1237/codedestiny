import {renderCraftedDetail,revealCraftedTranscript} from '../../feature-detail-panels.mjs';

// Display-only guides. The original chart, authorization and purchase controls own access.
const products={astro_basic_deep_pack:'astro-basic-deep',astro_career_talent_deep:'astro-career-talent',astro_growth_shadow_deep:'astro-growth-shadow'};
export function mountAstroCraftedDetails(area){
 if(!/^ko\b/i.test(document.documentElement.lang||'ko'))return;
 if(!document.getElementById('astroCraftedDetailStyles')){
  const style=document.createElement('style');style.id='astroCraftedDetailStyles';
  style.textContent='.astro-crafted{margin:16px 0;border:1px solid #b5a28b;border-radius:12px;color:#f8eddb;background:#252b41;overflow:hidden}.astro-crafted>summary{padding:16px;cursor:pointer;min-height:48px;line-height:1.6}.astro-crafted .craftedDetail{max-width:540px;margin:auto;color:#39364a;background:#f5f0e6}.astro-crafted .craftedDetail img{display:block;width:100%;height:auto}.astro-crafted .craftedDetailNotice,.astro-crafted .craftedDetailTranscript{padding:16px;color:#39364a;font-size:16px;line-height:1.8}.astro-crafted .craftedDetailTranscript p{white-space:pre-line;color:#39364a}.astro-crafted .craftedDetailTranscript h3{color:#39364a}.astro-crafted [role=status]{padding:16px}@media(max-width:600px){#astroResult .astro-crafted{margin-inline:-10px}}';
  document.head.append(style);
 }
 for(const [key,id] of Object.entries(products)){
  if(area.querySelector('[data-astro-crafted="'+key+'"]'))continue;
  const target=key==='astro_basic_deep_pack'?area.querySelector('[data-astro-server-detail]'):area.querySelector('#astroPaidGate_'+key);
  if(!target)continue;
  const disclosure=document.createElement('details');disclosure.className='astro-crafted';disclosure.dataset.astroCrafted=key;
  const summary=document.createElement('summary');summary.textContent=key==='astro_basic_deep_pack'?'기본 심층 패키지 상세 안내':key==='astro_career_talent_deep'?'커리어·재능 상세 안내':'과제와 변화 상세 안내';
  const host=document.createElement('div');disclosure.append(summary,host);
  // Keep illustrated guides out of the nested paid-section padding on small screens.
  (target.closest('.astro-counsel-section')||target).before(disclosure);
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
