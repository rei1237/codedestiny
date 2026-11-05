import { CURRENT_PASS_PLANS } from '../payment/pass-policy.js';
import { listServicePackPlans } from '../../worker/payments/service-pack-policy.js';
import lightFortunes from '../payment/light-fortunes.generated.json' with {type:'json'};

const won = value => value.toLocaleString('ko-KR') + '원';
const fishNames = {mackerel:'고등어',salmon:'연어',flounder:'광어',tuna:'참치'};
// Display only: the purchase flow always reloads the server catalog before payment.
export function passBenefitOffers(kind) {
  return kind === 'fish' ? listServicePackPlans().map(p => ({
    id:p.planId, name:fishNames[p.fishId], price:p.priceKRW, value:p.unitPriceKRW*p.totalUses,
    uses:p.totalUses, days:p.validityDays, unit:p.unitPriceKRW,
    art:'/assets/yeongnyangi/service-packs/'+p.fishId+'-gift-set-v2.webp',
    href:'/points/?pack='+p.planId+'#fish-packs'
  })) : Object.values(CURRENT_PASS_PLANS).map(p => ({
    id:p.tier, name:p.name, price:p.wonPrice, value:lightFortunes.valueKRW+p.monthlyLimitCoin*100,
    lightValue:lightFortunes.valueKRW, consultLimit:p.monthlyLimitCoin*100,
    cap:p.maxCoveredCoin*100, family:p.tier==='family',
    art:'/assets/yeoni/honey-passes/'+p.tier+'-honey-pass-v1.webp',
    href:'/points/?source=flower-membership&plan='+p.tier
  }));
}

// Native radio controls keep the approved comparison interaction available without JS.
// All values are trusted registry data; ids are caller-owned static strings.
export function renderPassBenefits(kind, id) {
  const fish=kind==='fish', offers=passBenefitOffers(kind), first=offers[0];
  return `<section class="pb pb--${kind}" aria-labelledby="${id}-title" data-pass-benefits="${kind}">
    <div class="pb__intro"><div><h2 id="${id}-title">${fish?'영냥이 전용 이용권':'문라이트 패스(꿀꿀운세 이용권)'}</h2>
      <p>${fish?'사주부터 타로까지, 내 마음에 맞는 상담을 골라요.':'사주·타로·연애·인생 리포트, 필요한 순간에 꺼내 보세요.'}</p>
      </div>
      <div class="pb__portrait"><img src="${fish?'/assets/yeongnyangi/original/hero-480.webp':'/images/home/yeoni-pass-cutout-v1.webp'}" width="480" height="480" alt="${fish?'생선 꾸러미를 소개하는 영냥이':'이용권을 들고 있는 꽃돼지 연이'}" loading="lazy">
      <p><strong>${fish?'생선 꾸러미, 골라볼래?':'문라이트 패스!'}</strong><span>${fish?'너의 이야기를 더 들려줘.':'나에게 맞는 꿀단지를 골라 보세요.'}</span></p></div></div>
    ${fish?'':`<p class="pb__banner"><strong>작은 꿀단지 하나면, 라이트 운세 ${lightFortunes.count}종이 전부 열려요.</strong><span>대표 상담을 제외한 라이트 운세를 횟수 제한 없이 이용하세요. 중간·큰·패밀리 꿀단지에도 똑같이 포함돼요.</span><a class="pb__revision" href="/terms/#terms-revision">이용권 규칙이 바뀌었어요. 약관 개정 안내 보기</a></p>`}
    <fieldset class="pb__selection"><legend>${fish?'마음에 드는 생선 꾸러미를 골라요.':'어떤 꿀단지를 열어 볼까요?'}</legend>

      <div class="pb__choices">${offers.map((p,i)=>`<label class="pb__choice"><input type="radio" name="${id}" value="${i}" ${i===0?'checked':''} aria-controls="${id}-panel-${i}"><img src="${p.art}"${fish?'':` srcset="${p.art.replace(/\.webp$/,'-96.webp')} 96w, ${p.art.replace(/\.webp$/,'-192.webp')} 192w" sizes="48px"`} alt="" width="240" height="240" loading="lazy"><strong>${p.name}</strong><span>${won(p.price)}</span><small class="pb__idle">고르기</small><small class="pb__chosen">선택 중</small></label>`).join('')}</div>
    </fieldset>
      ${offers.map((p,i)=>`<div class="pb__detail pb__detail--${i}" id="${id}-panel-${i}">
        <div class="pb__offer-title"><h3>${p.name}${fish?' 상담 '+p.uses+'회':''}</h3><strong>${fish?'':'최대 '}${Math.floor((1-p.price/p.value)*100)}% 절약</strong></div>
        <div class="pb__prices"><div><span>${fish?'단건으로 '+p.uses+'회 이용하면':'단건 결제 기준 이용 가치'}</span><s>${won(p.value)}</s></div><div><span>${fish?'전용 이용권으로 '+p.uses+'회':'이용권 구매 가격'}</span><strong>${won(p.price)}</strong></div></div>${fish?'':`<ul class="pb__includes"><li><span><span aria-hidden="true">✓</span> <span>라이트 운세 ${lightFortunes.count}종 횟수 제한 없이</span></span><strong>${won(p.lightValue)} 상당</strong></li><li><span><span aria-hidden="true">✓</span> <span>전문가 상담 이용 한도</span></span><strong><span>${won(p.consultLimit)}</span> <small>${p.family?'(건당 금액 상한 없음)':`(건당 ${won(p.cap)} 이하)`}</small></strong></li></ul><p class="pb__terms">라이트 운세 각 1회와 상담 한도를 모두 이용했을 때의 단건 가격 비교예요.</p>`}
        <details class="pb__conditions"><summary>적용 범위와 이용 조건</summary>      <p class="pb__scope"><strong>${fish?'영냥이 사이트 전용 이용권':'패밀리는 꿀꿀운세 + 영냥이 공통'}</strong><br>${fish?'꿀꿀운세에서는 사용할 수 없어요.':'작은·중간·큰 꿀단지는 꿀꿀운세에서 사용해요.'}</p>
      <p class="pb__upgrade">${fish?'가격 그대로 · <strong>'+first.uses+'회 · '+first.days+'일</strong>':'<strong>기간 제한 없이, 내 속도대로.</strong> <br>상담 한도를 다 써도 라이트 운세는 계속 이용할 수 있어요.'}</p><p class="pb__saving"><span>${fish?'1회당 '+won(p.price/p.uses):p.family?'건당 금액 상한 없음':'건당 '+won(p.cap)+' 이하 대상 서비스'}</span><strong>${fish?'총':'최대'} ${won(p.value-p.price)} 절약</strong></p>${fish?'<p class="pb__terms">'+p.uses+'회를 모두 이용했을 때의 비교예요. 단건 1회 '+won(p.unit)+' 기준.</p>':p.family?'':'<p class="pb__terms">건당 '+won(p.cap)+'을 넘는 대표 상담은 이 꿀단지로 이용할 수 없어요.</p>'}
        <p class="pb__coverage"><strong>${fish?'영냥이 사이트에서만 사용':p.family?'꿀꿀운세 + 영냥이, 두 사이트 공통':'꿀꿀운세에서 사용'}</strong><br>${fish?'같은 생선 등급의 사주·자미두수·숙요점·베다점·서양 점성술·타로. 다른 생선과 융합 상담은 제외돼요.':'상품별 적용·제외 조건과 잔여 한도 안에서 이용할 수 있어요.'}</p>
        <p class="pb__terms">${fish?'결제 확인 후 '+p.days+'일 · 선물은 수령 후 '+p.days+'일 · 자동 갱신 없음':'별도 이용 기간 없음 · 자동 갱신 없음'}</p>
        </details><a class="pb__cta" href="${p.href}">${p.name}${fish?' '+p.uses+'회':''} 이용권 확인하기 <span aria-hidden="true">→</span></a>

      </div>`).join('')}
    ${fish?'':`<details class="pb__light-list"><summary>포함된 라이트 운세 ${lightFortunes.count}종 보기</summary><ul data-cd-korean-only>${lightFortunes.keys.map(key=>`<li>${lightFortunes.labels[key]}</li>`).join('')}</ul></details>`}
    <details class="pb__bridge"><summary>다른 서비스 이용권도 살펴보기</summary><p><strong>${fish?'두 사이트를 모두 이용하고 싶다면':'영냥이만 자주 찾는다면'}</strong><br>${fish?'패밀리 꿀단지는 꿀꿀운세 + 영냥이 공통 이용권이에요.':'영냥이 전용 이용권은 별도 상품이에요. 꿀꿀운세에서는 사용할 수 없어요.'}</p><a href="${fish?'/points/?plan=family':'/yeongnyangi/#home-fish-pass-title'}">${fish?'패밀리 혜택 보기':'영냥이 이용권 보기'} →</a></details>
  </section>`;
}
