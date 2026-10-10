import {renderCraftedDetail} from '../../feature-detail-panels.mjs';

// Optional authored content has no access to chart calculations or purchase state.
const products={section_summary:'saju-summary',section_daewun:'saju-daewun'};
function mount(el){
 const id=products[el.getAttribute('data-saju-offer')];
 if(!id||!el.dataset.readingLocale?.startsWith('ko:')||el.querySelector('.saju-crafted-offer'))return;
 const disclosure=document.createElement('details');
 disclosure.className='saju-crafted-offer';
 disclosure.innerHTML='<summary>상세 안내 자세히 보기</summary><div data-crafted-host></div>';
 el.append(disclosure);
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
