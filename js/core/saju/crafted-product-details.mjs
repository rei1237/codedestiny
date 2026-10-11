import {renderCraftedDetail} from '../../feature-detail-panels.mjs';

// Optional authored content has no access to chart calculations or purchase state.
const products={section_summary:'saju-summary',section_daewun:'saju-daewun','compat-saju-compatibility':'saju-compatibility'};
function mount(el){
 const staticKey=el.getAttribute('data-saju-static-offer');
 const id=products[staticKey||el.getAttribute('data-saju-offer')];
 if(!id||!(staticKey?/^ko\b/i.test(document.documentElement.lang||'ko'):el.dataset.readingLocale?.startsWith('ko:'))||el.querySelector('.saju-crafted-offer'))return;
 const disclosure=document.createElement('details');
 disclosure.className='saju-crafted-offer';
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
