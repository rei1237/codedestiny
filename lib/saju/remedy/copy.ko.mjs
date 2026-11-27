// 액땜 문구(한국어). 모든 항목은 reviewed:false — 사람 검수 전이다.
// 문구 규칙
// - 풍속은 "이런 풍속이 전해져요"로 소개만 한다. 효과를 단정하지 않고, 부적·의식·물건 구매를 권하지 않는다.
// - 액땜은 "작은 불편을 먼저 치르는 마음으로" 설명한다.
// - 헌혈에는 헌혈 기준과 그날 컨디션 확인을, 여행에는 "가까운 곳이라도 충분해요"를 붙인다.
// - 색·방위가 돈이나 건강을 부른다고 말하지 않는다.
// - 검증기 스윕(__tests__/saju/remedy-copy-sweep.test.mjs)을 통과해야 한다. 검증기를 고치지 말고 문구를 고친다.

const entry = (title, text, extra = {}) => Object.freeze({ title, text, ...extra, reviewed: false });

export const REMEDY_INTRO_KO = Object.freeze({
  text: '액땜은 작은 불편을 먼저 치르는 마음으로 큰 걱정을 덜어 두는 옛말이에요.',
  reviewed: false,
});
export const REMEDY_DISCLAIMER_KO = Object.freeze({
  text: '효과를 보장하지 않아요. 마음을 다잡는 작은 실천이에요.',
  reviewed: false,
});
export const REMEDY_CUSTOM_LABEL_KO = '전해 내려오는 풍속';
export const REMEDY_MORE_LABEL_KO = (count) => `+${count} 더 보기`;

// 조사: 마지막 글자 받침에 맞춘다. 한자(간지·오행)는 한글 독음으로 받침을 본다.
const HANJA_READ = Object.freeze({
  甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
  子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해',
  木: '목', 火: '화', 土: '토', 金: '금', 水: '수',
});
const JOSA_PAIRS = Object.freeze({
  을: ['을', '를'], 를: ['을', '를'], 이: ['이', '가'], 가: ['이', '가'], 은: ['은', '는'], 는: ['은', '는'],
  과: ['과', '와'], 와: ['과', '와'], 으로: ['으로', '로'], 로: ['으로', '로'],
});
/** word 뒤에 받침에 맞는 조사를 붙인다(예: 丑+과 → 丑과, 동쪽+으로 → 동쪽으로, 중앙+을 → 중앙을). */
export function withJosa(word, josa) {
  const text = String(word ?? '');
  const pair = JOSA_PAIRS[josa];
  if (!pair) return text + String(josa ?? '');
  const lastChar = [...text].pop() || '';
  const read = HANJA_READ[lastChar] || lastChar;
  const code = read.charCodeAt(0) - 0xac00;
  if (!(code >= 0 && code <= 11171)) return text + pair[0];
  const final = code % 28;
  if (pair[0] === '으로') return text + (final === 0 || final === 8 ? '로' : '으로');
  return text + (final === 0 ? pair[1] : pair[0]);
}

// 방법 문구. {dir}·{color}·{activity} 자리는 쓸 오행으로 채운다. {key|을} 은 받침에 맞춰 조사를 붙인다.
// textByEl 은 그 오행에서 기본 문장이 어색할 때만 둔다(토=중앙).
export const METHOD_COPY_KO = Object.freeze({
  'direction-desk': entry('자리 방향 바꾸기', '책상이나 자주 앉는 자리를 {dir|을} 향하도록 살짝 돌려 보세요. 자리를 옮기는 작은 수고로 마음을 새로 다잡아요.', {
    textByEl: Object.freeze({ earth: '책상 위를 비우고 자주 앉는 자리를 방 한가운데 쪽으로 정돈해 보세요. 자리를 옮기는 작은 수고로 마음을 새로 다잡아요.' }),
  }),
  'direction-walk': entry('방향 정해 걷기', '{dir|으로} 난 길을 골라 가볍게 걸어 보세요. 동네 한 바퀴라도 충분해요.', {
    textByEl: Object.freeze({ earth: '동네 한가운데의 공원이나 광장을 골라 가볍게 걸어 보세요. 한 바퀴라도 충분해요.' }),
  }),
  'direction-color-item': entry('색 하나 곁에 두기', '{color} 소품이나 옷 하나를 눈에 띄는 곳에 두어 보세요. 색이 무언가를 불러온다기보다, 볼 때마다 마음을 다잡는 표시예요.'),
  'travel-move-first': entry('이동은 나들이로 먼저', '이사나 자리 이동이 마음에 걸리면 짧은 나들이로 움직임을 먼저 겪어 보세요. 가까운 곳이라도 충분해요.'),
  'travel-overseas': entry('먼 길로 이동수 먼저 쓰기', '움직임이 많은 때라면 해외나 먼 곳 여행으로 이동수를 먼저 써 보는 방법도 있어요. 가까운 곳이라도 충분해요.'),
  'travel-buffer': entry('일정에 여유 두기', '출장이나 여행 일정은 앞뒤로 반나절쯤 여유를 두고 잡아 보세요.'),
  'travel-direction-trip': entry('방향을 정한 나들이', '나들이 갈 곳을 고를 때 {dir|으로} 가는 곳을 한 번 골라 보세요. 가까운 곳이라도 충분해요.', {
    textByEl: Object.freeze({ earth: '멀리 가기보다 익숙한 동네를 천천히 둘러보는 하루를 잡아 보세요. 가까운 곳이라도 충분해요.' }),
  }),
  'travel-docs-copy': entry('서류 사본 챙기기', '여권·신분증·예약 내역은 사진이나 사본으로 한 벌 더 챙겨 두세요.'),
  'donation-blood': entry('헌혈로 나누기', '헌혈 기준과 그날 컨디션을 먼저 확인하고, 괜찮다면 헌혈로 나눠 보세요. 어렵다면 다른 나눔으로 대신해도 돼요.'),
  'donation-small': entry('작은 기부', '작은 금액이라도 나눔이나 기부를 해 보세요. 먼저 내어 주는 마음이 액땜의 본래 뜻과 닮았어요.'),
  'donation-time': entry('시간 나누기', '봉사나 이웃 돕기처럼 시간을 나누는 일도 액땜의 한 방법이에요.'),
  'relation-first-contact': entry('먼저 안부 건네기', '서운한 일이 있던 사람에게 먼저 짧게 안부를 건네 보세요. 먼저 숙이는 작은 불편이 액땜의 마음이에요.'),
  'relation-slow-word': entry('말 한 박자 늦추기', '답하기 전에 한 박자 쉬고, 중요한 말은 글로 한 번 정리한 뒤 전해 보세요.'),
  'relation-elder-call': entry('어른께 안부 전하기', '집안 어른께 안부 전화를 드리거나 얼굴을 뵈러 가 보세요.'),
  'relation-talk-time': entry('대화 시간 정하기', '가까운 사람과 일주일에 한 번, 휴대폰을 내려놓고 이야기하는 시간을 정해 보세요.'),
  'relation-apology': entry('먼저 사과하기', '마음에 걸리는 일이 있다면 먼저 사과해 보세요. 누가 옳은지보다 먼저 손을 내미는 쪽이 마음이 가벼워요.'),
  'document-read-twice': entry('계약서 두 번 읽기', '계약서나 약관은 서명 전에 하루 두고 두 번 읽어 보세요.'),
  'document-recheck': entry('서류 한 번 더 보기', '보내거나 제출하기 전에 서류를 한 번 더 확인하는 습관을 들여 보세요.'),
  'document-handover': entry('일 기록 남기기', '맡은 일의 진행 상황을 짧게라도 기록해 두세요. 갑작스러운 변화가 와도 덜 흔들려요.'),
  'document-insurance-check': entry('보험·계약 점검', '들어 둔 보험과 계약의 내용과 만기일을 한 번 점검해 보세요.'),
  'document-subscription': entry('오래된 구독 정리', '오래 쓰지 않은 구독이나 자동이체를 정리해 보세요.'),
  'document-split-plan': entry('계획 쪼개기', '큰 계획은 작은 단계로 쪼개고, 단계마다 확인할 날짜를 정해 두세요.'),
  'document-delay-announce': entry('확정 전엔 조용히', '확정되기 전에는 계획을 널리 알리기보다 가까운 사람과만 나눠 보세요.'),
  'document-spending-log': entry('지출 적어 보기', '한 달만이라도 지출을 적어 보세요. 새는 곳이 보이면 마음이 한결 가벼워져요.'),
  'document-savings-split': entry('통장 나누기', '쓰는 돈과 모으는 돈의 통장을 나눠 두세요.'),
  'safety-drive': entry('속도 한 단계 낮추기', '운전하거나 이동할 때는 속도를 한 단계 낮추고, 조금 일찍 출발해 보세요.'),
  'safety-tools': entry('날카로운 물건 정리', '칼이나 공구처럼 날카로운 물건은 제자리에 정리하고, 쓸 때는 천천히 다뤄 보세요.'),
  'safety-exercise': entry('운동 강도 조절', '운동은 평소보다 한 단계 가볍게 하고, 몸을 충분히 푼 뒤 시작해 보세요.'),
  'safety-kitchen-fire': entry('불 한 번 더 확인', '자리를 뜰 때 주방 불과 전열기구를 한 번 더 확인해 보세요.'),
  'safety-traffic': entry('교통 규칙 지키기', '신호와 횡단보도 같은 교통 규칙을 평소보다 꼼꼼히 지켜 보세요.'),
  'safety-home-check': entry('집 점검', '집 안의 오래된 배선·가스·창틀을 한 번 둘러보고 점검해 보세요.'),
  'lifestyle-declutter': entry('안 쓰는 물건 비우기', '안 쓰는 물건을 몇 가지 골라 비워 보세요. 아끼던 것을 먼저 내려놓는 작은 불편도 액땜의 한 모습이에요.'),
  'lifestyle-furniture': entry('가구 배치 바꾸기', '가구 배치를 조금 바꾸거나 앉는 자리를 옮겨 보세요. 큰 변화 전에 작은 움직임을 먼저 겪어 두는 방법이에요.'),
  'lifestyle-new-routine': entry('새 루틴 하나', '아침이나 저녁에 작은 새 루틴 하나를 시작해 보세요. 흐름이 바뀌는 때를 스스로 정리하는 표시가 돼요.'),
  'lifestyle-delay-decision': entry('급한 결정 하루 미루기', '급하게 정해야 할 일이 생기면 하루만 미뤄 두고 다시 보세요.'),
  'lifestyle-recheck-big': entry('큰 결정 다시 보기', '큰 결정은 한 번 더 확인하고, 믿을 만한 사람의 의견도 들어 보세요.'),
  'lifestyle-sun-warm': entry('햇볕과 온기 루틴', '낮에 햇볕을 쬐며 걷고, 따뜻한 차 한 잔으로 하루 리듬을 잡아 보세요.'),
  'lifestyle-hydrate-rest': entry('물과 쉼 루틴', '물을 자주 마시고, 쉬는 시간을 일정에 먼저 넣어 두세요.'),
  'lifestyle-rhythm': entry('생활 리듬 맞추기', '잠드는 시간과 일어나는 시간을 일정하게 맞춰 보세요.'),
  'lifestyle-regular-checkup': entry('정기 검진 챙기기', '미뤄 둔 정기 검진이 있다면 일정을 잡아 두세요.'),
  'lifestyle-fixed-routine': entry('고정 루틴 만들기', '하루 한 가지는 같은 시간에 같은 방식으로 하는 고정 루틴을 만들어 보세요.'),
  'lifestyle-element-activity': entry('쏠림을 푸는 활동', '{activity} 같은 활동을 일주일에 한 번 넣어 보세요. 한쪽으로 쏠린 흐름을 풀어 주는 생활 습관이에요.'),
  'lifestyle-family-events-pace': entry('경조사 체력 안배', '경조사는 챙기되, 일정이 몰리면 체력에 맞게 나눠 다녀오세요.'),
  'lifestyle-use-opposite': entry('바깥에서 힘 얻기', '마주 보는 자리의 흐름을 빌려 쓰듯, 바깥 활동이나 사람을 만나는 자리에서 힘을 얻어 보세요.'),
  'lifestyle-no-speculation': entry('투기 멀리하기', '큰돈이 걸린 투기성 결정은 미루고, 원금을 지키는 쪽을 먼저 생각해 보세요.'),
  'custom-bureom': entry('부럼 깨기', '정월 대보름에 부럼을 깨물며 한 해를 무탈하게 보내길 바라는 풍속이 전해져요.'),
  'custom-dongji-patjuk': entry('동지 팥죽', '동짓날 팥죽을 쑤어 이웃과 나눠 먹으며 묵은 해를 보내는 풍속이 전해져요.'),
  'custom-ipchunchup': entry('입춘첩', '입춘에 새봄을 맞는 글귀를 대문이나 현관에 붙이는 입춘첩 풍속이 전해져요.'),
  'custom-kite': entry('액막이 연', '정월 대보름 무렵 걱정을 적은 연을 날려 보내는 액막이 연 풍속이 전해져요.'),
  'custom-entrance': entry('현관 정리', '현관을 비우고 깨끗이 해 두며 새해를 맞는 마음을 정돈하는 풍속이 전해져요.'),
  'custom-old-things': entry('묵은 물건 정리', '해가 바뀔 무렵 묵은 물건을 정리하며 마음을 새로 하는 풍속이 전해져요.'),
  'custom-samjae-intro': entry('삼재 해 풍속', '삼재 해에는 이사나 혼례 같은 큰일을 서두르지 않고 한 해를 조심스럽게 보내던 풍속이 전해져요. 소개일 뿐, 꼭 따를 필요는 없어요.'),
  'custom-son-eomneun-nal': entry('손 없는 날', '이사나 큰일을 손 없는 날에 맞추는 풍속이 전해져요. 날짜보다 준비가 먼저예요.'),
  'custom-sangmun': entry('상문 풍속', '상문살이 든 해에는 문상 자리를 조심스럽게 여기던 풍속이 전해져요. 가야 할 자리는 예를 갖춰 다녀오면 돼요.'),
  'custom-blood-first': entry('피를 먼저 보는 액땜', '피를 조금 먼저 보면 큰 탈을 던다는 옛말이 전해져요. 요즘은 헌혈로 그 마음을 대신하기도 해요.'),
  'custom-new-year-aengmagi': entry('정초 액막이', '정초에 한 해의 걱정을 미리 덜어 두는 액막이 풍속이 전해져요. 소개일 뿐, 따로 준비할 필요는 없어요.'),
  'custom-travel-first': entry('길 떠나기 전 정돈', '먼 길을 떠나기 전 집을 정돈하고 짐을 미리 꾸려 두던 풍속이 전해져요.'),
});

// 쏠림을 푸는 활동(쓸 오행별).
export const ELEMENT_ACTIVITY_KO = Object.freeze({
  wood: '산책이나 화분 돌보기',
  fire: '햇볕 아래 걷기나 사람 만나기',
  earth: '정리 정돈이나 집밥 차리기',
  metal: '물건 정돈이나 글 정리',
  water: '책 읽기나 조용한 휴식',
});

export const PALACE_KO = Object.freeze({
  ming: '명궁', wealth: '재백궁', career: '관록궁', spouse: '부부궁', travel: '천이궁', health: '질액궁', home: '전택궁',
});

// 케이스 제목과 화자 대사용 주제구(뒤에 "흐름"이 붙는다). {palace} 는 궁 이름.
export const CASE_COPY_KO = Object.freeze({
  'gisin-year': entry('버거운 오행이 드는 해', '', { topic: '버거운 오행이 들어오는' }),
  'day-clash': entry('생활 자리가 흔들리는 때', '', { topic: '생활 자리가 흔들리기 쉬운' }),
  'month-clash': entry('일과 환경이 바뀌는 때', '', { topic: '일과 환경이 바뀌기 쉬운' }),
  'year-clash': entry('집안 일이 움직이는 때', '', { topic: '집안 일이 움직이기 쉬운' }),
  hyeong: entry('절차가 꼬이기 쉬운 때', '', { topic: '절차와 마찰이 꼬이기 쉬운' }),
  wonjin: entry('서운함이 쌓이기 쉬운 때', '', { topic: '서운함이 쌓이기 쉬운' }),
  baekho: entry('속도를 줄일 때', '', { topic: '속도와 날카로움을 살필' }),
  yangin: entry('힘이 넘치는 때', '', { topic: '힘이 넘쳐 부딪히기 쉬운' }),
  yeokma: entry('이동이 많은 때', '', { topic: '움직임과 이동이 많은' }),
  'sangmun-jogaek': entry('경조사가 겹치는 해', '', { topic: '경조사가 겹치기 쉬운' }),
  samjae: entry('삼재가 드는 해', '', { topic: '삼재가 드는' }),
  'daewoon-shift': entry('큰 흐름이 바뀌는 때', '', { topic: '큰 흐름이 바뀌는' }),
  'gongmang-year': entry('계획이 헛돌기 쉬운 해', '', { topic: '계획이 헛돌기 쉬운' }),
  'element-excess': entry('한쪽으로 쏠린 오행', '', { topic: '한쪽 오행이 넘치는' }),
  'johu-urgent': entry('온도를 맞출 때', '', { topic: '온도와 습도가 한쪽으로 쏠린' }),
  'zw-natal-hwagi': entry('{palace}의 화기', '', { topic: '{palace}에 화기가 놓인' }),
  'zw-decade-hwagi': entry('이번 대한의 {palace} 화기', '', { topic: '이번 대한에 {palace} 화기가 드는' }),
  'zw-yang-tuo': entry('명궁의 경양·타라', '', { topic: '명궁에 경양·타라가 있는' }),
  'zw-huo-ling': entry('화성·영성의 급한 기세', '', { topic: '급한 기세가 붙기 쉬운' }),
  'zw-kong-jie': entry('재물 자리의 지공·지겁', '', { topic: '재물 자리가 비기 쉬운' }),
  'zw-empty-ming': entry('비어 있는 명궁', '', { topic: '명궁이 비어 있는' }),
  'zw-travel-malefic': entry('천이궁의 살성', '', { topic: '바깥 이동에 살성이 있는' }),
  'everyday-balance': entry('평소의 오행 균형', '', { topic: '오행 균형을 살필' }),
});

// 화자별 대사 틀. frame 의 {topic} 에 주제구가 들어가고, closing 은 시드로 하나 고른다.
// 무성은 합니다체 판정 문장(80자), 나머지는 60자·2문장(narrator.mjs correctLine).
export const NARRATOR_COPY_KO = Object.freeze({
  yeoni: Object.freeze({ name: '연이', frame: '{topic} 흐름이에요.', closings: Object.freeze(['작은 것부터 먼저 챙겨 봐요.', '하나씩 천천히 해 봐요.', '불편 하나를 먼저 치러 봐요.']), reviewed: false }),
  'yeoni-saju': Object.freeze({ name: '연이', frame: '{topic} 흐름이에요.', closings: Object.freeze(['작은 것부터 먼저 챙겨 봐요.', '하나씩 천천히 해 봐요.', '불편 하나를 먼저 치러 봐요.']), reviewed: false }),
  yeongnyangi: Object.freeze({ name: '영냥이', frame: '{topic} 흐름이야, 손님.', closings: Object.freeze(['하나만 먼저 해 보자냥.', '작은 것부터 챙겨 보자.', '천천히 같이 보자냥.']), reviewed: false }),
  neo: Object.freeze({ name: '네오', frame: '{topic} 흐름이야.', closings: Object.freeze(['작게 먼저 치르고 가자.', '하나씩 막아 두면 돼.', '오늘 하나만 해 둬.']), reviewed: false }),
  musung: Object.freeze({ name: '무성', frame: '{topic} 흐름입니다.', closings: Object.freeze(['작은 불편을 먼저 치르는 편이 낫습니다.', '서두르지 않는 쪽이 맞습니다.', '하나씩 정리해 두는 편이 낫습니다.']), reviewed: false }),
});

// 프롬프트 블록 머리말·사용 규칙(신살 블록과 같은 모양).
export const REMEDY_PROMPT_HEADER = '[액땜 방법 — 서버 계산. 이 목록 밖의 액땜 방법은 쓰지 않는다]';
export const REMEDY_PROMPT_FOOTER = '사용 규칙: 액땜 방법은 블록 목록에서 고르고, 풍속은 소개로만 쓴다. 액땜은 작은 불편을 먼저 치르는 마음으로 설명하고 효과를 단정하지 않는다. 부적·의식·물건 구매를 권하지 않고, 헌혈은 헌혈 기준과 그날 컨디션 확인을 함께 말한다.';
export const REMEDY_PROMPT_CUSTOM_PREFIX = '풍속 소개';
