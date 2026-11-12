// 2026-11-12 사용자 결정: 무료 운세 3개월 홍보. 표시 전용 정본이다.
// 🔴 endsAt 은 배너 문구·D-N 표시에만 쓴다. 접근 판정·가격·결제·이용권에 쓰지 않는다
//    (자동 유료 전환 없음). 무료 범위의 정본은 lib/payment/free-fortune-policy.mjs 다.
// 정적 셸 배너(templates/home-funnel.html → index.html)와 React 배너(app/components/FreePromoBanner.tsx)가
// 이 파일 하나를 읽는다. 다른 언어 문구는 i18n/authored/freePromo-01.json (ko 는 여기와 같아야 한다).
export const FREE_PROMO = Object.freeze({
  id: 'free-fortune-3m-20270212',
  endsAt: '2027-02-12T23:59:59+09:00',
  ctaHref: '/ggulggul/#cdQuickServices',
  sharePath: '/?utm_source=share&utm_medium=free_promo&utm_campaign=free_3m',
});

export const FREE_PROMO_COPY_KO = Object.freeze({
  badge: '3개월 한정',
  title: '지금만 전부 무료',
  until: '2027년 2월 12일 이후 유료 전환 예정',
  note: '만세력·자미두수·별자리 등 기본 풀이가 대상이에요. AI 상담과 라이트 사주·대운 풀이는 제외돼요.',
  cta: '무료 운세 보러 가기',
  share: '친구에게도 무료일 때 알려주기',
  shareText: '만세력·자미두수·별자리 풀이를 지금 무료로 볼 수 있어요. 2027년 2월 12일 이후 유료 전환 예정이에요.',
  copied: '링크를 복사했어요. 친구에게 붙여 넣어 보내 주세요.',
  copyFailed: '링크를 복사하지 못했어요. 주소창의 링크를 복사해 주세요.',
  tileBadge: '3개월 한정 무료',
});

// 한국 시간 달력 기준으로 남은 날 수. 마감 당일 0, 마감 뒤 null.
// 정적 셸이 Function#toString 으로 같은 본문을 인라인하므로 ES5 문법만 쓴다.
export function freePromoDaysLeft(endsAt, now) {
  var end = Date.parse(endsAt);
  var t = now == null ? Date.now() : Number(now);
  if (!(end > 0) || !(t > 0) || t > end) return null;
  var KST = 9 * 3600000, DAY = 86400000;
  return Math.floor((end + KST) / DAY) - Math.floor((t + KST) / DAY);
}

export function freePromoDayLabel(days) {
  if (days == null) return '';
  return days === 0 ? 'D-DAY' : 'D-' + days;
}
