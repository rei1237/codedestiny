// Threads 🕯 밤의 카르마 노트 — 20:30 KST. 2026-10-02 추가(수비학 20:30 슬롯을 대신한다).
//
// 계산 점술이 아니라 "카르마 = 반복되는 행위의 패턴" 이라는 영적 해석 글이다. 그래서 facts 는 엔진 값이 아니라
// 아래 THEMES 에서 날짜로 고른 주제 카드 하나다. 모델은 그 카드의 생각을 반말 짧은 이야기로 옮기기만 한다.
// 🔴 경전 인용은 카드에 적힌 것만 쓴다. 카드에 없는 경전·성인 이름이 나오면 그 필드를 버린다(지어낸 인용 금지).
// 🔴 전생·업보를 독자 개인에게 단정하지 않는다("너는 전생에 ~였다", "벌 받는다" 금지). 실존 인물·가문 이야기 금지.
// 문체 참고: 영적 사주 계정들의 "짧게 끊는 반말 + 경전 한 줄" 구성. 문장은 전부 여기서 새로 썼다.

import { getKstDateParts } from "../daily-fortune-task.js";
import {
  CASUAL_RULES,
  generateJsonCopy,
  kstDateLabel,
  mergeCopy,
  renderPost,
} from "./shared.js";

export const TYPE = "karma";
export const PATH = "/karma-destiny-ai/";
export const HASHTAG = "카르마";
export const CTA = "내 사주에 반복되는 패턴 보기";
export const SCOPE = "영적 관점의 이야기 · 개인 예측 아님";

const GITA = "바가바드 기타";
const DHAMMAPADA = "법구경";
const ANGUTTARA = "앙굿따라 니까야";

/**
 * 주제 카드. idea 는 모델에게 주는 생각, quote 는 그대로 인용해도 되는 한 줄(없으면 인용하지 않는다),
 * fallback 은 모델이 꺼져 있거나 문장이 검증에서 버려질 때 그대로 나가는 사람 손 문장이다.
 */
export const THEMES = Object.freeze([
  { id: "same-person", idea: "매번 비슷한 사람을 만나는 건 운이 아니라 내가 고르는 패턴이다.", fallback: { hook: "왜 맨날 비슷한 사람만 만나는지 알아?", body: "얼굴만 바뀌고 대사는 똑같지. 처음엔 다정하다가, 어느 순간 내가 눈치 보고 있고. 이걸 운이 나쁘다고 하면 계속 반복돼. 카르마는 벌이 아니라 습관이야. 내가 익숙한 쪽을 계속 고르고 있는 거.", tip: "다음 사람 만나기 전에 '익숙해서 끌리는 것' 하나만 적어 봐." } },
  { id: "result", idea: "행위에만 권리가 있고 결과에는 권리가 없다 — 결과에 매달리면 행위가 흔들린다.", source: GITA, quote: "너에게는 행위에 대한 권리만 있을 뿐, 그 결과에 대한 권리는 없다.", fallback: { hook: "열심히 했는데 결과가 안 나와서 억울해?", body: "바가바드 기타에 이런 말이 있어. '너에게는 행위에 대한 권리만 있을 뿐, 그 결과에 대한 권리는 없다.' 차갑게 들리지? 근데 이게 해방이야. 결과는 네 손을 떠난 거고, 네가 쥘 수 있는 건 오늘 한 행동뿐이거든.", tip: "결과 말고, 오늘 내가 한 행동 하나만 칭찬해 줘." } },
  { id: "grudge", idea: "원한은 원한으로 갚아서는 끝나지 않고, 내려놓을 때 끝난다.", source: DHAMMAPADA, quote: "원한은 원한으로 갚아서는 사라지지 않는다. 원한을 버릴 때에만 사라진다.", fallback: { hook: "아직도 그 사람 생각하면 열 받지?", body: "법구경에 그래. '원한은 원한으로 갚아서는 사라지지 않는다. 원한을 버릴 때에만 사라진다.' 그 사람은 벌써 잊고 잘 살아. 근데 나는 밤마다 그 장면을 다시 틀지. 끝내는 건 상대가 아니라 나야.", tip: "오늘 밤엔 그 장면 다시 틀지 말고 그냥 꺼." } },
  { id: "intention", idea: "업은 행동 그 자체보다 그 밑의 의도에서 시작된다.", source: ANGUTTARA, quote: "의도가 곧 업이라고 나는 말한다.", fallback: { hook: "착한 일 했는데 왜 찝찝해?", body: "붓다가 그랬대. '의도가 곧 업이라고 나는 말한다.' 똑같이 도와줘도, 인정받으려고 한 거면 그 마음이 같이 쌓여. 그래서 해 주고도 서운하고, 고맙단 말 기다리게 되는 거야. 행동보다 먼저 봐야 하는 건 그 밑에 깔린 마음이야.", tip: "오늘 한 친절 하나, 왜 했는지 솔직하게 적어 봐." } },
  { id: "own-path", idea: "남의 길을 잘 걷는 것보다 서툴러도 내 길을 걷는 게 낫다.", source: GITA, quote: "남의 길을 잘 걷는 것보다 서툴더라도 자기 길을 걷는 것이 낫다.", fallback: { hook: "남들 사는 거 보면 나만 뒤처진 것 같지?", body: "기타에 이런 말이 있어. '남의 길을 잘 걷는 것보다 서툴더라도 자기 길을 걷는 것이 낫다.' 남의 인생 따라 하면 잘해도 공허해. 내 길은 느리고 못생겨 보여도 끝에 내가 남아. 비교가 시작되면 그건 남의 카르마를 빌려 입는 거야.", tip: "오늘 SNS 보다가 비교 시작되면 그냥 닫아." } },
  { id: "mind-first", idea: "모든 것은 마음이 앞서고 마음으로 지어진다.", source: DHAMMAPADA, quote: "모든 것은 마음이 앞서고, 마음이 주인이며, 마음으로 지어진다.", fallback: { hook: "같은 일인데 어떤 날은 괜찮고 어떤 날은 지옥이지?", body: "법구경 첫 줄이 이거야. '모든 것은 마음이 앞서고, 마음이 주인이며, 마음으로 지어진다.' 상황은 그대로인데 내 마음 상태가 하루를 다시 짓는 거지. 그래서 피곤한 날 내린 결론은 대부분 틀려.", tip: "오늘 내린 큰 결론은 자고 일어나서 다시 봐." } },
  { id: "self-friend", idea: "나를 끌어올리는 것도 끌어내리는 것도 나 자신이다.", source: GITA, quote: "자신이 곧 자신의 친구이고, 자신이 곧 자신의 적이다.", fallback: { hook: "제일 독한 말, 사실 네가 너한테 하고 있지 않아?", body: "기타에 그래. '자신이 곧 자신의 친구이고, 자신이 곧 자신의 적이다.' 남이 한 번 한 말을 나는 백 번 되새기지. 그 반복이 카르마가 돼. 나한테 하는 말버릇부터 바꿔야 패턴이 바뀌어.", tip: "오늘 나한테 한 말 중 제일 심한 거, 친구한테 하듯 바꿔 봐." } },
  { id: "money-leak", idea: "돈이 들어오면 꼭 나가는 패턴은 액수보다 감정의 습관이다.", fallback: { hook: "돈 들어오면 꼭 일 생겨서 나가지?", body: "월급 들어온 주에 꼭 뭐가 고장 나고, 누가 아프고, 갑자기 사고 싶은 게 생기지. 이걸 돈복 없다고만 하면 평생 그래. 들어온 돈을 '오래 못 가질 것' 처럼 대하는 마음이 먼저 있어. 돈 카르마는 액수보다 그 감정에서 돌아.", tip: "이번 달엔 아무 이유 없이 지키는 돈 하나 따로 빼 둬." } },
  { id: "parents-voice", idea: "부모에게 들은 말을 내가 똑같이 하고 있을 때 가족의 패턴이 이어진다.", fallback: { hook: "엄마가 하던 말, 지금 네 입에서 나오고 있지?", body: "그렇게 싫었던 말투인데 화나면 똑같이 튀어나와. 가족 카르마는 피가 아니라 말버릇으로 내려와. 내가 알아차린 순간이 그 줄이 끊길 수 있는 유일한 자리야. 모르면 다음 사람한테 그대로 넘어가.", tip: "오늘 그 말 튀어나오면, 반만 하고 멈춰 봐. 그걸로 충분해." } },
  { id: "procrastination", idea: "미룬 일은 사라지지 않고 이자를 붙여 돌아온다.", fallback: { hook: "미룬 일, 결국 더 크게 돌아왔지?", body: "답장 하나, 전화 하나, 사과 하나. 그땐 별거 아니었는데 미루니까 점점 무거워져. 카르마가 원래 그래. 사라지는 게 아니라 이자 붙어서 다시 와. 제일 싼 때는 언제나 지금이야.", tip: "제일 오래 미룬 연락 하나, 오늘 보내. 길게 말고 한 줄." } },
  { id: "gossip", idea: "남에 대해 한 말은 결국 말한 사람의 마음에 남는다.", fallback: { hook: "남 얘기하고 나서 이상하게 기분 더럽지?", body: "뒷담은 그 사람한테 가는 게 아니라 내 안에 쌓여. 말할 땐 시원한데 밤에 괜히 찝찝하지. 그게 말의 카르마야. 같은 얘기 세 번 했으면 그건 그 사람 문제가 아니라 내 패턴이야.", tip: "오늘 남 얘기 나오면, 대화 주제를 딱 한 번만 돌려 봐." } },
  { id: "cant-say-no", idea: "거절을 못 하는 패턴은 미움받기 싫은 마음에서 반복된다.", fallback: { hook: "싫은데 또 '괜찮아' 했지?", body: "거절 못 하는 사람은 나중에 꼭 터져. 그리고 상대는 왜 갑자기 그러냐고 해. 미움받기 싫어서 한 '괜찮아' 가 쌓여서 결국 관계를 망치는 거야. 이 카르마는 한 번 제대로 '아니' 하는 데서 끊겨.", tip: "오늘 작은 부탁 하나는 웃으면서 거절해 봐." } },
  { id: "unfinished", idea: "제대로 끝내지 않은 관계는 다른 얼굴로 다시 찾아온다.", fallback: { hook: "헤어진 사람이랑 똑같은 싸움, 새 사람이랑 또 하지?", body: "제대로 안 끝낸 관계는 다른 얼굴로 다시 와. 이름만 바뀌고 장면은 그대로야. 그때 하지 못한 말, 인정 못 한 내 몫이 아직 남아 있는 거지. 끝맺음은 상대랑 하는 게 아니라 나랑 하는 거야.", tip: "지난 관계에서 내 몫이었던 거 하나만 인정해 봐. 속으로라도." } },
  { id: "gratitude", idea: "받은 것을 기억하는 습관이 다음에 돌아올 것을 바꾼다.", fallback: { hook: "받은 건 금방 잊고 서운한 건 오래 기억하지?", body: "사람 마음이 원래 그래. 근데 그 기억 장부가 내 하루를 만들어. 서운한 것만 적힌 장부로 살면 세상이 다 빚쟁이 같아. 받은 걸 적기 시작하면 이상하게 받을 일이 더 보여. 카르마는 기억하는 방식에서도 돌아.", tip: "오늘 누가 해 준 작은 거 하나, 잊기 전에 고맙다고 해." } },
  { id: "jealousy", idea: "질투가 나는 사람은 내가 원하는 것을 보여 주는 거울이다.", fallback: { hook: "그 사람 잘되는 거 보면 속 쓰리지?", body: "질투는 나쁜 감정이 아니라 신호야. 내가 진짜 원하는 걸 그 사람이 들고 있다는 거. 거기서 깎아내리면 같은 감정이 계속 돌아오고, 배우면 그 패턴이 끝나. 질투 나는 사람은 내 카르마의 숙제를 보여 주는 거울이야.", tip: "질투 나는 그 사람한테서 훔칠 거 딱 하나만 적어 봐." } },
  { id: "not-punishment", idea: "카르마는 벌이 아니라 반복을 통해 배우게 하는 구조다.", fallback: { hook: "카르마가 벌이라고 생각했지?", body: "아니야. 카르마는 원래 '행위' 라는 뜻이야. 내가 한 행동이 습관이 되고, 습관이 비슷한 상황을 또 불러오는 구조. 그래서 같은 일이 반복되면 벌이 아니라 아직 덜 배운 거야. 배우면 그 장면은 더 안 와.", tip: "요즘 반복되는 일 하나, 이번엔 다르게 반응해 봐." } },
  { id: "third-mistake", idea: "같은 실수가 세 번째면 운이 아니라 패턴이다.", fallback: { hook: "같은 실수 세 번째지? 이제 운 탓은 못 함.", body: "한 번은 사고, 두 번은 우연, 세 번이면 패턴이야. 이 패턴은 내가 알아챌 때까지 계속 돌아와. 짜증 나지만 좋은 소식도 있어. 알아챈 순간 반은 끝난 거야.", tip: "세 번 반복된 실수, 공통점 하나만 찾아 적어 봐." } },
  { id: "forgive", idea: "용서는 상대를 위한 것이 아니라 나를 그 장면에서 풀어 주는 일이다.", fallback: { hook: "용서하면 지는 것 같아서 못 하겠지?", body: "용서는 그 사람이 잘했다고 도장 찍어 주는 게 아니야. 나를 그 장면에서 꺼내 주는 거지. 안 하면 그 사람이 내 머릿속에 월세도 안 내고 살아. 카르마의 줄은 용서할 때 내 쪽에서 먼저 풀려.", tip: "오늘은 용서까진 말고, 그 사람 생각 나면 '이제 그만' 하고 넘겨." } },
  { id: "let-go-things", idea: "버리지 못하는 물건에는 끝내지 못한 시간이 붙어 있다.", fallback: { hook: "안 쓰는데 못 버리는 물건 있지?", body: "그 물건엔 시간이 붙어 있어. 그때의 나, 그때의 사람, 그때 못 끝낸 마음. 그래서 못 버리는 거야. 물건 하나 비우는 게 생각보다 큰 정리야. 공간이 비어야 다음 게 들어와.", tip: "오늘 서랍 하나만 열어서 하나만 버려." } },
  { id: "unseen-kindness", idea: "아무도 보지 않을 때의 행동이 진짜 카르마로 쌓인다.", fallback: { hook: "아무도 안 볼 때 너는 어떤 사람이야?", body: "남들 앞에서 착한 건 쉬워. 아무도 안 볼 때 쓰레기 줍고, 아무도 모르게 양보하는 게 진짜로 쌓이는 거야. 보상이 없으니까 오히려 깨끗하게 남아. 카르마 장부엔 박수 소리가 안 적혀.", tip: "오늘 아무도 모르게 친절 하나 해. 말하지 말고." } },
  { id: "rock-bottom", idea: "바닥은 오래된 패턴이 끝나는 자리이기도 하다.", fallback: { hook: "요즘 바닥 찍은 것 같아?", body: "바닥은 끝이 아니라 오래 돌던 패턴이 더는 못 버티는 자리야. 지금까지 하던 방식이 안 먹히니까 바닥인 거지. 그래서 여기서부터는 다르게 할 수밖에 없어. 그게 카르마가 바뀌는 순간이야.", tip: "지금 안 먹히는 방식 하나, 오늘은 그냥 안 해 봐." } },
]);

// 카드에 없는 경전·성인 이름이 문장에 나오면 지어낸 인용이다 — 그 필드를 버린다.
const SOURCE_VOCABULARY = [GITA, DHAMMAPADA, ANGUTTARA, "기타에", "크리슈나", "아르주나", "우파니샤드", "베다", "성경", "예수", "공자", "노자", "도덕경", "금강경", "반야심경", "니까야", "붓다", "부처"];
const SOURCE_ALIASES = { [GITA]: [GITA, "기타에", "크리슈나", "아르주나"], [DHAMMAPADA]: [DHAMMAPADA, "붓다", "부처"], [ANGUTTARA]: [ANGUTTARA, "니까야", "붓다", "부처"] };
// 독자 개인에게 업보·전생을 단정하거나 겁주는 말.
const FORBIDDEN = ["전생에 너", "전생에 당신", "너는 전생", "당신은 전생", "업보", "벌 받", "벌을 받", "죄를", "저주", "천벌", "병에 걸", "아프게 된", "망한다", "망할"];

function dayNumber(now) {
  const { y, m, d } = getKstDateParts(now);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** @returns {object} 날짜로 고른 주제 카드. 같은 날이면 같은 카드. */
export function buildFacts(_env, now) {
  const theme = THEMES[dayNumber(now) % THEMES.length];
  return {
    type: TYPE,
    dateLabel: kstDateLabel(now),
    themeId: theme.id,
    idea: theme.idea,
    source: theme.source || "",
    quote: theme.quote || "",
  };
}

function themeOf(facts) {
  return THEMES.find((theme) => theme.id === facts.themeId) || THEMES[0];
}

const SYSTEM_PROMPT = [
  "당신은 카르마를 '반복되는 행동 패턴' 으로 읽는 영적 사주 상담가다. 밤에 친구한테 털어놓듯 반말로 쓴다.",
  "구성: 찔리는 장면 질문 → 그 장면이 왜 반복되는지 → 카르마로 다시 읽기 → 오늘 밤 할 작은 행동 하나.",
  "카르마는 벌이 아니라 습관과 의도의 반복이라는 관점을 지킨다. 독자에게 전생·업보·벌을 단정하지 않는다.",
  "실존 인물·연예인·기업 가문 이야기, 질병 이야기를 쓰지 않는다.",
  "facts.quote 가 있으면 그 문장만 그대로 인용할 수 있고 출처는 facts.source 로만 밝힌다. quote 가 없으면 어떤 경전도 인용하지 않는다.",
  CASUAL_RULES,
].join("\n");

export function buildPrompt(facts) {
  return [
    "facts — 오늘 밤의 카르마 주제 카드다. 생각을 바꾸지 말고 문장으로만 옮겨라.",
    JSON.stringify({ dateLabel: facts.dateLabel, idea: facts.idea, source: facts.source || null, quote: facts.quote || null }, null, 1),
    "",
    "다음 JSON 하나만 출력하라. 설명·코드펜스를 붙이지 마라.",
    "{",
    '  "hook": "읽는 사람이 뜨끔할 반말 질문 한 줄. 40자 이내.",',
    '  "body": "짧게 끊은 반말 4~5문장. 구체적인 장면 하나로 시작해 카르마로 다시 읽는다. 190자 이내.",',
    '  "tip": "오늘 밤 할 수 있는 작은 행동 하나. 반말 명령형, 45자 이내."',
    "}",
  ].join("\n");
}

function copyRules(facts) {
  const allowed = SOURCE_ALIASES[facts.source] || [];
  const quoteOk = (text) => !/['"‘“]/.test(text) || !facts.quote || text.includes(facts.quote.slice(0, 8));
  const base = { vocabulary: SOURCE_VOCABULARY, allowed, forbidden: FORBIDDEN, casual: true };
  return {
    hook: { ...base, min: 8, max: 40 },
    body: { ...base, min: 60, max: 190, validate: quoteOk },
    tip: { ...base, min: 8, max: 45 },
  };
}

/** @returns {Promise<{copy: Object<string,string>, model: string|null, rejected: string[]}>} */
export async function writeCopy(env, facts, { generateImpl, recent = [] } = {}) {
  const generated = await generateJsonCopy(env, { type: TYPE, systemPrompt: SYSTEM_PROMPT, prompt: buildPrompt(facts), generateImpl, recent });
  return mergeCopy(generated, copyRules(facts), { ...themeOf(facts).fallback });
}

export function format(facts, copy, url) {
  const lines = [
    copy.hook,
    "",
    copy.body,
    "",
    copy.tip,
    `🕯 ${facts.dateLabel} 밤의 카르마 노트 · ${SCOPE}`,
  ];
  return renderPost({ head: lines.join("\n"), cta: CTA, url, hashtag: HASHTAG });
}
