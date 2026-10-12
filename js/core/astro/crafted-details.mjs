import {renderCraftedDetail,revealCraftedTranscript} from '../../feature-detail-panels.mjs';

// Display-only guides. The original chart, authorization and purchase controls own access.
const products={astro_basic_deep_pack:'astro-basic-deep',astro_career_talent_deep:'astro-career-talent',astro_growth_shadow_deep:'astro-growth-shadow',astro_stellar_career_room:'astro-stellar-career',astro_stellar_relationship_room:'astro-stellar-relationship',astro_stellar_growth_room:'astro-stellar-growth',astro_stellar_talent_room:'astro-stellar-talent',astro_talent_attraction_deep:'astro-talent-attraction',astro_relationship_deep:'astro-relationship',astro_yearly_transit:'astro-yearly-transit',astrology_ai_prompt_generator:'astro-question-consultation','compat-astro-direct-synastry':'astro-direct-synastry','compat-astro-synastry':'astro-celebrity-synastry'};
const titles={astro_basic_deep_pack:'기본 심층 패키지',astro_career_talent_deep:'커리어·재능',astro_growth_shadow_deep:'과제와 변화',astro_stellar_career_room:'일과 역할',astro_stellar_relationship_room:'관계와 사랑',astro_stellar_growth_room:'성장과 내면',astro_stellar_talent_room:'재능과 끌림',astro_talent_attraction_deep:'재능·매력',astro_relationship_deep:'관계·궁합',astro_yearly_transit:'앞으로 12개월',astrology_ai_prompt_generator:'점성술 질문 AI 상담','compat-astro-direct-synastry':'상대 직접 입력 시나스트리','compat-astro-synastry':'유명인 시나스트리'};
export function mountAstroCraftedDetails(area){
 if(!/^ko\b/i.test(document.documentElement.lang||'ko'))return;
 // The legacy shell can be replaced after its presentation script first loads.
 window.BasicFortunePresentation?.init?.();
 if(!document.getElementById('astroCraftedDetailStyles')){
  const style=document.createElement('style');style.id='astroCraftedDetailStyles';
  style.textContent='.astro-crafted{margin:16px 0;border:1px solid #b5a28b;border-radius:12px;color:#f8eddb;background:#252b41;overflow:hidden}.astro-crafted>summary{padding:16px;cursor:pointer;min-height:48px;line-height:1.6}.astro-crafted .craftedDetail{max-width:540px;margin:auto;color:#39364a;background:#f5f0e6}.astro-crafted .craftedDetail img{display:block;width:100%;height:auto}.astro-crafted .craftedDetailNotice,.astro-crafted .craftedDetailTranscript{padding:16px;color:#39364a;font-size:16px;line-height:1.8}.astro-crafted .craftedDetailTranscript p{white-space:pre-line;color:#39364a}.astro-crafted .craftedDetailTranscript h3{color:#39364a}.astro-crafted [role=status]{padding:16px}@media(max-width:600px){#astroResult .astro-crafted{margin-inline:-10px}#astroResult .astro-stellar-archive .astro-crafted{margin-inline:-25px}}';
  document.head.append(style);
 }
 for(const [key,id] of Object.entries(products)){
  if(area.querySelector('[data-astro-crafted="'+key+'"]'))continue;
  const target=key==='compat-astro-direct-synastry'?area.querySelector('.astro-compat-panel--direct'):key==='compat-astro-synastry'?area.querySelector('#astroSynastrySection'):key==='astrology_ai_prompt_generator'?area.querySelector('#astroAiPromptSection'):key==='astro_basic_deep_pack'?area.querySelector('[data-astro-server-detail]'):area.querySelector('#astroPaidGate_'+key);
  if(!target)continue;
  const disclosure=document.createElement('details');disclosure.className='astro-crafted';disclosure.dataset.astroCrafted=key;
  const summary=document.createElement('summary');summary.textContent=titles[key]+' 상세 안내';
  const host=document.createElement('div');disclosure.append(summary,host);
  // Keep illustrated guides out of the nested paid-section padding on small screens.
  if(target.parentElement?.classList.contains('astro-stellar-archive__grid')){
   // The guide uses the surrounding modal width; avoid clipping its outer image margins.
   target.parentElement.parentElement.style.overflow='visible';
   const group=document.createElement('div');group.style.minWidth='0';group.style.gridColumn='1 / -1';target.before(group);group.append(disclosure,target);
  }else {
   const anchor=target.closest('.astro-counsel-section, .as-year')||target;
   const pair=document.createElement('div');pair.className='astro-crafted-pair';pair.style.display='contents';
   anchor.before(pair);pair.append(disclosure,anchor);
  }
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
