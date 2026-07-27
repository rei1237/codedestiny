// 잠금화면형(lock-screen) 운세 콘텐츠 엔진.
//
// 앱의 "실제 폰 잠금화면" 위에 매일 하나의 세트를 보여준다. 사용자의 입력 없이,
// 날짜를 시드로 결정론적으로 선별한다(같은 날엔 같은 내용, 날이 바뀌면 새 내용).
// 과장된 예언·공포 조장·"무조건/반드시/100%" 표현은 쓰지 않는다.
// 명언은 실존 인물의 널리 알려진 문장만 사용한다. LLM 미사용(오프라인·즉시 표시).
//
// 각 요소(풀)는 서로 다른 offset으로 뽑아 독립적으로 변주되며, 풀 크기를 서로소에 가깝게
// 두어 여러 요소가 동시에 같은 조합으로 반복되는 주기를 극대화한다(사실상 반복 없음).

export interface LockScreenQuote {
  text: string;
  author: string;
}

export interface LockScreenKnowledge {
  system: string; // 사주 / 타로 / 자미두수 / 베다 / 숙요 / 점성술
  text: string;
}

export interface LockScreenFlower {
  name: string; // 오늘의 꽃
  meaning: string; // 꽃말
}

export interface LockScreenContent {
  header: string; // 상단 감성 헤더 (짧게)
  coreEnergy: string; // 오늘의 핵심 기운 1문장 (가장 크게 노출)
  affirmation: string; // 긍정 확언 1문장
  hope: string; // 희망 메시지 1문장
  greeting: string; // 연이(마스코트) 톤의 좋은 하루 인사 1문장
  flower: LockScreenFlower; // 오늘의 꽃 + 꽃말
  quote: LockScreenQuote; // 명언 1문장
  knowledge: LockScreenKnowledge; // 운세 지식 요약 1개
  dateKey: string; // YYYY-MM-DD (KST)
}

const HEADERS: readonly string[] = [
  "오늘의 기운을 조용히 정돈합니다",
  "고요한 아침, 마음을 맑게",
  "잠시 멈추고, 오늘을 바라봅니다",
  "달빛이 남긴 오늘의 문장",
  "서두르지 않는 하루의 시작",
  "당신을 위한 오늘의 정돈",
  "천천히, 그러나 선명하게",
  "오늘의 흐름을 가만히 읽습니다",
  "숨을 고르고, 오늘을 엽니다",
  "작은 빛으로 여는 하루",
  "마음의 결을 다듬는 아침",
  "오늘도 당신 편에서",
  "조용히 차오르는 오늘의 기운",
  "한 걸음의 여유로 시작합니다",
];

const CORE_ENERGIES: readonly string[] = [
  "흐름은 조용히 정리되고 있습니다.",
  "서두르지 않을수록 길이 더 선명해집니다.",
  "오늘은 작은 정돈이 큰 여유를 만듭니다.",
  "무리해서 밀어붙이기보다, 결을 따라갈 때입니다.",
  "가벼운 정리가 마음의 공간을 넓혀 줍니다.",
  "속도를 늦추면 놓쳤던 신호가 보입니다.",
  "오늘의 기운은 안으로 단단해지는 쪽에 있습니다.",
  "확장보다 정비가 어울리는 하루입니다.",
  "한 걸음 물러서면 전체가 눈에 들어옵니다.",
  "작은 평정이 오늘의 큰 운을 만듭니다.",
  "관계에서는 먼저 듣는 편이 유리합니다.",
  "오늘은 마무리하지 못한 일을 매듭짓기 좋습니다.",
  "결정을 서두르지 말고 하루만 더 재워 두세요.",
  "몸을 돌보는 일이 곧 운을 돌보는 일입니다.",
  "익숙한 길에서 뜻밖의 여유를 만납니다.",
  "오늘의 흐름은 정직한 노력에 반응합니다.",
  "말수를 줄이면 신뢰가 늘어납니다.",
  "재정비의 기운이 강한 하루입니다.",
  "가까운 사람에게서 조용한 도움이 옵니다.",
  "완벽함보다 꾸준함이 오늘의 열쇠입니다.",
  "먼저 웃으면 분위기가 당신 쪽으로 기웁니다.",
  "오늘은 시작보다 이어 가는 힘이 중요합니다.",
  "작은 약속을 지키는 것이 큰 신뢰가 됩니다.",
  "머릿속이 복잡할수록 한 가지만 골라 손대세요.",
  "지출은 잠시 멈추고, 필요와 욕심을 나눠 보세요.",
  "오늘의 운은 서두름보다 준비에 반응합니다.",
  "감정이 앞설 땐 반나절만 미뤄도 괜찮습니다.",
  "낯선 제안엔 하루의 여유를 두고 답하세요.",
  "정리한 책상만큼 생각도 맑아집니다.",
  "오늘은 받기보다 건네는 쪽에서 운이 열립니다.",
  "무던하게 넘기는 힘이 오늘을 지켜 줍니다.",
  "작은 성취 하나를 오늘의 기준점으로 삼으세요.",
  "흔들려도 방향만 잃지 않으면 됩니다.",
  "조용한 하루가 다음 도약의 발판이 됩니다.",
  "오늘은 손보다 눈으로 먼저 살필 때입니다.",
  "미뤄 둔 연락 하나가 뜻밖의 기회가 됩니다.",
];

export interface LockScreenAffirmationCategory {
  key: string;
  label: string;
}

// 사용자가 잠금화면 설정에서 고를 수 있는 "확언 분야". key는 아래 AFFIRMATIONS의 cat 값과 일치한다.
export const AFFIRMATION_CATEGORIES: readonly LockScreenAffirmationCategory[] = [
  { key: "resilience", label: "회복·다시 일어섬" },
  { key: "selfcare", label: "자기 돌봄·휴식" },
  { key: "agency", label: "주도성·용기" },
  { key: "growth", label: "성장·배움" },
  { key: "selfworth", label: "자기 존중" },
  { key: "relationship", label: "관계·사랑" },
  { key: "gratitude", label: "감사·기쁨" },
  { key: "peace", label: "마음의 평화" },
  { key: "dream", label: "꿈·미래" },
  { key: "wisdom", label: "지혜·직관" },
  { key: "health", label: "건강·몸" },
  { key: "abundance", label: "재물·풍요" },
];

interface LockScreenAffirmation {
  cat: string; // AFFIRMATION_CATEGORIES.key 또는 "core"(분야 미선택 시에도 나오는 기본 확언)
  text: string;
}

const AFFIRMATIONS: readonly LockScreenAffirmation[] = [
  // 기본(core) — 분야를 고르지 않았을 때 함께 후보가 되는 잔잔한 확언
  { cat: "core", text: "나는 오늘도 나를 맑게 지키며 앞으로 갑니다." },
  { cat: "core", text: "나는 서두르지 않아도 충분히 나아가고 있습니다." },
  { cat: "core", text: "나는 내 속도를 존중하며 하루를 걷습니다." },
  { cat: "core", text: "나는 흔들려도 다시 중심으로 돌아옵니다." },
  { cat: "core", text: "나는 작은 평온을 오늘의 힘으로 삼습니다." },
  { cat: "core", text: "나는 조급함 대신 신뢰를 선택합니다." },
  { cat: "core", text: "나는 나에게 필요한 것을 알아차리고 있습니다." },
  { cat: "core", text: "나는 오늘 하루를 다정하게 시작합니다." },
  { cat: "core", text: "나는 지나간 일에 마음을 오래 두지 않습니다." },
  { cat: "core", text: "나는 지금 이 순간에 온전히 머무릅니다." },
  { cat: "core", text: "나는 나의 노력을 조용히 믿습니다." },
  { cat: "core", text: "나는 무리하지 않는 용기를 가지고 있습니다." },
  { cat: "core", text: "나는 스스로에게 너그러운 사람입니다." },
  { cat: "core", text: "나는 오늘도 배우며 한 뼘 자랍니다." },
  { cat: "core", text: "나는 내 마음의 소리를 소중히 듣습니다." },
  { cat: "core", text: "나는 충분히 잘하고 있고, 앞으로도 그럴 것입니다." },
  { cat: "core", text: "나는 흐름을 거스르지 않고 함께 나아갑니다." },
  { cat: "core", text: "나는 오늘의 나를 있는 그대로 받아들입니다." },
  { cat: "core", text: "나는 평정 속에서 더 선명하게 봅니다." },
  { cat: "core", text: "나는 나를 지키며 세상을 향해 열려 있습니다." },
  { cat: "core", text: "나는 실수 앞에서도 나를 몰아세우지 않습니다." },
  { cat: "core", text: "나는 내가 가진 것에 먼저 감사합니다." },
  { cat: "core", text: "나는 오늘 할 수 있는 만큼을 정성껏 합니다." },
  { cat: "core", text: "나는 두려움보다 호기심을 앞세웁니다." },
  { cat: "core", text: "나는 비교 대신 나만의 길을 걷습니다." },
  { cat: "core", text: "나는 쉬어 가는 것도 나아가는 일임을 압니다." },
  { cat: "core", text: "나는 마음이 하는 말을 부드럽게 다독입니다." },
  { cat: "core", text: "나는 오늘 만나는 사람에게 온기를 건넵니다." },
  { cat: "core", text: "나는 작은 진전을 크게 축하합니다." },
  { cat: "core", text: "나는 완벽하지 않아도 충분히 괜찮습니다." },
  { cat: "core", text: "나는 어제보다 오늘의 나를 더 잘 압니다." },
  { cat: "core", text: "나는 내 선택을 믿고 책임집니다." },
  { cat: "core", text: "나는 불안을 인정하되 끌려가지 않습니다." },
  { cat: "core", text: "나는 오늘 하루의 주인으로 살아갑니다." },
  { cat: "core", text: "나는 나를 아끼는 방식으로 하루를 채웁니다." },
  { cat: "core", text: "나는 지금의 나로도 사랑받을 자격이 있습니다." },
  // 회복·다시 일어섬
  { cat: "resilience", text: "나는 오늘도 무너지지 않고 다시 일어선다." },
  { cat: "resilience", text: "나는 고통 속에서도 나를 지켜내는 힘이 있다." },
  { cat: "resilience", text: "나는 힘든 시간도 결국 나를 단단하게 만든다고 믿는다." },
  { cat: "resilience", text: "나는 내가 겪어온 모든 어려움을 잘 통과해왔다." },
  { cat: "resilience", text: "나는 아픈 순간에도 내 안의 빛을 잃지 않는다." },
  { cat: "resilience", text: "나는 버티는 나 자신을 진심으로 존중한다." },
  { cat: "resilience", text: "나는 오늘의 나를 있는 그대로 받아들인다." },
  { cat: "resilience", text: "나는 내 마음의 상처를 천천히 회복시킬 수 있다." },
  { cat: "resilience", text: "나는 지나간 아픔에 묶이지 않고 앞으로 나아간다." },
  { cat: "resilience", text: "나는 어려움 속에서도 내 길을 찾는다." },
  { cat: "resilience", text: "나는 내 삶을 바꿀 수 있는 충분한 힘을 가지고 있다." },
  { cat: "resilience", text: "나는 실패해도 다시 시작할 수 있다." },
  { cat: "resilience", text: "나는 넘어져도 끝이 아니라는 것을 안다." },
  { cat: "resilience", text: "나는 포기하지 않는 나를 믿는다." },
  { cat: "resilience", text: "나는 어떤 상황에서도 배울 수 있다." },
  { cat: "resilience", text: "나는 내 속도대로 성장해도 괜찮다." },
  { cat: "resilience", text: "나는 흔들려도 중심을 다시 찾는다." },
  { cat: "resilience", text: "나는 오늘보다 조금 더 나은 내일을 만든다." },
  { cat: "resilience", text: "나는 내 마음을 회복시키는 방법을 알고 있다." },
  { cat: "resilience", text: "나는 힘든 날에도 나를 외면하지 않는다." },
  // 자기 돌봄·휴식
  { cat: "selfcare", text: "나는 나의 감정을 부드럽게 안아준다." },
  { cat: "selfcare", text: "나는 내 마음의 무게를 혼자 다 짊어지지 않아도 된다." },
  { cat: "selfcare", text: "나는 쉬어도 괜찮은 사람이다." },
  { cat: "selfcare", text: "나는 나에게 필요한 휴식을 허락한다." },
  { cat: "selfcare", text: "나는 내 몸과 마음의 신호를 존중한다." },
  { cat: "selfcare", text: "나는 불안한 순간에도 숨을 고를 수 있다." },
  { cat: "selfcare", text: "나는 마음의 평화를 선택하는 연습을 하고 있다." },
  { cat: "selfcare", text: "나는 내 안의 조용한 힘을 신뢰한다." },
  { cat: "selfcare", text: "나는 오늘도 나를 다정하게 대한다." },
  { cat: "selfcare", text: "나는 나의 상처를 치유할 가치가 있다." },
  // 주도성·용기
  { cat: "agency", text: "나는 내 삶의 주인으로 살아간다." },
  { cat: "agency", text: "나는 내 선택을 믿고 책임질 수 있다." },
  { cat: "agency", text: "나는 흔들리지 않는 내 기준을 세워간다." },
  { cat: "agency", text: "나는 나에게 맞는 길을 찾을 수 있다." },
  { cat: "agency", text: "나는 내 삶을 스스로 이끌 수 있다." },
  { cat: "agency", text: "나는 불확실함 속에서도 앞으로 나아간다." },
  { cat: "agency", text: "나는 내 가능성을 작게 보지 않는다." },
  { cat: "agency", text: "나는 내가 생각하는 것보다 더 강하다." },
  { cat: "agency", text: "나는 내 안의 용기를 매일 깨운다." },
  { cat: "agency", text: "나는 두려움이 있어도 행동할 수 있다." },
  // 성장·배움
  { cat: "growth", text: "나는 오늘의 작은 성취도 소중히 여긴다." },
  { cat: "growth", text: "나는 작은 변화가 큰 결과를 만든다는 것을 안다." },
  { cat: "growth", text: "나는 꾸준함의 힘을 믿는다." },
  { cat: "growth", text: "나는 천천히 가도 멈추지 않는다." },
  { cat: "growth", text: "나는 나의 노력을 결코 헛되다고 여기지 않는다." },
  { cat: "growth", text: "나는 오늘 한 걸음만으로도 충분히 잘하고 있다." },
  { cat: "growth", text: "나는 완벽하지 않아도 괜찮다." },
  { cat: "growth", text: "나는 계속 나아가는 나를 칭찬한다." },
  { cat: "growth", text: "나는 성장의 과정 자체를 사랑한다." },
  { cat: "growth", text: "나는 오늘도 조금씩 더 나아지고 있다." },
  // 자기 존중
  { cat: "selfworth", text: "나는 나의 가치를 외부 평가로만 정하지 않는다." },
  { cat: "selfworth", text: "나는 이미 충분히 소중한 사람이다." },
  { cat: "selfworth", text: "나는 있는 그대로 사랑받을 자격이 있다." },
  { cat: "selfworth", text: "나는 나 자신을 존중하는 사람이다." },
  { cat: "selfworth", text: "나는 비교보다 나의 길에 집중한다." },
  { cat: "selfworth", text: "나는 나만의 속도와 방식이 있다." },
  { cat: "selfworth", text: "나는 내 이야기를 부끄러워하지 않는다." },
  { cat: "selfworth", text: "나는 나의 개성과 진심을 소중히 여긴다." },
  { cat: "selfworth", text: "나는 내 존재 자체로 의미가 있다." },
  { cat: "selfworth", text: "나는 나를 깎아내리는 말보다 지켜주는 말을 선택한다." },
  // 관계·사랑
  { cat: "relationship", text: "나는 좋은 인연을 알아보고 소중히 여긴다." },
  { cat: "relationship", text: "나는 건강한 관계를 만들어갈 수 있다." },
  { cat: "relationship", text: "나는 나를 존중하는 사람들과 잘 어울린다." },
  { cat: "relationship", text: "나는 마음을 나눌 수 있는 관계를 환영한다." },
  { cat: "relationship", text: "나는 사랑을 주고받을 준비가 되어 있다." },
  { cat: "relationship", text: "나는 상대를 이해하면서도 나를 잃지 않는다." },
  { cat: "relationship", text: "나는 경계가 있는 사랑이 더 깊다는 것을 안다." },
  { cat: "relationship", text: "나는 솔직하고 따뜻한 관계를 만든다." },
  { cat: "relationship", text: "나는 나와 맞는 사람과 자연스럽게 연결된다." },
  { cat: "relationship", text: "나는 관계 속에서도 내 중심을 지킨다." },
  // 감사·기쁨
  { cat: "gratitude", text: "나는 오늘도 내 삶에 감사할 이유를 찾는다." },
  { cat: "gratitude", text: "나는 작은 기쁨을 크게 느낄 줄 안다." },
  { cat: "gratitude", text: "나는 평범한 순간 속에서도 행복을 발견한다." },
  { cat: "gratitude", text: "나는 내 일상에 스며든 축복을 알아본다." },
  { cat: "gratitude", text: "나는 감사할수록 더 풍요로워진다." },
  { cat: "gratitude", text: "나는 지금 가진 것에 만족하면서도 더 나아질 수 있다." },
  { cat: "gratitude", text: "나는 마음의 여유를 키워간다." },
  { cat: "gratitude", text: "나는 순간순간을 더 깊이 음미한다." },
  { cat: "gratitude", text: "나는 조용한 행복을 소중히 여긴다." },
  { cat: "gratitude", text: "나는 오늘의 햇살 같은 순간을 놓치지 않는다." },
  // 마음의 평화
  { cat: "peace", text: "나는 나를 지치게 하는 생각을 흘려보낼 수 있다." },
  { cat: "peace", text: "나는 불필요한 걱정을 내려놓는다." },
  { cat: "peace", text: "나는 모든 것을 통제하지 않아도 괜찮다." },
  { cat: "peace", text: "나는 흐름을 믿고 한 걸음씩 나아간다." },
  { cat: "peace", text: "나는 마음의 짐을 가볍게 할 수 있다." },
  { cat: "peace", text: "나는 지금 이 순간에 머물 수 있다." },
  { cat: "peace", text: "나는 내 호흡을 통해 다시 안정된다." },
  { cat: "peace", text: "나는 혼란 속에서도 중심을 찾는다." },
  { cat: "peace", text: "나는 내 안의 평온을 회복할 수 있다." },
  { cat: "peace", text: "나는 급하지 않아도 괜찮다." },
  // 꿈·미래
  { cat: "dream", text: "나는 나의 꿈을 포기하지 않는다." },
  { cat: "dream", text: "나는 내가 원하는 삶을 충분히 만들 수 있다." },
  { cat: "dream", text: "나는 매일 내 꿈에 가까워지고 있다." },
  { cat: "dream", text: "나는 나의 열망을 진지하게 존중한다." },
  { cat: "dream", text: "나는 나의 미래를 긍정적으로 그린다." },
  { cat: "dream", text: "나는 가능성을 좁게 보지 않는다." },
  { cat: "dream", text: "나는 새로운 기회를 기쁘게 맞이한다." },
  { cat: "dream", text: "나는 내 가능성을 키우는 선택을 한다." },
  { cat: "dream", text: "나는 두려움보다 가능성을 더 크게 본다." },
  { cat: "dream", text: "나는 나의 미래를 스스로 밝힌다." },
  // 지혜·직관
  { cat: "wisdom", text: "나는 내 안의 지혜를 신뢰한다." },
  { cat: "wisdom", text: "나는 중요한 순간에 좋은 판단을 할 수 있다." },
  { cat: "wisdom", text: "나는 서두르지 않고 현명하게 선택한다." },
  { cat: "wisdom", text: "나는 나에게 필요한 답을 찾을 수 있다." },
  { cat: "wisdom", text: "나는 내 직감을 존중한다." },
  { cat: "wisdom", text: "나는 마음과 현실의 균형을 잘 맞춘다." },
  { cat: "wisdom", text: "나는 상황을 넓게 바라볼 수 있다." },
  { cat: "wisdom", text: "나는 내 삶에 필요한 배움을 기꺼이 받아들인다." },
  { cat: "wisdom", text: "나는 경험을 통해 더 지혜로워진다." },
  { cat: "wisdom", text: "나는 성장할수록 더 분명해진다." },
  // 건강·몸
  { cat: "health", text: "나는 내 몸을 소중히 돌본다." },
  { cat: "health", text: "나는 휴식과 회복이 필요할 때 멈출 수 있다." },
  { cat: "health", text: "나는 건강한 습관을 선택하는 힘이 있다." },
  { cat: "health", text: "나는 내 몸의 회복력을 믿는다." },
  { cat: "health", text: "나는 나의 에너지를 아껴서 잘 쓴다." },
  { cat: "health", text: "나는 내 몸과 마음의 균형을 지킨다." },
  { cat: "health", text: "나는 내 컨디션을 존중하는 사람이 된다." },
  { cat: "health", text: "나는 꾸준한 돌봄이 나를 살린다는 것을 안다." },
  { cat: "health", text: "나는 내 몸을 미워하지 않는다." },
  { cat: "health", text: "나는 내 몸과 우호적인 관계를 만든다." },
  // 재물·풍요
  { cat: "abundance", text: "나는 돈을 받는 것에 죄책감을 느끼지 않는다." },
  { cat: "abundance", text: "나는 내 노동과 재능이 충분히 가치 있음을 안다." },
  { cat: "abundance", text: "나는 풍요를 받아도 안전하다." },
  { cat: "abundance", text: "나는 재정적으로도 점점 더 안정된다." },
  { cat: "abundance", text: "나는 돈을 다루는 감각이 점점 좋아진다." },
  { cat: "abundance", text: "나는 나의 능력에 맞는 보상을 받을 자격이 있다." },
  { cat: "abundance", text: "나는 수입이 늘어나는 흐름을 기쁘게 맞이한다." },
  { cat: "abundance", text: "나는 돈을 통해 삶의 가능성을 넓힌다." },
  { cat: "abundance", text: "나는 필요한 만큼, 그리고 그 이상으로도 채워질 수 있다." },
  { cat: "abundance", text: "나는 재물과 마음의 평화를 함께 키운다." },
  // 재건(회복)
  { cat: "resilience", text: "나는 내 인생의 속도를 존중한다." },
  { cat: "resilience", text: "나는 빨리 가는 것보다 제대로 가는 것을 선택한다." },
  { cat: "resilience", text: "나는 지금의 과정이 의미 있음을 안다." },
  { cat: "resilience", text: "나는 느리더라도 확실하게 성장한다." },
  { cat: "resilience", text: "나는 흐트러져도 다시 정돈할 수 있다." },
  { cat: "resilience", text: "나는 오늘의 나를 실망시키지 않는다." },
  { cat: "resilience", text: "나는 내 삶을 다시 세울 수 있는 사람이다." },
  { cat: "resilience", text: "나는 지금의 어려움도 지나갈 것임을 안다." },
  { cat: "resilience", text: "나는 내일을 위해 오늘을 잘 살아간다." },
  { cat: "resilience", text: "나는 스스로를 끝까지 포기하지 않는다." },
  // 선함·따뜻함(관계)
  { cat: "relationship", text: "나는 내 안의 선함을 믿는다." },
  { cat: "relationship", text: "나는 따뜻함을 잃지 않는 사람이다." },
  { cat: "relationship", text: "나는 세상을 더 부드럽게 만드는 힘이 있다." },
  { cat: "relationship", text: "나는 나의 진심이 결국 닿는다고 믿는다." },
  { cat: "relationship", text: "나는 나답게 살아도 사랑받을 수 있다." },
  { cat: "relationship", text: "나는 진실한 마음으로 관계를 맺는다." },
  { cat: "relationship", text: "나는 친절함을 잃지 않으면서도 단단하다." },
  { cat: "relationship", text: "나는 나의 선한 마음을 보호할 수 있다." },
  { cat: "relationship", text: "나는 좋은 영향을 주고받는 삶을 선택한다." },
  { cat: "relationship", text: "나는 내가 있는 곳에 온기를 남긴다." },
  // 치유(회복)
  { cat: "resilience", text: "나는 오늘의 불편함이 영원하지 않음을 안다." },
  { cat: "resilience", text: "나는 감정의 파도를 지나갈 수 있다." },
  { cat: "resilience", text: "나는 슬픔을 느껴도 괜찮은 사람이다." },
  { cat: "resilience", text: "나는 내 눈물을 부끄러워하지 않는다." },
  { cat: "resilience", text: "나는 아픔을 겪으면서도 여전히 소중하다." },
  { cat: "resilience", text: "나는 상처받은 나를 잘 돌볼 수 있다." },
  { cat: "resilience", text: "나는 회복은 한 번에 오지 않아도 괜찮다고 믿는다." },
  { cat: "resilience", text: "나는 치유의 속도를 존중한다." },
  { cat: "resilience", text: "나는 오늘도 조금씩 나아지고 있다." },
  { cat: "resilience", text: "나는 지나온 고통을 넘어 새로운 삶을 만든다." },
  // 기쁨(감사)
  { cat: "gratitude", text: "나는 내 삶에 기쁨이 더 많이 들어오도록 허락한다." },
  { cat: "gratitude", text: "나는 웃을 수 있는 순간을 놓치지 않는다." },
  { cat: "gratitude", text: "나는 즐거움을 느낄 자격이 있다." },
  { cat: "gratitude", text: "나는 편안함을 죄책감 없이 누린다." },
  { cat: "gratitude", text: "나는 행복을 멀리 있는 목표가 아니라 지금의 선택으로 만든다." },
  { cat: "gratitude", text: "나는 내 삶에 밝은 에너지를 채운다." },
  { cat: "gratitude", text: "나는 좋은 소식과 좋은 흐름을 맞이한다." },
  { cat: "gratitude", text: "나는 내 하루를 더 사랑하게 된다." },
  { cat: "gratitude", text: "나는 평온함 속에서도 충분히 행복하다." },
  { cat: "gratitude", text: "나는 내 삶의 아름다움을 자주 발견한다." },
  // 배움(성장)
  { cat: "growth", text: "나는 배울수록 더 자유로워진다." },
  { cat: "growth", text: "나는 경험이 나를 망치지 않고 성장시킨다고 믿는다." },
  { cat: "growth", text: "나는 실수를 통해 더 현명해진다." },
  { cat: "growth", text: "나는 내 약점도 성장의 재료로 바꿀 수 있다." },
  { cat: "growth", text: "나는 변화가 두려워도 적응할 수 있다." },
  { cat: "growth", text: "나는 새로운 시작을 환영한다." },
  { cat: "growth", text: "나는 낯선 길도 걸어갈 수 있다." },
  { cat: "growth", text: "나는 삶의 전환점에서도 나를 잃지 않는다." },
  { cat: "growth", text: "나는 더 나은 선택을 할 수 있는 사람이다." },
  { cat: "growth", text: "나는 오늘의 선택이 내 미래를 만든다는 것을 안다." },
  // 자기 신뢰(자기 존중)
  { cat: "selfworth", text: "나는 내 마음이 원하는 것을 진지하게 들어준다." },
  { cat: "selfworth", text: "나는 나의 진짜 바람을 외면하지 않는다." },
  { cat: "selfworth", text: "나는 내 삶의 방향을 스스로 선택한다." },
  { cat: "selfworth", text: "나는 내 가능성을 제한하지 않는다." },
  { cat: "selfworth", text: "나는 나의 가치를 낮게 부르지 않는다." },
  { cat: "selfworth", text: "나는 충분히 잘하고 있고, 충분히 나아지고 있다." },
  { cat: "selfworth", text: "나는 나를 믿는 연습을 계속한다." },
  { cat: "selfworth", text: "나는 불안 속에서도 희망을 찾는다." },
  { cat: "selfworth", text: "나는 오늘도 자기 자신에게 친절하다." },
  { cat: "selfworth", text: "나는 내 삶을 더 다정하고 깊게 살아간다." },
  // 종합(회복)
  { cat: "resilience", text: "나는 작아 보이는 한 걸음도 소중히 여긴다." },
  { cat: "resilience", text: "나는 매일의 반복 속에서 힘을 만든다." },
  { cat: "resilience", text: "나는 나의 하루를 바꾸는 사람이다." },
  { cat: "resilience", text: "나는 고통을 경험했어도 여전히 사랑받을 수 있다." },
  { cat: "resilience", text: "나는 회복한 만큼 더 깊어진 사람이다." },
  { cat: "resilience", text: "나는 내 삶을 다시 아름답게 빚어간다." },
  { cat: "resilience", text: "나는 오늘도 나의 편이 되어준다." },
  { cat: "resilience", text: "나는 내 인생의 좋은 흐름을 믿는다." },
  { cat: "resilience", text: "나는 고통을 넘어 평온과 행복을 향해 간다." },
  { cat: "resilience", text: "나는 결국 더 강하고, 더 따뜻하고, 더 행복한 사람이 된다." },
];

const HOPES: readonly string[] = [
  "막혔던 흐름이 서서히 풀려 갑니다.",
  "정리한 만큼 새로운 자리가 생깁니다.",
  "회복은 이미 조용히 시작되었습니다.",
  "오늘의 작은 정비가 내일의 여유가 됩니다.",
  "가라앉았던 기운이 다시 차오릅니다.",
  "느리게 오는 것일수록 오래 남습니다.",
  "닫혀 있던 문 하나가 곧 열립니다.",
  "지금의 고요함이 다음 도약의 준비입니다.",
  "흩어졌던 마음이 제자리를 찾아갑니다.",
  "당신의 결이 서서히 밝아지고 있습니다.",
  "쉬어 간 자리에서 새 길이 열립니다.",
  "오늘 심은 작은 습관이 멀리까지 갑니다.",
  "무거웠던 하루가 한결 가벼워집니다.",
  "기다림의 끝에서 반가운 소식이 옵니다.",
  "정직한 하루가 좋은 인연을 부릅니다.",
  "지금의 정비가 더 넓은 확장으로 이어집니다.",
  "애쓴 마음은 어떤 형태로든 돌아옵니다.",
  "흐린 하늘 뒤에도 해는 여전히 그 자리에 있습니다.",
  "작게 웃는 오늘이 내일의 힘이 됩니다.",
  "당신의 자리는 조금씩 넓어지고 있습니다.",
  "지금 걷는 길이 결국 당신에게 닿습니다.",
  "오래 품은 바람이 형태를 갖추기 시작합니다.",
  "지친 하루 끝엔 반드시 쉼표가 옵니다.",
  "천천히 내린 뿌리가 가장 깊습니다.",
  "오늘의 다정함이 누군가에게 오래 남습니다.",
  "돌아보면 오늘도 한 걸음 나아가 있습니다.",
  "흔들린 만큼 더 단단히 자리 잡습니다.",
  "곧, 마음이 한결 가벼워질 일이 생깁니다.",
  "당신이 놓지 않은 것들이 당신을 지킵니다.",
  "새 계절은 늘 조용히 먼저 도착합니다.",
];

const YEONI_GREETINGS: readonly string[] = [
  "오늘도 연이가 곁에서 응원할게요. 좋은 하루 되세요!",
  "당신의 하루가 오늘 유난히 반짝이길 바라요.",
  "조금 느려도 괜찮아요. 오늘도 잘 해낼 거예요.",
  "따뜻한 차 한 잔 같은 하루가 되길 바라요.",
  "오늘 하루, 당신에게 좋은 일만 스며들길.",
  "무리하지 말고, 당신 속도대로 걸어요.",
  "연이가 오늘도 당신의 하루를 살포시 응원해요.",
  "오늘은 당신에게 조금 더 다정한 하루이길.",
  "작은 기쁨 하나쯤은 꼭 만나는 하루 되세요.",
  "잘 자고, 잘 먹고, 오늘도 나를 아껴 줘요.",
  "당신이 웃는 순간이 오늘 많기를 바라요.",
  "오늘 하루도 당신 편이에요. 힘내요, 우리!",
  "바쁜 와중에도 잠깐의 쉼을 챙기길 바라요.",
  "오늘의 당신을 연이가 가만히 안아 줄게요.",
  "좋은 하루의 시작, 깊게 숨 한번 쉬어 볼까요?",
  "오늘 만나는 사람들에게 다정하게, 그리고 당신에게도.",
  "비가 와도 마음만은 맑은 하루 되세요.",
  "당신이 오늘 한 모든 애씀을 연이는 알아요.",
  "오늘은 스스로에게 칭찬 한마디 건네 보세요.",
  "고단한 날엔 잠시 멈춰도 괜찮아요.",
  "오늘 하루, 당신다운 하루로 채워지길.",
  "작은 걸음도 걸음이에요. 오늘도 고마워요.",
  "당신의 오늘이 어제보다 조금 더 편안하길.",
  "좋은 하루 되세요. 연이는 늘 당신 편이에요.",
];

const FLOWERS: readonly LockScreenFlower[] = [
  { name: "장미", meaning: "사랑, 그리고 열정" },
  { name: "튤립", meaning: "사랑의 고백" },
  { name: "벚꽃", meaning: "순수한 마음" },
  { name: "해바라기", meaning: "당신만을 바라봅니다" },
  { name: "안개꽃", meaning: "맑은 마음, 영원한 사랑" },
  { name: "라벤더", meaning: "침묵과 기다림" },
  { name: "수국", meaning: "진심 어린 마음" },
  { name: "물망초", meaning: "나를 잊지 말아요" },
  { name: "카네이션", meaning: "감사와 사랑" },
  { name: "데이지", meaning: "순수, 희망" },
  { name: "백합", meaning: "순결과 위엄" },
  { name: "동백꽃", meaning: "그대를 누구보다 사랑합니다" },
  { name: "매화", meaning: "고결한 마음, 인내" },
  { name: "국화", meaning: "고결, 청순한 사랑" },
  { name: "코스모스", meaning: "소녀의 순정" },
  { name: "은방울꽃", meaning: "다시 찾은 행복" },
  { name: "제비꽃", meaning: "겸손, 성실" },
  { name: "프리지아", meaning: "당신의 시작을 응원해요" },
  { name: "라일락", meaning: "첫사랑의 설렘" },
  { name: "수선화", meaning: "자존, 그리고 신비" },
  { name: "민들레", meaning: "행복, 감사하는 마음" },
  { name: "클로버", meaning: "약속, 행운" },
  { name: "달맞이꽃", meaning: "말없는 사랑" },
  { name: "목련", meaning: "고귀함, 자연에 대한 사랑" },
  { name: "치자꽃", meaning: "한없는 즐거움" },
  { name: "작약", meaning: "수줍음, 부끄러움" },
  { name: "봉선화", meaning: "나를 건드리지 마세요" },
  { name: "능소화", meaning: "그리움, 명예" },
  { name: "패랭이꽃", meaning: "순결한 사랑" },
  { name: "제라늄", meaning: "그대가 있어 행복해요" },
  { name: "스위트피", meaning: "추억, 그리고 작별" },
  { name: "아이리스", meaning: "좋은 소식, 기별" },
  { name: "금잔화", meaning: "이별의 슬픔, 그리고 인내" },
  { name: "메리골드", meaning: "반드시 오고야 말 행복" },
  { name: "협죽도", meaning: "주의, 그리고 방심하지 않는 마음" },
  { name: "재스민", meaning: "친절, 상냥함" },
];

const QUOTES: readonly LockScreenQuote[] = [
  { text: "천 리 길도 한 걸음에서 시작된다.", author: "노자" },
  { text: "우리가 반복해서 하는 것이 곧 우리 자신이다.", author: "아리스토텔레스" },
  { text: "지금 서 있는 곳에서, 가진 것으로, 할 수 있는 일을 하라.", author: "시어도어 루스벨트" },
  { text: "고요한 물이 깊게 흐른다.", author: "서양 속담" },
  { text: "인내는 쓰지만 그 열매는 달다.", author: "장 자크 루소" },
  { text: "행복은 습관이다. 그것을 몸에 지녀라.", author: "허버트" },
  { text: "가장 어두운 밤도 끝이 나고 해는 떠오른다.", author: "빅토르 위고" },
  { text: "너 자신을 아는 것이 모든 지혜의 시작이다.", author: "아리스토텔레스" },
  { text: "상처가 있는 곳으로 빛이 들어온다.", author: "루미" },
  { text: "서두르지 않되 멈추지도 마라.", author: "괴테" },
  { text: "오늘 할 수 있는 일에 전념하라.", author: "아이작 뉴턴" },
  { text: "흐르는 물은 썩지 않는다.", author: "동양 격언" },
  { text: "작은 기회로부터 종종 위대한 성취가 시작된다.", author: "데모스테네스" },
  { text: "마음이 고요하면 온 세상이 잔잔해진다.", author: "장자" },
  { text: "길을 아는 것과 그 길을 걷는 것은 다르다.", author: "동양 격언" },
  { text: "느리게 가는 것을 두려워 말고, 멈춰 서는 것을 두려워하라.", author: "중국 속담" },
  { text: "평온한 마음은 몸의 생명이다.", author: "잠언" },
  { text: "위대한 일은 충동이 아니라 작은 일들이 모여 이루어진다.", author: "빈센트 반 고흐" },
  { text: "할 수 있다고 믿는 사람은 그렇게 되고, 할 수 없다고 믿는 사람도 그렇게 된다.", author: "샤를 드골" },
  { text: "행복은 이미 완성된 것이 아니라 당신의 행동에서 온다.", author: "달라이 라마" },
  { text: "미래를 예측하는 가장 좋은 방법은 미래를 만드는 것이다.", author: "에이브러햄 링컨" },
  { text: "삶이 있는 한 희망은 있다.", author: "키케로" },
  { text: "성공은 최종이 아니고 실패는 치명적이지 않다. 중요한 것은 계속하는 용기다.", author: "윈스턴 처칠" },
  { text: "가장 큰 영광은 넘어지지 않는 것이 아니라 넘어질 때마다 일어서는 것이다.", author: "넬슨 만델라" },
  { text: "노력하는 사람에게 불가능이란 없다.", author: "나폴레옹" },
  { text: "당신이 할 수 있다고 생각하든 없다고 생각하든, 당신의 생각이 옳다.", author: "헨리 포드" },
  { text: "친절은 귀머거리도 듣고 장님도 볼 수 있는 언어다.", author: "마크 트웨인" },
  { text: "오늘 심는 씨앗이 내일의 열매가 된다.", author: "랠프 월도 에머슨" },
  { text: "하루하루가 새로운 삶이다. 오늘을 붙잡아라.", author: "호라티우스" },
  { text: "가장 좋은 시절은 아직 오지 않았다.", author: "로버트 브라우닝" },
  { text: "웃음은 두 사람 사이의 가장 짧은 거리다.", author: "빅토르 보르게" },
  { text: "행동은 모든 성공의 기본 열쇠다.", author: "파블로 피카소" },
];

const KNOWLEDGE: readonly LockScreenKnowledge[] = [
  { system: "사주", text: "일간(日干)은 사주에서 '나 자신'을 가리키는 기준점입니다. 오늘의 기운도 이 중심에서 읽습니다." },
  { system: "사주", text: "오행(五行)의 균형은 넘침을 덜고 모자람을 채우는 데 있습니다. 치우친 하루엔 반대의 기운을 더해 보세요." },
  { system: "사주", text: "십성(十星)은 나와 세상의 관계를 열 가지로 나눈 이름표입니다. 관계의 결을 이해하는 실마리가 됩니다." },
  { system: "타로", text: "타로 78장은 삶의 국면을 상징으로 담습니다. 정방향과 역방향은 옳고 그름이 아니라 흐름의 방향입니다." },
  { system: "타로", text: "메이저 아르카나는 인생의 큰 장(章)을, 마이너는 일상의 결을 말합니다. 오늘은 작은 결에 주목해 보세요." },
  { system: "자미두수", text: "명궁(命宮)은 타고난 성향과 삶의 무대를 보여 주는 자리입니다. 나의 기본 결을 이해하는 출발점입니다." },
  { system: "자미두수", text: "삼방사정(三方四正)은 한 궁을 둘러싼 별들의 상호작용을 봅니다. 오늘의 일도 주변과의 관계 속에서 읽힙니다." },
  { system: "베다점성술", text: "나크샤트라는 달이 머무는 27개의 자리로, 그날의 미세한 기운을 읽는 인도 점성술의 지도입니다." },
  { system: "베다점성술", text: "다샤(Dasha)는 삶을 흐르는 시기의 주기입니다. 지금이 어느 계절인지 알면 서두를 때와 기다릴 때가 보입니다." },
  { system: "숙요점", text: "숙요는 달의 자리인 27수(宿)로 그날의 기운을 읽습니다. 오늘의 본명숙은 하루의 결을 부드럽게 안내합니다." },
  { system: "숙요점", text: "27수는 안세(安)·위세(危) 같은 관계로 서로를 돕고 견제합니다. 사람 사이의 거리를 가늠하는 데 쓰입니다." },
  { system: "점성술", text: "상승궁(어센던트)은 세상에 비치는 나의 첫인상을 보여 줍니다. 태양이 '무엇'이라면 상승궁은 '어떻게'입니다." },
  { system: "점성술", text: "하우스는 삶의 열두 무대입니다. 행성이 어느 무대에 있는지가 그 기운이 펼쳐질 곳을 알려 줍니다." },
  { system: "점성술", text: "트랜싯은 지금 하늘을 지나는 행성이 내 별자리를 건드리는 순간입니다. 변화의 신호를 읽는 창입니다." },
  { system: "사주", text: "격국(格局)은 사주 전체의 짜임새를 하나의 그림으로 봅니다. 오늘의 선택도 큰 그림 안에서 가벼워집니다." },
  { system: "타로", text: "같은 카드도 자리와 질문에 따라 다르게 말합니다. 정답을 찾기보다, 지금의 마음을 비추는 거울로 삼아 보세요." },
  { system: "사주", text: "대운(大運)은 십 년 단위로 흐르는 큰 물결입니다. 오늘의 작은 파도도 그 큰 흐름 위에 있습니다." },
  { system: "사주", text: "용신(用神)은 사주의 균형을 잡아 주는 열쇠 같은 기운입니다. 내게 힘이 되는 색·방향·계절을 알려 줍니다." },
  { system: "타로", text: "컵은 감정, 완드는 열정, 소드는 생각, 펜타클은 현실을 상징합니다. 오늘 어떤 슈트가 나를 이끄는지 살펴보세요." },
  { system: "자미두수", text: "화록·화권·화과·화기 사화(四化)는 별의 기운에 색을 입힙니다. 같은 별도 사화에 따라 다르게 작동합니다." },
  { system: "베다점성술", text: "라후와 케투는 달의 궤도가 만나는 점으로, 집착과 초연함이라는 두 방향의 배움을 상징합니다." },
  { system: "숙요점", text: "본명숙은 태어난 날 달이 머문 자리입니다. 나의 타고난 리듬과 인연의 결을 부드럽게 비춥니다." },
  { system: "점성술", text: "달은 감정과 습관의 자리입니다. 태양이 낮의 나라면, 달은 혼자 있을 때의 나에 가깝습니다." },
  { system: "점성술", text: "수성 역행은 소통·이동·계약을 다시 점검하라는 신호입니다. 새로 벌이기보다 되돌아보기 좋은 때입니다." },
  { system: "사주", text: "지지(地支)에 숨은 지장간은 겉으로 드러나지 않는 속마음 같은 기운입니다. 사람의 이면을 이해하는 단서가 됩니다." },
  { system: "타로", text: "역방향은 나쁜 것이 아니라 '안으로 향한' 에너지입니다. 밖으로 못 쓴 힘을 어디에 두었는지 살펴보세요." },
  { system: "자미두수", text: "재백궁은 돈의 자리, 관록궁은 일의 자리입니다. 오늘의 관심이 어느 궁에 있는지가 하루의 무게를 정합니다." },
  { system: "점성술", text: "금성은 사랑과 아름다움, 그리고 무엇을 좋아하는가의 자리입니다. 오늘 마음이 끌리는 것에 힌트가 있습니다." },
  // ── 사주(四柱) 지식 — 매일 하나씩, 실제로 쓸모 있는 개념을 쉬운 한 줄로 ──
  { system: "사주", text: "천간(天干) 열 글자는 하늘의 기운, 지지(地支) 열두 글자는 땅의 기운입니다. 사주는 이 여덟 글자로 나를 읽습니다." },
  { system: "사주", text: "오행은 서로 낳고(생) 누릅니다(극). 목생화·화생토처럼 '낳는' 흐름을 알면 내게 힘을 주는 기운이 보입니다." },
  { system: "사주", text: "목극토·토극수처럼 '누르는' 관계도 있습니다. 나를 억누르는 기운을 알면 스트레스의 결도 이해됩니다." },
  { system: "사주", text: "비견·겁재(비겁)는 나와 같은 편, 형제·동료의 기운입니다. 경쟁이면서 협력이 되는 자리입니다." },
  { system: "사주", text: "식신·상관(식상)은 내가 만들어 내보내는 기운입니다. 표현·재능·먹을 복과 이어집니다." },
  { system: "사주", text: "정재·편재(재성)는 내가 다스리는 재물과 현실의 자리입니다. 꾸준한 재물과 큰 판의 재물로 나뉩니다." },
  { system: "사주", text: "정관·편관(관성)은 나를 다스리는 규범·직책·책임의 기운입니다. 자기 절제와 사회적 자리를 봅니다." },
  { system: "사주", text: "정인·편인(인성)은 나를 낳아 주는 기운으로, 배움·문서·어머니 같은 자리입니다. 공부와 자격이 여기서 열립니다." },
  { system: "사주", text: "대운(大運)은 십 년마다 바뀌는 큰 계절입니다. 지금이 봄인지 겨울인지 알면 서두를 때와 기다릴 때가 보입니다." },
  { system: "사주", text: "세운(歲運)은 그해의 기운입니다. 대운이라는 계절 위에 매년의 날씨가 겹친다고 보면 됩니다." },
  { system: "사주", text: "용신(用神)은 사주의 균형을 잡아 주는 열쇠 기운입니다. 내게 힘이 되는 색·방향·계절을 알려 줍니다." },
  { system: "사주", text: "희신은 용신을 돕는 반가운 기운, 기신은 균형을 깨는 조심할 기운입니다. 나를 살리는 편을 아는 일입니다." },
  { system: "사주", text: "신강(身强)은 나의 기운이 든든한 것, 신약(身弱)은 여린 것입니다. 강하면 덜어 주고 약하면 채워 줍니다." },
  { system: "사주", text: "지장간(支藏干)은 지지 속에 숨은 천간, 겉으로 드러나지 않는 속마음 같은 기운입니다. 사람의 이면을 봅니다." },
  { system: "사주", text: "월지(月支)는 태어난 달의 기운으로, 사주에서 가장 힘이 센 자리입니다. 계절이 나의 바탕을 정합니다." },
  { system: "사주", text: "근묘화실(根苗花實)은 연·월·일·시를 뿌리·싹·꽃·열매로 봅니다. 조상에서 나, 그리고 자식까지의 흐름입니다." },
  { system: "사주", text: "십이운성은 장생·제왕·묘처럼 기운의 열두 단계입니다. 지금 내 기운이 차오르는지 저무는지 읽습니다." },
  { system: "사주", text: "합(合)은 두 기운이 손잡는 것입니다. 천간합·삼합·육합이 있으며, 인연과 협력의 결을 봅니다." },
  { system: "사주", text: "충(沖)은 두 기운이 부딪히는 것입니다. 변동·이동·자극의 신호이며, 나쁘기만 한 것은 아닙니다." },
  { system: "사주", text: "형·파·해(刑破害)는 미세한 어긋남입니다. 관계나 건강에서 작은 마찰로 나타날 수 있어 미리 살피면 좋습니다." },
  { system: "사주", text: "도화살은 매력과 인기, 역마살은 이동과 변화, 화개살은 예술과 고독의 기운입니다. 살(煞)은 색깔일 뿐 흉이 아닙니다." },
  { system: "사주", text: "천을귀인(天乙貴人)은 대표적 길신으로, 어려울 때 돕는 사람이 나타나는 자리입니다. 귀인의 방향을 봅니다." },
  { system: "사주", text: "공망(空亡)은 잠시 비어 있는 자리입니다. 그 기운은 흉이 아니라 채워질 때를 기다리는 여백으로 읽습니다." },
  { system: "사주", text: "조후(調候)는 사주의 온도와 습도를 고르는 일입니다. 너무 뜨겁거나 차가운 사주엔 반대의 기운이 약이 됩니다." },
  { system: "사주", text: "통근(通根)은 천간이 지지에 뿌리내린 것입니다. 뿌리가 깊은 글자는 그만큼 힘 있게 작동합니다." },
  { system: "사주", text: "육친(六親)은 사주 글자를 부모·형제·배우자·자식으로 읽는 법입니다. 관계 속의 나를 이해하는 지도입니다." },
  { system: "사주", text: "왕상휴수사(旺相休囚死)는 계절에 따라 오행의 힘이 달라지는 원리입니다. 같은 글자도 때를 만나면 강해집니다." },
  // ── 사용자 제공 사주 지식 100선(원문 그대로) ──
  { system: "사주", text: "지장간은 겉으로 드러나지 않은 잠재력과 내면의 가능성을 의미한다." },
  { system: "사주", text: "천간은 현재 드러난 의식과 행동을 의미한다." },
  { system: "사주", text: "지지는 환경과 현실, 인간관계를 의미하는 경우가 많다." },
  { system: "사주", text: "월지는 사주의 계절과 세력을 결정하는 중심축이다." },
  { system: "사주", text: "월령을 얻은 오행은 가장 강력한 힘을 가진다." },
  { system: "사주", text: "용신은 부족한 균형을 회복시키는 핵심 에너지이다." },
  { system: "사주", text: "희신은 용신을 도와 운을 상승시키는 요소이다." },
  { system: "사주", text: "기신은 균형을 무너뜨리는 방해 요소이다." },
  { system: "사주", text: "구신은 기신보다 더 큰 문제를 만드는 오행이다." },
  { system: "사주", text: "억부용신은 강약의 균형을 맞추는 방식이다." },
  { system: "사주", text: "조후용신은 기후와 온도를 조절하는 것이 우선이다." },
  { system: "사주", text: "병약용신은 오행의 건강 상태를 회복시키는 개념이다." },
  { system: "사주", text: "통관용신은 충돌하는 오행을 연결하는 역할을 한다." },
  { system: "사주", text: "격국은 사주의 기본적인 구조와 방향성을 의미한다." },
  { system: "사주", text: "성격은 격국보다 용신의 영향을 더 크게 받는 경우가 많다." },
  { system: "사주", text: "용신이 대운에서 오면 인생의 전환점이 된다." },
  { system: "사주", text: "기신운에는 같은 실수를 반복하기 쉽다." },
  { system: "사주", text: "희신운에는 노력의 효율이 높아진다." },
  { system: "사주", text: "조후가 맞지 않으면 격이 높아도 고생하기 쉽다." },
  { system: "사주", text: "오행의 개수보다 세력이 더 중요하다." },
  { system: "사주", text: "통근한 천간은 쉽게 무너지지 않는다." },
  { system: "사주", text: "투간한 지장간은 현실에서 크게 발현된다." },
  { system: "사주", text: "뿌리가 없는 천간은 환경 변화에 약하다." },
  { system: "사주", text: "득령은 계절의 힘을 얻는 것이다." },
  { system: "사주", text: "득지는 뿌리를 얻는 것이다." },
  { system: "사주", text: "득세는 주변 오행의 도움을 받는 것이다." },
  { system: "사주", text: "천간합은 의식의 변화와 관계 변화로 나타난다." },
  { system: "사주", text: "지지합은 현실과 환경의 변화를 만든다." },
  { system: "사주", text: "충은 파괴보다 변화의 시작인 경우가 많다." },
  { system: "사주", text: "형은 심리적 갈등과 압박을 만든다." },
  { system: "사주", text: "파는 관계의 균열을 의미한다." },
  { system: "사주", text: "해는 서서히 인연이 멀어지는 작용이다." },
  { system: "사주", text: "삼합은 오행의 힘을 크게 증폭시킨다." },
  { system: "사주", text: "방합은 계절의 기운을 강화한다." },
  { system: "사주", text: "반합은 조건이 갖춰질 때 완성된다." },
  { system: "사주", text: "암합은 겉으로 드러나지 않는 연결이다." },
  { system: "사주", text: "암충은 보이지 않는 갈등을 만든다." },
  { system: "사주", text: "원진은 감정적인 거리감을 만들기 쉽다." },
  { system: "사주", text: "귀문은 직관력과 예민함을 높인다." },
  { system: "사주", text: "백호는 극단적인 사건성과 연결되기도 한다." },
  { system: "사주", text: "괴강은 강한 추진력과 독립성을 의미한다." },
  { system: "사주", text: "천을귀인은 인생의 귀인을 만나기 쉬운 구조이다." },
  { system: "사주", text: "문창귀인은 학문과 창작 능력을 높인다." },
  { system: "사주", text: "금여귀인은 품위와 복을 의미한다." },
  { system: "사주", text: "역마는 이동과 변화의 기운이다." },
  { system: "사주", text: "화개는 예술성과 종교성을 높인다." },
  { system: "사주", text: "도화는 매력과 표현력을 의미한다." },
  { system: "사주", text: "홍염은 강한 이성적 매력을 뜻한다." },
  { system: "사주", text: "양인은 추진력이 강하지만 극단성을 동반하기 쉽다." },
  { system: "사주", text: "건록은 자립성과 안정성을 의미한다." },
  { system: "사주", text: "제왕은 오행의 힘이 최고조에 이른 상태이다." },
  { system: "사주", text: "쇠지는 성숙과 정리의 시기이다." },
  { system: "사주", text: "묘지는 저장과 휴식의 의미가 강하다." },
  { system: "사주", text: "절지는 새로운 시작을 준비하는 단계이다." },
  { system: "사주", text: "태지는 가능성이 싹트는 시기이다." },
  { system: "사주", text: "장생은 성장의 출발점이다." },
  { system: "사주", text: "목욕은 경험과 시행착오가 많은 단계이다." },
  { system: "사주", text: "관대는 사회적 성장기이다." },
  { system: "사주", text: "임관은 실력을 인정받기 시작하는 시기이다." },
  { system: "사주", text: "장생운은 새로운 기회를 가져오는 경우가 많다." },
  { system: "사주", text: "재성은 돈보다 현실 감각을 의미한다." },
  { system: "사주", text: "관성은 직장보다 책임감을 의미한다." },
  { system: "사주", text: "인성은 공부보다 보호와 지원을 의미한다." },
  { system: "사주", text: "식상은 재능보다 표현력을 의미한다." },
  { system: "사주", text: "비겁은 경쟁보다 자아와 동료를 의미한다." },
  { system: "사주", text: "편재는 사업성과 활동성을 높인다." },
  { system: "사주", text: "정재는 안정적인 재물을 의미한다." },
  { system: "사주", text: "편관은 도전과 압박을 의미한다." },
  { system: "사주", text: "정관은 질서와 명예를 의미한다." },
  { system: "사주", text: "편인은 독창성과 연구력을 의미한다." },
  { system: "사주", text: "정인은 배움과 안정감을 의미한다." },
  { system: "사주", text: "식신은 꾸준한 생산성과 복을 의미한다." },
  { system: "사주", text: "상관은 창의성과 혁신을 의미한다." },
  { system: "사주", text: "겁재는 경쟁과 분배의 의미가 강하다." },
  { system: "사주", text: "비견은 독립성과 자존감을 높인다." },
  { system: "사주", text: "재생관은 돈이 명예를 만든다." },
  { system: "사주", text: "식신생재는 능력이 돈으로 이어진다." },
  { system: "사주", text: "살인상생은 위기가 성장으로 연결된다." },
  { system: "사주", text: "상관패인은 재능이 학문과 결합하는 구조이다." },
  { system: "사주", text: "상관견관은 권위와 충돌하기 쉽다." },
  { system: "사주", text: "인다신약은 생각이 행동보다 많아질 수 있다." },
  { system: "사주", text: "재다신약은 책임이 능력을 초과하기 쉽다." },
  { system: "사주", text: "비겁다자는 경쟁 속에서 성장한다." },
  { system: "사주", text: "식상다자는 표현력이 뛰어나다." },
  { system: "사주", text: "관다신약은 압박을 크게 느끼기 쉽다." },
  { system: "사주", text: "재다신왕은 사업 감각이 뛰어난 편이다." },
  { system: "사주", text: "인다신왕은 학문과 철학에 강하다." },
  { system: "사주", text: "진술축미는 저장과 변화의 토이다." },
  { system: "사주", text: "자오묘유는 왕성한 기운의 축이다." },
  { system: "사주", text: "인신사해는 이동성과 변화성이 강하다." },
  { system: "사주", text: "대운은 인생의 큰 계절을 의미한다." },
  { system: "사주", text: "세운은 한 해의 사건을 의미한다." },
  { system: "사주", text: "원국이 우선이고 대운은 이를 활성화한다." },
  { system: "사주", text: "좋은 운도 원국이 받아들일 준비가 되어야 발현된다." },
  { system: "사주", text: "나쁜 운도 원국의 장점을 활용하면 피해를 줄일 수 있다." },
  { system: "사주", text: "같은 사주라도 환경에 따라 발현 방식은 달라진다." },
  { system: "사주", text: "사주는 가능성을 말하며 선택은 결과를 바꾼다." },
  { system: "사주", text: "용신은 평생 변하지 않는 경우가 많지만 해석은 상황에 따라 달라질 수 있다." },
  { system: "사주", text: "명리학은 길흉을 단정하기보다 기운의 흐름을 읽는 학문이다." },
  { system: "사주", text: "가장 뛰어난 명리 해석은 오행의 균형과 실제 삶의 맥락을 함께 읽는 것이다." },
  // 타로 — 사주 편중을 덜기 위한 다른 점술 지식 확대
  { system: "타로", text: "타로는 미래를 정해 주는 도구가 아니라, 지금의 마음을 비추는 거울에 가깝습니다." },
  { system: "타로", text: "메이저 아르카나 22장은 '바보(0)'의 여정으로, 시작에서 완성까지의 성장을 담습니다." },
  { system: "타로", text: "'죽음' 카드는 끝이 아니라 한 국면의 마무리와 새로운 전환을 뜻합니다." },
  { system: "타로", text: "'탑' 카드는 무너짐이지만, 오래된 틀을 깨고 진실이 드러나는 순간이기도 합니다." },
  { system: "타로", text: "'별' 카드는 상처 뒤의 회복과 희망을 상징합니다. 조용한 치유의 신호입니다." },
  { system: "타로", text: "코트 카드(페이지·나이트·퀸·킹)는 사람이나 성향, 태도를 나타내는 경우가 많습니다." },
  { system: "타로", text: "역방향은 나쁜 뜻이 아니라 에너지가 안으로 향하거나 지연되는 상태를 말합니다." },
  { system: "타로", text: "3장 스프레드(과거·현재·미래)는 짧은 질문에 흐름을 읽기 좋은 기본 배열입니다." },
  { system: "타로", text: "켈틱 크로스는 상황·장애·희망·결과를 두루 살피는 대표적인 심화 배열입니다." },
  { system: "타로", text: "같은 카드도 질문과 자리에 따라 의미가 달라집니다. 맥락이 곧 해석입니다." },
  // 자미두수
  { system: "자미두수", text: "자미두수는 열두 궁에 별을 배치해 삶의 무대를 지도처럼 그리는 동양 점성술입니다." },
  { system: "자미두수", text: "자미성은 '제왕의 별'로, 중심을 잡고 이끄는 기운을 상징합니다." },
  { system: "자미두수", text: "명궁·신궁은 타고난 성향과 후천적으로 완성되는 나를 함께 보여 줍니다." },
  { system: "자미두수", text: "십이궁(명·형제·부처·자녀·재백·질액·천이·노복·관록·전택·복덕·부모)이 삶의 영역을 나눕니다." },
  { system: "자미두수", text: "부처궁은 배우자와 깊은 인연을, 관록궁은 일과 사회적 성취를 살피는 자리입니다." },
  { system: "자미두수", text: "사화(화록·화권·화과·화기)는 같은 별에도 재물·권력·명예·시련의 색을 입힙니다." },
  { system: "자미두수", text: "화기(化忌)는 흉이 아니라 집착과 과제의 자리로, 가장 애쓰는 지점을 알려 줍니다." },
  { system: "자미두수", text: "삼방사정은 한 궁을 둘러싼 별들의 관계를 함께 읽어 균형을 살핍니다." },
  { system: "자미두수", text: "대한(大限)은 10년 단위의 큰 흐름으로, 인생의 장(章)이 바뀌는 주기입니다." },
  { system: "자미두수", text: "길성(좌보·우필·천괴·천월)은 곁에서 돕는 귀인의 기운을 상징합니다." },
  // 베다 점성술(조티시)
  { system: "베다", text: "베다 점성술(조티시)은 실제 별자리 위치를 쓰는 항성 황도대를 기반으로 합니다." },
  { system: "베다", text: "라그나(상승점)는 태어난 순간 동쪽 지평선의 별자리로, 삶의 출발점을 정합니다." },
  { system: "베다", text: "달(찬드라)의 자리를 중시해, 서양 점성술보다 마음과 정서를 깊이 읽습니다." },
  { system: "베다", text: "나바그라하(9행성)에는 해·달·화·수·목·금·토와 라후·케투가 포함됩니다." },
  { system: "베다", text: "라후·케투는 달의 교점으로, 이생의 욕망과 내려놓을 과제를 상징합니다." },
  { system: "베다", text: "27 낙샤트라(별자리 구획)는 성격과 인연을 섬세하게 나누는 베다의 핵심입니다." },
  { system: "베다", text: "다샤(daśā)는 행성이 삶을 주관하는 시기를 나눠, 언제 무엇이 무르익는지 봅니다." },
  { system: "베다", text: "빔쇼타리 다샤는 120년을 아홉 행성에 배분한 대표적 시기 판단법입니다." },
  { system: "베다", text: "요가(행성 조합)는 특정 배치가 만드는 재능과 복덕의 무늬를 뜻합니다." },
  { system: "베다", text: "베다 점성술은 정해진 운명보다 카르마와 노력의 상호작용을 강조합니다." },
  // 숙요(수쿠요·인도 점성 27수)
  { system: "숙요", text: "숙요(宿曜)는 달이 머무는 27개 별자리로 하루의 기운과 인연을 보는 밀교 점성술입니다." },
  { system: "숙요", text: "태어난 날 달의 자리가 '본명숙'이 되어, 타고난 성향의 바탕을 이룹니다." },
  { system: "숙요", text: "27수는 안(安)·위(危)·성(成)·괴(壞) 등 관계의 결을 나눠 궁합을 읽습니다." },
  { system: "숙요", text: "숙요에서는 상대와의 '거리'가 인연의 성격을 정합니다. 가까움만이 좋은 것은 아닙니다." },
  { system: "숙요", text: "'명(命)'과 '업(業)'의 관계는 서로를 성장시키는 깊은 인연으로 봅니다." },
  { system: "숙요", text: "숙요는 일본에 전해져 스쿠요도(宿曜道)로 발전, 택일과 궁합에 널리 쓰였습니다." },
  { system: "숙요", text: "매일의 달자리를 살펴 '오늘 어떤 일이 순한가'를 가늠하는 택일법이 핵심입니다." },
  { system: "숙요", text: "본명숙은 나를, 그날의 숙은 하루의 기운을 말해 둘의 관계로 길흉을 읽습니다." },
  // 서양 점성술
  { system: "점성술", text: "서양 점성술의 태양별자리는 '나는 누구인가'라는 정체성의 큰 방향을 말합니다." },
  { system: "점성술", text: "달별자리는 감정과 무의식의 습관을, 상승별자리는 남에게 보이는 첫인상을 나타냅니다." },
  { system: "점성술", text: "12별자리는 불·흙·바람·물 4원소로 나뉘어 기질의 바탕을 이룹니다." },
  { system: "점성술", text: "행성은 '무엇을', 별자리는 '어떻게', 하우스는 '어디서'를 상징합니다." },
  { system: "점성술", text: "수성 역행은 불운이 아니라 점검·재정비에 어울리는 시기로 읽습니다." },
  { system: "점성술", text: "토성은 시련의 별이 아니라 책임과 성숙을 가르치는 스승의 별입니다." },
  { system: "점성술", text: "금성은 사랑과 취향을, 화성은 의욕과 추진력을 상징합니다." },
  { system: "점성술", text: "'새턴 리턴'(약 29세)은 진짜 어른으로 자리 잡는 인생의 큰 전환기입니다." },
  { system: "점성술", text: "어스펙트(각도)는 행성 사이의 대화로, 조화와 긴장의 무늬를 만듭니다." },
  { system: "점성술", text: "출생 차트는 정해진 결말이 아니라, 나를 이해하는 지도이자 언어입니다." },
];

// KST(UTC+9) 기준 오늘 날짜 키(YYYY-MM-DD).
export function getKstDateKey(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 날짜 키를 정수로(에폭일수 기준) — 같은 날엔 같은 값, 날이 바뀌면 +1.
function dateKeyToDayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map((v) => Number(v) || 0);
  // Date.UTC는 결정론적(로케일 무관). 에폭일수로 환산.
  return Math.floor(Date.UTC(y, Math.max(0, m - 1), d) / 86400000);
}

function pick<T>(pool: readonly T[], dayNumber: number, offset: number): T {
  if (pool.length === 0) throw new Error("lock-screen content pool is empty");
  const idx = ((dayNumber + offset) % pool.length + pool.length) % pool.length;
  return pool[idx];
}

// 선택된 확언 분야(cats)가 있으면 그 분야만, 없으면 전체(core 포함)에서 결정론적으로 하나 고른다.
function pickAffirmation(dayNumber: number, cats?: readonly string[]): string {
  let pool: readonly LockScreenAffirmation[] = AFFIRMATIONS;
  if (cats && cats.length > 0) {
    const wanted = new Set(cats);
    const filtered = AFFIRMATIONS.filter((a) => wanted.has(a.cat));
    if (filtered.length > 0) pool = filtered;
  }
  return pick(pool, dayNumber, 7).text;
}

// 오늘(또는 주어진 날짜)의 잠금화면 콘텐츠 세트를 결정론적으로 반환한다.
// 풀마다 서로 다른 offset(서로소에 가까운 소수)을 주어 요소들이 각자 독립적으로 변주되게 한다.
export function getDailyLockScreenContent(
  now: Date = new Date(),
  affirmationCats?: readonly string[],
): LockScreenContent {
  const dateKey = getKstDateKey(now);
  const day = dateKeyToDayNumber(dateKey);
  return {
    dateKey,
    header: pick(HEADERS, day, 0),
    coreEnergy: pick(CORE_ENERGIES, day, 0),
    affirmation: pickAffirmation(day, affirmationCats),
    hope: pick(HOPES, day, 3),
    greeting: pick(YEONI_GREETINGS, day, 19),
    flower: pick(FLOWERS, day, 13),
    quote: pick(QUOTES, day, 5),
    knowledge: pick(KNOWLEDGE, day, 11),
  };
}

// 탭할 때마다 새 문구가 나오도록, 하루 안에서 여러 풀 항목을 변주해 섞은 카드 시퀀스를 만든다.
// (기존엔 각 풀에서 하루 1개만 골라 탭해도 같은 5문장이 반복됐다.)
export type LockScreenCardKind = "affirmation" | "energy" | "quote" | "knowledge" | "greeting";
export interface LockScreenCard {
  kind: LockScreenCardKind;
  affirmation?: string;
  coreEnergy?: string;
  quote?: LockScreenQuote;
  knowledge?: LockScreenKnowledge;
  greeting?: string;
}

export function getDailyLockScreenSequence(
  now: Date = new Date(),
  affirmationCats?: readonly string[],
): LockScreenCard[] {
  const day = dateKeyToDayNumber(getKstDateKey(now));
  const cards: LockScreenCard[] = [];
  const ROUNDS = 4;
  for (let r = 0; r < ROUNDS; r++) {
    cards.push({ kind: "affirmation", affirmation: pickAffirmation(day + r * 7, affirmationCats) });
    cards.push({ kind: "quote", quote: pick(QUOTES, day + r * 5, 5) });
    cards.push({ kind: "knowledge", knowledge: pick(KNOWLEDGE, day + r * 3, 11) });
    if (r % 2 === 0) cards.push({ kind: "energy", coreEnergy: pick(CORE_ENERGIES, day + r * 2, 0) });
  }
  cards.push({ kind: "greeting", greeting: pick(YEONI_GREETINGS, day, 19) });
  return cards;
}
