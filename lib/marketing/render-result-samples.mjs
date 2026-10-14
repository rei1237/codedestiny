import samples from './result-samples.json' with {type:'json'};

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/** @param {{ids?:string[], compact?:boolean, prefix?:string, overviewHref?:string}} options */
export function renderResultSamples({ids=[], compact=false, prefix='result-samples', overviewHref=''}={}) {
  const selected=ids.length?samples.filter(item=>ids.includes(item.id)):samples;
  const overviewLink=overviewHref?`<a class="result-samples__overview" href="${escape(overviewHref)}">상담 결과 전체 미리보기 <span aria-hidden="true">→</span></a>`:'';
  const itemHtml=item=>`<article class="result-sample" id="${escape(prefix+'-'+item.id)}">${item.visual?`
    <a class="result-sample__visual" href="${escape(item.href)}" tabindex="-1" aria-hidden="true"><img src="${escape(item.visual)}" width="1200" height="675" sizes="(max-width:700px) calc(100vw - 32px), 560px" loading="lazy" decoding="async" alt=""/></a>`:''}
    <div class="result-sample__content"><div class="result-sample__intro"><h3>${escape(item.title)}</h3><p class="result-sample__question">${escape(item.question)}</p></div>
      <blockquote>${escape(item.excerpts[0])}</blockquote><p class="result-sample__receives">${escape(item.receives)}</p>
      <details class="result-sample__details"><summary>${item.kind==='result'?'결과 예시 펼쳐보기':'리포트 구성 미리보기'}<span aria-hidden="true">＋</span></summary>
        <div class="result-sample__body"><p class="result-sample__note">${item.kind==='result'?'가상 프로필로 생성한 AI 상담 결과의 일부예요. 실제 고객 후기가 아니며, 질문과 선택한 상품에 따라 결과가 달라져요.':'서비스 구성 안내예요. 개인별로 생성된 결과 예시는 아니에요.'}</p>
        ${item.excerpts.map(text=>`<p>${escape(text)}</p>`).join('')}
        ${item.kind==='result'?`<a class="result-sample__image-link" href="${escape(item.image)}" target="_blank" rel="noopener" aria-label="${escape(item.title)} 도식 예시 크게 보기 (새 창)"><img src="${escape(item.image)}" width="1080" height="1350" loading="lazy" decoding="async" alt="${escape(item.title)}의 ${escape(item.receives)} 결과 도식 예시"/><span>도식 크게 보기</span></a>`:''}</div>
      </details><a class="result-sample__cta" href="${escape(item.href)}">${escape(item.title)} 상담 알아보기 <span aria-hidden="true">→</span></a></div>
  </article>`;
  return `<section class="result-samples${compact?' result-samples--compact':''}" lang="ko" aria-label="상담 결과 미리보기"><header class="result-samples__heading"><h2>내 고민에는 어떤 상담이 맞을까요?</h2><p>결제 전에 답변의 깊이와 구성을 먼저 살펴보세요.</p>${overviewLink}</header>${['대표 상담','영냥이 상담'].map(group=>{const rows=selected.filter(item=>item.group===group);return rows.length?`<section class="result-samples__group" aria-label="${group}">${!compact?`<h3 class="result-samples__group-title">${group}</h3>`:''}<div class="result-samples__grid">${rows.map(itemHtml).join('')}</div></section>`:'';}).join('')}</section>`;
}
