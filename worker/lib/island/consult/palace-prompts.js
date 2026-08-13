// 운명의 섬 12궁 심층 상담 — 궁별 맞춤 프롬프트.
// 컨셉: 각 궁의 문을 열면 연이(다정)·네오(통찰)가 그 궁의 주성·사화·대운을 짧고 밀도 있게 읽어준다.
// 궁마다 고유 질문 축·결과 섹션. 톤 가이드 엄수(단정 예언·공포 금지, 흉조엔 행동 제안).
// 순수 모듈(env·부작용 없음) — Node 단독 테스트 가능.

// 12궁 상담 프레임: 궁별 focus 축 + 결과 섹션(키·라벨). 섹션 키는 프론트 렌더 계약이므로 안정적으로 유지.
export const PALACE_CONSULT = {
  "명궁": { title: "운명의 성", focus: "타고난 본질·성향·삶의 중심 방향",
    sections: [["essence", "본질"], ["strength", "강점"], ["shadow", "그림자"], ["task", "올해의 과제"]] },
  "재백궁": { title: "황금 광산", focus: "재물을 벌고 쓰고 모으는 방식과 재물의 시기",
    sections: [["nature", "재물 성향"], ["structure", "수입·지출 구조"], ["flow", "재물 대운 흐름"], ["advice", "지금의 돈 선택 조언"]] },
  "관록궁": { title: "전략실", focus: "직업·성취와 진로 전환",
    sections: [["aptitude", "적성"], ["path", "성취 경로"], ["timing", "전환 시기"], ["advice", "지금의 일 조언"]] },
  "부부궁": { title: "연인의 정원", focus: "배우자·연애 인연의 형태와 흐름",
    sections: [["type", "인연의 형태"], ["rhythm", "만남과 갈등의 리듬"], ["keep", "관계를 지키는 법"]] },
  "천이궁": { title: "항구", focus: "이동·변화·해외와 바깥 활동",
    sections: [["aptitude", "이동 적성"], ["direction", "유리한 방향과 시기"], ["advice", "지금의 변화 조언"]] },
  "복덕궁": { title: "신비한 도서관", focus: "내면의 즐거움·정신 상태·취향",
    sections: [["mind", "정신의 결"], ["joy", "즐거움의 원천"], ["rest", "회복하는 법"]] },
  "질액궁": { title: "치유의 성소", focus: "건강·체질과 몸·마음의 취약점",
    sections: [["constitution", "체질 경향"], ["care", "주의할 부위와 리듬"], ["advice", "지금의 몸·마음 조언"]] },
  "부모궁": { title: "고대 신전", focus: "부모·윗사람과의 관계와 뿌리",
    sections: [["relation", "부모·윗사람운"], ["pattern", "관계의 패턴"], ["reconcile", "연결과 화해의 조언"]] },
  "형제궁": { title: "형제의 숲", focus: "형제·동년배와의 협력과 경쟁",
    sections: [["terrain", "관계 지형"], ["conflict", "갈등의 패턴"], ["recover", "회복 조언"]] },
  "노복궁": { title: "동료의 광장", focus: "동료·아랫사람 등 사회적 관계망",
    sections: [["network", "인맥 지형"], ["help", "도움을 주고받는 법"], ["boundary", "지켜야 할 경계선"]] },
  "자녀궁": { title: "빛의 놀이터", focus: "자녀·창작물과 기르고 낳는 것",
    sections: [["fortune", "자녀·창작운"], ["energy", "기르는 에너지"], ["care", "돌봄의 방식"]] },
  "전택궁": { title: "고향의 집", focus: "거처·부동산과 머무는 자리",
    sections: [["home", "거처운"], ["timing", "이사·터전의 시기"], ["advice", "공간을 다루는 조언"]] },
};

export const PALACE_KEYS = Object.keys(PALACE_CONSULT);
export function isValidPalace(key) { return Object.prototype.hasOwnProperty.call(PALACE_CONSULT, String(key || "")); }
export function getPalaceConfig(key) { return PALACE_CONSULT[String(key || "")] || null; }

/** 관리자 CMS 가 기본값을 보여줄 때 읽어 간다(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSystemPrompt() {
  return buildSystemPrompt();
}

/* 관리자 프롬프트 랩 전용(lib/admin/prompt-lab-registry.mjs 참고).
   궁별 사용자 프롬프트는 계산된 명반(chart)을 입력으로 받으므로 생년 정보만으로는 조립되지 않는다.
   12궁은 시스템 프롬프트를 공유하므로 궁 목록만 함께 돌려준다. */
export function buildAdminLabPrompt(body = {}, options = {}) {
  const palace = isValidPalace(options.variant) ? String(options.variant) : PALACE_KEYS[0];
  const config = getPalaceConfig(palace);

  // 이 빌더는 input.question 을 그대로 프롬프트에 싣는다. 명반(chart) 없이도 뼈대는 만들어지므로
  // 질문이 들어간 실제 프롬프트를 보여 주고, 명반 칸이 비었다는 것만 알린다.
  let prompt = "";
  try {
    const built = buildPalaceFirstPrompt(palace, { question: body?.question || "", birthInfo: body || {} }, null);
    prompt = String(built?.prompt || built || "");
  } catch (error) {
    prompt = "";
  }

  return {
    systemPrompt: buildSystemPrompt(),
    prompt,
    partial: true,
    partialReason: "명반 데이터 칸은 비어 있습니다 — 실제 상담에서는 계산된 자미두수 명반이 들어갑니다. 질문과 지시문은 프로덕션과 같습니다.",
    variantKey: palace,
    variants: PALACE_KEYS.map((key) => ({
      key,
      label: `${key} · ${PALACE_CONSULT[key].title}`,
    })),
    notes: config ? [`${palace} 초점: ${config.focus}`] : [],
  };
}

// 14주성 + 사화 한자 병기 화이트리스트(가짜 근거 방지 — ziwei-ai와 동일 원칙)
const HANJA_WHITELIST = "자미(紫微)·천기(天機)·태양(太陽)·무곡(武曲)·천동(天同)·염정(廉貞)·천부(天府)·태음(太陰)·탐랑(貪狼)·거문(巨門)·천상(天相)·천량(天梁)·칠살(七殺)·파군(破軍) / 화록(化祿)·화권(化權)·화과(化科)·화기(化忌) / 대운(大運)·삼방사정(三方四正)";

export function buildSystemPrompt() {
  return [
    "당신은 30년 경력의 자미두수(紫微斗數) 명인이자, '운명의 섬'의 안내자입니다.",
    "이 상담은 12궁 중 사용자가 고른 '한 궁'에 집중하는 짧고 밀도 있는 심층 상담입니다.",
    "규칙 A) 한 별의 뜻을 사전처럼 나열하지 마세요. 궁의 주성·보좌성·살성, 삼방사정, 사화의 관계를 종합해 '이 사람의 실제 삶의 결'로 풀어내세요.",
    "규칙 B) 단정적 예언('반드시 ~한다')·공포 조성('큰일 난다')·의료/법률/투자 확언을 금지합니다. 불리한 해석 뒤에는 반드시 '오늘 할 수 있는 작은 행동'을 붙이세요.",
    "규칙 C) 두 안내자의 결을 은은히 섞으세요 — 연이는 따뜻한 해요체로 위로하고, 네오는 진중한 통찰로 방향을 짚습니다. 다만 과장된 이모지는 쓰지 않습니다.",
    "규칙 D) 한자는 다음 목록만 병기할 수 있습니다: " + HANJA_WHITELIST + ". 그 외 한자·낯선 술어는 쓰지 마세요.",
    "규칙 E) 모든 문장은 한국어. 각 섹션 본문은 600~1200자, 문단으로 자연스럽게. 결과는 요청된 JSON 스키마로만 출력하세요.",
  ].join("\n");
}

function clean(v, max = 0) { const t = String(v ?? "").trim(); return max > 0 ? t.slice(0, max) : t; }
function brightnessMark(level) { return { "묘": "◎", "득": "O", "리": "▲", "평": "△", "함": "X" }[level] || ""; }

function palaceFactsBlock(palaceKey, chart) {
  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  const target = palaces.find((p) => p.name === palaceKey) || null;
  const triad = chart?.sanFangSiZheng?.byPalace?.[palaceKey] || null;
  const ft = chart?.fourTransformations || {};
  const lines = [];
  lines.push(`대상 궁: ${palaceKey}${target ? ` (지지 ${target.earthlyBranch})` : ""}`);
  if (target) {
    const stars = (target.mainStars || []).map((s) => s + (brightnessMark(target.brightness?.[s]) || "")).join(", ") || "무주성(주성 없음 — 삼방사정으로 읽음)";
    lines.push(`주성: ${stars}`);
    if ((target.assistantStars || []).length) lines.push(`보좌성: ${target.assistantStars.join(", ")}`);
    if ((target.maleficStars || []).length) lines.push(`살성: ${target.maleficStars.join(", ")}`);
    if ((target.transformations || []).length) lines.push(`이 궁의 사화: ${target.transformations.join(", ")}`);
    if (target.majorLuck?.range) lines.push(`이 궁의 대운 구간: ${target.majorLuck.range}세 (${target.majorLuck.direction || "순행"})`);
  }
  if (triad) {
    lines.push(`삼방사정(함께 읽는 궁): ${(triad.palaceNames || []).join(", ")}`);
    if ((triad.mainStars || []).length) lines.push(`삼방사정 주성 총합: ${[...new Set(triad.mainStars)].join(", ")}`);
    if (triad.opposite) lines.push(`대궁(맞은편): ${triad.opposite}`);
  }
  const sihua = Object.entries({ 화록: ft.huaLu, 화권: ft.huaQuan, 화과: ft.huaKe, 화기: ft.huaJi })
    .filter(([, s]) => s).map(([k, s]) => `${k}:${s}`).join(", ");
  if (sihua) lines.push(`생년 사화 배치: ${sihua}`);
  if (chart?.bureau?.name) lines.push(`오행국: ${chart.bureau.name}`);
  const yl = chart?.yearlyLuck;
  if (yl?.palaceName) lines.push(`올해 유년궁: ${yl.palaceName}${yl.year ? ` (${yl.year})` : ""}`);
  return lines.join("\n");
}

/**
 * 궁별 첫 상담 프롬프트.
 * @returns { prompt, sectionKeys, responseMimeType }
 */
export function buildPalaceFirstPrompt(palaceKey, input, chart) {
  const cfg = getPalaceConfig(palaceKey);
  if (!cfg) { const e = new Error("INVALID_PALACE"); e.code = "INVALID_INPUT"; throw e; }
  const sectionKeys = cfg.sections.map(([k]) => k);
  const sectionSchemaLines = cfg.sections
    .map(([k, label]) => `    "${k}": { "title": "${label}", "body": "..." }`).join(",\n");
  const userQuestion = clean(input?.userQuestion || input?.question, 1200);
  const birth = input?.birthInfo || input || {};

  const prompt = [
    `[상담 대상 궁] ${palaceKey} · ${cfg.title}`,
    `[이 궁의 초점] ${cfg.focus}`,
    userQuestion ? `[사용자의 질문] ${userQuestion}` : "[사용자의 질문] (없음 — 이 궁의 흐름을 지금 시점에 맞춰 자연스럽게 짚어 주세요)",
    "",
    "[상담자 정보]",
    `이름: ${clean(birth.name, 40) || "미기재"} / 성별: ${clean(birth.gender)} / 생년월일: ${clean(birth.birthDate)} ${birth.birthTimeUnknown ? "(시간 미상, 정오 기준)" : clean(birth.birthTime)} / 달력: ${clean(birth.calendarType) || "solar"}`,
    "",
    "[계산된 명반 근거 — 이 값만 사용, 새 별·수치 창작 금지]",
    palaceFactsBlock(palaceKey, chart),
    "",
    "[작성 지침]",
    `- '${palaceKey}'을(를) 중심으로, 삼방사정과 사화·대운을 겹쳐 지금의 결을 읽어 주세요.`,
    "- 무주성 궁이면 삼방사정으로 대신 읽고, 그 사실을 담담히 밝혀 주세요.",
    "- 흉조(함/살성/화기)가 보이면 불안만 남기지 말고, 그 자리에서 오늘 할 수 있는 작은 행동을 함께 제시하세요.",
    "",
    "[출력 — 아래 JSON만. 각 섹션 body는 600~1200자 한국어]",
    "{",
    '  "meta": {',
    `    "palace": "${palaceKey}", "palaceTitle": "${cfg.title}",`,
    '    "mainStars": ["..."], "sihua": ["..."], "daeun": "지금 대운 한 줄"',
    "  },",
    '  "sections": {',
    sectionSchemaLines,
    "  }",
    "}",
  ].join("\n");

  return { prompt, sectionKeys, responseMimeType: "application/json" };
}
