import {renderCraftedDetail} from '../../feature-detail-panels.mjs';

// Optional authored content has no access to chart calculations or purchase state.
const products={"tarot-myeongri-three-card":"myeongri-tarot-three","physiognomy-ogwan-mole-deep":"physiognomy-ogwan","physiognomy-compatibility":"physiognomy-compat","physiognomy-pastlife-compatibility":"physiognomy-pastlife","premium-sibyl-dominator":"sibyl-dominator","fun.quantumLotto.ritualReport":"moon-lucky-ritual",saju_ai_question_prompt:"saju-question-ai",ziwei_symbolic_layer:"ziwei-symbolic",ziwei_decade_luck:"ziwei-decade",ziwei_love_deep:"ziwei-spouse",ziwei_life_yearly_flow:"ziwei-life-yearly",ziwei_twelve_palaces:'ziwei-twelve-palaces',ziwei_ai_prompt_generator:'ziwei-question-ai',section_summary:'saju-summary',section_daewun:'saju-daewun','compat-saju-compatibility':'saju-compatibility','compat-sukuyo-compatibility':'sukuyo-compatibility','premium-sukuyo-compat-extra':'sukuyo-compatibility-precision','compat-ziwei-compatibility':'ziwei-compatibility','sukuyo-nature-deep-dive':'sukuyo-nature','sukuyo-relationship-encyclopedia':'sukuyo-encyclopedia','sukyo_yearly_fortune_unlock':'sukuyo-yearly','sukuyo-extreme-t-relationship':'extreme-t-relationship','sukuyo-past-life-reading':'sukuyo-bond-radar','sukuyo_ai_prompt_generator':'sukuyo-question-ai'};
function mount(el){
 const staticKey=el.getAttribute('data-crafted-static-offer')||el.getAttribute('data-saju-static-offer');
 const id=products[staticKey||el.getAttribute('data-saju-offer')];
 if(!id||!(staticKey?/^ko\b/i.test(document.documentElement.lang||'ko'):el.dataset.readingLocale?.startsWith('ko:'))||el.querySelector('.saju-crafted-offer'))return;
 const modalOffer=el.hasAttribute('data-crafted-static-offer')||staticKey==='compat-ziwei-compatibility';
 if(modalOffer)window.BasicFortunePresentation?.init?.();
 const disclosure=document.createElement('details');
 disclosure.className=modalOffer?'saju-crafted-offer saju-crafted-offer--modal':staticKey==='sukuyo-extreme-t-relationship'?'saju-crafted-offer saju-crafted-offer--contained':'saju-crafted-offer';
 disclosure.innerHTML='<summary>상세 안내 자세히 보기</summary><div data-crafted-host></div>';
 const oldPreview=staticKey?el.querySelector('.compat-preview__grid'):null;
 if(oldPreview)oldPreview.before(disclosure);else el.append(disclosure);
 const host=disclosure.querySelector('[data-crafted-host]');
 let loading=false;
 disclosure.addEventListener('toggle',async()=>{
  if(!disclosure.open||disclosure.dataset.loaded||loading)return;
  loading=true;
  try{
   const response=await fetch('/feature-details/crafted/'+id+'/manifest.json');
   if(!response.ok)throw new Error('DETAIL_UNAVAILABLE');
   const detail=await response.json();
   if(!disclosure.isConnected)return;
   host.innerHTML=renderCraftedDetail(detail);
   disclosure.dataset.loaded='true';
   if(oldPreview)oldPreview.remove();
  }catch{
   host.textContent='상세 안내를 불러오지 못했어요. 접었다 다시 펼쳐 주세요.';
  }finally{loading=false;}
 });
 host.addEventListener('error',event=>{
  if(event.target instanceof HTMLImageElement){
   const transcript=host.querySelector('.craftedDetailTranscript');
   if(transcript)transcript.open=true;
  }
 },true);
}
document.querySelectorAll('[data-saju-offer]').forEach(el=>{
 const observer=new MutationObserver(()=>mount(el));
 observer.observe(el,{childList:true,attributes:true,attributeFilter:['data-reading-locale']});
 mount(el);
});

document.querySelectorAll('[data-saju-static-offer]').forEach(mount);

export {mount as mountCraftedStaticOffer};
