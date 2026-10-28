import samples from './result-samples.json' with {type:'json'};
import {renderConsultationSampleGuide} from '../../js/consultation-sample-guide.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/** @param {{ids?:string[], compact?:boolean, mode?:'comparison'|'detail', prefix?:string, overviewHref?:string}} options */
export function renderResultSamples({ids=[], compact=false, mode=ids.length?'detail':'comparison', prefix='result-samples', overviewHref=''}={}) {
  const selected=ids.length?samples.filter(item=>ids.includes(item.id)):samples;
  const detail=mode==='detail';
  const itemHtml=item=>{
    const image=item.visual?'<figure class="result-sample__visual"><img src="'+escape(item.visual)+'" width="1200" height="800" sizes="(max-width:700px) calc(100vw - 40px), 480px" loading="lazy" decoding="async" alt="'+escape(item.visualAlt||item.title)+'"/></figure>':'';
    const guide = item.guide;
    const intro = '<p class="result-sample__master">'+escape(item.master)+'</p><h3>'+escape(item.title)+'</h3><p class="result-sample__question">'+escape(item.question)+'</p>';
    const receives = '<p class="result-sample__receives">'+escape(item.receives)+'</p>';
    const legacyExample = !guide ? '<details class="result-sample__details"><summary>결과 예시 펼쳐보기</summary><p class="result-sample__note">가상 프로필로 생성한 AI 상담 결과의 일부예요. 실제 고객 후기가 아니며, 질문과 선택한 상품에 따라 결과가 달라져요.</p>'+item.excerpts.map(p=>'<p>'+escape(p)+'</p>').join('')+'<a class="result-sample__image-link" href="'+escape(item.image)+'" target="_blank" rel="noopener">도식 예시 크게 보기 (새 창)</a></details>' : '';
    const preview = guide ? '<p class="result-sample__audience">'+escape(guide.audience)+'</p><ul class="result-sample__includes">'+(item.comparisonContents || guide.outline.slice(0,3).map(row=>row.title)).map(title=>'<li>'+escape(title)+'</li>').join('')+'</ul>' : '<p>'+escape(item.excerpts[0])+'</p>';
    return '<article class="result-sample'+(item.id==='neo'?' result-sample--neo':'')+'" data-consultation-item="'+escape(item.slug || item.id)+'" id="'+escape(prefix+'-'+item.id)+'">'+image+'<div class="result-sample__content">'+intro+receives+(!detail?preview:'')+legacyExample+
      '<a class="result-sample__cta" href="'+escape(item.href)+'">'+escape(item.title)+' 상담 알아보기 <span aria-hidden="true">→</span></a></div>'+
      (detail&&guide?'<div class="result-sample__full">'+renderConsultationSampleGuide(guide)+'</div>':'')+'</article>';
  };
  const groups=detail ? '<div class="result-samples__grid">'+selected.map(itemHtml).join('')+'</div>' : ['대표 상담','영냥이 상담'].map(group=>{
    const rows=selected.filter(item=>item.group===group);
    return rows.length?'<section class="result-samples__group" aria-label="'+group+'"><h2 class="result-samples__group-title">'+(group==='대표 상담'?'나의 고민에 맞는 일곱 가지 상담':'영냥이와 살펴보는 운세')+'</h2><div class="result-samples__grid">'+rows.map(itemHtml).join('')+'</div></section>':'';
  }).join('');
  return '<section class="result-samples'+(compact?' result-samples--compact':'')+(detail?' result-samples--detail':'')+'" lang="ko" aria-label="상담 구성과 결과 예시">'+
    (detail?'<header class="result-samples__heading"><h2>상담에서 어떤 내용을 받나요?</h2><p>구성과 예시를 읽고, 나의 질문을 준비해 보세요.</p></header>':'')+groups+
    (overviewHref?'<a class="result-samples__overview" href="'+escape(overviewHref)+'">상담별 구성과 예시 보기</a>':'')+'</section>';
}
