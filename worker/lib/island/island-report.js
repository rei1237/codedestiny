// 운명의 섬 — Layer 2.5: 청사진(blueprint) + 명반(chart) → 사람이 읽는 문장.
// 이 모듈의 모든 함수는 순수 함수여야 한다: Date.now()/Math.random()/네트워크 금지.
// (동일 입력 → 항상 동일 출력. 검증: scripts/verify-island-report.mjs)
//
// 유료 심층 리포트(₩5,000) 전용. 섬 지도의 무료 궁 요약은 destiny-island.html의 생성기가 정본이라
// 같은 문장을 여기서 또 만들지 않는다. 섹션 프레임은 PALACE_CONSULT를 재사용해 ₩20,000 상담과 목차를 맞춘다.
//
// 🔴 chart를 함께 받는 이유
// blueprint는 무인증·무DB 라우트가 쓰는 계약이라 스키마를 못 늘린다. 그런데 자미두수 판독의 핵심인
// 삼방사정·대운 타임라인·유년 주성은 chart에만 있다. 유료 라우트는 chart를 이미 손에 쥐고 있으므로
// 두 번째 인자로 받아 쓴다. chart가 없으면 blueprint만으로 동작한다(폴백).
//
// 문체 규칙: 쉬운 말이 앞, 전문 용어는 괄호. 같은 용어는 한 궁에서 첫 등장 때만 풀이한다.

import { PALACE_CONSULT, getPalaceConfig } from "./consult/palace-prompts.js";
import { describeTerm } from "../fortune-glossary.js";
import {
  STAR_FACET,
  PALACE_FACET,
  PALACE_QUESTION,
  STAR_FAMILIES,
  BRIGHTNESS_FACET,
  ASSIST_FACET,
  MALEFIC_FACET,
  SIHUA_FACET,
  BUREAU_FACET,
} from "./report-star-data.js";

export const REPORT_VERSION = "island-report-v2";

const TIER_NOTE = {
  1: { label: "폐허", state: "아직 손이 닿지 않은 자리",
    tone: "지금은 비어 있지만, 비어 있다는 건 무엇을 지어도 된다는 뜻입니다",
    drive: "아직 정해진 방식이 없어서, 처음 만든 습관이 그대로 이 자리의 규칙이 됩니다",
    step: "크게 세우려 하지 말고, 오늘 한 가지만 시작해 그것만 지켜 보세요" },
  2: { label: "오두막", state: "작게 자리를 잡은 단계",
    tone: "기본은 서 있으니 한 칸씩 늘려가면 됩니다",
    drive: "작동은 하지만 여유가 없어, 무리하면 바로 표가 납니다",
    step: "새로 벌이기보다 지금 있는 것 하나를 끝까지 밀어 완성해 보세요" },
  3: { label: "저택", state: "제 몫을 하는 단단한 자리",
    tone: "무너지지 않는 기반이 있으니 여기서 방향을 골라도 됩니다",
    drive: "안정적으로 굴러가서, 방향만 정하면 결과가 따라옵니다",
    step: "유지에 쓰던 힘을 조금 덜어 한 단계 위를 시도해 보세요" },
  4: { label: "궁전", state: "당신의 강한 영역",
    tone: "여기서는 밀어붙여도 됩니다. 당신 편입니다",
    drive: "힘이 남는 자리라, 속도를 올려도 구조가 버팁니다",
    step: "미뤄 둔 큰 건을 이 자리에서 먼저 꺼내 보세요" },
  5: { label: "신전", state: "인생의 중심축",
    tone: "이 자리가 흔들리지 않는 한 나머지는 복구됩니다",
    drive: "다른 자리가 흔들려도 여기서 중심을 잡아 되돌립니다",
    step: "이 자리의 힘을 약한 궁 쪽으로 한 갈래 나눠 보내 보세요" },
};

// 궁별 어휘 — 같은 구조의 문장을 궁마다 다른 결로 읽히게 만든다.
const PALACE_LEX = {
  명궁: { field: "당신 자신", subject: "삶의 중심", act: "선택하고 밀고 나가는 방식" },
  형제궁: { field: "형제·동년배 관계", subject: "곁에서 함께 뛰는 사람들", act: "협력하고 경쟁하는 방식" },
  부부궁: { field: "배우자·연애 인연", subject: "가장 가까운 한 사람", act: "사랑하고 다투는 방식" },
  자녀궁: { field: "자녀·창작물", subject: "당신이 기르고 낳는 것", act: "돌보고 키우는 방식" },
  재백궁: { field: "재물", subject: "돈이 들어오고 나가는 길", act: "벌고 쓰고 모으는 방식" },
  질액궁: { field: "몸과 컨디션", subject: "체력과 회복", act: "무리하고 회복하는 방식" },
  천이궁: { field: "이동과 바깥 활동", subject: "밖에서의 당신", act: "움직이고 자리를 옮기는 방식" },
  노복궁: { field: "동료·인맥", subject: "사회적 관계망", act: "주고받는 방식" },
  관록궁: { field: "직업과 성취", subject: "일에서의 당신", act: "일하고 올라가는 방식" },
  전택궁: { field: "거처와 터전", subject: "머무는 자리", act: "자리 잡고 옮기는 방식" },
  복덕궁: { field: "내면과 즐거움", subject: "혼자 있을 때의 당신", act: "쉬고 즐기는 방식" },
  부모궁: { field: "부모·윗사람", subject: "뿌리와 울타리", act: "기대고 부딪히는 방식" },
};

// 궁 × 섹션키 → 서술 원형. 같은 키라도 궁에 따라 뜻이 달라서(질액궁 care=주의 / 자녀궁 care=돌봄) 명시 매핑한다.
const SECTION_ARCHETYPE = {
  명궁: { essence: "NATURE", strength: "ENGINE", shadow: "CAUTION", task: "ADVICE" },
  재백궁: { nature: "NATURE", structure: "ENGINE", flow: "TIMING", advice: "ADVICE" },
  관록궁: { aptitude: "NATURE", path: "ENGINE", timing: "TIMING", advice: "ADVICE" },
  부부궁: { type: "NATURE", rhythm: "ENGINE", keep: "ADVICE" },
  천이궁: { aptitude: "NATURE", direction: "TIMING", advice: "ADVICE" },
  복덕궁: { mind: "NATURE", joy: "ENGINE", rest: "ADVICE" },
  질액궁: { constitution: "NATURE", care: "CAUTION", advice: "ADVICE" },
  부모궁: { relation: "NATURE", pattern: "ENGINE", reconcile: "ADVICE" },
  형제궁: { terrain: "NATURE", conflict: "CAUTION", recover: "ADVICE" },
  노복궁: { network: "NATURE", help: "ENGINE", boundary: "CAUTION" },
  자녀궁: { fortune: "NATURE", energy: "ENGINE", care: "ADVICE" },
  전택궁: { home: "NATURE", timing: "TIMING", advice: "ADVICE" },
};

/** 마지막 글자의 받침 유무. (한글 음절 코드 - 0xac00) % 28 !== 0 이면 받침이 있다. */
function hasBatchim(word) {
  const text = String(word || "").trim();
  if (!text) return false;
  const code = text.charCodeAt(text.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/** 받침에 맞는 조사를 붙인다. josa("파군","이") → "파군이" / josa("연이","이") → "연이가" */
function josa(word, withBatchim) {
  const PAIR = { 이: "가", 은: "는", 을: "를", 과: "와", 으로: "로" };
  const tail = hasBatchim(word) ? withBatchim : PAIR[withBatchim] || withBatchim;
  return `${word}${tail}`;
}

/**
 * 한 궁 안에서 같은 문장이 두 번 나오지 않게 한다.
 * 공용 문장을 여러 섹션이 함께 참조하는데, 그대로 두면 한 페이지에서 같은 줄이 두세 번 반복된다.
 */
function once(seen, text) {
  const value = String(text || "").trim();
  if (!value || seen.has(value)) return "";
  seen.add(value);
  return value;
}

/**
 * 용어 표기. 🔴 사전 정의를 괄호에 통째로 넣지 않는다 —
 * "…실력이 됩니다(같은 별이라도 앉은 자리에 따라 …(밝기))" 처럼 문장이 끊긴다.
 * 뜻은 문장이 앞에서 쉬운 말로 이미 설명하고, 괄호는 "그걸 뭐라 부르는지"만 알려 준다.
 * 사전 풀이는 리포트 맨 앞 '읽는 법' 장이 한 번에 맡는다.
 */
function term(name) {
  return name;
}

/**
 * 문장 단위 중복 제거. 블록 단위(once)만으로는 못 잡는 경우가 있다 —
 * 같은 별의 결이 "직접 앉은 별"과 "함께 읽는 별" 양쪽에서 나오면 문장이 겹친다.
 * 먼저 쓴 섹션이 가져가고, 뒤 섹션에서는 그 문장만 빠진다.
 */
function dedupeSentences(body, seenSentences) {
  return String(body || "")
    .split("\n\n")
    .map((para) => para
      .split(/(?<=다\.)\s+/)
      .filter((sentence) => {
        const key = sentence.trim();
        if (key.length <= 18) return true;
        if (seenSentences.has(key)) return false;
        seenSentences.add(key);
        return true;
      })
      .join(" ")
      .trim())
    .filter(Boolean)
    .join("\n\n");
}

function join(parts) {
  return parts.filter((part) => typeof part === "string" && part.trim()).join(" ");
}

function paragraphs(list) {
  return list.filter((part) => typeof part === "string" && part.trim()).join("\n\n");
}

function listText(items) {
  const rows = (items || []).filter(Boolean);
  return rows.length ? rows.join("·") : "";
}

function parseTransform(entry) {
  const text = String(entry || "");
  const sep = text.indexOf(":");
  if (sep <= 0) return { label: text, star: "" };
  return { label: text.slice(0, sep), star: text.slice(sep + 1) };
}

function familyOf(stars) {
  const names = Array.isArray(stars) ? stars : [];
  return STAR_FAMILIES.find((family) => family.stars.some((star) => names.includes(star))) || null;
}

/** 궁 하나를 문장으로 만들 때 쓰는 사실 묶음. blueprint(+chart) 값을 읽기만 한다. */
function collectFacts(palace, context) {
  const name = String(palace?.name || "");
  const mainStars = Array.isArray(palace?.mainStars) ? palace.mainStars : [];
  const assistantStars = Array.isArray(palace?.assistantStars) ? palace.assistantStars : [];
  const maleficStars = Array.isArray(palace?.maleficStars) ? palace.maleficStars : [];
  const brightness = palace?.brightness && typeof palace.brightness === "object" ? palace.brightness : {};
  const transforms = (Array.isArray(palace?.transformations) ? palace.transformations : []).map(parseTransform);
  const edges = Array.isArray(context?.edges) ? context.edges : [];
  const markers = context?.markers || {};
  const chart = context?.chart || null;

  const facet = PALACE_FACET[name] || "self";
  const leadStar = mainStars.find((star) => STAR_FACET[star]) || "";

  // 삼방사정 — 함께 읽는 네 궁. chart에만 있어 없으면 공명(edges)으로 대체한다.
  const triad = chart?.sanFangSiZheng?.byPalace?.[name] || null;
  const opposite = triad?.opposite || "";
  const triadNames = Array.isArray(triad?.palaceNames) ? triad.palaceNames.filter((n) => n && n !== name) : [];
  const triadStars = Array.isArray(triad?.mainStars) ? triad.mainStars.filter((s) => STAR_FACET[s]) : [];

  // 무주성이면 마주 보는 궁의 별을 빌려 읽는다(차성안궁).
  const borrowedStars = mainStars.length === 0 && opposite
    ? ((chart?.palaces || []).find((row) => row.name === opposite)?.mainStars || []).filter((s) => STAR_FACET[s])
    : [];

  // 대운 타임라인 — 지금 대운과 다음 전환.
  const luckRows = Array.isArray(chart?.majorLuck) ? chart.majorLuck : [];
  const currentLuck = markers.currentMajorLuck || null;
  const currentIndex = currentLuck ? luckRows.findIndex((row) => row.palaceName === currentLuck.palaceName) : -1;
  const nextLuck = currentIndex >= 0 ? luckRows[currentIndex + 1] || null : null;
  const ownLuck = luckRows.find((row) => row.palaceName === name) || null;

  const incoming = edges.filter((edge) => edge.to === name);

  return {
    name,
    lex: PALACE_LEX[name] || PALACE_LEX["명궁"],
    question: PALACE_QUESTION[name] || "",
    facet,
    mainStars,
    assistantStars,
    maleficStars,
    brightness,
    transforms,
    leadStar,
    leadFacet: leadStar ? STAR_FACET[leadStar] : null,
    family: familyOf(mainStars.length ? mainStars : borrowedStars),
    tier: TIER_NOTE[palace?.tier] || TIER_NOTE[1],
    scoreDetail: palace?.scoreDetail || null,
    score: Number(palace?.score) || 0,
    opposite,
    triadNames,
    triadStars,
    borrowedStars,
    strongIncoming: incoming.filter((edge) => edge.weight >= 4).map((edge) => edge.from),
    drainingIncoming: incoming.filter((edge) => edge.weight <= -4).map((edge) => edge.from),
    isLifePalace: name === (markers.lifePalace || "명궁"),
    isBodyPalace: Boolean(markers.bodyPalace) && name === markers.bodyPalace,
    isCurrentLuck: Boolean(currentLuck) && name === currentLuck.palaceName,
    currentLuck,
    nextLuck,
    ownLuck,
    isYearlyLuck: Boolean(markers.yearlyLuckPalace) && name === markers.yearlyLuckPalace,
    yearlyLuck: chart?.yearlyLuck || null,
    yearlyLuckYear: markers.yearlyLuckYear || null,
    bureau: context?.bureau || chart?.bureau || null,
    sihuaHome: context?.sihuaHome || {},
    season: context?.season || "",
  };
}

// ── 공용 문장 조각 ──────────────────────────────────────────────

function starLine(facts) {
  if (!facts.leadFacet) {
    if (facts.borrowedStars.length) {
      const borrowed = facts.borrowedStars[0];
      return join([
        `${facts.name}에는 중심 별이 앉지 않았습니다. 이런 자리를 ${term("무주성")}이라 하는데, 비어 있다는 뜻이 아니라 정해진 형태가 없다는 뜻입니다.`,
        `이럴 때는 정면으로 ${term("대궁")}인 ${facts.opposite}의 별을 빌려 읽습니다. ${term("차성안궁")}이라고 부르는 방법입니다.`,
        `빌려 온 ${borrowed}의 결이 옅게 비칩니다 — ${STAR_FACET[borrowed][facts.facet]}.`,
      ]);
    }
    return `${facts.name}에는 중심 별이 앉지 않았습니다(${term("무주성")}). 정해진 형태가 없다는 뜻이라, ${josa(facts.lex.field, "은")} 주변 궁의 기운과 당신의 선택을 따라 모양이 잡힙니다.`;
  }

  const marks = facts.mainStars
    .map((star) => {
      const level = facts.brightness[star];
      const note = level ? BRIGHTNESS_FACET[level] : null;
      return note ? `${josa(star, "은")} ${note.label} 상태라 ${note.read}` : "";
    })
    .filter(Boolean);

  return join([
    `${josa(facts.question || facts.lex.field, "은")} 이 자리에서 읽습니다.`,
    `한가운데에는 ${josa(facts.mainStars.join("·"), "이")} 앉아 있습니다.`,
    `${facts.leadFacet[facts.facet]}.`,
    marks.length ? `${marks.join(". ")}(${term("밝기")}).` : "",
  ]);
}

function familyLine(facts) {
  if (!facts.family) return "";
  return `별들의 조합은 ${facts.family.name} 계열 — ${facts.family.summary}입니다. ${facts.family.detail}.`;
}

function tierLine(facts) {
  return `이 자리의 힘은 ${facts.score}점, 건물로 치면 ${facts.tier.label} 단계입니다. ${facts.tier.tone}.`;
}

function triadLine(facts) {
  if (facts.triadNames.length === 0) return "";
  const head = `이 자리는 혼자 보지 않습니다. 마주 보는 ${facts.opposite}과 빗각으로 이어진 ${facts.triadNames.filter((n) => n !== facts.opposite).join("·")}까지 넷을 함께 읽는데, 이걸 ${term("삼방사정")}이라고 합니다.`;
  const stars = facts.triadStars.length
    ? `그 네 자리에 모인 별은 ${facts.triadStars.join("·")}입니다. ${josa(facts.lex.subject, "이")} 이 별들의 합으로 굴러갑니다.`
    : "";
  return join([head, stars]);
}

function sihuaLine(facts) {
  if (facts.transforms.length === 0) return "";
  const rows = facts.transforms
    .map(({ label, star }) => {
      const note = SIHUA_FACET[label];
      if (!note) return "";
      const home = facts.sihuaHome[label];
      const from = home && home !== facts.name ? `${home}에서 출발한 ` : "";
      return `${from}${note.plain}(${label}${star ? `·${star}` : ""})가 이 자리에 걸려 있습니다. ${note.flow}`;
    })
    .filter(Boolean);
  return rows.join(" ");
}

function supportLine(facts) {
  const assists = facts.assistantStars.map((star) => ASSIST_FACET[star]).filter(Boolean);
  const malefics = facts.maleficStars.map((star) => MALEFIC_FACET[star]?.cause).filter(Boolean);
  const assistRows = facts.assistantStars.map((star) => (ASSIST_FACET[star] ? `${star} — ${ASSIST_FACET[star]}` : "")).filter(Boolean);
  const maleficRows = facts.maleficStars.map((star) => (MALEFIC_FACET[star] ? `${star} — ${MALEFIC_FACET[star].cause}` : "")).filter(Boolean);
  return join([
    assistRows.length ? `도움이 붙는 별(${term("보좌성")})이 있습니다. ${assistRows.join(". ")}.` : "",
    maleficRows.length ? `마찰을 만드는 별(${term("살성")})도 함께 있습니다. ${maleficRows.join(". ")}. 나쁘기만 한 것이 아니라 밀어붙이는 힘이 되기도 하지만, 그냥 두면 소모가 커집니다.` : "",
    assists.length === 0 && malefics.length === 0
      ? "돕는 별도 마찰을 만드는 별도 붙지 않아, 이 자리는 외부 자극보다 당신의 습관이 결과를 만듭니다."
      : "",
  ]);
}

function mechanicsLine(facts) {
  const detail = facts.scoreDetail || {};
  const rows = [
    ["중심 별", detail.starScore],
    ["밝기", detail.brightnessScore],
    ["돕는 별", detail.assistScore],
    ["마찰 별", detail.maleficScore],
    ["사화", detail.sihuaScore],
  ].filter(([, value]) => Number.isFinite(value) && value !== 0);
  if (rows.length === 0) return "기본값 외에 힘을 더하거나 깎는 요소가 없어, 이 자리는 당신이 쓰는 만큼만 반응합니다.";
  const biggest = rows.slice().sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  const parts = rows.map(([label, value]) => `${label} ${value > 0 ? "+" : ""}${value}`).join(" · ");
  return `점수를 뜯어보면 ${parts}입니다. ${biggest[1] > 0 ? `${biggest[0]}이 이 자리를 가장 크게 밀어 올립니다` : `${biggest[0]}이 가장 크게 깎아내리니 그 항목부터 관리해야 합니다`}.`;
}

// 한 궁이 받쳐 주면서 동시에 흔든다고 쓰면 앞뒤가 모순으로 읽힌다 — 받쳐 주는 쪽을 남기고 흔드는 목록에서 뺀다.
function drainingOnly(facts) {
  return facts.drainingIncoming.filter((name) => !facts.strongIncoming.includes(name));
}

function resonanceLine(facts) {
  if (facts.strongIncoming.length === 0 && facts.drainingIncoming.length === 0) {
    return `다른 궁에서 들어오는 힘이 크지 않아, ${josa(facts.lex.field, "은")} 다른 영역에 휘둘리지 않고 독립적으로 움직입니다.`;
  }
  const draining = drainingOnly(facts);
  return join([
    facts.strongIncoming.length ? `${facts.strongIncoming.join("·")}에서 힘이 흘러들어와 이 자리를 받쳐 줍니다.` : "",
    draining.length
      ? `${facts.strongIncoming.length ? "반대로 " : ""}${draining.join("·")} 쪽이 흔들리면 이 자리가 같이 흔들립니다.`
      : "",
  ]);
}

function markerLine(facts) {
  return join([
    facts.isLifePalace ? `이 궁은 ${term("명궁")} — 섬의 중심이자 당신 자신입니다.` : "",
    facts.isBodyPalace ? `${term("신궁")}이 겹칩니다. 타고난 결보다 살면서 실제로 매달리게 되는 자리라, 나이가 들수록 비중이 커집니다.` : "",
  ]);
}

function luckLine(facts) {
  const rows = [];
  if (facts.isCurrentLuck && facts.currentLuck) {
    rows.push(`지금 ${term("대운")}이 바로 이 궁을 지나고 있습니다(${facts.currentLuck.range}세). 앞으로 10년의 주제가 여기 있습니다.`);
    if (facts.nextLuck) {
      rows.push(`${facts.nextLuck.startAge}세가 되면 흐름이 ${facts.nextLuck.palaceName}으로 넘어갑니다. 그전에 이 자리에서 매듭지어야 할 것을 정해 두세요.`);
    }
  } else if (facts.ownLuck) {
    rows.push(`이 궁의 ${term("대운")} 차례는 ${facts.ownLuck.range}세입니다. 그때 ${josa(facts.lex.field, "이")} 전면에 나옵니다.`);
    if (facts.currentLuck) {
      rows.push(`지금은 ${facts.currentLuck.palaceName} 차례라, 이 자리는 다음 순서를 위해 쌓아 두는 시기입니다.`);
    }
  } else {
    rows.push(`대운 구간이 확정되지 않아, ${josa(facts.lex.field, "의")} 시기는 그 해의 흐름(${term("유년")})을 따라 움직입니다.`);
  }
  return join(rows);
}

function yearlyLine(facts) {
  if (!facts.isYearlyLuck) return "";
  const yl = facts.yearlyLuck || {};
  const stars = Array.isArray(yl.mainStars) ? yl.mainStars.filter(Boolean) : [];
  return join([
    `${facts.yearlyLuckYear ? `${facts.yearlyLuckYear}년 ` : ""}그 해의 흐름(${term("유년")})도 이 자리에 들어와 있습니다.`,
    stars.length ? `올해 이 자리에는 ${stars.join("·")}의 기운이 겹칩니다.` : "",
    "대운이 10년의 주제라면 유년은 그 안에서 올해 어디에 힘이 실리는지를 말합니다. 올해 안에 눈에 보이는 변화가 생깁니다.",
  ]);
}

/** 대운이 도는 방향 — 순행이면 다음 자리로, 역행이면 반대로 간다. */
function luckDirectionLine(facts) {
  const dir = facts.currentLuck?.direction || facts.ownLuck?.direction || "";
  if (!dir) return "";
  return dir === "역행"
    ? "당신의 대운은 명반을 거꾸로 도는 역행입니다. 흐름이 예상과 반대로 넘어가는 편이라, 다음 10년을 미리 그려 두면 전환이 덜 흔들립니다."
    : "당신의 대운은 명반을 차례로 도는 순행입니다. 다음 자리가 예측되므로, 미리 준비해 둔 만큼 전환이 매끄럽습니다.";
}

/** 삼방사정 네 자리에 모인 별들이 함께 만드는 결. 별 하나보다 조합이 사람을 더 크게 정한다. */
function triadStarLine(facts) {
  if (facts.triadStars.length < 2) return "";
  const family = familyOf(facts.triadStars);
  if (!family) return "";
  return `네 자리를 합쳐 보면 ${family.name} 계열의 색이 짙습니다 — ${family.summary}. 이 자리 하나만 볼 때보다 훨씬 또렷하게 드러나는 결입니다.`;
}

/**
 * 삼방사정 네 자리에 모인 별을 **이 궁의 관점으로** 읽는다.
 * 같은 별이라도 재백궁에서는 돈 이야기, 부부궁에서는 관계 이야기가 된다 — 이게 자미두수의 실제 판독법이다.
 */
function triadFacetLine(facts) {
  const others = facts.triadStars.filter((star) => !facts.mainStars.includes(star)).slice(0, 3);
  if (others.length === 0) return "";
  const rows = others.map((star) => `${josa(star, "은")} ${STAR_FACET[star][facts.facet]}`);
  return join([
    `이 자리에 직접 앉지는 않았지만 함께 읽는 별들이 있습니다. ${josa(facts.lex.field, "은")} 그 별들의 영향도 같이 받습니다.`,
    `${rows.join(". ")}.`,
    "직접 앉은 별만큼 세게 나오지는 않지만, 결정적인 순간에 이 결들이 함께 움직입니다.",
  ]);
}

/** 주성이 둘 이상이면 두 별이 어떻게 겹치는지. 겹침이 곧 그 사람의 복잡함이다. */
function secondStarLine(facts) {
  const second = facts.mainStars.filter((star) => STAR_FACET[star])[1];
  if (!second) return "";
  return join([
    `여기에 ${second}까지 겹쳐 있습니다 — ${STAR_FACET[second][facts.facet]}.`,
    `두 별이 한자리에 있으면 결이 하나로 정리되지 않습니다. 상황에 따라 ${facts.leadStar}처럼 굴 때가 있고 ${second}처럼 굴 때가 있어, 스스로도 일관되지 않다고 느낄 수 있습니다.`,
    "일관성이 없는 게 아니라 쓸 수 있는 방식이 둘이라는 뜻입니다.",
  ]);
}

/** 이 자리에 앉은 별들이 각각 어떤 그림자를 만드는지. 별이 둘이면 걸리는 지점도 둘이다. */
function shadowLine(facts) {
  const stars = facts.mainStars.filter((star) => STAR_FACET[star]);
  if (stars.length === 0) return "";
  const rows = stars.map((star) => `${josa(star, "은")} ${STAR_FACET[star].shadow}`);
  return join([
    `${rows.join(". ")}.`,
    stars.length > 1 ? "걸리는 지점이 둘이라, 한쪽을 조심하면 다른 쪽이 튀어나올 수 있습니다. 둘을 같이 봐야 합니다." : "",
  ]);
}

/** 이 자리에서 실제로 할 수 있는 행동. 별마다 처방이 다르다. */
function moveLine(facts) {
  const stars = facts.mainStars.filter((star) => STAR_FACET[star]);
  if (stars.length === 0) return "";
  const rows = stars.map((star) => STAR_FACET[star].move);
  return `${rows.join(". ")}.`;
}

/** 도움이 붙은 별을 어떻게 쓸지 — 있으면 활용법, 없으면 대안. */
function useAssistLine(facts) {
  if (facts.assistantStars.length === 0) {
    return "이 자리에는 도와주는 별이 따로 붙지 않았습니다. 사람이나 운에 기대기보다 습관과 일정에 기대는 편이 확실합니다.";
  }
  const first = facts.assistantStars.find((star) => ASSIST_FACET[star]);
  if (!first) return "";
  return `${josa(first, "이")} 붙어 있으니 혼자 밀지 말고 이 통로를 쓰세요 — ${ASSIST_FACET[first]}. 도움은 청해야 오고, 청하지 않으면 그냥 지나갑니다.`;
}

/** 마주 보는 자리가 이 자리에 주는 균형. 자미두수는 늘 맞은편을 함께 본다. */
function oppositeLine(facts) {
  if (!facts.opposite) return "";
  const lex = PALACE_LEX[facts.opposite];
  if (!lex) return "";
  return `맞은편에는 ${facts.opposite}이 있습니다. ${josa(facts.lex.field, "이")} 흔들릴 때 ${josa(lex.field, "이")} 균형을 잡아 주고, 반대로 그쪽이 무거워지면 이 자리가 대신 눌립니다. 둘은 한 쌍으로 움직입니다.`;
}

function bureauLine(facts) {
  const bureau = facts.bureau;
  if (!bureau?.number) return "";
  const note = BUREAU_FACET[bureau.number];
  if (!note) return "";
  return `명반 전체의 골격은 ${bureau.name}(${term("오행국")})입니다. ${note}.`;
}

// ── 서술 원형 5종 ────────────────────────────────────────────────

function narrativeNature(facts, seen) {
  return paragraphs([
    join([once(seen, starLine(facts)), once(seen, secondStarLine(facts))]),
    join([once(seen, tierLine(facts)), once(seen, familyLine(facts))]),
    join([once(seen, supportLine(facts))]),
    join([once(seen, markerLine(facts)), once(seen, oppositeLine(facts)), once(seen, resonanceLine(facts))]),
  ]);
}

function narrativeEngine(facts, seen) {
  return paragraphs([
    join([
      `${josa(facts.lex.subject, "이")} 실제로 굴러가는 방식입니다.`,
      facts.leadFacet ? `${facts.leadFacet[facts.facet]}.` : "고정된 축이 없어 상황에 맞춰 방식이 바뀝니다.",
    ]),
    join([once(seen, triadLine(facts)), once(seen, triadStarLine(facts))]),
    join([once(seen, triadFacetLine(facts))]),
    join([once(seen, sihuaLine(facts))]),
    join([once(seen, supportLine(facts)), once(seen, mechanicsLine(facts))]),
    join([once(seen, resonanceLine(facts)), `${facts.tier.label} 단계 — ${facts.tier.drive}.`]),
  ]);
}

function narrativeCaution(facts, seen) {
  const dim = facts.mainStars.filter((star) => facts.brightness[star] === "함");
  const ji = facts.transforms.find((row) => row.label === "화기");
  return paragraphs([
    join([
      `${facts.lex.field}에서 반복해서 걸리는 지점입니다.`,
      once(seen, shadowLine(facts)) || "특정한 한 가지 패턴보다, 방치했을 때 서서히 비는 쪽이 문제입니다.",
      dim.length ? `${josa(dim.join("·"), "은")} 지금 힘이 눌린 자리라(${term("밝기")} 함), 장점보다 그림자가 먼저 나옵니다.` : "",
    ]),
    join([
      ji ? `막힘과 집착이 몰리는 표시(화기${ji.star ? `·${ji.star}` : ""})가 이 자리에 걸려 있어, 여기서만 유독 놓지 못하고 붙잡습니다. 겁낼 자리가 아니라 관리할 자리입니다.` : "",
      once(seen, supportLine(facts)),
      facts.maleficStars.length
        ? `대응은 이렇습니다 — ${facts.maleficStars.map((star) => MALEFIC_FACET[star]?.care).filter(Boolean).map((care) => `${care}.`).join(" ")}`
        : "",
    ]),
    join([
      drainingOnly(facts).length ? `${josa(drainingOnly(facts).join("·"), "이")} 흔들릴 때 이 자리도 같이 흔들리니, 그쪽을 먼저 살피세요.` : "",
      once(seen, oppositeLine(facts)),
      "겁을 주려는 말이 아닙니다. 미리 알면 대비되는 자리입니다. 자미두수에서 약한 자리는 피하라는 뜻이 아니라, 먼저 손보라는 표시로 읽습니다.",
      once(seen, moveLine(facts)) || "무리해서 키우기보다 지금 있는 것을 지키는 쪽으로 방향을 잡으세요.",
      `${facts.tier.label} 단계라 무너져도 바닥까지 가지는 않습니다. 다만 같은 자리에서 두 번 걸리면 그때는 우연이 아니라 습관입니다.`,
      once(seen, useAssistLine(facts)),
    ]),
  ]);
}

function narrativeTiming(facts, seen) {
  return paragraphs([
    join([once(seen, luckLine(facts)), once(seen, luckDirectionLine(facts))]),
    join([once(seen, yearlyLine(facts)), once(seen, sihuaLine(facts))]),
    join([
      once(seen, bureauLine(facts)),
      `대운은 10년 단위로 궁을 옮겨 가고, 그 안에서 그 해의 흐름이 매년 한 궁씩 지납니다. 섬의 계절이 ${facts.season || "지금"}인 것도 지금 대운이 몇 번째 자리를 지나는지에 따라 정해진 것입니다.`,
      once(seen, resonanceLine(facts)),
    ]),
  ]);
}

function narrativeAdvice(facts, seen) {
  const bright = facts.mainStars.map((star) => facts.brightness[star]).find((level) => BRIGHTNESS_FACET[level]);
  return paragraphs([
    join([
      `${facts.lex.field}에서 지금 당장 손댈 수 있는 것만 추립니다.`,
      once(seen, moveLine(facts)) || "새로 벌이기보다, 이미 있는 것 중 하나를 골라 끝까지 밀어 보세요.",
      bright ? `${BRIGHTNESS_FACET[bright].act}.` : "",
    ]),
    join([
      once(seen, useAssistLine(facts)),
      once(seen, supportLine(facts)),
      facts.family ? `${facts.family.name} 계열이라 ${facts.family.detail}.` : "",
    ]),
    join([
      `${facts.tier.label} 단계이니 ${facts.tier.step}.`,
      once(seen, markerLine(facts)),
      once(seen, bureauLine(facts)),
      facts.isCurrentLuck
        ? "지금 대운이 여기를 지나므로, 이 조언은 올해가 아니라 앞으로 10년을 위한 것입니다. 이 구간에 들인 습관이 다음 자리로 넘어갈 때 그대로 따라갑니다."
        : `${josa(facts.lex.field, "은")} 한 번에 바뀌지 않습니다. 이번 달에 한 가지만 정해 끝까지 해보세요. 대운 차례가 아닐 때 쌓아 둔 것이, 차례가 왔을 때 쓸 수 있는 밑천이 됩니다.`,
      once(seen, oppositeLine(facts)),
    ]),
  ]);
}

const NARRATIVE_BY_ARCHETYPE = {
  NATURE: narrativeNature,
  ENGINE: narrativeEngine,
  CAUTION: narrativeCaution,
  TIMING: narrativeTiming,
  ADVICE: narrativeAdvice,
};

/** 생년 사화가 각각 어느 궁에서 출발하는지 — "어디서 어디로 흐르는가"를 말하려면 출발지가 필요하다. */
function sihuaHomeOf(blueprint) {
  const home = {};
  for (const palace of blueprint?.palaces || []) {
    for (const entry of palace.transformations || []) {
      const { label } = parseTransform(entry);
      if (label && !home[label]) home[label] = palace.name;
    }
  }
  return home;
}

/** 리포트 맨 앞 — 용어와 명반 골격을 먼저 알려 주는 안내 장. */
function buildIntro(blueprint, chart, context) {
  const seen = new Set();
  const ft = blueprint?.fourTransformations || {};
  const bureau = context.bureau;
  const sihuaRows = [
    ["화록", ft.huaLu], ["화권", ft.huaQuan], ["화과", ft.huaKe], ["화기", ft.huaJi],
  ].filter(([, star]) => star).map(([label, star]) => `${josa(label, "은")} ${star}`);

  const sections = [
    {
      key: "howto",
      title: "이 리포트 읽는 법",
      body: paragraphs([
        `열두 자리(${term("명반")})를 한 자리씩 읽어 드립니다. 자리마다 묻는 것이 다릅니다 — 돈을 보는 자리, 가까운 사람을 보는 자리, 몸을 보는 자리가 따로 있습니다.`,
        `읽다 보면 같은 말이 반복해서 나옵니다. ${term("주성")}은 그 자리의 성격을 정하는 가장 큰 요소고, ${term("보좌성")}은 도움이 붙는 자리, ${term("살성")}은 마찰이 생기는 자리를 가리킵니다.`,
        `${term("사화")}는 명반에 힘의 방향을 넣는 네 가지 표시입니다. 어느 자리에 걸렸는지가 그 영역의 흐름을 크게 바꿉니다.`,
        `한 자리만 보고 단정하지 않습니다. 마주 보는 자리와 빗각으로 이어진 두 자리를 함께 보는데, 이걸 ${term("삼방사정")}이라고 합니다. 이 리포트도 그 방식으로 읽습니다.`,
      ]),
    },
    {
      key: "frame",
      title: "당신 명반의 골격",
      body: paragraphs([
        join([
          chart?.bodyPalace && chart.bodyPalace !== (chart.lifePalace || "명궁")
            ? `타고난 결을 보는 자리(${term("명궁")})는 ${chart.lifePalace || "명궁"}이고, 살면서 실제로 매달리게 되는 자리(${term("신궁")})는 ${chart.bodyPalace}입니다. 둘이 다르다는 건 타고난 성향과 실제로 쏟는 힘이 다른 곳을 향한다는 뜻입니다.`
            : `타고난 결을 보는 자리(${term("명궁")})와 살면서 힘을 쏟는 자리(${term("신궁")})가 같은 곳에 있습니다. 타고난 성향과 실제 삶의 방향이 한 줄로 이어져 있다는 뜻입니다.`,
          bureau?.name ? `전체 골격은 ${bureau.name}(${term("오행국")})이고, ${BUREAU_FACET[bureau.number] || ""}.` : "",
        ]),
        sihuaRows.length
          ? `태어난 해가 정한 사화는 ${sihuaRows.join(", ")}입니다. 이 네 별이 앉은 자리가 삶에서 유난히 크게 움직이는 영역이 됩니다.`
          : "",
        chart?.uncertainty?.birthTimeUnknown
          ? "출생 시간을 모른다고 하셔서 정오를 기준으로 계산했습니다. 태어난 시각이 확인되면 자리 배치가 달라질 수 있으니, 지금 리포트는 큰 흐름 위주로 읽어 주세요."
          : "출생 시간까지 넣어 계산했기 때문에 자리 배치가 확정된 상태입니다.",
      ]),
    },
  ];

  return { title: "시작하기 전에", focus: "용어와 명반 골격", tier: 0, tierLabel: "안내", sections };
}

/**
 * 유료 심층 리포트 — 안내 1장 + 12궁 × 3~4섹션.
 * @param {object} blueprint buildIslandBlueprint() 결과
 * @param {object} [chart] calculateZiweiAiChart() 결과. 있으면 삼방사정·대운 타임라인·유년까지 읽는다.
 */
export function buildIslandDeepReport(blueprint, chart = null) {
  const palaces = Array.isArray(blueprint?.palaces) ? blueprint.palaces : [];
  if (palaces.length === 0) {
    const error = new Error("EMPTY_BLUEPRINT");
    error.code = "INVALID_INPUT";
    throw error;
  }
  const context = {
    edges: blueprint.edges,
    markers: blueprint.markers,
    season: blueprint.season,
    biome: blueprint.biome,
    bureau: blueprint.bureau || chart?.bureau || null,
    sihuaHome: sihuaHomeOf(blueprint),
    chart,
  };

  const out = { __intro: buildIntro(blueprint, chart, context) };
  for (const name of Object.keys(PALACE_CONSULT)) {
    const palace = palaces.find((row) => row.name === name);
    if (!palace) continue;
    const config = getPalaceConfig(name);
    const facts = collectFacts(palace, context);
    const archetypes = SECTION_ARCHETYPE[name] || {};
    // 궁마다 새로 시작한다 — 중복 제거·용어 풀이는 "한 궁 안에서"만 적용된다.
    const seen = new Set();
    const seenSentences = new Set();
    out[name] = {
      title: config.title,
      focus: PALACE_QUESTION[name] || config.focus,
      tier: palace.tier,
      tierLabel: palace.tierLabel,
      sections: config.sections.map(([key, label]) => ({
        key,
        title: label,
        body: dedupeSentences((NARRATIVE_BY_ARCHETYPE[archetypes[key]] || narrativeNature)(facts, seen), seenSentences),
      })),
    };
  }

  return {
    version: REPORT_VERSION,
    signature: blueprint.signature || "",
    biome: blueprint.biome || null,
    season: blueprint.season || "",
    palaces: out,
  };
}
