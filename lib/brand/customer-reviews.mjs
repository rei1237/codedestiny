// 네오 1:1 상담 이용자가 카카오톡으로 남긴 후기. 출처: 네오 블로그 neosaju/224032671570 의 캡처 이미지.
// 게시 동의는 블로그 게시 때 받았다(사용자 확인 2026-10-01). 문구는 이미지와 3회 대조한 원문 그대로다.
// - 말풍선 하나 = 고객 메시지 하나. "\n" 은 고객이 넣은 줄바꿈이다.
// - 원문의 말줄임은 고객이 친 마침표("..")를 그대로 두고, 우리가 생략한 자리는 U+2026 "…" 하나로만 표시한다.
// - 문장을 고치거나 순서를 바꾸거나 합치지 않는다. 바꾸면 __tests__/ui/customer-reviews.test.mjs 의 해시가 실패한다.
// - postedAt 은 대화 날짜가 아니라 블로그 이미지 업로드일이다(이미지 URL 경로로 확인).
// - evidence 는 검수용이며 화면에 내보내지 않는다(원문 글에 이 서비스가 쓰지 않는 표현이 남아 있다).
// 이 후기는 사람 1:1 상담에 대한 것이다. 천원 상담(계산 엔진 + AI 해설)과 같은 상품이 아니므로
// 노출하는 곳마다 그 차이를 알리는 고지를 함께 둔다.
const POST = 'neosaju/224032671570';

export const CUSTOMER_REVIEWS = Object.freeze([
  {id: 'kakao-010', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-29', consent: true, visible: true, featured: false, evidence: {post: POST, image: 10},
    bubbles: ['제가 너무 단답형이었어서 죄송했습니다. 선생님 조언 깊이 새기며 잘 결정하겠습니다. 오늘 상담 너무 감사했습니다.']},
  {id: 'kakao-015', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-29', consent: true, visible: true, featured: false, evidence: {post: POST, image: 15},
    bubbles: ['말씀 덕분에 많이 생각이 정리 되었습니다 감사합니다!']},
  {id: 'kakao-016', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-29', consent: true, visible: true, featured: false, evidence: {post: POST, image: 16},
    bubbles: ['그냥 그 말한마디가... 응원이 되는것 같아요. 감사해요. …']},
  {id: 'kakao-024', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: true, evidence: {post: POST, image: 24},
    bubbles: ['…뭐랄까 이렇게까지 제 삶에 대해 방향성을 제시해주고 노력하라고 말해준분이 거의 처음이셔서 정말 뭐라 감사드려야할지 모르겠네요.\n\n현실적인 조언과 좋은 말 해주신만큼 꼭 정신차리고 잘 살아보도록 노력하겠습니다. …\n\n이번상담이 저에게 있어 앞으로의 큰 방향성을 제시해준건 확실한것 같아요. …']},
  {id: 'kakao-029', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 29},
    bubbles: ['자세히 설명해주시고 요약본까지 주셔서 감사합니다! 말씀해주신대로 잘 실천해보겠습니다! 항상 건강하세요!']},
  {id: 'kakao-031', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 31},
    bubbles: ['헉 너무 잘맞네요.\n…']},
  {id: 'kakao-039', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 39},
    bubbles: ['선생님 봐주셔서 감사합니다 봐주신거 토대로 잘 삶을 설계해보겠습니다 :) 좋은 저녁 되세여 많이많이 소문 내겠습니다....!']},
  {id: 'kakao-040', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 40},
    bubbles: ['네 상담해주셔서 정말 감사합니다 너무 답답했는데 좋은 말씀해주셔서 조금 위안이 되어요', '오늘 말씀해주신 것들 보면서 힘들때마다 읽어보겠습니다.']},
  {id: 'kakao-045', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 45},
    bubbles: ['정말 감사합니다\n이렇게 정성껏해주시는지 몰랐네여!!\n복많이 받으세요']},
  {id: 'kakao-047', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: true, evidence: {post: POST, image: 47},
    bubbles: ['고생 많으셨습니다ㅠㅠ 그래도 정말 제대로 잘 보시는 분과 인연이 닿아 도움 많이 받았습니다.\n\n사주 풀 때도 제 상황에 맞게 유연하게 잘 봐주신다는 느낌을 받았고 선생님은 현명하신 분이라고 생각합니다. …']},
  {id: 'kakao-050', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: true, evidence: {post: POST, image: 50},
    bubbles: ['너무나 위안이 되는 말입니다..\n상세히 설명해주셔서 감사합니다.\n\n여유를 갖고 한 걸음씩 걸어보겠습니다.\n\n건강하시고, 앞으로 하시는 일 승승장구하시길 바랍니다. 정말 감사합니다.']},
  {id: 'kakao-059', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 59},
    bubbles: ['아아 정말 너무 만족스러운 상담이었습니다']},
]);

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// fail-closed: 동의·노출 플래그가 true 로 명시되고 필수 필드가 온전한 항목만 통과한다.
function isPublishable(review) {
  return Boolean(review)
    && review.consent === true
    && review.visible === true
    && typeof review.id === 'string' && review.id.length > 0
    && typeof review.postedAt === 'string' && DATE.test(review.postedAt)
    && Array.isArray(review.bubbles) && review.bubbles.length > 0
    && review.bubbles.every(text => typeof text === 'string' && text.trim().length > 0);
}

export function visibleReviews(list = CUSTOMER_REVIEWS) {
  return Array.isArray(list) ? list.filter(isPublishable) : [];
}

// 대표 후기를 먼저, 나머지는 원래 순서대로. 대표가 limit 보다 적으면 앞에서부터 채운다.
export function splitReviews(limit, list = CUSTOMER_REVIEWS) {
  const visible = visibleReviews(list);
  const featured = visible.filter(review => review.featured === true);
  const lead = [...featured, ...visible.filter(review => review.featured !== true)].slice(0, limit);
  const leadIds = new Set(lead.map(review => review.id));
  return {lead, rest: visible.filter(review => !leadIds.has(review.id))};
}

// "2025-03-30" → "2025.03"
export const postedMonth = review => review.postedAt.slice(0, 7).replace('-', '.');
