// 네오 1:1 상담 이용자가 카카오톡으로 남긴 후기. 출처: 네오 블로그 neosaju/224032671570 의 캡처 이미지.
// 게시 동의는 블로그 게시 때 받았다(사용자 확인 2026-10-01). 문구는 이미지와 3회 대조한 원문 그대로다.
// - 말풍선 하나 = 고객 메시지 하나. "\n" 은 고객이 넣은 줄바꿈이다.
// - 원문의 말줄임은 고객이 친 마침표("..")를 그대로 두고, 우리가 생략한 자리는 U+2026 "…" 하나로만 표시한다.
// - 문장을 고치거나 순서를 바꾸거나 합치지 않는다. 바꾸면 __tests__/ui/customer-reviews.test.mjs 의 해시가 실패한다.
// - postedAt 은 대화 날짜가 아니라 블로그 이미지 업로드일이다(이미지 URL 경로로 확인).
// - evidence 는 검수용이며 화면에 내보내지 않는다(원문 글에 이 서비스가 쓰지 않는 표현이 남아 있다).
// - highlight 는 대표·인용용으로 말풍선 원문에서 그대로 잘라 낸 한 구절이다(테스트가 부분 문자열인지 확인).
// 이 후기는 사람 1:1 상담(neo-1on1)과 네오의 사주 강의(neo-lecture)에 대한 것이다. 천원 상담(계산 엔진 + AI 해설)과
// 같은 상품이 아니므로 노출하는 곳마다 그 차이를 알리는 고지를 함께 둔다.
const POST = 'neosaju/224032671570';

export const CUSTOMER_REVIEWS = Object.freeze([
  {id: 'kakao-002', source: 'kakao', service: 'neo-1on1', postedAt: '2026-02-19', consent: true, visible: true, featured: false, evidence: {post: POST, image: 2},
    bubbles: ['네오님 생각이 많아져 뒤늦게 인사드려요; 오늘 궁금한점이 많이 해소되었고 자세히 답변해주셔서 감사합니다 또 언젠가 요청드릴 일 생기면 연락드릴게요~  늘 승승장구하시길 바라며 감사합니다!!^^']},
  {id: 'kakao-006', source: 'kakao', service: 'neo-lecture', postedAt: '2025-10-14', consent: true, visible: true, featured: false, evidence: {post: POST, image: 6},
    bubbles: ['저는 진짜 알차게 들엇습니다', '그리고 저 …이랑 …한테도', '사주본적잇는데', '선생님이 100000000000000000000배 더'], highlight: '선생님이 100000000000000000000배 더'},
  {id: 'kakao-007', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-29', consent: true, visible: true, featured: false, evidence: {post: POST, image: 7},
    bubbles: ['오늘 자세히 상담해주셔서 감사합니다.\n앞으로 하시는 일 모두 잘 되시길 응원하겠습니다! 🙏']},
  {id: 'kakao-009', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-29', consent: true, visible: true, featured: false, evidence: {post: POST, image: 9},
    bubbles: ['…냉정한 말씀 감사합니다 ㅋㅋ 속이 좀 시원하네요'], highlight: '속이 좀 시원하네요'},
  {id: 'kakao-010', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-29', consent: true, visible: true, featured: false, evidence: {post: POST, image: 10},
    bubbles: ['제가 너무 단답형이었어서 죄송했습니다. 선생님 조언 깊이 새기며 잘 결정하겠습니다. 오늘 상담 너무 감사했습니다.']},
  {id: 'kakao-015', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-29', consent: true, visible: true, featured: false, evidence: {post: POST, image: 15},
    bubbles: ['말씀 덕분에 많이 생각이 정리 되었습니다 감사합니다!']},
  {id: 'kakao-016', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-29', consent: true, visible: true, featured: false, evidence: {post: POST, image: 16},
    bubbles: ['그냥 그 말한마디가... 응원이 되는것 같아요. 감사해요. …']},
  {id: 'kakao-024', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 24},
    bubbles: ['…뭐랄까 이렇게까지 제 삶에 대해 방향성을 제시해주고 노력하라고 말해준분이 거의 처음이셔서 정말 뭐라 감사드려야할지 모르겠네요.\n\n현실적인 조언과 좋은 말 해주신만큼 꼭 정신차리고 잘 살아보도록 노력하겠습니다. …\n\n이번상담이 저에게 있어 앞으로의 큰 방향성을 제시해준건 확실한것 같아요. …'], highlight: '이렇게까지 제 삶에 대해 방향성을 제시해주고 노력하라고 말해준분이 거의 처음이셔서'},
  {id: 'kakao-026', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 26},
    bubbles: ['…친구들한테 너무 대박이라 얘기하려고 하는대 …'], highlight: '친구들한테 너무 대박이라 얘기하려고'},
  {id: 'kakao-028', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 28},
    bubbles: ['대단하십니다 내공과 실력이요!', '네 맞아요'], highlight: '대단하십니다 내공과 실력이요!'},
  {id: 'kakao-029', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 29},
    bubbles: ['자세히 설명해주시고 요약본까지 주셔서 감사합니다! 말씀해주신대로 잘 실천해보겠습니다! 항상 건강하세요!']},
  {id: 'kakao-030', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 30},
    bubbles: ['에고 네에😭👍👍 마지막까지 열시미 봐주시는 쌤 최고네용 ㅎㅎㅎㅎ\n감사합니다!!^^ 미리 새해복 많이 받으시구 또 찾아뵐게요~~~'], highlight: '마지막까지 열시미 봐주시는 쌤 최고네용'},
  {id: 'kakao-031', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 31},
    bubbles: ['헉 너무 잘맞네요.\n…'], highlight: '헉 너무 잘맞네요.'},
  {id: 'kakao-035', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 35},
    bubbles: ['혹시 선생님 사주 강의도 하시는지 궁금해서 연락드려요~!~! 사주 배워보고 싶은데 저는 선생님한테 봤던 스타일이 제일 좋았어서....!!! 혹시 개인 강의도 따로 하시는게 있나요???'], highlight: '선생님한테 봤던 스타일이 제일 좋았어서'},
  {id: 'kakao-036', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 36},
    bubbles: ['네 선생님 정해지면 나중에 연락부탁드리겠습니다~~ 사주 배우고 싶은데 선생님이 해주셨던 풀이방법이 가장 좋았어서 혹시나 하고 먼저 문의 드렸어요!', '알겠습니다 선생님좋은하루되세요 수고하세요~!~!'], highlight: '선생님이 해주셨던 풀이방법이 가장 좋았어서'},
  {id: 'kakao-037', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 37},
    bubbles: ['잘읽어보앗습니다 역시해외에자꾸어떻게든휴가때마다나갈려고하는것도이런이유엿을까싶어요ㅠㅠ!!!! 직업적으로도해외에서도 사실 강사도생각해본거여서 잘맞을것같다고하셔서놀랏어요!!!! …'], highlight: '잘맞을것같다고하셔서놀랏어요!!!!'},
  {id: 'kakao-039', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 39},
    bubbles: ['선생님 봐주셔서 감사합니다 봐주신거 토대로 잘 삶을 설계해보겠습니다 :) 좋은 저녁 되세여 많이많이 소문 내겠습니다....!']},
  {id: 'kakao-040', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 40},
    bubbles: ['네 상담해주셔서 정말 감사합니다 너무 답답했는데 좋은 말씀해주셔서 조금 위안이 되어요', '오늘 말씀해주신 것들 보면서 힘들때마다 읽어보겠습니다.']},
  {id: 'kakao-045', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 45},
    bubbles: ['정말 감사합니다\n이렇게 정성껏해주시는지 몰랐네여!!\n복많이 받으세요']},
  {id: 'kakao-046', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 46},
    bubbles: ['네.. 억울한 일 잘 못 참고 남이 물면 저도 물려고 하는 경향이 있습니다.\n근데 이 이빨도 잘 써야 하는 것 같아서, 요즘은 한두 번 더 생각하고 드러내려고 의식적으로 노력하는 중입니다.\n\n그런데 이게 나이 먹어서 자녀와의 관계에서도 발현될 수 있다고 하시니\n염송 많이 하고 저 자신을 잘 수양하겠습니다. (나이롱 신자지만 불교라서요 ㅋㅋ)', '그리고 결국 안 받아주시면 어쩌나 고민스러웠는데 받아주셔서 넘모 감사합니다 ㅎㅎ\n\n앞으로 네오님께서도 활기찬 나날들 되시기를 멀리서 바라겠습니다.\n주말 잘 보내셔요!!😊😊']},
  {id: 'kakao-047', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 47},
    bubbles: ['고생 많으셨습니다ㅠㅠ 그래도 정말 제대로 잘 보시는 분과 인연이 닿아 도움 많이 받았습니다.\n\n사주 풀 때도 제 상황에 맞게 유연하게 잘 봐주신다는 느낌을 받았고 선생님은 현명하신 분이라고 생각합니다. …'], highlight: '정말 제대로 잘 보시는 분과 인연이 닿아 도움 많이 받았습니다.'},
  {id: 'kakao-050', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 50},
    bubbles: ['너무나 위안이 되는 말입니다..\n상세히 설명해주셔서 감사합니다.\n\n여유를 갖고 한 걸음씩 걸어보겠습니다.\n\n건강하시고, 앞으로 하시는 일 승승장구하시길 바랍니다. 정말 감사합니다.']},
  {id: 'kakao-059', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 59},
    bubbles: ['아아 정말 너무 만족스러운 상담이었습니다']},
  {id: 'kakao-062', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 62},
    bubbles: ['선생님 퇴근 후 천천히 읽어보았습니다. 작년에도 올해해도  속 시원히 상담해주셔서 감사합니다. 집과 회사의 변화로 생각이 많은시기였는데 차분히 기회를 기다려 보겠습니다. 건강의 문제가 생기고 있는것도 정확히 알아주셨습니다. 혹시 내년에 조심해야하는부분이 있으면 알려주세요. ^^ 감사합니다'], highlight: '건강의 문제가 생기고 있는것도 정확히 알아주셨습니다.'},
  {id: 'kakao-063', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 63},
    bubbles: ['헉 너무 맞는 점이 많네요!!\' 친구들이 인테리어 쪽으로 가보라고 자꾸들 그랬는데.. 이런 이유 때문이였나봐요 ㅠ ㅠ ㅠ ㅠ정말 감사합니다♡♡♡해주신 말씀 밑거름 삼아서 잘 살아볼게요.\n친구들한테도 소개시켜드릴게요 ㅎㅎㅎ 감사합니다!!!!!'], highlight: '헉 너무 맞는 점이 많네요!!'},
  {id: 'kakao-064', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 64},
    bubbles: ['가려운곳 많이 긁어주셔서 도움도 위로도 많이 되었어요', '감사합니다!', '감사합니다!!! 좋은 하루 되세요!!^^'], highlight: '가려운곳 많이 긁어주셔서'},
  {id: 'kakao-065', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 65},
    bubbles: ['상담 너무너무 감사합니다.\n막막하고 답답했는데\n다 짚어주셔서 너무많이 도움 되었습니다.\n진짜 최고 역대급이었습니다👍\n좋은하루 되세요🙇‍♀️'], highlight: '진짜 최고 역대급이었습니다'},
  {id: 'kakao-066', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 66},
    bubbles: ['감사합니다^^ 저번에진짜 돈날렷어요. …', '길바닥에돈뿌렸습니다 ㅋㅋ', '올해 쓴 제일 아까운 돈이고.\n선생님 풀이는 ... 막힌가슴 뚫어주셔서 감사합니다.', '네 좋은 오후 되세요^^'], highlight: '막힌가슴 뚫어주셔서 감사합니다.'},
  {id: 'kakao-068', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 68},
    bubbles: ['네 진짜 너무 감사합니다', '사람 살리셨어요', '네...! 좋은 아침 보내시구 ! 감사했습니다'], highlight: '사람 살리셨어요'},
  {id: 'kakao-070', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 70},
    bubbles: ['넵!! 그... 나중에 또 뭔가 궁금한게 있으면 그때 다시 상담신청 하도록 하겠습니다! 좋은 주말 보내세요!']},
  {id: 'kakao-071', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 71},
    bubbles: ['ㅎㅎㅎ넵 넘 감사합니다!!', '맞는게 넘 많아서 신기하네요 이번에도!!ㅋㅋㅋㅌ', '수고하셨습니다 감사합니당ㅎㅎ', '좋은 밤 되세요~!'], highlight: '맞는게 넘 많아서 신기하네요'},
  {id: 'kakao-072', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 72},
    bubbles: ['선생님 상담하고 나니 차라리 마음이 편하네요 사실 버티는건 잘 할 수 있고 말씀주신대로 전보다는 33살부터 많이 나아지긴 했어요 물상대체 열심히 해보겠습니다 오늘 상담 감사했습니다 좋은 밤 되세요!!'], highlight: '상담하고 나니 차라리 마음이 편하네요'},
  {id: 'kakao-074', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: false, evidence: {post: POST, image: 74},
    bubbles: ['좋은 말씀 감사합니당ㅠㅠ 부모님 말씀 듣기싫어서 늦게 시작했는데 부모님 말도 참고해야겠어요ㅋㅋ', '말년운 !! 꼭 성공하겠습니다^^']},
  {id: 'kakao-075', source: 'kakao', service: 'neo-1on1', postedAt: '2025-03-30', consent: true, visible: true, featured: true, evidence: {post: POST, image: 75},
    bubbles: ['안녕하세요 선생님~\n너무 기쁜 소식입니다.\n어제밤 합격 확인을 했어요\n이게 이렇게 되네요...\n너무 기뻐서 눈물이 날 지경입니다..ㅠㅠ\n무엇보다 최선을 다한 …가 너무 자랑스러워요\n항상 고민할때마다 함께 해주셔서 정말 감사드립니다.\n앞으로도 늘 든든한 조언 부탁드려요\n답례를 하고 싶은데..마땅치 않아 작은 선물을 보냅니다.\n작은 성의이니 기쁘게 받아주세요\n너무 감사드립니다.\n말씀해주신대로 큰 명예를 얻었어요~!!!'], highlight: '말씀해주신대로 큰 명예를 얻었어요~!!!'},
  {id: 'kakao-076', source: 'kakao', service: 'neo-1on1', postedAt: '2025-04-01', consent: true, visible: true, featured: true, evidence: {post: POST, image: 76},
    bubbles: ['…사주를 봐주셨을 때, 보험 쪽에도 소질이 있다고 하셨었는데, 제가 지금은 어쩌다보니 보험업을 하고 있게 되었습니다 ㅎㅎ 신기하더라고요'], highlight: '보험 쪽에도 소질이 있다고 하셨었는데, 제가 지금은 어쩌다보니 보험업을 하고 있게 되었습니다'},
  {id: 'kakao-077', source: 'kakao', service: 'neo-1on1', postedAt: '2025-04-23', consent: true, visible: true, featured: false, evidence: {post: POST, image: 77},
    bubbles: ['사주특성에 대해 설명해주신 걸 쭉 읽어보니 신기하고 시원한 기분입니다\n그동안 블로그와 최근엔 유튜브로 뵙다가 이렇게 상담으로 뵐수있어서  감사합니다'], highlight: '신기하고 시원한 기분입니다'},
  {id: 'kakao-081', source: 'kakao', service: 'neo-1on1', postedAt: '2025-04-23', consent: true, visible: true, featured: false, evidence: {post: POST, image: 81},
    bubbles: ['제가 시간도 놓쳤는데 이렇게 상세히 풀이해주시니 너무 감사할 뿐입니더']},
  {id: 'kakao-083', source: 'kakao', service: 'neo-1on1', postedAt: '2025-04-23', consent: true, visible: true, featured: false, evidence: {post: POST, image: 83},
    bubbles: ['도움많이 됐습니다! 좋은하루되세요^^']},
  {id: 'kakao-085', source: 'kakao', service: 'neo-1on1', postedAt: '2025-04-23', consent: true, visible: true, featured: false, evidence: {post: POST, image: 85},
    bubbles: ['그런데 이렇게 딱딱 맞춰주시니 이제 뭔가 다 들어맞는 기분도 들고', '속이 시원합니다', 'ㅋㅋㅋㅋㅋㅋㅋㅋ감사드려요 진짜'], highlight: '이렇게 딱딱 맞춰주시니'},
  {id: 'kakao-086', source: 'kakao', service: 'neo-1on1', postedAt: '2025-04-23', consent: true, visible: true, featured: false, evidence: {post: POST, image: 86},
    bubbles: ['네.!! 또 찾아뵐게요 그동안 선생님 블로그 눈팅만 하다가 상담신청했는데', '많은 도움 됐습니다..']},
  {id: 'kakao-088', source: 'kakao', service: 'neo-1on1', postedAt: '2026-01-18', consent: true, visible: true, featured: false, evidence: {post: POST, image: 88},
    bubbles: ['이게 너무 잘 맞았습니다..']},
  {id: 'kakao-089', source: 'kakao', service: 'neo-1on1', postedAt: '2026-01-18', consent: true, visible: true, featured: true, evidence: {post: POST, image: 89},
    bubbles: ['…작년에는 선생님 분석이 너무 정확해서 지인들까지 한번에 문의 드렸었는데, …', '가족 사업같이 운영하는 회사라 내년사주도 다들 기대하고 있더라구요..! 중간에 사주 안보신다하고 크게 아쉬워하고 있었는데 다시 열어주셔서 감사합니다'], highlight: '선생님 분석이 너무 정확해서'}
]);

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SERVICES = new Set(['neo-1on1', 'neo-lecture']);

// fail-closed: 동의·노출 플래그가 true 로 명시되고 필수 필드가 온전한 항목만 통과한다.
function isPublishable(review) {
  return Boolean(review)
    && review.consent === true
    && review.visible === true
    && typeof review.id === 'string' && review.id.length > 0
    && SERVICES.has(review.service)
    && typeof review.postedAt === 'string' && DATE.test(review.postedAt)
    && Array.isArray(review.bubbles) && review.bubbles.length > 0
    && review.bubbles.every(text => typeof text === 'string' && text.trim().length > 0);
}

export function visibleReviews(list = CUSTOMER_REVIEWS) {
  return Array.isArray(list) ? list.filter(isPublishable) : [];
}

// 대표 후기를 먼저, 나머지는 원래 순서대로. 대표가 limit 보다 적으면 앞에서부터 채운다.
// 대표 자리(정적 셸·결제 전 패널·첫 화면)는 "1:1 상담 후기"라고 소개하므로 1:1 상담 후기만 오른다.
export function splitReviews(limit, list = CUSTOMER_REVIEWS) {
  const visible = visibleReviews(list);
  const pool = visible.filter(review => review.service === 'neo-1on1');
  const featured = pool.filter(review => review.featured === true);
  const lead = [...featured, ...pool.filter(review => review.featured !== true)].slice(0, limit);
  const leadIds = new Set(lead.map(review => review.id));
  return {lead, rest: visible.filter(review => !leadIds.has(review.id))};
}

// "2025-03-30" → "2025.03"
export const postedMonth = review => review.postedAt.slice(0, 7).replace('-', '.');
