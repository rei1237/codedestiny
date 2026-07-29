// 운명의 섬 — Layer 2.5: 청사진(blueprint) → 사람이 읽는 문장.
// 이 모듈의 모든 함수는 순수 함수여야 한다: Date.now()/Math.random()/네트워크 금지.
// (동일 청사진 입력 → 항상 동일 출력. 검증: scripts/verify-island-report.mjs)
//
// 유료 심층 리포트(₩5,000) 전용. 섬 지도의 무료 궁 요약은 destiny-island.html의 기존 생성기가 정본이므로
// 같은 문장을 여기서 또 만들지 않는다(중복 생성 → 톤 분기 방지).
// 섹션 프레임은 PALACE_CONSULT(consult/palace-prompts.js)를 재사용해 ₩20,000 LLM 상담과 목차를 일치시킨다.

import { PALACE_CONSULT, getPalaceConfig } from "./consult/palace-prompts.js";

export const REPORT_VERSION = "island-report-v1";

// ── 14주성 프로파일 ──────────────────────────────────────────────
// core=본질 / power=강점 / risk=그림자 / move=행동 제안. 전부 짧은 구절로 두고 조합 단계에서 문장이 된다.
const STAR_PROFILE = {
  자미: { keyword: "중심", core: "판을 정리하고 중심을 잡으려는 힘", power: "책임을 맡을수록 사람이 따라옵니다", risk: "혼자 다 짊어지다 자존심에 갇힙니다", move: "권한을 나눠 주세요" },
  천기: { keyword: "설계", core: "머리로 먼저 길을 그리는 힘", power: "변수를 빨리 읽고 대안을 만듭니다", risk: "생각만 굴리다 시기를 놓칩니다", move: "결정 기한을 날짜로 못박으세요" },
  태양: { keyword: "발산", core: "밖으로 비추고 알리는 힘", power: "사람을 모으고 명분을 세웁니다", risk: "다 퍼주고 스스로 소진됩니다", move: "쉬는 시간을 일정에 먼저 넣으세요" },
  무곡: { keyword: "실행", core: "숫자와 실물로 밀어붙이는 힘", power: "한번 정하면 끝을 봅니다", risk: "말이 짧아 관계가 메마릅니다", move: "결과 말고 과정도 말해 주세요" },
  천동: { keyword: "회복", core: "긴장을 풀고 관계를 눅이는 힘", power: "어디서든 편안한 자리를 만듭니다", risk: "편한 쪽으로 미루다 기회를 흘립니다", move: "작아도 먼저 시작하세요" },
  염정: { keyword: "전환", core: "한 곳에 몰입해 판을 뒤집는 힘", power: "원칙과 승부처를 압니다", risk: "감정이 격해지면 관계를 태웁니다", move: "화가 날 때는 하루만 미루세요" },
  천부: { keyword: "축적", core: "모으고 지켜 안정시키는 힘", power: "위기에서 곳간 역할을 합니다", risk: "안전만 챙기다 확장을 놓칩니다", move: "일부는 과감히 걸어 보세요" },
  태음: { keyword: "내면", core: "안에서 다듬고 보살피는 힘", power: "디테일과 사람 마음을 읽습니다", risk: "속으로 삭이다 혼자 지칩니다", move: "말로 꺼내 나누세요" },
  탐랑: { keyword: "확장", core: "원하는 것을 향해 뻗어가는 힘", power: "사교와 감각으로 기회를 만듭니다", risk: "손을 여러 곳에 대다 얕아집니다", move: "올해는 하나만 끝내세요" },
  거문: { keyword: "규명", core: "따지고 파고들어 밝히는 힘", power: "허점을 남보다 먼저 발견합니다", risk: "말이 앞서 오해를 부릅니다", move: "지적하기 전에 먼저 물어보세요" },
  천상: { keyword: "조율", core: "사이를 잇고 형식을 갖추는 힘", power: "믿을 만한 중재자가 됩니다", risk: "결정을 자꾸 남에게 미룹니다", move: "당신 의견부터 먼저 말하세요" },
  천량: { keyword: "원칙", core: "기준을 세우고 지켜주는 힘", power: "어른 역할로 신뢰를 얻습니다", risk: "조언이 잔소리로 굳습니다", move: "듣는 시간을 두 배로 늘리세요" },
  칠살: { keyword: "돌파", core: "정면으로 밀고 나가는 힘", power: "위기에서 가장 강해집니다", risk: "다 갈아엎고 혼자 남습니다", move: "물러설 선을 미리 정해 두세요" },
  파군: { keyword: "재건", core: "낡은 것을 부수고 새로 짓는 힘", power: "판을 갈아탈 때 빛납니다", risk: "안정된 것까지 흔들어 놓습니다", move: "부수기 전에 대체안을 먼저 만드세요" },
};

const BRIGHTNESS_NOTE = {
  묘: "제 자리를 만나 힘이 가장 곧게 나옵니다",
  득: "무리 없이 제 몫을 해냅니다",
  리: "쓰이기는 하나 손이 한 번 더 갑니다",
  평: "평범하게 흐르며 상황을 탑니다",
  함: "힘이 눌려 있어 조건을 갖춰야 살아납니다",
};

const ASSIST_NOTE = {
  문창: "문서·시험·계약 쪽 운이 붙습니다",
  문곡: "표현과 감성으로 사람을 움직입니다",
  좌보: "곁에서 돕는 손이 끊기지 않습니다",
  우필: "결정적인 순간에 도와줄 사람이 나타납니다",
  천괴: "윗사람 귀인의 덕을 봅니다",
  천월: "뜻밖의 자리에서 도움이 옵니다",
  녹존: "실속을 챙기는 감각이 있습니다",
  함지: "사람을 끄는 매력이 강합니다",
  천요: "분위기를 다루는 재주가 있습니다",
};

const MALEFIC_NOTE = {
  경양: "날이 선 말과 충돌",
  타라: "질질 끌리는 지연과 반복",
  화성: "갑자기 치솟는 조급함",
  영성: "겉으로 못 내는 속앓이",
  지공: "공들인 것이 비는 허무함",
  지겁: "새어 나가는 손실과 이탈",
};

const SIHUA_NOTE = {
  화록: { tone: "풍요", text: "이 자리로 기회와 재물이 흘러들어옵니다" },
  화권: { tone: "권한", text: "이 자리에서 주도권을 쥐게 됩니다" },
  화과: { tone: "명예", text: "이 자리의 일이 이름과 평판으로 남습니다" },
  화기: { tone: "마찰", text: "이 자리에 집착과 마찰이 몰립니다" },
};

const TIER_NOTE = {
  1: { label: "폐허", state: "아직 손이 닿지 않은 자리", tone: "지금은 비어 있지만, 비어 있다는 건 무엇을 지어도 된다는 뜻입니다" },
  2: { label: "오두막", state: "작게 자리를 잡은 단계", tone: "기본은 서 있으니 한 칸씩 늘려가면 됩니다" },
  3: { label: "저택", state: "제 몫을 하는 단단한 자리", tone: "무너지지 않는 기반이 있으니 여기서 방향을 골라도 됩니다" },
  4: { label: "궁전", state: "당신의 강한 영역", tone: "여기서는 밀어붙여도 됩니다. 당신 편입니다" },
  5: { label: "신전", state: "인생의 중심축", tone: "이 자리가 흔들리지 않는 한 나머지는 복구됩니다" },
};

// 궁별 어휘 — 같은 구조의 문장을 궁마다 다른 결로 읽히게 만든다.
const PALACE_LEX = {
  명궁: { field: "당신 자신", subject: "삶의 중심", people: "당신을 보는 사람들", act: "선택하고 밀고 나가는 방식" },
  형제궁: { field: "형제·동년배 관계", subject: "곁에서 함께 뛰는 사람들", people: "형제와 또래", act: "협력하고 경쟁하는 방식" },
  부부궁: { field: "배우자·연애 인연", subject: "가장 가까운 한 사람", people: "연인과 배우자", act: "사랑하고 다투는 방식" },
  자녀궁: { field: "자녀·창작물", subject: "당신이 기르고 낳는 것", people: "아이와 후배", act: "돌보고 키우는 방식" },
  재백궁: { field: "재물", subject: "돈이 들어오고 나가는 길", people: "돈으로 엮인 사람들", act: "벌고 쓰고 모으는 방식" },
  질액궁: { field: "몸과 컨디션", subject: "체력과 회복", people: "당신의 몸", act: "무리하고 회복하는 방식" },
  천이궁: { field: "이동과 바깥 활동", subject: "밖에서의 당신", people: "밖에서 만나는 사람들", act: "움직이고 자리를 옮기는 방식" },
  노복궁: { field: "동료·인맥", subject: "사회적 관계망", people: "동료와 아랫사람", act: "주고받는 방식" },
  관록궁: { field: "직업과 성취", subject: "일에서의 당신", people: "일로 만나는 사람들", act: "일하고 올라가는 방식" },
  전택궁: { field: "거처와 터전", subject: "머무는 자리", people: "집과 가족", act: "자리 잡고 옮기는 방식" },
  복덕궁: { field: "내면과 즐거움", subject: "혼자 있을 때의 당신", people: "당신의 마음", act: "쉬고 즐기는 방식" },
  부모궁: { field: "부모·윗사람", subject: "뿌리와 울타리", people: "부모와 윗사람", act: "기대고 부딪히는 방식" },
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
  if (code < 0xac00 || code > 0xd7a3) return false; // 한글 음절이 아니면 받침 없는 쪽으로 읽는다
  return (code - 0xac00) % 28 !== 0;
}

/** 받침에 맞는 조사를 붙인다. josa("파군","이") → "파군이" / josa("연이","이") → "연이가" */
function josa(word, withBatchim) {
  const PAIR = { 이: "가", 은: "는", 을: "를", 과: "와", 으로: "로" };
  const tail = hasBatchim(word) ? withBatchim : PAIR[withBatchim] || withBatchim;
  return `${word}${tail}`;
}

function join(parts) {
  return parts.filter((part) => typeof part === "string" && part.trim()).join(" ");
}

function paragraphs(list) {
  return list.filter((part) => typeof part === "string" && part.trim()).join("\n\n");
}

function listText(items, tail = "") {
  const rows = (items || []).filter(Boolean);
  if (rows.length === 0) return "";
  return rows.join("·") + tail;
}

function parseTransform(entry) {
  const text = String(entry || "");
  const sep = text.indexOf(":");
  if (sep <= 0) return { label: text, star: "" };
  return { label: text.slice(0, sep), star: text.slice(sep + 1) };
}

/** 궁 하나를 문장으로 만들 때 쓰는 사실 묶음. 청사진 값만 읽고 새로 계산하지 않는다. */
function collectFacts(palace, context) {
  const mainStars = Array.isArray(palace?.mainStars) ? palace.mainStars : [];
  const assistantStars = Array.isArray(palace?.assistantStars) ? palace.assistantStars : [];
  const maleficStars = Array.isArray(palace?.maleficStars) ? palace.maleficStars : [];
  const brightness = palace?.brightness && typeof palace.brightness === "object" ? palace.brightness : {};
  const transforms = (Array.isArray(palace?.transformations) ? palace.transformations : []).map(parseTransform);
  const edges = Array.isArray(context?.edges) ? context.edges : [];
  const markers = context?.markers || {};

  const leadStar = mainStars.find((star) => STAR_PROFILE[star]) || "";
  const profiles = mainStars.map((star) => STAR_PROFILE[star]).filter(Boolean);
  const tier = TIER_NOTE[palace?.tier] || TIER_NOTE[1];

  const incoming = edges.filter((edge) => edge.to === palace?.name);
  const strongIncoming = incoming.filter((edge) => edge.weight >= 4).map((edge) => edge.from);
  const drainingIncoming = incoming.filter((edge) => edge.weight <= -4).map((edge) => edge.from);

  return {
    name: String(palace?.name || ""),
    lex: PALACE_LEX[palace?.name] || PALACE_LEX["명궁"],
    mainStars,
    assistantStars,
    maleficStars,
    brightness,
    transforms,
    profiles,
    leadStar,
    leadProfile: leadStar ? STAR_PROFILE[leadStar] : null,
    tier,
    score: Number(palace?.score) || 0,
    majorLuckRange: String(palace?.majorLuckRange || ""),
    strongIncoming,
    drainingIncoming,
    isLifePalace: palace?.name === (markers.lifePalace || "명궁"),
    isBodyPalace: Boolean(markers.bodyPalace) && palace?.name === markers.bodyPalace,
    isCurrentLuck: Boolean(markers.currentMajorLuck) && palace?.name === markers.currentMajorLuck.palaceName,
    currentLuckRange: markers.currentMajorLuck?.range || "",
    isYearlyLuck: Boolean(markers.yearlyLuckPalace) && palace?.name === markers.yearlyLuckPalace,
    yearlyLuckYear: markers.yearlyLuckYear || null,
    season: context?.season || "",
    biome: context?.biome || null,
  };
}

function starLine(facts) {
  if (!facts.leadProfile) {
    return `${facts.name}에는 주성이 앉지 않았습니다. 정해진 형태가 없다는 뜻이라, ${josa(facts.lex.field, "은")} 주변 궁의 기운과 당신의 선택을 따라 모양이 잡힙니다.`;
  }
  const marks = facts.mainStars
    .map((star) => {
      const level = facts.brightness[star];
      const note = level ? BRIGHTNESS_NOTE[level] : "";
      return note ? `${josa(star, "은")} ${note}` : "";
    })
    .filter(Boolean);
  return join([
    `${facts.name}의 중심에는 ${josa(facts.mainStars.join("·"), "이")} 있습니다.`,
    `${facts.leadProfile.core}이 ${facts.lex.field}에서 먼저 작동합니다.`,
    marks.length ? `${marks.join(", ")}.` : "",
  ]);
}

function tierLine(facts) {
  return `건물 등급은 ${facts.tier.label}(${facts.score}점) — ${facts.tier.state}입니다. ${facts.tier.tone}.`;
}

function sihuaLine(facts) {
  if (facts.transforms.length === 0) return "";
  const rows = facts.transforms
    .map(({ label, star }) => {
      const note = SIHUA_NOTE[label];
      if (!note) return "";
      return `${label}${star ? `(${star})` : ""} — ${note.text}`;
    })
    .filter(Boolean);
  return rows.length ? `이 궁에 걸린 사화: ${rows.join(" / ")}.` : "";
}

function supportLine(facts) {
  const assists = facts.assistantStars.map((star) => ASSIST_NOTE[star]).filter(Boolean);
  const malefics = facts.maleficStars.map((star) => MALEFIC_NOTE[star]).filter(Boolean);
  return join([
    assists.length ? `도와주는 힘으로는 ${assists.join(", ")}.` : "",
    malefics.length ? `걸리는 지점은 ${listText(malefics)}입니다.` : "",
    assists.length === 0 && malefics.length === 0 ? "보좌성도 살성도 붙지 않아, 이 자리는 외부 자극보다 당신의 습관이 결과를 만듭니다." : "",
  ]);
}

function resonanceLine(facts) {
  if (facts.strongIncoming.length === 0 && facts.drainingIncoming.length === 0) {
    return `다른 궁에서 들어오는 힘이 크지 않아, ${josa(facts.lex.field, "은")} 다른 영역에 휘둘리지 않고 독립적으로 움직입니다.`;
  }
  return join([
    facts.strongIncoming.length ? `${facts.strongIncoming.join("·")}에서 힘이 흘러들어와 이 자리를 받쳐 줍니다.` : "",
    facts.drainingIncoming.length ? `반대로 ${facts.drainingIncoming.join("·")} 쪽이 흔들리면 이 자리가 같이 흔들립니다.` : "",
  ]);
}

function markerLine(facts) {
  return join([
    facts.isLifePalace ? "이 궁은 명궁 — 섬의 중심이자 당신 자신입니다." : "",
    facts.isBodyPalace ? "신궁이 겹쳐, 후천적인 노력이 이 자리에 가장 크게 쌓입니다." : "",
    facts.isCurrentLuck ? `지금 대운(${facts.currentLuckRange}세)이 이 궁을 지나고 있습니다. 앞으로 10년의 주제가 여기에 있습니다.` : "",
    facts.isYearlyLuck ? `${facts.yearlyLuckYear ? `${facts.yearlyLuckYear}년 ` : ""}올해의 유년도 이 자리에 머뭅니다.` : "",
    !facts.isCurrentLuck && facts.majorLuckRange ? `이 궁의 대운 구간은 ${facts.majorLuckRange}세입니다.` : "",
  ]);
}

// ── 서술 원형 5종 ────────────────────────────────────────────────

function narrativeNature(facts) {
  return paragraphs([
    join([starLine(facts), tierLine(facts)]),
    join([
      facts.leadProfile ? `${josa(facts.lex.act, "을")} 보면 ${facts.leadProfile.power}.` : `${josa(facts.lex.act, "은")} 아직 한 가지로 굳지 않았습니다.`,
      supportLine(facts),
    ]),
    join([markerLine(facts), resonanceLine(facts)]),
  ]);
}

function narrativeEngine(facts) {
  const second = facts.profiles[1] || null;
  return paragraphs([
    join([
      `${josa(facts.lex.subject, "이")} 실제로 굴러가는 방식입니다.`,
      facts.leadProfile ? `${facts.leadProfile.core}이 축이고, ${facts.leadProfile.power}.` : "고정된 축이 없어 상황에 맞춰 방식이 바뀝니다.",
      second ? `여기에 ${second.keyword}의 결이 겹쳐, 한 가지 방식만 고집하지 않습니다.` : "",
    ]),
    join([sihuaLine(facts), supportLine(facts)]),
    join([
      resonanceLine(facts),
      `${facts.tier.label} 단계이므로, ${facts.tier.tone.replace(/\.$/, "")}.`,
    ]),
  ]);
}

function narrativeCaution(facts) {
  const risks = facts.profiles.map((profile) => profile.risk).filter(Boolean);
  const ji = facts.transforms.find((row) => row.label === "화기");
  return paragraphs([
    join([
      `${facts.lex.field}에서 반복해서 걸리는 지점입니다.`,
      risks.length ? risks.join(" 그리고 ") + "." : "특정한 한 가지 패턴보다, 방치했을 때 서서히 비는 쪽이 문제입니다.",
    ]),
    join([
      ji ? `화기${ji.star ? `(${ji.star})` : ""}가 이 자리에 걸려 있어, 여기서만 유독 놓지 못하고 붙잡습니다.` : "",
      facts.maleficStars.length ? `살성으로는 ${josa(listText(facts.maleficStars.map((star) => MALEFIC_NOTE[star])), "이")} 함께 옵니다.` : "",
      facts.drainingIncoming.length ? `${josa(facts.drainingIncoming.join("·"), "이")} 흔들릴 때 같이 무너지니, 그쪽을 먼저 살피세요.` : "",
    ]),
    join([
      "겁을 주려는 말이 아닙니다. 미리 알면 대비되는 자리입니다.",
      facts.leadProfile ? `${facts.leadProfile.move}. 그거 하나로 이 자리의 손실은 크게 줄어듭니다.` : "무리해서 키우기보다, 지금 있는 것을 지키는 쪽으로 방향을 잡으세요.",
      `${facts.tier.label} 단계라 무너져도 바닥까지 가지는 않습니다. 다만 같은 자리에서 두 번 걸리면 그때는 습관입니다.`,
    ]),
  ]);
}

function narrativeTiming(facts) {
  const lu = facts.transforms.find((row) => row.label === "화록");
  const quan = facts.transforms.find((row) => row.label === "화권");
  return paragraphs([
    join([
      facts.isCurrentLuck
        ? `지금 대운(${facts.currentLuckRange}세)이 바로 이 궁을 지나고 있습니다. 앞으로 10년, ${josa(facts.lex.field, "이")} 인생의 주제가 됩니다.`
        : facts.majorLuckRange
          ? `이 궁의 대운은 ${facts.majorLuckRange}세 구간입니다. 그때 ${josa(facts.lex.field, "이")} 전면에 나옵니다.`
          : `대운 구간이 확정되지 않아, ${facts.lex.field}의 시기는 유년(그 해의 흐름)을 따라 움직입니다.`,
      facts.isYearlyLuck ? `${facts.yearlyLuckYear ? `${facts.yearlyLuckYear}년 ` : ""}올해의 유년도 이 자리에 들어와 있어, 올해 안에 변화가 눈에 보입니다.` : "",
    ]),
    join([
      lu ? `화록이 붙어 기회 쪽으로 문이 열립니다. 이 시기에 시작한 것이 가장 오래 갑니다.` : "",
      quan ? `화권이 붙어 주도권을 잡는 흐름입니다. 요청을 기다리지 말고 먼저 제안하세요.` : "",
      !lu && !quan ? `사화가 크게 개입하지 않아, 급격한 반전보다 준비한 만큼 나오는 시기입니다.` : "",
      `섬의 계절은 ${facts.season || "지금"} — ${facts.tier.label} 단계의 자리입니다.`,
    ]),
    join([resonanceLine(facts)]),
  ]);
}

function narrativeAdvice(facts) {
  const moves = facts.profiles.map((profile) => profile.move).filter(Boolean);
  return paragraphs([
    join([
      `${facts.lex.field}에서 지금 당장 손댈 수 있는 것만 추립니다.`,
      moves.length ? moves.join(" 그리고 ") + "." : "새로 벌이기보다, 이미 있는 것 중 하나를 골라 끝까지 밀어 보세요.",
    ]),
    join([
      facts.assistantStars.length
        ? `도와줄 힘이 이미 붙어 있습니다 — ${listText(facts.assistantStars)}. 혼자 하려 들지 말고 이 통로를 쓰세요.`
        : "도와주는 별이 따로 없으니, 사람보다 습관과 일정에 기대는 편이 확실합니다.",
      facts.maleficStars.length ? `대신 ${josa(listText(facts.maleficStars.map((star) => MALEFIC_NOTE[star])), "은")} 늘 붙어 다닌다고 보고 일정을 짜세요.` : "",
    ]),
    join([
      facts.tier.tone + ".",
      facts.isCurrentLuck
        ? "지금 대운이 여기를 지나므로, 이 조언은 올해가 아니라 앞으로 10년을 위한 것입니다."
        : `${josa(facts.lex.field, "은")} 한 번에 바뀌지 않습니다. 이번 달에 한 가지만 정해 끝까지 해보세요.`,
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

function contextOf(blueprint) {
  return {
    edges: blueprint?.edges,
    markers: blueprint?.markers,
    season: blueprint?.season,
    biome: blueprint?.biome,
  };
}

/**
 * 유료 심층 리포트 — 12궁 × 3~4섹션.
 * @param {object} blueprint buildIslandBlueprint() 결과
 */
export function buildIslandDeepReport(blueprint) {
  const palaces = Array.isArray(blueprint?.palaces) ? blueprint.palaces : [];
  if (palaces.length === 0) {
    const error = new Error("EMPTY_BLUEPRINT");
    error.code = "INVALID_INPUT";
    throw error;
  }
  const context = contextOf(blueprint);

  const out = {};
  for (const name of Object.keys(PALACE_CONSULT)) {
    const palace = palaces.find((row) => row.name === name);
    if (!palace) continue;
    const config = getPalaceConfig(name);
    const facts = collectFacts(palace, context);
    const archetypes = SECTION_ARCHETYPE[name] || {};
    out[name] = {
      title: config.title,
      focus: config.focus,
      tier: palace.tier,
      tierLabel: palace.tierLabel,
      sections: config.sections.map(([key, label]) => ({
        key,
        title: label,
        body: (NARRATIVE_BY_ARCHETYPE[archetypes[key]] || narrativeNature)(facts),
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
