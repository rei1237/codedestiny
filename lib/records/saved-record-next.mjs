// /records/view 의 "다음 행동" 투영. 기록 메타데이터(출처·상태·상품 키)만 읽고
// 저장 본문·질문·기록 ID 는 보지 않는다. 재열람은 저장 원본 그대로이며 결제·차감·생성이 없다.
export const COMPLETE_RECORD_STATUSES = Object.freeze(['completed', 'saved', 'conversation']);

// 무료 기능은 실제로 열리는 기존 진입점만 쓴다(/saju/free/, /ziwei/chart/, 꿀꿀 셸의 무료 카드 액션).
const FREE_FEATURES = Object.freeze({
  saju: Object.freeze({ href: '/saju/free/', service: 'saju', label: '무료 만세력 보기' }),
  ziwei: Object.freeze({ href: '/ziwei/chart/', service: 'ziwei', label: '무료 자미두수 명반 보기' }),
  vedic: Object.freeze({ href: '/ggulggul/?action=cdHomeVedicEntry', service: 'vedic', label: '무료 베다 하늘 지도 보기' }),
  astrology: Object.freeze({ href: '/ggulggul/?action=cdHomeAstroEntry', service: 'astrology', label: '무료 출생 차트 보기' }),
  sukuyo: Object.freeze({ href: '/ggulggul/?action=cdHomeSukuyoEntry', service: 'sukuyo', label: '무료 본명숙 보기' }),
  tarot: Object.freeze({ href: '/ggulggul/?action=cdHomeTarotEntry', service: 'tarot', label: '무료 카드 세 장 뽑기' }),
});
const FREE_BY_SOURCE = Object.freeze({
  ziwei: 'ziwei', 'ziwei-deep': 'ziwei', vedic: 'vedic', nakshatra: 'vedic',
  astrology: 'astrology', 'sukuyo-compat': 'sukuyo',
});

export function isCompleteRecord(record) {
  return Boolean(record) && COMPLETE_RECORD_STATUSES.includes(record.status);
}

// 완료 결과에만 무료 기능 1개. 그 밖의 출처는 무료 만세력으로 둔다.
export function savedRecordFreeFeature(record) {
  if (!isCompleteRecord(record)) return null;
  return FREE_FEATURES[FREE_BY_SOURCE[record.source] || 'saju'];
}

// 영냥이 완료 결과(ResultBridge)용. 상담 체계(domain) 기준이며 융합·미지정은 무료 만세력.
export function freeFeatureForDomain(domain) {
  return FREE_FEATURES[Object.hasOwn(FREE_FEATURES, domain) ? domain : 'saju'];
}

// fortune_result_view(entry_source=library) 파라미터. 완료·부분 저장만 열람으로 센다.
// 생성 중·실패·환불·취소는 열람이 아니다. item_id 는 공개 상품 키 형식일 때만 싣는다.
export function savedRecordViewEvent(record) {
  if (!record) return null;
  const resultState = isCompleteRecord(record) ? 'complete' : record.status === 'partial' ? 'partial' : '';
  const item = String(record.serviceId || '');
  if (!resultState || !/^[a-zA-Z0-9_-]{1,100}$/.test(item)) return null;
  return { item_id: item, result_state: resultState, entry_source: 'library', observation: 'browser_render', metric_version: 2 };
}
