import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { LOVE_SECRET_MODE_CONFIG } from "../lib/saju-premium-chapters.js";
import { buildLoveSecretReference } from "../lib/love-secret-reference.js";
import { connectDb, mongoose } from "../lib/db.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";

const LOVE_SECRET_SERVICE_KEY = "saju-love-secret";
const LOVE_SECRET_FEATURE_KEY_BY_MODE = Object.freeze({
  solo: "premium_pdf_saju_love_secret",
  compatibility: "premium_pdf_saju_love_secret_compat",
});
const LOVE_SECRET_JOB_COLLECTION = "premium_report_jobs";
const LOVE_SECRET_JOB_POLL_AFTER_MS = 4000;
const LOVE_SECRET_LOCK_TTL_MS = 1000 * 60 * 20;
const LOVE_SECRET_GENERATION_LOCKS = new Map();
const LOVE_SECRET_FORBIDDEN_RE = /\b(?:fallback|payload|json|schema|debug|internal\s*server\s*error|object|undefined|null|nan|calculationmode|recovered|about:blank|raw|llm|api|prompt)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다|로컬\s*엔진|계산\s*시그니처|내부\s*데이터|엔진\s*결과|데이터\s*정규화|품질\s*검증|재생성/gi;
const LOVE_SECRET_MANUSCRIPT_SOURCE = Object.freeze({
  LOCAL: "local",
});
const LOVE_SECRET_FAST_DB_ENV_OVERRIDES = Object.freeze({
  // Keep async job bootstrapping well below Cloudflare's edge timeout window.
  MONGO_WORKER_CONNECT_GUARD_MS: "9000",
  MONGO_SERVER_SELECTION_TIMEOUT_MS: "6500",
  MONGO_CONNECT_TIMEOUT_MS: "6500",
  MONGO_SOCKET_TIMEOUT_MS: "12000",
  MONGO_WORKER_CONNECT_RETRIES: "0",
  MONGO_IP_FAMILY: "4",
});

const DEFAULT_CATEGORY_BY_MODE = {
  solo: {
    1: ["일간으로 보는 사랑의 기본 태도", "일지로 보는 마음의 방어선", "월지가 만드는 연애 욕구", "천간에 드러난 표현 방식", "지지에 숨어 있는 관계 본능", "이 명식의 사랑 한 줄 해석"],
    2: ["배우자성으로 보는 이상형", "나를 흔드는 상대의 특징", "겉으로 끌리는 사람과 실제로 맞는 사람", "관계 초반에 강하게 작동하는 패턴", "피해야 할 매력의 함정", "오래 갈 수 있는 사람의 조건"],
    3: ["사랑이 시작되는 방식", "마음을 여는 속도", "가까워질수록 드러나는 모습", "자존심이 개입되는 순간", "반복되는 오해와 거리감", "관계를 안정시키는 핵심 습관"],
    4: ["식상으로 보는 표현 방식", "말이 강해지는 순간", "침묵으로 마음을 숨기는 패턴", "상대가 오해하기 쉬운 표현", "갈등을 풀어내는 대화법", "사랑을 지키는 말의 온도"],
    5: ["일지로 보는 배우자궁", "배우자성과 현실 조건", "결혼에 유리한 관계 구조", "결혼 후 반복될 수 있는 갈등", "결혼운을 살리는 생활 방식", "오래 가는 파트너십의 조건"],
    6: ["관계가 흔들리는 첫 신호", "이별을 부르는 말과 태도", "미련이 남는 구조", "다시 이어질 수 있는 조건", "재회가 독이 되는 경우", "관계를 회복시키는 현실 전략"],
    7: ["연애에서 반드시 지켜야 할 기준", "내려놓아야 할 방어기제", "상대에게 보여줘야 할 진짜 매력", "사랑과 일의 균형", "안정적인 관계를 만드는 루틴", "나에게 맞는 연애 운영법"],
    8: ["현재 연애운의 큰 흐름", "가까운 시기의 만남 가능성", "관계가 깊어지기 쉬운 시기", "조심해야 할 감정 기복의 시기", "결혼을 준비하기 좋은 흐름", "운의 흐름을 사랑에 활용하는 법"],
    9: ["연애에서 가장 약해지는 순간", "반복되는 선택 실수", "자존심과 불안의 충돌", "관계를 망치는 무의식적 습관", "약점을 매력으로 바꾸는 법", "다시 사랑할 힘을 회복하는 법"],
    10: ["이 명식의 가장 큰 연애 무기", "반드시 조심해야 할 관계 패턴", "좋은 사람을 알아보는 기준", "사랑을 현실로 지키는 방법", "결혼까지 이어지는 전략", "최종 연애 조언"],
  },
  compatibility: {
    1: ["나의 원국 요약", "상대의 원국 요약", "두 사람 일간 관계", "두 사람 일지 관계", "끌림의 시작점", "관계 기본축"],
    2: ["나의 사랑 태도", "나의 표현 습관", "나의 방어기제", "내가 바라는 관계", "내가 약해지는 순간", "내가 지켜야 할 기준"],
    3: ["상대의 사랑 태도", "상대의 표현 습관", "상대의 방어기제", "상대가 바라는 관계", "상대가 약해지는 순간", "상대가 지켜야 할 기준"],
    4: ["배우자성 관점의 끌림", "오행 보완성", "초기 케미 포인트", "관계 심화 조건", "환상과 현실의 간극", "오래 가는 접점"],
    5: ["감정 속도 차이", "말의 온도 차이", "침묵 패턴", "오해 누적 구간", "화해가 쉬운 방식", "표현 조율 규칙"],
    6: ["충돌 촉발 요인", "자존심 충돌", "반복되는 말실수", "합충형해파 관점의 갈등", "갈등 완충 장치", "재발 방지 실행"],
    7: ["생활 리듬 차이", "역할 분담", "경계선 설정", "일과 사랑의 균형", "피로 누적 신호", "현실 조율 프로토콜"],
    8: ["결혼 가능성의 조건", "배우자궁 상호작용", "결혼 후 갈등 포인트", "책임과 안정성", "생활 궁합 점검", "장기 파트너십 설계"],
    9: ["돈 감각 차이", "일 우선순위 차이", "소비와 저축 관성", "현실 목표의 합치", "위기 대응 방식", "현실 협업 전략"],
    10: ["이별 위험 시그널", "거리감이 커지는 패턴", "미련 구조", "재회 가능 조건", "재회가 독이 되는 경우", "관계 정리 기준"],
    11: ["현재 관계 흐름", "대운 관점의 전환점", "세운 관점의 기회", "주의 시기", "관계 심화 타이밍", "시기 활용 전략"],
    12: ["관계의 핵심 무기", "반드시 피해야 할 패턴", "합의 문장 만들기", "일상 유지 루틴", "결혼으로 이어지는 전략", "최종 궁합 조언"],
  },
};

const LOVE_SECRET_TOPIC_KEYWORDS = Object.freeze({
  solo: {
    1: ["사랑", "기준", "마음", "일지", "관계", "태도"],
    2: ["이상형", "끌림", "배우자성", "매력", "조건", "오래 가는 사람"],
    3: ["시작", "가까워짐", "자존심", "오해", "거리감", "안정"],
    4: ["말", "표현", "침묵", "감정", "오해", "대화"],
    5: ["결혼", "배우자", "생활", "책임", "현실", "유지"],
    6: ["이별", "미련", "재회", "신뢰", "회복", "조건"],
    7: ["기준", "방어", "매력", "균형", "루틴", "운영"],
    8: ["현재 시기", "만남", "관계 변화", "결혼 준비", "감정 흐름", "기회"],
    9: ["약점", "실수", "불안", "습관", "반전", "회복"],
    10: ["무기", "패턴", "기준", "현실", "결혼", "조언"],
  },
  compatibility: {
    1: ["원국", "일간", "일지", "관계", "기본", "요약"],
    2: ["나의", "사랑", "표현", "방어", "기준", "관계"],
    3: ["상대", "사랑", "표현", "방어", "기준", "관계"],
    4: ["끌림", "배우자성", "오행", "매력", "접점", "조건"],
    5: ["감정", "표현", "침묵", "오해", "대화", "조율"],
    6: ["갈등", "충돌", "자존심", "완충", "복구", "실행"],
    7: ["생활", "리듬", "역할", "균형", "현실", "조율"],
    8: ["결혼", "배우자", "책임", "생활", "안정", "장기"],
    9: ["돈", "일", "현실", "목표", "협업", "전략"],
    10: ["이별", "재회", "신뢰", "회복", "조건", "정리"],
    11: ["대운", "세운", "시기", "변화", "기회", "흐름"],
    12: ["전략", "패턴", "루틴", "유지", "결혼", "조언"],
  },
});

const SAJU_LOVE_TEN_GOD_INTERPRETATION = Object.freeze({
  "비견": { loveCore: "대등함과 자존심이 강한 관계", attraction: "서로의 실력과 세계를 인정하는 사람에게 끌림", strength: "관계에서 중심을 잃지 않고 버팀", caution: "상처받으면 먼저 닫히는 경향", communication: "사실 중심 대화를 선호", marriage: "동반자형 결혼 구조에 강함", breakup: "존중이 무너지면 빠르게 거리 둠", advice: "평가보다 공감 문장을 먼저 배치" },
  "겁재": { loveCore: "강한 에너지와 승부욕", attraction: "강렬하고 주도적인 상대에게 반응", strength: "관계를 추진하는 실행력", caution: "비교심과 경쟁심이 갈등을 키움", communication: "직설적 표현이 많아짐", marriage: "역할 합의가 분명하면 안정", breakup: "감정 과열 시 급격히 흔들림", advice: "승패 프레임 대신 공동 목표 설정" },
  "식신": { loveCore: "돌봄과 생활 감각", attraction: "편안함과 신뢰를 주는 상대", strength: "꾸준한 애정 표현", caution: "말하지 않고 참고 쌓는 패턴", communication: "따뜻하지만 완곡한 화법", marriage: "일상 루틴 중심의 안정성", breakup: "지루함이 누적되면 서서히 이탈", advice: "작은 욕구를 초기에 언어화" },
  "상관": { loveCore: "표현력과 감정 배출", attraction: "대화가 잘 통하는 상대", strength: "관계를 움직이는 언어 능력", caution: "날 선 표현이 상처를 남김", communication: "빠르고 직관적인 피드백", marriage: "소통 규칙이 있으면 강점 극대화", breakup: "말의 온도가 깨지면 단절 가속", advice: "핵심 주장 전에 감정 확인 한 문장" },
  "편재": { loveCore: "현실 추진력과 매력", attraction: "활동적이고 감각적인 상대", strength: "관계를 활기 있게 운영", caution: "관심 분산으로 신뢰 흔들림", communication: "속도감 있는 제안형 대화", marriage: "재정/생활 계획이 성패 좌우", breakup: "현실 책임이 비대칭이면 약화", advice: "흥분 구간에서 약속 범위 축소" },
  "정재": { loveCore: "책임과 지속성", attraction: "성실하고 안정적인 상대", strength: "관계를 오래 지키는 인내", caution: "과한 통제로 답답함 유발", communication: "체계적이지만 경직되기 쉬움", marriage: "가정 운영력에 강점", breakup: "감정 무시에 의한 건조화", advice: "원칙 전달 시 선택지를 함께 제시" },
  "편관": { loveCore: "긴장감과 결단", attraction: "카리스마와 방향성을 가진 상대", strength: "위기 상황 수습 능력", caution: "압박형 태도가 친밀감 저해", communication: "짧고 단단한 표현", marriage: "규칙이 명확할수록 안정", breakup: "통제 저항이 커지면 충돌", advice: "요구보다 요청 문장 비율 확대" },
  "정관": { loveCore: "신뢰와 규범", attraction: "품위 있고 예측 가능한 상대", strength: "관계 질서를 유지", caution: "경직된 기대가 실망을 키움", communication: "정중하나 감정표현 약함", marriage: "제도권 파트너십과 궁합 우수", breakup: "실수에 대한 유연성 부족", advice: "규칙 앞에 감정 수용 문장 추가" },
  "편인": { loveCore: "직관과 내면 탐구", attraction: "깊이 있는 대화가 가능한 상대", strength: "관계의 본질을 보는 통찰", caution: "의심과 거리두기 반복", communication: "간접적이고 암시적 표현", marriage: "정서적 안전지대가 필요", breakup: "오해를 혼자 키우는 경향", advice: "추측 대신 확인 질문 습관화" },
  "정인": { loveCore: "보호와 정서 안정", attraction: "배려와 신뢰를 주는 상대", strength: "위로와 회복의 힘", caution: "의존과 과보호의 위험", communication: "부드럽지만 우회적", marriage: "서로 돌보는 가정에 강점", breakup: "서운함을 쌓아 폭발", advice: "요구를 미루지 말고 즉시 전달" },
});

const SAJU_LOVE_PILLAR_INTERPRETATION = Object.freeze({
  dayStem: { theme: "사랑에서의 기본 태도와 자기 본질" },
  dayBranch: { theme: "배우자궁, 관계 안정감, 가까운 사람을 대하는 방식" },
  monthBranch: { theme: "현실 욕구, 사회적 조건, 연애가 실제 삶과 연결되는 방식" },
  hourPillar: { theme: "미래의 사랑, 표현 방식, 결혼 후 깊어지는 욕구" },
});

function clean(value) {
  return String(value || "").trim();
}

function normalizeLoveBookError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return {
        message: String(error),
      };
    }
  }

  return {
    message: String(error),
  };
}

function hasLoveSecretForbiddenText(value) {
  const text = String(value || "");
  return new RegExp(LOVE_SECRET_FORBIDDEN_RE.source, "i").test(text);
}

function stripLoveSecretForbiddenText(value) {
  return String(value || "").replace(LOVE_SECRET_FORBIDDEN_RE, " ").replace(/\s{2,}/g, " ").trim();
}

function estimateLoveSecretRepetitionScore(chapters = []) {
  const sentenceCount = new Map();
  let total = 0;
  for (const chapter of chapters) {
    const text = clean(chapter?.text || "");
    if (!text) continue;
    const sentences = text
      .split(/[.!?\n]+/)
      .map((s) => stripLoveSecretForbiddenText(s).toLowerCase())
      .filter((s) => s.length >= 24);
    for (const sentence of sentences) {
      total += 1;
      sentenceCount.set(sentence, Number(sentenceCount.get(sentence) || 0) + 1);
    }
  }
  if (!total) return 0;
  let repeated = 0;
  for (const value of sentenceCount.values()) {
    if (value > 2) repeated += (value - 2);
  }
  return Number((repeated / total).toFixed(4));
}

function collectLoveSecretText(chapters = []) {
  return (Array.isArray(chapters) ? chapters : [])
    .map((chapter) => {
      const sectionText = Array.isArray(chapter?.sections)
        ? chapter.sections.map((section) => clean(section?.body || section?.text || "")).join("\n")
        : "";
      return `${clean(chapter?.title)}\n${clean(chapter?.subtitle)}\n${clean(chapter?.text)}\n${sectionText}`;
    })
    .join("\n");
}

function collectNormalizedSentences(text) {
  return String(text || "")
    .split(/[.!?\n]+/)
    .map((row) => row.replace(/\s+/g, " ").trim())
    .filter((row) => row.length >= 22);
}

function countRepeatedLongFragments(text, ngramLength = 30, threshold = 3) {
  const grams = new Map();
  for (const sentence of collectNormalizedSentences(text)) {
    const normalized = sentence.replace(/\s+/g, " ").trim();
    if (normalized.length < ngramLength) continue;
    grams.set(normalized, Number(grams.get(normalized) || 0) + 1);
  }
  let repeated = 0;
  for (const value of grams.values()) {
    if (value >= threshold) repeated += 1;
  }
  return repeated;
}

function countRepeatedSectionOpenings(chapters = []) {
  const openingCount = new Map();
  for (const chapter of Array.isArray(chapters) ? chapters : []) {
    for (const section of Array.isArray(chapter?.sections) ? chapter.sections : []) {
      const sentence = collectNormalizedSentences(clean(section?.body || section?.text || ""))[0] || "";
      if (!sentence) continue;
      openingCount.set(sentence, Number(openingCount.get(sentence) || 0) + 1);
    }
  }
  let repeated = 0;
  for (const value of openingCount.values()) {
    if (value >= 3) repeated += 1;
  }
  return repeated;
}

function countPhraseOveruse(text, phrase, allowed = 3) {
  if (!phrase) return 0;
  const list = String(text || "").match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
  const count = Array.isArray(list) ? list.length : 0;
  return count > allowed ? count - allowed : 0;
}

function validateLoveSecretTopicCoverage(mode, chapters = []) {
  const keywordMap = LOVE_SECRET_TOPIC_KEYWORDS[mode] || LOVE_SECRET_TOPIC_KEYWORDS.solo;
  const issues = [];
  for (const chapter of Array.isArray(chapters) ? chapters : []) {
    const chapterNo = Number(chapter?.chapter || 0);
    const text = `${clean(chapter?.title)} ${clean(chapter?.subtitle)} ${clean(chapter?.text)}`;
    const keywords = keywordMap[chapterNo] || [];
    const hits = keywords.filter((keyword) => text.includes(keyword));
    if (keywords.length > 0 && hits.length < 3) {
      issues.push(chapterNo);
    }
  }
  return issues;
}

function chapterCharLength(chapter) {
  const title = clean(chapter?.title);
  const subtitle = clean(chapter?.subtitle);
  const body = clean(chapter?.text);
  return `${title}\n${subtitle}\n${body}`.replace(/\s+/g, "").length;
}

function validateLoveSecretManuscript({ mode, chapters, config, minChapterChars = 2000 } = {}) {
  const list = Array.isArray(chapters) ? chapters : [];
  const expected = Number(config?.totalChapters || 0);
  const chapterCountOk = expected > 0 ? list.length === expected : list.length > 0;
  const chapterLengths = list.map((chapter) => chapterCharLength(chapter));
  const totalChars = chapterLengths.reduce((acc, value) => acc + value, 0);
  const minTotal = Number(config?.minTotalChars || (mode === "compatibility" ? 33000 : 25000));
  const tooShortChapterIndexes = chapterLengths
    .map((count, idx) => ({ count, idx }))
    .filter((row) => row.count < minChapterChars)
    .map((row) => row.idx + 1);

  let forbiddenTermsCount = 0;
  const shortSections = [];
  const lowSectionCount = [];
  for (const chapter of list) {
    const sectionList = Array.isArray(chapter?.sections) ? chapter.sections : [];
    if (sectionList.length < 6) {
      lowSectionCount.push(Number(chapter?.chapter || 0));
    }
    for (const section of sectionList) {
      const sectionLen = String(clean(section?.body || section?.text || "")).replace(/\s+/g, "").length;
      if (sectionLen < 500) {
        shortSections.push({ chapter: Number(chapter?.chapter || 0), section: clean(section?.title) || "(무제)", len: sectionLen });
      }
    }
    const sample = `${clean(chapter?.title)}\n${clean(chapter?.subtitle)}\n${clean(chapter?.text)}`;
    const matches = sample.match(LOVE_SECRET_FORBIDDEN_RE);
    forbiddenTermsCount += Array.isArray(matches) ? matches.length : 0;
  }

  const repetitionScore = estimateLoveSecretRepetitionScore(list);
  const combined = collectLoveSecretText(list);
  const sentenceMap = new Map();
  for (const sentence of collectNormalizedSentences(combined)) {
    sentenceMap.set(sentence, Number(sentenceMap.get(sentence) || 0) + 1);
  }
  const duplicateSentenceCount = Array.from(sentenceMap.values()).filter((count) => count >= 2).length;
  const repeatedLongFragments = countRepeatedLongFragments(combined, 30, 3);
  const repeatedSectionOpenings = countRepeatedSectionOpenings(list);
  const mechanicalOveruse =
    countPhraseOveruse(combined, "이 명식은 사랑에서")
    + countPhraseOveruse(combined, "관계에서 균형이 필요")
    + countPhraseOveruse(combined, "주의가 필요")
    + countPhraseOveruse(combined, "현실 조언은");
  const topicCoverageIssues = validateLoveSecretTopicCoverage(mode, list);

  const ok = chapterCountOk
    && tooShortChapterIndexes.length === 0
    && lowSectionCount.length === 0
    && shortSections.length === 0
    && totalChars >= minTotal
    && forbiddenTermsCount === 0
    && repetitionScore <= 0.35
    && duplicateSentenceCount === 0
    && repeatedLongFragments === 0
    && repeatedSectionOpenings === 0
    && mechanicalOveruse === 0
    && topicCoverageIssues.length === 0;

  return {
    ok,
    expected,
    actual: list.length,
    totalChars,
    minTotal,
    tooShortChapterIndexes,
    lowSectionCount,
    shortSections,
    forbiddenTermsCount,
    repetitionScore,
    duplicateSentenceCount,
    repeatedLongFragments,
    repeatedSectionOpenings,
    mechanicalOveruse,
    topicCoverageIssues,
  };
}

function acquireLoveSecretLock(sessionId, jobId = "") {
  const key = clean(sessionId);
  if (!key) return { ok: true, key: "" };

  const now = Date.now();
  const existing = LOVE_SECRET_GENERATION_LOCKS.get(key);
  if (existing && existing.status === "running" && now - Number(existing.startedAtTs || now) <= LOVE_SECRET_LOCK_TTL_MS) {
    return {
      ok: false,
      key,
      existing,
    };
  }

  const lock = {
    sessionId: key,
    status: "running",
    startedAt: new Date().toISOString(),
    startedAtTs: now,
    jobId: clean(jobId),
  };
  LOVE_SECRET_GENERATION_LOCKS.set(key, lock);
  return { ok: true, key, lock };
}

function resolveLoveSecretLock(sessionId, status, jobId = "") {
  const key = clean(sessionId);
  if (!key) return;
  const lock = LOVE_SECRET_GENERATION_LOCKS.get(key) || {
    sessionId: key,
    startedAt: new Date().toISOString(),
    startedAtTs: Date.now(),
  };
  LOVE_SECRET_GENERATION_LOCKS.set(key, {
    ...lock,
    status: clean(status) || "failed",
    jobId: clean(jobId) || clean(lock.jobId),
    updatedAt: new Date().toISOString(),
  });
}

function getLoveSecretFastDbEnv(env = {}) {
  return {
    ...env,
    ...LOVE_SECRET_FAST_DB_ENV_OVERRIDES,
  };
}

function normalizeMode(rawMode) {
  const mode = clean(rawMode).toLowerCase();
  if (mode === "compatibility" || mode === "compat" || mode === "couple") return "compatibility";
  return "solo";
}

function toConfigMode(mode) {
  return mode === "compatibility" ? "couple" : "solo";
}

function toFeatureKey(mode) {
  const normalized = normalizeMode(mode);
  return LOVE_SECRET_FEATURE_KEY_BY_MODE[normalized] || LOVE_SECRET_FEATURE_KEY_BY_MODE.solo;
}

function getLoveSecretChapterMeta(config, chapterNo) {
  return (Array.isArray(config?.chapters) ? config.chapters : [])[chapterNo - 1] || {};
}

async function generateLoveSecretChapter(env, base, mode, config, chapterNo) {
  const chapterMeta = getLoveSecretChapterMeta(config, chapterNo);
  const title = stripUnsafeText(chapterMeta.title || `연애 비책 ${chapterNo}장`);
  const subtitle = stripUnsafeText(chapterMeta.subtitle || "");
  const sectionTitles = getChapterSpecificSections({}, chapterNo, mode);
  const local = buildLocalChapter(base, title, subtitle, sectionTitles, mode, chapterNo);
  return {
    fallbackUsed: false,
    chapter: {
      chapter: chapterNo,
      title,
      subtitle,
      text: stripUnsafeText(local.finalText) || local.finalText,
      sections: Array.isArray(local.sections) ? local.sections : [],
    },
  };
}

async function buildLoveSecretChapters(env, { base, mode, config, onProgress = null } = {}) {
  const totalChapters = Number(config?.totalChapters || 0);
  if (!Number.isFinite(totalChapters) || totalChapters <= 0) {
    return { chapters: [], fallbackUsed: false, totalChapters: 0 };
  }

  const chapters = new Array(totalChapters);
  let fallbackUsed = false;
  let completed = 0;

  console.info("[LoveBook][Flow] SKELETON_READY", { mode, chapterCount: totalChapters });
  for (let current = 0; current < totalChapters; current += 1) {
    const chapterNo = current + 1;
    console.info("[LoveBook][Chapter] START", { index: chapterNo });
    let generated = null;
    try {
      generated = await generateLoveSecretChapter(env, base, mode, config, chapterNo);
    } catch (error) {
      const chapterMeta = getLoveSecretChapterMeta(config, chapterNo);
      const title = stripUnsafeText(chapterMeta.title || `연애 비책 ${chapterNo}장`);
      const subtitle = stripUnsafeText(chapterMeta.subtitle || "");
      const sectionTitles = getChapterSpecificSections({}, chapterNo, mode);
      const local = buildLocalChapter(base, title, subtitle, sectionTitles, mode, chapterNo);
      generated = {
        fallbackUsed: true,
        chapter: {
          chapter: chapterNo,
          title,
          subtitle,
          text: stripUnsafeText(local.finalText) || local.finalText,
          sections: Array.isArray(local.sections) ? local.sections : [],
        },
      };
      console.error("[LoveBook][ChapterError]", {
        chapterIndex: chapterNo,
        chapterTitle: title,
        message: clean(error?.message || error) || "unknown_error",
      });
    }

    if (generated?.fallbackUsed) fallbackUsed = true;
    chapters[current] = generated?.chapter || null;
    completed += 1;

    if (typeof onProgress === "function") {
      await onProgress({ completed, chapterNo, totalChapters });
    }

    console.info("[LoveBook][Chapter] LOCAL_DONE", {
      index: chapterNo,
      fallbackUsed: Boolean(generated?.fallbackUsed),
    });
  }

  if (chapters.some((chapter) => !chapter)) {
    throw new Error(`[LoveBook] Chapter count mismatch: expected ${totalChapters}, got ${chapters.filter(Boolean).length}`);
  }
  console.info("[LoveBook][Flow] ALL_CHAPTERS_DONE", { expected: totalChapters, actual: chapters.length });
  return { chapters, fallbackUsed, totalChapters };
}

function stripUnsafeText(value) {
  return clean(value)
    .replace(/\b(undefined|null|nan)\b/gi, "")
    .replace(/\b(payload|json|schema|localdraft|fallback|llm|api|prompt|debug|raw|about:blank|internal\s*server\s*error|calculationmode|recovered)\b/gi, "")
    .replace(/chapter\s*1\s*chapter\s*1/gi, "")
    .replace(/자동\s*복구\s*생성/gi, "")
    .replace(/데이터가\s*부족합니다/gi, "")
    .replace(/로컬\s*엔진|계산\s*시그니처|내부\s*데이터|엔진\s*결과|데이터\s*정규화|품질\s*검증|재생성/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parsePillarToken(value) {
  const raw = clean(value);
  const m = raw.match(/^([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸])([자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])$/);
  if (!m) return null;
  return { gan: m[1], zhi: m[2], raw };
}

function pickPillarFromBase(base, key) {
  const node = base?.pillars?.[key];
  const gan = clean(node?.gan);
  const zhi = clean(node?.zhi);
  if (!gan || !zhi) return null;
  return { gan, zhi, raw: `${gan}${zhi}` };
}

function parsePillarsFromSajuData(sajuData) {
  const text = clean(sajuData);
  if (!text) return {};
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const out = {};

  const patterns = [
    { key: "year", regex: /년주[^:：]*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸][자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/ },
    { key: "month", regex: /월주[^:：]*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸][자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/ },
    { key: "day", regex: /일주[^:：]*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸][자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/ },
    { key: "hour", regex: /시주[^:：]*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸][자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/ },
  ];

  for (const line of lines) {
    for (const p of patterns) {
      if (out[p.key]) continue;
      const m = line.match(p.regex);
      if (m) out[p.key] = parsePillarToken(m[1]);
    }
  }
  return out;
}

function parseBirthDate(raw) {
  const text = clean(raw);
  if (!text) return "";
  const m = text.match(/(\d{4})[-./\s년]+(\d{1,2})[-./\s월]+(\d{1,2})/);
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return "";
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseBirthDateFromSajuData(sajuData) {
  const text = clean(sajuData);
  if (!text) return "";
  const m = text.match(/생년월일[^:：]*[:：]\s*([^\n]+)/);
  return parseBirthDate(m ? m[1] : text);
}

function parsePartnerSnapshot(partnerData) {
  const text = clean(partnerData);
  if (!text) return null;
  const pillars = parsePillarsFromSajuData(text);
  const day = pillars.day || null;
  const month = pillars.month || null;
  return {
    raw: text,
    birthDate: parseBirthDateFromSajuData(text),
    pillars,
    core: {
      dayMaster: clean(day?.gan),
      dayBranch: clean(day?.zhi),
      monthBranch: clean(month?.zhi),
    },
  };
}

function normalizeElementCounts(input) {
  const safe = input && typeof input === "object" ? input : {};
  return {
    wood: Number(safe.wood || 0) || 0,
    fire: Number(safe.fire || 0) || 0,
    earth: Number(safe.earth || 0) || 0,
    metal: Number(safe.metal || 0) || 0,
    water: Number(safe.water || 0) || 0,
  };
}

function deriveElementBalanceFromCounts(counts) {
  const total = Math.max(1, Number(counts.wood) + Number(counts.fire) + Number(counts.earth) + Number(counts.metal) + Number(counts.water));
  const entries = Object.keys(counts).map((key) => ({ key, value: Number(counts[key] || 0), pct: Math.round((Number(counts[key] || 0) / total) * 100) }));
  entries.sort((a, b) => b.pct - a.pct);
  const dominant = entries[0]?.key || "earth";
  const deficient = entries[entries.length - 1]?.key || "earth";
  const gap = Math.abs(Number(entries[0]?.pct || 0) - Number(entries[entries.length - 1]?.pct || 0));
  return { dominant, deficient, balanceScore: Math.max(35, Math.min(97, 100 - Math.round(gap * 1.6))) };
}

function normalizeSajuBase(body = {}) {
  const base = body?.sajuBase && typeof body.sajuBase === "object" ? body.sajuBase : {};
  const profile = body?.profile && typeof body.profile === "object" ? body.profile : {};
  const sajuData = clean(body?.sajuData);

  const parsed = parsePillarsFromSajuData(sajuData);
  const year = pickPillarFromBase(base, "year") || parsed.year || null;
  const month = pickPillarFromBase(base, "month") || parsed.month || null;
  const day = pickPillarFromBase(base, "day") || parsed.day || null;
  const hour = pickPillarFromBase(base, "hour") || parsed.hour || null;

  const dayMaster = clean(base?.core?.dayMaster) || clean(day?.gan);
  const dayBranch = clean(base?.core?.dayBranch) || clean(day?.zhi);
  const monthBranch = clean(base?.core?.monthBranch) || clean(month?.zhi);

  const counts = normalizeElementCounts(base?.elementBalance?.counts || body?.elementCounts || {});
  const balance = deriveElementBalanceFromCounts(counts);

  const tenGodCounts = (base?.tenGods?.counts && typeof base.tenGods.counts === "object") ? base.tenGods.counts : {};
  const tenGodEntries = Object.keys(tenGodCounts).map((name) => ({ name, count: Number(tenGodCounts[name] || 0) || 0 }));
  tenGodEntries.sort((a, b) => b.count - a.count);

  const birthDate = parseBirthDate(base?.user?.birthDate)
    || parseBirthDate(profile?.birthDate)
    || parseBirthDateFromSajuData(sajuData);

  const normalizedBase = {
    user: {
      name: clean(base?.user?.name) || clean(profile?.name) || "사용자",
      gender: clean(base?.user?.gender) || clean(profile?.gender) || "",
      birthDate,
      birthTime: clean(base?.user?.birthTime) || clean(profile?.birthTime) || "",
      calendarType: clean(base?.user?.calendarType) || "solar",
    },
    pillars: {
      year,
      month,
      day,
      hour,
    },
    core: {
      dayMaster,
      dayBranch,
      monthBranch,
      season: clean(base?.core?.season) || "",
    },
    elementBalance: {
      counts,
      dominant: clean(base?.elementBalance?.dominant) || balance.dominant,
      deficient: clean(base?.elementBalance?.deficient) || balance.deficient,
      balanceScore: Number(base?.elementBalance?.balanceScore) || balance.balanceScore,
    },
    tenGods: {
      counts: tenGodCounts,
      dominantTenGod: clean(base?.tenGods?.dominantTenGod) || clean(tenGodEntries[0]?.name) || "",
      topTenGods: (base?.tenGods?.topTenGods && Array.isArray(base.tenGods.topTenGods))
        ? base.tenGods.topTenGods
        : tenGodEntries.slice(0, 3).map((row) => ({ name: row.name, count: row.count })),
    },
    strength: {
      isStrong: typeof base?.strength?.isStrong === "boolean" ? base.strength.isStrong : undefined,
      label: clean(base?.strength?.label),
      reason: clean(base?.strength?.reason),
    },
    johu: base?.johu && typeof base.johu === "object" ? base.johu : undefined,
    yongshin: base?.yongshin && typeof base.yongshin === "object" ? base.yongshin : undefined,
    specialStars: base?.specialStars && typeof base.specialStars === "object" ? base.specialStars : undefined,
    timing: base?.timing && typeof base.timing === "object" ? base.timing : undefined,
    partner: parsePartnerSnapshot(body?.partnerData),
  };

  return {
    ...normalizedBase,
    loveSecretReference: buildLoveSecretReference(normalizedBase),
  };
}

function validateMinimumSaju(base) {
  const hasYear = Boolean(clean(base?.pillars?.year?.gan) && clean(base?.pillars?.year?.zhi));
  const hasMonth = Boolean(clean(base?.pillars?.month?.gan) && clean(base?.pillars?.month?.zhi));
  const hasDay = Boolean(clean(base?.pillars?.day?.gan) && clean(base?.pillars?.day?.zhi));
  const hasDayMaster = Boolean(clean(base?.core?.dayMaster));
  const hasDayBranch = Boolean(clean(base?.core?.dayBranch));
  const hasBirthDate = Boolean(clean(base?.user?.birthDate));
  const missing = [];
  if (!hasYear) missing.push("yearPillar");
  if (!hasMonth) missing.push("monthPillar");
  if (!hasDay) missing.push("dayPillar");
  if (!hasDayMaster) missing.push("dayMaster");
  if (!hasDayBranch) missing.push("dayBranch");
  if (!hasBirthDate) missing.push("birthDate");
  return { ok: missing.length === 0, missing };
}

function validatePartnerMinimumSaju(base, mode) {
  if (normalizeMode(mode) !== "compatibility") {
    return { ok: true, missing: [] };
  }
  const partner = base?.partner && typeof base.partner === "object" ? base.partner : null;
  const missing = [];
  if (!clean(partner?.birthDate)) missing.push("partnerBirthDate");
  if (!clean(partner?.core?.dayMaster)) missing.push("partnerDayMaster");
  if (!clean(partner?.core?.dayBranch)) missing.push("partnerDayBranch");
  return { ok: missing.length === 0, missing };
}

function safeModeChapterConfig(mode) {
  const key = toConfigMode(mode);
  return LOVE_SECRET_MODE_CONFIG[key] || LOVE_SECRET_MODE_CONFIG.solo;
}

function getChapterSpecificSections(body, chapterNo, mode) {
  const input = Array.isArray(body?.chapterSpecificSections) ? body.chapterSpecificSections : [];
  const cleanedInput = input.map((v) => stripUnsafeText(v)).filter(Boolean);
  if (cleanedInput.length) return cleanedInput.slice(0, 8);
  const defaults = DEFAULT_CATEGORY_BY_MODE[mode] || DEFAULT_CATEGORY_BY_MODE.solo;
  return (defaults[chapterNo] || defaults[1] || ["핵심 성향", "관계 패턴", "주의점", "실전 전략", "행동 가이드"]).slice(0, 8);
}

function localCategoryDraft(base, chapterTitle, sectionTitle, mode, chapterNo) {
  const sectionIndex = Number(arguments[5] || 0);
  const dm = clean(base?.core?.dayMaster) || "미상";
  const db = clean(base?.core?.dayBranch) || "미상";
  const mb = clean(base?.core?.monthBranch) || "미상";
  const dominantEl = clean(base?.elementBalance?.dominant) || "earth";
  const deficientEl = clean(base?.elementBalance?.deficient) || "water";
  const tenGod = clean(base?.tenGods?.dominantTenGod) || "비견";
  const strengthLabel = clean(base?.strength?.label) || (base?.strength?.isStrong === true ? "신강" : base?.strength?.isStrong === false ? "신약" : "중화");
  const hasHour = Boolean(clean(base?.pillars?.hour?.gan) && clean(base?.pillars?.hour?.zhi));
  const hourNote = hasHour
    ? "시주 정보가 있어 친밀감 세부 반응까지 비교적 선명하게 판단했습니다."
    : "출생 시간이 없는 경우에는 시주 영역의 세부 판단을 보수적으로 해석하며, 일주와 월지를 중심으로 연애 성향을 판단합니다.";
  const ref = base?.loveSecretReference && typeof base.loveSecretReference === "object" ? base.loveSecretReference : null;
  const partner = base?.partner && typeof base.partner === "object" ? base.partner : null;
  const partnerDm = clean(partner?.core?.dayMaster);
  const partnerDb = clean(partner?.core?.dayBranch);
  const identity = ref?.identity || null;
  const primaryRisk = Array.isArray(ref?.risks) && ref.risks.length ? ref.risks[0] : null;
  const bestMonths = Array.isArray(ref?.monthlyWindows?.best) ? ref.monthlyWindows.best.slice(0, 2).map((row) => `${row.month} ${row.score}점`).join(", ") : "";
  const cautionMonths = Array.isArray(ref?.monthlyWindows?.caution) ? ref.monthlyWindows.caution.slice(0, 2).map((row) => `${row.month} ${row.score}점`).join(", ") : "";

  const profileLines = [];
  if (identity) {
    profileLines.push(`${identity.title} 성향 기준으로 보면 ${identity.instinct}`);
    profileLines.push(`무의식의 핵심은 ${identity.unconscious}`);
  }
  if (chapterNo <= 3 && ref?.idealPartner) {
    profileLines.push(`보완 인연은 용신 오행 ${ref.yongshinElementLabel} 계열로, ${ref.idealPartner.personality} 흐름과 잘 맞습니다.`);
  }
  if (chapterNo >= 4 && primaryRisk) {
    profileLines.push(`현재 가장 먼저 관리해야 할 리스크는 ${primaryRisk.title}이며, ${primaryRisk.solution}`);
  }
  if (chapterNo >= 7 && ref?.marriageAgeLabel) {
    profileLines.push(`장기 안정성은 ${ref.marriageAgeLabel} 구간에서 더 선명해지고, ${ref.strengthTip}`);
  }
  if (chapterNo >= 9 && bestMonths) {
    profileLines.push(`실행 타이밍은 상위 구간 ${bestMonths}에 집중하고, 주의 구간 ${cautionMonths || "저점 달"}에는 결론보다 조율을 우선해야 합니다.`);
  }
  if (chapterNo === 10 && ref?.gaeun) {
    profileLines.push(`개운 루틴은 ${ref.gaeun.livingColor}, ${ref.gaeun.perfume}, 확언 "${ref.gaeun.affirmation}"을 함께 쓰는 방식이 가장 안정적입니다.`);
  }

  const openingSet = [
    `${chapterTitle}에서 다루는 ${sectionTitle}는 사랑의 방향을 결정하는 핵심 축입니다.`,
    `${sectionTitle}를 읽을 때는 감정의 크기보다 관계가 실제로 굴러가는 구조를 함께 보아야 합니다.`,
    `${chapterTitle}의 ${sectionTitle}는 막연한 운세가 아니라 연애를 운영하는 기준을 정리하는 장치입니다.`,
    `${sectionTitle}의 초점은 상대를 바꾸는 방법이 아니라 내가 사랑을 다루는 방식을 정교하게 만드는 데 있습니다.`,
    `${chapterTitle}에서 특히 ${sectionTitle}는 관계의 체온과 속도를 조율하는 실무 지침에 가깝습니다.`,
    `${sectionTitle}를 통해 지금의 관계 습관을 점검하면 오래 가는 사랑의 방향을 더 분명하게 잡을 수 있습니다.`,
  ];
  const opening = openingSet[sectionIndex % openingSet.length];
  const tenGodPack = SAJU_LOVE_TEN_GOD_INTERPRETATION[tenGod] || SAJU_LOVE_TEN_GOD_INTERPRETATION["비견"];
  const pillarNotes = [
    `${SAJU_LOVE_PILLAR_INTERPRETATION.dayStem.theme} 관점에서 일간 ${dm}은 ${tenGodPack.loveCore}로 나타나며, 감정을 다룰 때 ${tenGodPack.communication} 성향이 함께 드러납니다.`,
    `${SAJU_LOVE_PILLAR_INTERPRETATION.dayBranch.theme} 관점에서 일지 ${db}는 가까워질수록 자존심과 신뢰의 경계선을 더 분명히 세우는 경향이 있습니다.`,
    `${SAJU_LOVE_PILLAR_INTERPRETATION.monthBranch.theme} 관점에서 월지 ${mb}는 사랑을 현실 계획과 연결하려는 성향을 강화하고, 우세 오행 ${dominantEl}과 결핍 오행 ${deficientEl}의 간격이 감정 피로도를 좌우합니다.`,
  ];
  if (mode === "compatibility" && partnerDm && partnerDb) {
    pillarNotes.push(`궁합 관점에서는 상대 일간 ${partnerDm}, 상대 일지 ${partnerDb}와의 상호작용을 함께 보며, 두 사람의 감정 속도와 생활 리듬 차이를 조율해야 관계 안정성이 높아집니다.`);
  }

  const paragraph1 = `${opening}\n\n${chapterNo}장의 ${sectionTitle}에서 중요한 것은 한 번의 강한 감정이 아니라 반복되는 선택의 방향입니다. 이 항목은 마음이 움직이는 순간, 표현이 오해로 번지는 순간, 그리고 관계를 다시 안정으로 돌리는 순간을 분리해 설명합니다. 따라서 관계가 좋을 때는 무엇을 유지해야 하는지, 흔들릴 때는 무엇을 먼저 멈춰야 하는지를 동시에 제시합니다.`;
  const paragraph2 = `${pillarNotes.join(" ")} ${chapterNo}장 ${sectionTitle} 구간에서는 ${strengthLabel} 흐름에 따라 ${tenGodPack.attraction} 경향이 자주 나타나며, ${tenGodPack.caution}이 겹칠 때 갈등이 커지기 쉽습니다. ${hourNote}`;
  const paragraph3 = `${sectionTitle}가 건강하게 작동하면 ${tenGodPack.strength}이 선명해지고, 관계의 중심이 흔들려도 다시 균형을 회복하는 속도가 빨라집니다. ${tenGodPack.marriage}으로 이어지는 장점이 살아나면 사랑은 감정 소비가 아니라 성장의 협업으로 바뀝니다. ${profileLines.join(" ")}`;
  const paragraph4 = `${sectionTitle}에서 신뢰가 어긋날 때는 ${tenGodPack.breakup} 패턴이 먼저 나타날 수 있으므로, 감정이 커진 날일수록 결론을 서두르기보다 대화 순서와 말의 온도를 먼저 조정해야 합니다. ${tenGodPack.advice}를 실전 규칙으로 삼고, ${chapterNo}장에서 바로 실행할 한 문장을 정해 반복하면 관계의 회복력이 확실히 올라갑니다.`;

  const text = [paragraph1, paragraph2, paragraph3, paragraph4].join("\n\n");

  return stripUnsafeText(text);
}

function buildLocalChapter(base, chapterTitle, chapterSubtitle, sectionTitles, mode, chapterNo) {
  const sections = sectionTitles.map((sectionTitle, idx) => ({
    id: `${String(idx + 1).padStart(2, "0")}`,
    title: stripUnsafeText(sectionTitle) || `세부 항목 ${idx + 1}`,
    body: localCategoryDraft(base, chapterTitle, sectionTitle, mode, chapterNo, idx),
  }));
  const text = sections.map((s) => `## ${s.title}\n\n${s.body}`).join("\n\n");
  return {
    chapterTitle,
    chapterSubtitle,
    sections,
    localDraft: text,
    finalText: text,
    fallbackUsed: false,
  };
}

function toObjectIdOrNull(value) {
  const raw = clean(value);
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

async function getLoveSecretJobsCollection(env) {
  await connectDb(getLoveSecretFastDbEnv(env));
  return mongoose.connection.collection(LOVE_SECRET_JOB_COLLECTION);
}

function toPublicJobPayload(job = {}) {
  const status = clean(job?.status) || "pending";
  const chapterCount = Number(job?.chapterCount || 0);
  const completedChapters = Number(job?.completedChapters || 0);
  return {
    jobId: String(job?._id || ""),
    reportId: clean(job?.reportId),
    mode: normalizeMode(job?.mode),
    status,
    chapterCount,
    completedChapters,
    progress: chapterCount > 0 ? Math.max(0, Math.min(100, Math.round((completedChapters / chapterCount) * 100))) : 0,
    message: clean(job?.message),
    errorMessage: clean(job?.errorMessage),
    resultReady: status === "completed",
    failed: status === "failed",
    updatedAt: job?.updatedAt || null,
    createdAt: job?.createdAt || null,
  };
}

async function runLoveSecretJob(env, jobId) {
  const coll = await getLoveSecretJobsCollection(env);
  const _id = toObjectIdOrNull(jobId);
  if (!_id) return;

  const job = await coll.findOne({ _id });
  if (!job) return;

   const sessionId = clean(job?.requestBody?.sessionId || job?.requestBody?.reportSessionId);
  const execRaw = job?.execution && typeof job.execution === "object" ? job.execution : {};
  const executionCtx = {
    executionKey: clean(execRaw.executionKey, 120),
    sessionId: clean(execRaw.sessionId || sessionId, 180),
    reportId: clean(execRaw.reportId || job?.reportId, 120),
    metadata: execRaw.metadata && typeof execRaw.metadata === "object" ? execRaw.metadata : null,
  };

  await coll.updateOne(
    { _id },
    {
      $set: {
        status: "processing",
        stage: "local_calculation",
        message: "연애 사주 신호를 계산하고 있습니다.",
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  try {
    const mode = normalizeMode(job?.mode || "solo");
    console.info("[LoveBookPremiumPDF][RequestReceived]", {
      mode,
      hasSessionId: Boolean(sessionId),
      hasReportId: Boolean(clean(job?.reportId)),
    });
    console.info("[LoveBookPremiumPDF][ModeValidated]", { mode });

    const base = normalizeSajuBase(job?.requestBody || {});
    const safeBirthLog = {
      mode,
      hasSelfBirthDate: Boolean(clean(base?.user?.birthDate)),
      hasSelfBirthTime: Boolean(clean(base?.user?.birthTime)),
      hasPartnerBirthDate: /생년월일\s*:\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일/.test(clean(job?.requestBody?.partnerData)),
      hasPartnerBirthTime: /출생\s*시각\s*:\s*/.test(clean(job?.requestBody?.partnerData)),
    };
    console.info("[LoveBookPremiumPDF][BirthInputValidated]", safeBirthLog);

    const partnerValid = validatePartnerMinimumSaju(base, mode);
    if (!partnerValid.ok) {
      throw new Error(`MISSING_PARTNER_SAJU:${partnerValid.missing.join(",")}`);
    }

    const config = safeModeChapterConfig(mode);
    const expectedChapterCount = Number(config.totalChapters || 0);

    console.info("[LoveBookPremiumPDF][LocalCalculationStart]", { mode });
    console.info("[LoveBookPremiumPDF][LocalCalculationSuccess]", {
      selfDayMasterResolved: Boolean(clean(base?.core?.dayMaster)),
      romanceStarsResolved: Boolean(base?.specialStars && typeof base.specialStars === "object"),
    });

    await coll.updateOne(
      { _id },
      {
        $set: {
          stage: "local_draft_building",
          message: "모드별 로컬 원고를 생성하고 있습니다.",
          updatedAt: new Date(),
        },
      },
    );

    console.info("[LoveBookPremiumPDF][LocalDraftBuildStart]", { chapterCount: expectedChapterCount });
    const { chapters: localChapters, totalChapters } = await buildLoveSecretChapters(env, {
      base,
      mode,
      config,
      onProgress: async ({ completed, chapterNo, totalChapters: progressTotal }) => {
        console.info("[LoveBookPremiumPDF][LocalDraftChapterDone]", {
          chapter: chapterNo,
          completed,
        });
        await coll.updateOne(
          { _id },
          {
            $set: {
              status: "processing",
              stage: completed >= progressTotal ? "local_quality_validation" : "local_draft_building",
              message: completed >= progressTotal
                ? "로컬 원고 품질을 검증하고 있습니다."
                : `로컬 원고 ${completed}/${progressTotal} 챕터 생성 중...`,
              completedChapters: Math.max(0, Math.min(progressTotal, completed)),
              updatedAt: new Date(),
            },
          },
        );
      },
    });

    console.info("[LoveBookPremiumPDF][LocalDraftBuildSuccess]", { chapterCount: localChapters.length });

    const localValidation = validateLoveSecretManuscript({
      mode,
      chapters: localChapters,
      config,
      minChapterChars: Number(config?.chapterMinDefault || 2000),
    });
    if (!localValidation.ok) {
      throw new Error(`LOCAL_DRAFT_INVALID: expected=${localValidation.expected}, actual=${localValidation.actual}, totalChars=${localValidation.totalChars}`);
    }
    console.info("[LoveBookPremiumPDF][LocalQualityValidated]", {
      chapterCount: localValidation.actual,
      totalLength: localValidation.totalChars,
      forbiddenTermsCount: localValidation.forbiddenTermsCount,
      repetitionScore: localValidation.repetitionScore,
    });

    await coll.updateOne(
      { _id },
      {
        $set: {
          stage: "local_finalize",
          message: "로컬 상담문 최종 점검을 진행하고 있습니다.",
          localValidation,
          localManuscript: {
            mode,
            chapterCount: localChapters.length,
            chapters: localChapters,
            source: LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL,
          },
          updatedAt: new Date(),
        },
      },
    );

    let finalChapters = localChapters.map((chapter) => ({ ...chapter, source: LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL }));
    let fallbackUsed = false;
    let manuscriptSource = LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;

    const finalValidation = validateLoveSecretManuscript({
      mode,
      chapters: finalChapters,
      config,
      minChapterChars: Number(config?.chapterMinDefault || 2000),
    });

    if (!finalValidation.ok) {
      fallbackUsed = true;
      finalChapters = localChapters;
      manuscriptSource = LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;
    }

    const validatedFinal = validateLoveSecretManuscript({
      mode,
      chapters: finalChapters,
      config,
      minChapterChars: Number(config?.chapterMinDefault || 2000),
    });
    if (!validatedFinal.ok) {
      throw new Error("FINAL_MANUSCRIPT_INVALID");
    }
    console.info("[LoveBookPremiumPDF][FinalManuscriptValidated]", {
      mode,
      chapterCount: validatedFinal.actual,
      totalLength: validatedFinal.totalChars,
      forbiddenTermsCount: validatedFinal.forbiddenTermsCount,
      repetitionScore: validatedFinal.repetitionScore,
      manuscriptSource,
    });

    console.info("[LoveBookPremiumPDF][PdfRenderStart]", { chapterCount: finalChapters.length, fallbackUsed, manuscriptSource });

    await coll.updateOne(
      { _id },
      {
        $set: {
          status: "completed",
          stage: "completed",
          message: "연애 비책 PDF가 준비되었습니다.",
          completedChapters: totalChapters,
          fallbackUsed,
          manuscriptSource,
          result: {
            ok: true,
            featureKey: clean(job?.featureKey) || toFeatureKey(mode),
            mode,
            sessionId: clean(job?.requestBody?.sessionId || job?.requestBody?.reportSessionId) || "",
            chapterCount: totalChapters,
            fallbackUsed,
            manuscriptSource,
            pdfUrl: "",
            chapters: finalChapters,
          },
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
    console.info("[LoveBookPremiumPDF][PdfRenderSuccess]", { chapterCount: totalChapters, fallbackUsed, manuscriptSource });
    await completePremiumPdfExecution(
      env,
      String(job?.userId || ""),
      executionCtx,
      clean(job?.reportId),
      {
        manuscriptSource,
        chapterCount: totalChapters,
        archive: {
          reportId: clean(job?.reportId),
          reportType: "love_book",
          displayName: "사주 연애 비책",
          title: `${clean(base?.user?.name || "사용자")}님의 연애 비책`,
          mode,
          birthName: clean(base?.user?.name),
          summary: clean(finalChapters?.[0]?.sections?.[0]?.body || "", 1000),
          pdfUrl: "",
          chapters: finalChapters,
          payload: { mode, chapterCount: totalChapters },
          canReopen: true,
          canDownload: false,
        },
      },
    );
    resolveLoveSecretLock(sessionId, "done", String(_id));
  } catch (error) {
    console.error("[LoveBookPremiumPDF][Error]", normalizeLoveBookError(error));
    await coll.updateOne(
      { _id },
      {
        $set: {
          status: "failed",
          stage: "failed",
          message: "연애 비책 생성이 중단되었습니다.",
          errorMessage: clean(error?.message || "알 수 없는 오류"),
          failedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
    await failPremiumPdfExecution(
      env,
      String(job?.userId || ""),
      executionCtx,
      "love_secret_generation_failed",
      clean(error?.message || "연애 비책 생성 실패"),
      "love-secret-generation",
    );
    resolveLoveSecretLock(sessionId, "failed", String(_id));
  }
}

function buildApiError(code, message, status = 400, debugSafe = null) {
  return json({
    ok: false,
    code,
    message,
    ...(debugSafe && typeof debugSafe === "object" ? { debugSafe } : {}),
  }, { status });
}

function isLikelyDbUnavailableError(error) {
  const msg = clean(error?.message || error).toLowerCase();
  return msg.includes("database is temporarily unavailable")
    || msg.includes("db is temporarily unavailable")
    || msg.includes("mongodb")
    || msg.includes("server selection")
    || msg.includes("connect")
    || msg.includes("timeout")
    || msg.includes("econn")
    || msg.includes("topology");
}

async function authorizeLoveSecret(request, env, body, mode) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return { ok: false, response: buildApiError("UNAUTHORIZED", "로그인 후 연애 비책 PDF를 생성할 수 있습니다.", 401) };
    }
    throw error;
  }

  const featureKey = toFeatureKey(mode);
  const reportId = clean(body?.reportId);
  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.chapterSessionId);
  const purchaseId = clean(body?.purchaseId || body?.reportPurchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId || body?._paymentContext?.purchaseId);

  const access = await requirePremiumReportAccess(getLoveSecretFastDbEnv(env), auth.userId, "loveSecret", {
    ...body,
    mode,
    reportType: "loveSecret",
    featureKey,
    _accessRoute: "/api/love-secret/generate-chapter",
  });

  if (!access?.ok) {
    const status = Number(access?.status || 402);
    const hasBinding = Boolean(reportId || sessionId || purchaseId);
    const isPaymentBindingMiss = status === 402 && hasBinding;
    const code = isPaymentBindingMiss
      ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING"
      : (access?.code || "UNAUTHORIZED");
    const message = isPaymentBindingMiss
      ? "결제는 확인되었지만 생성 권한 연결이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."
      : status === 402
        ? "프리미엄 연애 비책 생성 권한이 필요합니다."
        : status === 401
          ? "로그인 후 연애 비책 PDF를 생성할 수 있습니다."
          : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return {
      ok: false,
      response: buildApiError(code, message, status, {
        featureKey,
        mode,
        hasSessionId: Boolean(sessionId),
        hasPurchaseId: Boolean(purchaseId),
        hasReportId: Boolean(reportId),
      }),
    };
  }

  return { ok: true, auth, featureKey, access };
}

async function handleGenerateChapter(request, env) {
  const body = await readJson(request);
  const mode = normalizeMode(body?.mode || body?.reportMode);
  console.info("[LoveBookPremiumPDF][RequestReceived]", { mode, endpoint: "generate-chapter" });
  console.info("[LoveBookPremiumPDF][ModeValidated]", { mode });
  const authz = await authorizeLoveSecret(request, env, body, mode);
  if (!authz.ok) return authz.response;

  const chapterNo = Number(body?.chapter || 1);
  const config = safeModeChapterConfig(mode);
  const totalChapters = Number(config.totalChapters || 0);
  if (!Number.isFinite(chapterNo) || chapterNo < 1 || chapterNo > totalChapters) {
    return buildApiError("INVALID_CHAPTER", "요청한 챕터 번호가 유효하지 않습니다.", 400);
  }

  const base = normalizeSajuBase(body);
  console.info("[LoveBookPremiumPDF][BirthInputValidated]", {
    mode,
    hasSelfBirthDate: Boolean(clean(base?.user?.birthDate)),
    hasSelfBirthTime: Boolean(clean(base?.user?.birthTime)),
  });
  const valid = validateMinimumSaju(base);
  if (!valid.ok) {
    return buildApiError("MISSING_SAJU_DATA", "사주 분석 결과가 충분하지 않습니다. 사주 분석 화면에서 다시 계산해 주세요.", 400);
  }
  const partnerValid = validatePartnerMinimumSaju(base, mode);
  if (!partnerValid.ok) {
    return buildApiError("MISSING_PARTNER_SAJU", "궁합 모드는 상대 생년월일과 핵심 명식 정보가 필요합니다. 상대 정보를 확인해 주세요.", 400);
  }

  const chapterMeta = (Array.isArray(config.chapters) ? config.chapters : [])[chapterNo - 1] || {};
  const title = stripUnsafeText(body?.chapterTitle || chapterMeta.title || `연애 비책 ${chapterNo}장`);
  const subtitle = stripUnsafeText(body?.chapterSubtitle || chapterMeta.subtitle || "") || "";
  const sectionTitles = getChapterSpecificSections(body, chapterNo, mode);

  console.info("[LoveBookPremiumPDF][LocalDraftBuildStart]", { chapterCount: 1 });
  const local = buildLocalChapter(base, title, subtitle, sectionTitles, mode, chapterNo);
  const finalText = stripUnsafeText(local.finalText) || local.finalText;
  console.info("[LoveBookPremiumPDF][LocalDraftChapterDone]", { chapter: chapterNo, chapterChars: finalText.length });
  console.info("[LoveBookPremiumPDF][FinalManuscriptValidated]", {
    chapterCount: 1,
    manuscriptSource: LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL,
  });

  return json({
    ok: true,
    featureKey: authz.featureKey,
    mode,
    sessionId: clean(body?.sessionId || body?.reportSessionId || body?.chapterSessionId) || "",
    chapter: chapterNo,
    chapterCount: totalChapters,
    chapterMeta: { title, subtitle },
    fallbackUsed: false,
    manuscriptSource: LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL,
    pdfUrl: "",
    text: finalText,
    sections: Array.isArray(local.sections) ? local.sections : [],
  });
}

async function handlePrepare(request, env) {
  const body = await readJson(request);
  const mode = normalizeMode(body?.mode || body?.reportMode);
  console.info("[LoveBookPremiumPDF][RequestReceived]", { mode, endpoint: "prepare" });
  console.info("[LoveBookPremiumPDF][ModeValidated]", { mode });
  const authz = await authorizeLoveSecret(request, env, body, mode);
  if (!authz.ok) return authz.response;

  const base = normalizeSajuBase(body);
  console.info("[LoveBookPremiumPDF][BirthInputValidated]", {
    mode,
    hasSelfBirthDate: Boolean(clean(base?.user?.birthDate)),
    hasSelfBirthTime: Boolean(clean(base?.user?.birthTime)),
  });
  const valid = validateMinimumSaju(base);
  if (!valid.ok) {
    return buildApiError("MISSING_SAJU_DATA", "사주 분석 결과가 충분하지 않습니다. 사주 분석 화면에서 다시 계산해 주세요.", 400);
  }
  const partnerValid = validatePartnerMinimumSaju(base, mode);
  if (!partnerValid.ok) {
    return buildApiError("MISSING_PARTNER_SAJU", "궁합 모드는 상대 생년월일과 핵심 명식 정보가 필요합니다. 상대 정보를 확인해 주세요.", 400);
  }

  const config = safeModeChapterConfig(mode);
  const sessionId = clean(body?.sessionId || body?.reportSessionId) || "";
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: LOVE_SECRET_SERVICE_KEY,
    reportType: "loveSecret",
    userId: authz?.auth?.userId,
    featureKey: authz.featureKey,
    sessionId,
    reportId: clean(body?.reportId),
    access: authz.access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  await startPremiumPdfExecution(env, authz?.auth?.userId, executionCtx);

  try {
  console.info("[LoveBookPremiumPDF][LocalCalculationStart]", { mode });
  console.info("[LoveBookPremiumPDF][LocalCalculationSuccess]", {
    selfDayMasterResolved: Boolean(clean(base?.core?.dayMaster)),
    romanceStarsResolved: Boolean(base?.specialStars && typeof base.specialStars === "object"),
  });
  console.info("[LoveBookPremiumPDF][LocalDraftBuildStart]", { chapterCount: Number(config?.totalChapters || 0) });

  const { chapters: localChapters, totalChapters } = await buildLoveSecretChapters(env, {
    base,
    mode,
    config,
  });

  const localValidation = validateLoveSecretManuscript({
    mode,
    chapters: localChapters,
    config,
    minChapterChars: Number(config?.chapterMinDefault || 2000),
  });
  if (!localValidation.ok) {
    return buildApiError("LOCAL_DRAFT_INVALID", "로컬 원고 생성이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.", 422);
  }
  console.info("[LoveBookPremiumPDF][LocalDraftBuildSuccess]", { chapterCount: localChapters.length, totalLength: localValidation.totalChars });
  console.info("[LoveBookPremiumPDF][LocalQualityValidated]", {
    chapterCount: localValidation.actual,
    totalLength: localValidation.totalChars,
    forbiddenTermsCount: localValidation.forbiddenTermsCount,
    repetitionScore: localValidation.repetitionScore,
  });

  let finalChapters = localChapters.map((chapter) => ({ ...chapter, source: LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL }));
  let fallbackUsed = false;
  let manuscriptSource = LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;

  const finalValidation = validateLoveSecretManuscript({
    mode,
    chapters: finalChapters,
    config,
    minChapterChars: Number(config?.chapterMinDefault || 2000),
  });
  if (!finalValidation.ok) {
    fallbackUsed = true;
    finalChapters = localChapters;
    manuscriptSource = LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;
  }
  console.info("[LoveBookPremiumPDF][FinalManuscriptValidated]", {
    chapterCount: finalChapters.length,
    manuscriptSource,
  });
  console.info("[LoveBookPremiumPDF][PdfRenderStart]", { chapterCount: finalChapters.length, fallbackUsed, manuscriptSource });
  console.info("[LoveBookPremiumPDF][PdfRenderSuccess]", { chapterCount: finalChapters.length, fallbackUsed, manuscriptSource });

  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `love-secret-${Date.now().toString(36)}`);
  await completePremiumPdfExecution(env, authz?.auth?.userId, executionCtx, reportId, {
    manuscriptSource,
    chapterCount: totalChapters,
    archive: {
      reportId,
      reportType: "love_book",
      displayName: "사주 연애 비책",
      title: `${clean(base?.user?.name || "사용자")}님의 연애 비책`,
      mode,
      birthName: clean(base?.user?.name),
      summary: clean(finalChapters?.[0]?.sections?.[0]?.body || "", 1000),
      pdfUrl: "",
      chapters: finalChapters,
      payload: { mode, chapterCount: totalChapters },
      canReopen: true,
      canDownload: false,
    },
  });

  return json({
    ok: true,
    featureKey: authz.featureKey,
    mode,
    reportId,
    sessionId,
    chapterCount: totalChapters,
    fallbackUsed,
    manuscriptSource,
    pdfUrl: "",
    chapters: finalChapters,
  });
  } catch (error) {
    await failPremiumPdfExecution(
      env,
      authz?.auth?.userId,
      executionCtx,
      "love_secret_prepare_failed",
      clean(error?.message || "연애 비책 생성 실패"),
      "love-secret-prepare-sync",
    );
    throw error;
  }
}

async function handlePrepareAsync(request, env, ctx) {
  const body = await readJson(request);
  const mode = normalizeMode(body?.mode || body?.reportMode);
  console.info("[LoveBookPremiumPDF][RequestReceived]", { mode, endpoint: "prepare-async" });
  console.info("[LoveBookPremiumPDF][ModeValidated]", { mode });
  const authz = await authorizeLoveSecret(request, env, body, mode);
  if (!authz.ok) return authz.response;

  const base = normalizeSajuBase(body);
  console.info("[LoveBookPremiumPDF][BirthInputValidated]", {
    mode,
    hasSelfBirthDate: Boolean(clean(base?.user?.birthDate)),
    hasSelfBirthTime: Boolean(clean(base?.user?.birthTime)),
  });
  const valid = validateMinimumSaju(base);
  if (!valid.ok) {
    return buildApiError("MISSING_SAJU_DATA", "사주 분석 결과가 충분하지 않습니다. 사주 분석 화면에서 다시 계산해 주세요.", 400);
  }
  const partnerValid = validatePartnerMinimumSaju(base, mode);
  if (!partnerValid.ok) {
    return buildApiError("MISSING_PARTNER_SAJU", "궁합 모드는 상대 생년월일과 핵심 명식 정보가 필요합니다. 상대 정보를 확인해 주세요.", 400);
  }

  const config = safeModeChapterConfig(mode);
  const sessionId = clean(body?.sessionId || body?.reportSessionId || `love-book:${clean(body?.reportId)}`);
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: LOVE_SECRET_SERVICE_KEY,
    reportType: "loveSecret",
    userId: authz?.auth?.userId,
    featureKey: authz.featureKey,
    sessionId,
    reportId: clean(body?.reportId),
    access: authz.access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  await startPremiumPdfExecution(env, authz?.auth?.userId, executionCtx);
  const lockState = acquireLoveSecretLock(sessionId);
  if (!lockState.ok) {
    const existing = lockState.existing || {};
    return json({
      ok: true,
      accepted: true,
      duplicate: true,
      sessionId,
      jobId: clean(existing.jobId),
      status: clean(existing.status || "running") || "running",
      pollAfterMs: LOVE_SECRET_JOB_POLL_AFTER_MS,
      lock: {
        sessionId,
        status: clean(existing.status || "running") || "running",
        startedAt: clean(existing.startedAt) || new Date().toISOString(),
      },
    }, { status: 202 });
  }

  const totalChapters = Number(config.totalChapters || 0);
  try {
    const coll = await getLoveSecretJobsCollection(env);
    const now = new Date();

    const runningJob = await coll.findOne({
      service: LOVE_SECRET_SERVICE_KEY,
      userId: String(authz?.auth?.userId || ""),
      "requestBody.sessionId": sessionId,
      status: { $in: ["pending", "processing"] },
    });
    if (runningJob) {
      resolveLoveSecretLock(sessionId, "running", String(runningJob?._id || ""));
      return json({
        ok: true,
        accepted: true,
        duplicate: true,
        sessionId,
        jobId: String(runningJob?._id || ""),
        status: clean(runningJob?.status) || "pending",
        pollAfterMs: LOVE_SECRET_JOB_POLL_AFTER_MS,
      }, { status: 202 });
    }

    const insertDoc = {
      service: LOVE_SECRET_SERVICE_KEY,
      featureKey: authz.featureKey,
      userId: String(authz?.auth?.userId || ""),
      reportId: clean(body?.reportId),
      mode,
      status: "pending",
      stage: "pending",
      message: "연애 비책 생성 요청을 접수했습니다.",
      chapterCount: totalChapters,
      completedChapters: 0,
      requestBody: {
        reportId: clean(body?.reportId),
        sessionId,
        reportSessionId: sessionId,
        mode,
        reportMode: mode,
        sajuData: clean(body?.sajuData),
        sajuBase: base,
        profile: body?.profile && typeof body.profile === "object" ? body.profile : {},
        partnerData: body?.partnerData || "",
      },
      execution: {
        executionKey: executionCtx.executionKey,
        sessionId: executionCtx.sessionId,
        reportId: executionCtx.reportId,
        metadata: executionCtx.metadata,
      },
      result: null,
      errorMessage: "",
      createdAt: now,
      updatedAt: now,
    };

    const inserted = await coll.insertOne(insertDoc);
    const jobId = String(inserted?.insertedId || "");
    resolveLoveSecretLock(sessionId, "running", jobId);

    await coll.updateOne(
      { _id: inserted.insertedId },
      {
        $set: {
          status: "pending",
          stage: "queued",
          message: "백그라운드 생성 대기열에 등록되었습니다.",
          updatedAt: new Date(),
        },
      },
    );

    const runTask = runLoveSecretJob(env, jobId).catch((error) => {
      console.error("[love-secret][async-job-failed]", error?.message || error);
    });

    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(runTask);
    } else {
      Promise.resolve(runTask).catch(() => {});
    }

    return json({
      ok: true,
      accepted: true,
      sessionId,
      jobId,
      status: "pending",
      pollAfterMs: LOVE_SECRET_JOB_POLL_AFTER_MS,
    }, { status: 202 });
  } catch (error) {
    await failPremiumPdfExecution(
      env,
      authz?.auth?.userId,
      executionCtx,
      "love_secret_prepare_failed",
      clean(error?.message || "연애 비책 준비 실패"),
      "love-secret-prepare",
    );
    if (!isLikelyDbUnavailableError(error)) {
      resolveLoveSecretLock(sessionId, "failed", "");
      throw error;
    }
    console.warn("[love-secret][async-job-db-fallback]", clean(error?.message || error) || error);

    const { chapters, fallbackUsed, totalChapters: directChapterCount } = await buildLoveSecretChapters(env, {
      base,
      mode,
      config,
      maxConcurrency: 1,
    });

    resolveLoveSecretLock(sessionId, "done", "");

    await completePremiumPdfExecution(
      env,
      authz?.auth?.userId,
      executionCtx,
      clean(body?.reportId),
      {
        manuscriptSource: fallbackUsed ? "mixed" : "local",
        chapterCount: directChapterCount,
        archive: {
          reportId: clean(body?.reportId),
          reportType: "love_book",
          displayName: "사주 연애 비책",
          title: `${clean(base?.user?.name || "사용자")}님의 연애 비책`,
          mode,
          birthName: clean(base?.user?.name),
          summary: clean(chapters?.[0]?.sections?.[0]?.body || "", 1000),
          pdfUrl: "",
          chapters,
          payload: { mode, chapterCount: directChapterCount },
          canReopen: true,
          canDownload: false,
        },
      },
    );

    return json({
      ok: true,
      accepted: false,
      direct: true,
      mode,
      featureKey: authz.featureKey,
      sessionId,
      chapterCount: directChapterCount,
      fallbackUsed,
      pdfUrl: "",
      chapters,
      message: "대기열 저장소 문제로 직접 생성 모드로 전환되었습니다.",
    }, { status: 200 });
  }
}

async function handleJobStatus(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id") || url.searchParams.get("jobId"));
  const _id = toObjectIdOrNull(id);
  if (!_id) return buildApiError("INVALID_JOB_ID", "작업 ID가 유효하지 않습니다.", 400);

  const coll = await getLoveSecretJobsCollection(env);
  const job = await coll.findOne({ _id, service: LOVE_SECRET_SERVICE_KEY, userId: String(auth.userId || "") });
  if (!job) return buildApiError("JOB_NOT_FOUND", "작업 정보를 찾을 수 없습니다.", 404);

  const payload = toPublicJobPayload(job);
  if (payload.status === "completed") {
    payload.result = job?.result && typeof job.result === "object" ? job.result : null;
  }

  return json({ ok: true, ...payload });
}

async function handleJobResult(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id") || url.searchParams.get("jobId"));
  const _id = toObjectIdOrNull(id);
  if (!_id) return buildApiError("INVALID_JOB_ID", "작업 ID가 유효하지 않습니다.", 400);

  const coll = await getLoveSecretJobsCollection(env);
  const job = await coll.findOne({ _id, service: LOVE_SECRET_SERVICE_KEY, userId: String(auth.userId || "") });
  if (!job) return buildApiError("JOB_NOT_FOUND", "작업 정보를 찾을 수 없습니다.", 404);
  if (clean(job?.status) !== "completed") {
    return buildApiError("JOB_NOT_READY", "아직 작업이 완료되지 않았습니다.", 409);
  }

  return json({
    ok: true,
    jobId: String(job?._id || ""),
    status: "completed",
    result: job?.result && typeof job.result === "object" ? job.result : null,
  });
}

export async function handleSajuLoveSecretRoutes(request, env = {}, ctx = null) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/love-secret");

    if (method === "POST" && (path === "" || path === "/" || path === "/generate-chapter")) {
      return await handleGenerateChapter(request, env);
    }

    if (method === "POST" && path === "/prepare") {
      return await handlePrepare(request, env);
    }

    if (method === "POST" && path === "/prepare-async") {
      return await handlePrepareAsync(request, env, ctx);
    }

    if (method === "GET" && path === "/status") {
      return await handleJobStatus(request, env);
    }

    if (method === "GET" && path === "/result") {
      return await handleJobResult(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, {
      request,
      env,
      trace: {
        route: "saju-love-secret",
        method: request?.method || "",
        requestPath: (() => {
          try { return new URL(request.url).pathname; } catch (_) { return ""; }
        })(),
      },
    });
  }
}
