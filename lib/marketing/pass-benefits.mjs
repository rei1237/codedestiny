import { passFishCoverage } from '../payment/pass-fish-coverage.js';
import { CURRENT_PASS_PLANS } from '../payment/pass-policy.js';
import lightFortunes from '../payment/light-fortunes.generated.json' with {type:'json'};

const won = value => value.toLocaleString('ko-KR') + '원';
// Display only: the purchase flow always reloads the server catalog before payment.
export function passBenefitOffers() {
  return Object.values(CURRENT_PASS_PLANS).map(p => ({
    id:p.tier, name:p.name, price:p.wonPrice, value:lightFortunes.valueKRW+p.monthlyLimitCoin*100,
    lightValue:lightFortunes.valueKRW, consultLimit:p.monthlyLimitCoin*100,
    cap:p.maxCoveredCoin*100, family:p.tier==='family',
    art:'/assets/yeoni/honey-passes/'+p.tier+'-honey-pass-v1.webp',
    href:'/points/?source=flower-membership&plan='+p.tier
  }));
}

// Native radio controls keep the approved comparison interaction available without JS.
// All values are trusted registry data; ids are caller-owned static strings.
const passCta = (p, panelId) => `<a class="pb__cta" href="${p.href}" aria-labelledby="${panelId}-title ${panelId}-action"><span id="${panelId}-action" data-cd-trans="featureMarketing.points.fallbackCta">이용권 확인하기</span> <span aria-hidden="true">→</span></a>`;

function passDialogue(host, id) {
  const count = lightFortunes.count;
  const lines = host === 'yeongnyangi' ? [
    ['영냥이', `작은 꿀단지에도 라이트 운세 ${count}종이 들어 있어. 궁금한 운세부터 골라 봐.`],
    ['연이', '사주부터 타로까지, 아래 목록에서 마음이 가는 운세를 찾아보세요.'],
    ['영냥이', '전문가 상담은 한도도 봐. 꿀단지를 고르면 아래에서 바로 확인할 수 있어.'],
  ] : [
    ['연이', `작은 꿀단지 하나면 라이트 운세 ${count}종이 모두 열려요.`],
    ['영냥이', '어떤 운세가 들었는지 궁금하지? 아래 목록을 펼쳐 봐.'],
    ['연이', '전문가 상담은 꿀단지마다 이용 한도가 달라요. 하나씩 골라 비교해 보세요.'],
  ];
  return `<cd-pass-duet class="pb__scene" data-cd-korean-only>
    <h2 id="${id}-title">문라이트 패스</h2>
    <div class="pb__banner" aria-live="off">${lines.map(([speaker, line], index) =>
      `<div class="pb__line" aria-hidden="${index !== 0}"><b>${speaker}</b><p>${line}</p></div>`).join('')}</div>
    <img class="pb__art" src="/images/home/moonlight-pass-duet.webp" width="560" height="560" alt="연이가 꿀을 들어 올리고 영냥이가 꿀단지를 받쳐 들고 있어요" loading="lazy" decoding="async">
    <div class="pb__controls" hidden><button type="button" data-prev aria-label="이전 대사">←</button>
      <span data-position>1 / ${lines.length}</span><button type="button" data-next aria-label="다음 대사">→</button>
      <button type="button" data-play>일시 정지</button></div>
  </cd-pass-duet>`;
}

export function renderPassBenefits(kind, id, { host = 'ggulggul' } = {}) {
  const offers = passBenefitOffers();
  return `<section class="pb pb--${kind}" aria-labelledby="${id}-title" data-pass-benefits="${kind}">
    ${passDialogue(host, id)}
    <fieldset class="pb__selection"><legend>어떤 꿀단지를 열어 볼까요?</legend>
      <div class="pb__choices">${offers.map((p,i)=>`<label class="pb__choice"><input type="radio" name="${id}" value="${i}" ${i===0?'checked':''} aria-controls="${id}-panel-${i}">
        <img src="${p.art.replace(/\.webp$/,'-96.webp')}" width="48" height="48" loading="lazy" alt="">
        <strong>${p.name}</strong><span>${won(p.price)}</span></label>`).join('')}</div>
    </fieldset>
    ${offers.map((p,i)=>`<div class="pb__detail pb__detail--${i}" id="${id}-panel-${i}">
      <div class="pb__offer"><div><h3 id="${id}-panel-${i}-title">${p.name}</h3><div class="pb__prices"><strong>${won(p.price)}</strong></div></div>
        ${passCta(p, id + '-panel-' + i)}</div>
      <ul class="pb__includes"><li>라이트 운세 ${lightFortunes.count}종 횟수 제한 없이</li><li><span>전문가 상담 이용 한도</span> <b>${won(p.consultLimit)}</b></li></ul>
      <details class="pb__conditions"><summary>적용 범위와 이용 조건</summary>
        <p>대표 상담을 제외한 라이트 운세를 횟수 제한 없이 이용하세요. 중간·큰·패밀리 꿀단지에도 똑같이 포함돼요.</p>
        <p>${p.family?'(건당 금액 상한 없음)':`(건당 ${won(p.cap)} 이하)`}</p>
        <p><strong>꿀꿀운세와 영냥이 어디서나</strong><br>한도 안에서 건당 상한 이하 상담이면 어느 사이트든 쓸 수 있어요.</p>
        <p class="pb__coverage"><strong>${passFishCoverage(p.id).reachLabel}</strong><br>상품별 적용·제외 조건과 잔여 한도 안에서 이용할 수 있어요.</p>
${p.family?'':'        <p>건당 '+won(p.cap)+'을 넘는 대표 상담은 이 꿀단지로 이용할 수 없어요.</p>'}
        <p>상담 한도를 다 써도 라이트 운세는 계속 이용할 수 있어요.</p>
        <p>별도 이용 기간 없음 · 자동 갱신 없음</p>
        <div class="pb__comparison"><span>단건 결제 기준 이용 가치</span> <s>${won(p.value)}</s> · <strong>최대 ${Math.floor((1-p.price/p.value)*100)}% 절약</strong>
          <p><span>라이트 운세 ${lightFortunes.count}종 횟수 제한 없이</span> · <span>${won(p.lightValue)} 상당</span></p>
          <p>최대 ${won(p.value-p.price)} 절약</p>
          <p class="pb__terms">라이트 운세 각 1회와 상담 한도를 모두 이용했을 때의 단건 가격 비교예요.</p></div>
      </details>
    </div>`).join('')}
    <details class="pb__light-list"><summary>포함된 라이트 운세 ${lightFortunes.count}종 보기</summary><ul data-cd-korean-only>${lightFortunes.keys.map(key=>`<li>${lightFortunes.labels[key]}</li>`).join('')}</ul></details>
    <a class="pb__revision" href="/terms/#terms-revision">이용권 규칙이 바뀌었어요. 약관 개정 안내 보기</a>
  </section>`;
}
