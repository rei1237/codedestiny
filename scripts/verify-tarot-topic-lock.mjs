#!/usr/bin/env node
// 타로 해석 Topic Lock 회귀 검증
//
// "사용자가 고른 질문 영역이 카드의 일반 키워드보다 우선하는가"를 실제 실행으로 확인한다.
// LLM은 한 번도 호출하지 않는다 — 프롬프트는 문자열로만 생성해 지시문 존재 여부를 본다.
//
//   1) 명리학 타로: 8주제 × 22카드 × 정/역 = 352 케이스 전수 실행 (jsdom)
//   2) 78장 결정론 경로: inferQuestionType 우선순위 + 주제별 카드 의미 선택
//   3) LLM 프롬프트 3종: domain lock 문장 존재 / 고정 도메인 목차 부재
//   4) detectTopicDrift 단위 케이스 (사양서 §10 · §12)

import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

import {
  TOPIC_LOCK_PROMPT_MARKERS,
  buildCardTopicContext,
  buildTopicLockPromptBlock,
  detectTopicDrift,
} from "../lib/tarot/topic-lock.mjs";
import { getMeaningByQuestion, inferQuestionType } from "../lib/tarot/tarot-interpretation-engine.mjs";
import { getTarotCardByAnyId, TAROT_CARDS } from "../lib/tarot/tarot-cards.mjs";
import { buildLoveReadingPrompt } from "../lib/tarot/love-reading-llm.mjs";
import { buildMindscanPrompt } from "../lib/tarot/mindscan-reading.mjs";
import { buildCrystalSoulV3Reading } from "../lib/tarot/crystal-soul-reading.mjs";

const MYEONGRI_ENGINE_PATH = "js/saju-engine-tarot-sukuyo-quantum.js";
const MYEONGRI_TOPICS = ["daily", "love", "reunion", "career", "money", "health", "exam", "people"];

const failures = [];
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    failures.push(label);
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

// ── 1. 명리학 타로 ─────────────────────────────────────────────────────────
function loadMyeongriEngine() {
  const source = readFileSync(MYEONGRI_ENGINE_PATH, "utf8");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { runScripts: "outside-only" });
  dom.window.eval(source);
  return dom.window;
}

function verifyMyeongriTarot() {
  console.log("\n[1] 명리학 타로 — 주제별 재해석");
  let engine;
  try {
    engine = loadMyeongriEngine();
  } catch (error) {
    check("명리 엔진 로드", false, error.message);
    return;
  }

  const deck = Array.isArray(engine.TAROT_DATA) ? engine.TAROT_DATA : [];
  check("메이저 22장 덱 로드", deck.length === 22, `cards=${deck.length}`);
  check("combineTarotAndTenGod 노출", typeof engine.combineTarotAndTenGod === "function");
  if (typeof engine.combineTarotAndTenGod !== "function" || !deck.length) return;

  // 최종 결론에 해당하는 필드만 본다. 보조 설명까지 검사하면 현실 조건 언급까지 막힌다.
  const conclusionFields = ["oneLineConclusion", "bestChoice", "actionAdvice", "cardMeaning", "combinedReading", "whyThisHappens"];

  let cases = 0;
  const driftIssues = [];
  const lensIssues = [];
  const projectionMisses = [];

  for (const topic of MYEONGRI_TOPICS) {
    for (const card of deck) {
      for (const orientation of ["upright", "reversed"]) {
        cases += 1;
        const reading = engine.combineTarotAndTenGod(card, "", topic, orientation);
        const conclusion = conclusionFields.map((field) => reading[field] || "").join(" ");

        const drift = detectTopicDrift(conclusion, topic);
        if (!drift.ok) {
          driftIssues.push(`${topic}/${card.name_kr}/${orientation}: "${drift.offenders[0].word}" — ${drift.offenders[0].sentence}`);
        }

        const validation = engine.validateMyeongriTarotReading(reading);
        if (!validation.ok) {
          lensIssues.push(`${topic}/${card.name_kr}/${orientation}: ${validation.issues.join(", ")}`);
        }

        // 카드의 핵심 축이 주제 언어로 번역돼 들어갔는가 (일반 심리 문장 직역 금지)
        if (!String(reading.card?.coreProjection || "").includes("이 카드의 축인")) {
          projectionMisses.push(`${topic}/${card.name_kr}/${orientation}`);
        }
      }
    }
  }

  check(`전수 실행 ${cases}케이스 (8주제 × 22카드 × 정/역)`, cases === MYEONGRI_TOPICS.length * deck.length * 2);
  check("질문 분야 이탈 어휘 없음", driftIssues.length === 0, driftIssues.slice(0, 3).join(" | "));
  check("카테고리 렌즈가 본문에 반영됨", lensIssues.length === 0, lensIssues.slice(0, 3).join(" | "));
  check("카드 핵심 축이 주제 언어로 번역됨", projectionMisses.length === 0, projectionMisses.slice(0, 3).join(" | "));

  // 같은 카드가 주제에 따라 다른 해석을 내야 한다 (사양서 §15)
  const empress = deck.find((card) => card.name_kr === "여황제") || deck[3];
  const byTopic = MYEONGRI_TOPICS.map((topic) => engine.combineTarotAndTenGod(empress, "", topic, "upright").cardMeaning);
  check("같은 카드가 주제마다 다른 해석을 낸다", new Set(byTopic).size === MYEONGRI_TOPICS.length, `distinct=${new Set(byTopic).size}`);

  // AI 프롬프트 파리티 — 브라우저 번들과 topic-lock.mjs 의 지시문이 같아야 한다
  const sample = [0, 6, 15].map((idx) => ({ card: deck[idx], isReversed: idx === 6 }));
  const readings = sample.map((item) => engine.combineTarotAndTenGod(item.card, "", "reunion", item.isReversed ? "reversed" : "upright"));
  const prompt = engine.buildMyeongriTarotAiPrompt(sample, "reunion", ["과거", "현재", "미래"], readings, "", "");
  const missingMarkers = TOPIC_LOCK_PROMPT_MARKERS.filter((marker) => !prompt.includes(marker));
  check("AI 프롬프트에 topic-lock 지시문 전량 포함", missingMarkers.length === 0, missingMarkers.join(" | "));
  check("AI 프롬프트에 readingTopic 범위 명시", prompt.includes("[질문 영역 고정] 재회운"));
  check("AI 프롬프트가 카드 원재료를 구조화해 전달", prompt.includes("cardCoreMeaning(원재료):") && prompt.includes("cardSymbols:"));
  check("AI 프롬프트에 자가 검증 문항 포함", prompt.includes("다른 분야의 운세로 이탈하지 않았는가"));
}

// ── 1-b. 카드 앞면 이미지 ──────────────────────────────────────────────────
// .tarot-face-img 는 앞면을 완전히 덮는 레이어라, src 에 남은 그림이 그대로 먼저 보인다.
// 예전에는 마크업이 연애타로 홍보 이미지(/fuctionassets/tarolove.webp)를 기본 src 로
// 달고 있어서, 카드를 뒤집으면 그 그림이 먼저 뜬 뒤 진짜 카드로 바뀌었다.
function verifyCardFaceImages() {
  console.log("\n[1-b] 명리학 타로 — 카드 앞면 이미지");

  const shells = [
    "index.html",
    "public/index.html",
    "public/static/index.html",
    "public/en/index.html",
    "public/ja/index.html",
    "public/zh/index.html",
  ];
  const decoys = [];
  const unhidden = [];
  for (const shell of shells) {
    let html;
    try {
      html = readFileSync(shell, "utf8");
    } catch {
      continue;
    }
    const faces = html.match(/<img[^>]*class="tarot-face-img"[^>]*>/g) || [];
    if (faces.length !== 4) {
      decoys.push(`${shell}: 카드 앞면 img 가 4개가 아님(${faces.length})`);
      continue;
    }
    for (const tag of faces) {
      if (/\ssrc=/.test(tag)) decoys.push(`${shell}: 마크업에 기본 src 가 박혀 있음 — ${tag.slice(0, 90)}`);
      if (!/visibility:hidden/.test(tag)) unhidden.push(`${shell}: 초기 상태가 감춰져 있지 않음`);
    }
  }
  check("6개 셸 카드 앞면에 기본 src 없음", decoys.length === 0, decoys.slice(0, 2).join(" | "));
  check("6개 셸 카드 앞면이 로드 전까지 감춰짐", unhidden.length === 0, unhidden.slice(0, 2).join(" | "));

  // 재추첨 시 직전 카드가 남아 보이지 않아야 한다.
  let engine;
  try {
    engine = loadMyeongriEngine();
  } catch (error) {
    check("이미지 검증용 엔진 로드", false, error.message);
    return;
  }
  const doc = engine.document;
  const frontEl = doc.createElement("div");
  const imgEl = doc.createElement("img");
  imgEl.setAttribute("src", "/tarot-cards/thefool.jpeg");
  imgEl.style.visibility = "visible";
  frontEl.appendChild(imgEl);

  engine.applyTarotImageToFace(frontEl, imgEl, "thedevil", "악마 (The Devil)");
  check("새 카드 적용 즉시 직전 카드가 감춰짐", imgEl.style.visibility === "hidden", `visibility=${imgEl.style.visibility}`);
  check("새 카드 src 로 교체됨", imgEl.getAttribute("src").includes("thedevil"), imgEl.getAttribute("src"));
  check("앞면 배경도 새 카드로 교체됨", String(frontEl.style.backgroundImage).includes("thedevil"), frontEl.style.backgroundImage);
}

// ── 2. 78장 결정론 경로 ────────────────────────────────────────────────────
function verifyQuestionTypePrecedence() {
  console.log("\n[2] 78장 덱 — 질문 유형 우선순위");

  // 스프레드 기본값(general)이 사용자가 고른 category 를 덮으면 안 된다.
  check(
    "사용자 category 가 스프레드 기본값보다 우선",
    inferQuestionType({ category: "money", spreadId: "three_card_past_present_future" }) === "money",
    `got=${inferQuestionType({ category: "money", spreadId: "three_card_past_present_future" })}`,
  );
  check(
    "재회 category 가 스프레드 기본값보다 우선",
    inferQuestionType({ category: "reunion", spreadId: "three_card_past_present_future" }) === "reunion",
  );
  // category 가 어떤 규칙에도 걸리지 않으면 기존 동작(스프레드 기본값)이 그대로 남아야 한다.
  const spreadFallback = inferQuestionType({ category: "general", spreadId: "reunion_lighthouse_five_card" });
  check("미매칭 category 는 스프레드 기본값 유지", spreadFallback === "reunion", `got=${spreadFallback}`);
  check("빈 category 도 스프레드 기본값 유지", inferQuestionType({ spreadId: "reunion_lighthouse_five_card" }) === "reunion");
  // 명시 questionType 은 여전히 최우선
  check("명시 questionType 이 최우선", inferQuestionType({ questionType: "career", category: "money", spreadId: "one_card" }) === "career");

  // 주제가 바뀌면 카드 의미도 바뀌어야 한다 (같은 카드, 같은 방향)
  const pentacles10 = getTarotCardByAnyId("P10");
  check("펜타클 10 카드 로드", Boolean(pentacles10));
  if (pentacles10) {
    const money = getMeaningByQuestion(pentacles10, "upright", "money").line;
    const love = getMeaningByQuestion(pentacles10, "upright", "love").line;
    const career = getMeaningByQuestion(pentacles10, "upright", "career").line;
    check("펜타클 10: 재물운 ≠ 애정운 해석", money !== love, `money="${money}" love="${love}"`);
    check("펜타클 10: 애정운 ≠ 직장운 해석", love !== career);

    // 애정운으로 뽑은 의미가 금전 결론으로 새지 않는지
    const loveDrift = detectTopicDrift(love, "love");
    check("펜타클 10 애정운 의미에 금전 결론 없음", loveDrift.ok, JSON.stringify(loveDrift.offenders));
  }

  const cups2 = getTarotCardByAnyId("C02");
  if (cups2) {
    const careerLine = getMeaningByQuestion(cups2, "upright", "career").line;
    const drift = detectTopicDrift(careerLine, "career");
    check("컵 2 직장운 의미가 연애 결론으로 새지 않음", drift.ok, JSON.stringify(drift.offenders));
  }

  // 78장 × 7주제 × 정/역 전수 스윕 — 카드 데이터 자체에 박힌 도메인 누수를 잡는다.
  const sweepTopics = ["love", "relationship", "reunion", "exMind", "career", "money", "daily"];
  const deckDrift = [];
  for (const card of TAROT_CARDS) {
    for (const topic of sweepTopics) {
      for (const orientation of ["upright", "reversed"]) {
        const meaning = getMeaningByQuestion(card, orientation, topic);
        const text = [meaning.line, meaning.core, meaning.advice, (meaning.keywords || []).join(" ")].filter(Boolean).join(" ");
        const drift = detectTopicDrift(text, topic);
        if (!drift.ok) {
          deckDrift.push(`${topic}/${card.code}/${orientation}: "${drift.offenders[0].word}" :: ${drift.offenders[0].sentence}`);
        }
      }
    }
  }
  check(
    `78장 덱 전수 스윕 ${TAROT_CARDS.length * sweepTopics.length * 2}케이스에 도메인 누수 없음`,
    deckDrift.length === 0,
    deckDrift.slice(0, 3).join(" | "),
  );

  // buildCardTopicContext 가 주제별로 다른 원재료를 만든다
  if (pentacles10) {
    const reunion = buildCardTopicContext(pentacles10, "upright", "reunion");
    const money = buildCardTopicContext(pentacles10, "upright", "money");
    check("buildCardTopicContext: readingTopic 반영", reunion.readingTopic === "재회운" && money.readingTopic === "재물운");
    check("buildCardTopicContext: 상징 투영이 주제마다 다름", reunion.topicProjection !== money.topicProjection);
    check("buildCardTopicContext: 상징 축은 동일", reunion.cardSymbols === money.cardSymbols);
  }
}

// ── 3. LLM 프롬프트 3종 ────────────────────────────────────────────────────
function verifyPrompts() {
  console.log("\n[3] LLM 프롬프트 — domain lock");

  const block = buildTopicLockPromptBlock("reunion", { userQuestion: "다시 연락이 올까요?" });
  const missing = TOPIC_LOCK_PROMPT_MARKERS.filter((marker) => !block.includes(marker));
  check("buildTopicLockPromptBlock 이 마커 전량 포함", missing.length === 0, missing.join(" | "));
  check("사용자 질문이 프롬프트에 전달됨", block.includes("다시 연락이 올까요?"));
  check("주제 밖 어휘를 핵심 결론으로 금지", block.includes("답변의 핵심 결론으로 삼지 마라"));

  // 연애 6카드
  const lovePrompt = buildLoveReadingPrompt(
    {
      relationshipMatrix: { sequenceFlow: "flow" },
      positionBreakdown: [
        { positionOrder: 1, positionTitle: "내 마음", cardName: "펜타클 4", cardId: "P04", orientation: "upright", orientationLabel: "정방향", keywords: ["안정"] },
        { positionOrder: 2, positionTitle: "상대 겉모습", cardName: "컵 2", cardId: "C02", orientation: "reversed", orientationLabel: "역방향", keywords: ["교류"] },
      ],
    },
    "ko",
    { userQuestion: "이 관계가 이어질까요?" },
  );
  const loveMissing = TOPIC_LOCK_PROMPT_MARKERS.filter((marker) => !lovePrompt.includes(marker));
  check("연애 리딩 프롬프트에 domain lock 포함", loveMissing.length === 0, loveMissing.join(" | "));
  check("연애 리딩 프롬프트가 사용자 질문을 전달", lovePrompt.includes("이 관계가 이어질까요?"));
  check("연애 리딩 프롬프트가 주제 변환 원재료를 전달", lovePrompt.includes("cardCoreMeaning") && lovePrompt.includes("topicProjection"));

  // 마인드 스캔
  const mindscanPrompt = buildMindscanPrompt({
    question: "헤어진 상대에게서 다시 연락이 올까요?",
    questionKeywords: ["연락"],
    pairs: [{ positionLabel: "1", positionQuestion: "q", positionPurpose: "p", positionMeaning: "m", mainCard: {}, subCard: {}, orientation: "upright" }],
  });
  const mindscanMissing = TOPIC_LOCK_PROMPT_MARKERS.filter((marker) => !mindscanPrompt.includes(marker));
  check("마인드 스캔 프롬프트에 domain lock 포함", mindscanMissing.length === 0, mindscanMissing.join(" | "));

  // 크리스탈 소울 — 고정 4도메인 목차가 사라져야 한다
  const crystal = buildCrystalSoulV3Reading({ gem: { id: "rose_quartz" } });
  const crystalPrompt = crystal?.readingData?.ai_fortune_prompt || "";
  check("크리스탈 소울 프롬프트 생성", Boolean(crystalPrompt));
  check(
    "크리스탈 소울: 사랑/재물 고정 목차 제거",
    !crystalPrompt.includes("2) 사랑과 관계, 3) 일과 재물"),
    "고정 도메인 목차가 남아 있으면 카드와 무관하게 두 영역이 매번 등장한다",
  );
  check("크리스탈 소울: 목차가 실제 뽑힌 자리를 따름", crystalPrompt.includes("원석의 첫 번째 빛"));
  check("크리스탈 소울: 목차 채우기용 영역 끌어오기 금지", crystalPrompt.includes("목차를 채우려고 끌어오지 마세요"));
  const crystalMissing = TOPIC_LOCK_PROMPT_MARKERS.filter((marker) => !crystalPrompt.includes(marker));
  check("크리스탈 소울 프롬프트에 domain lock 포함", crystalMissing.length === 0, crystalMissing.join(" | "));
}

// ── 4. detectTopicDrift 단위 케이스 (사양서 §10 · §12) ─────────────────────
function verifyDriftDetection() {
  console.log("\n[4] 이탈 감지 단위 케이스");

  const cases = [
    // [설명, 본문, 주제, 통과해야 하는가]
    ["재회운에 재물 결론", "재정적으로 안정될 수 있는 시기입니다.", "reunion", false],
    ["재회운 올바른 답", "상대방이 과거 관계를 완전히 정리했다기보다는 관계의 안정성과 현실적인 조건을 다시 생각하는 흐름이 강합니다.", "reunion", true],
    ["애정운에 재물운 상승", "재물운이 상승합니다.", "love", false],
    ["애정운의 현실 조건 언급은 허용", "경제적인 문제 때문에 관계가 부담을 받을 수 있습니다.", "love", true],
    ["애정운 올바른 답(펜타클 10)", "가볍게 스쳐가는 관계보다는 안정성과 지속 가능성이 있는 인연을 의미할 수 있습니다.", "love", true],
    ["직장운에 새로운 사랑", "새로운 사랑이 찾아옵니다.", "career", false],
    ["직장운 올바른 답(컵 2)", "업무적으로 호흡이 잘 맞는 사람과의 협력이나 파트너십을 의미할 가능성이 큽니다.", "career", true],
    ["재물운은 금전 어휘가 정상", "수익 가능성이 여러 방향으로 보이더라도 실제 조건과 위험을 확인한 뒤 하나를 선택하는 것이 중요합니다.", "money", true],
    ["재물운에 저축 언급 허용", "저축과 투자의 균형을 맞추는 시기입니다.", "money", true],
    ["시험운에 재물 결론", "투자 수익이 늘어납니다.", "exam", false],
    ["건강운 올바른 답", "몸이 요구하는 휴식을 먼저 확보해야 합니다.", "health", true],
  ];

  for (const [label, text, topic, shouldPass] of cases) {
    const result = detectTopicDrift(text, topic);
    check(
      `${label} → ${shouldPass ? "통과" : "이탈 감지"}`,
      result.ok === shouldPass,
      shouldPass ? JSON.stringify(result.offenders) : "감지하지 못했습니다",
    );
  }
}

console.log("타로 해석 Topic Lock 검증 (LLM 미호출)");
verifyMyeongriTarot();
verifyCardFaceImages();
verifyQuestionTypePrecedence();
verifyPrompts();
verifyDriftDetection();

console.log("");
if (failures.length) {
  console.log(`❌ 실패 ${failures.length}건`);
  for (const item of failures) console.log(`   - ${item}`);
  process.exit(1);
}
console.log("✅ 전부 통과");
