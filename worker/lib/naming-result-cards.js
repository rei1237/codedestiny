// 작명 AI 결과의 "이름 카드 블록" 계약과 파서.
// LLM이 자유 마크다운(작명첩 본문) 뒤에 붙이는 소형 구조화 블록을 관대하게 파싱한다.
// JSON 강제 응답은 쓰지 않는다 — Gemini 2.5는 긴 JSON 요구 시 thinking 토큰이
// maxOutputTokens를 잠식해 잘림/빈 응답이 나는 알려진 함정이 있어, 프로즈 끝의
// 라인 단위 블록 + 파싱 실패 시 조용한 강등(카드 없이 본문만 렌더)으로 설계한다.
// 이 모듈은 외부 import가 없는 순수 함수만 담는다(verify 스크립트가 직접 import해 테스트).

// 🔴 라벨과 여는/닫는 토큰은 **기계 계약**이다. 출력 언어가 바뀌어도 번역되면 안 된다 —
//    파서가 이 한국어 라벨로 값을 찾으므로, 번역되는 순간 카드가 조용히 사라진다.
//    naming-locale-profile.js 가 비-ko 계약문을 만들 때 이 토큰을 그대로 가져다 쓴다.
export const BLOCK_OPEN = "[이름카드]";
export const BLOCK_CLOSE = "[/이름카드]";

export const NAME_CARD_BLOCK_CONTRACT = `---

## [이름 카드 블록 — 응답 맨 마지막에 반드시 포함]
위 작명첩 본문을 모두 쓴 뒤, 응답의 **가장 마지막**에 아래 형식의 블록을 그대로 출력하세요.
이 블록은 화면의 이름 카드 UI가 기계적으로 읽는 부분이므로 형식을 정확히 지키세요.

- \`${BLOCK_OPEN}\` 한 줄로 시작하고 \`${BLOCK_CLOSE}\` 한 줄로 끝냅니다.
- 후보 이름마다 \`후보:\`로 시작하는 한 줄. 각 필드는 \` | \`로 구분하고 순서를 지키세요.
- 마지막에 \`최종:\`으로 시작하는 한 줄로 최종 1순위를 확정하세요.
- 블록 안에서는 줄바꿈 없이 각 항목을 한 줄로 쓰고, 표/마크다운 문법을 쓰지 마세요.
- \`수리:\`에는 본문 4장과 같은 **원·형·이·정 4격을 모두** 적고 각 격의 길흉을 함께 밝히세요.

${BLOCK_OPEN}
후보: 서준 | 한자: 徐俊 | 뜻: 펼 서, 뛰어날 준 | 보완오행: 金·水 | 소리오행: 金→金 상생 | 수리: 원21·형23·이19·정33 (원·형·정 길, 이격 흉) | 총평: 곧게 뻗는 기운에 빼어남을 더한 이름
후보: (같은 형식으로 본문에서 다룬 모든 후보를 나열)
최종: 서준 | 이유: 부족한 金 기운을 자원오행으로 채우면서 소리 흐름까지 상생하는, 이 사주에 가장 맞는 이름입니다
${BLOCK_CLOSE}`;

function cleanLine(value) {
  return String(value ?? "").trim();
}

function stripLabel(part, labels) {
  const text = cleanLine(part);
  for (const label of labels) {
    if (text.startsWith(`${label}:`)) return cleanLine(text.slice(label.length + 1));
    if (text.startsWith(`${label} :`)) return cleanLine(text.slice(label.length + 2));
  }
  return text;
}

function parseCandidateLine(line) {
  const body = cleanLine(line).replace(/^후보\s*:\s*/, "");
  const parts = body.split("|").map((part) => cleanLine(part)).filter(Boolean);
  if (!parts.length) return null;
  const card = {
    name: stripLabel(parts[0], ["이름", "후보"]),
    hanja: "",
    meaning: "",
    elements: "",
    soundFlow: "",
    suri: "",
    summary: "",
  };
  for (const part of parts.slice(1)) {
    if (/^한자\s*:/.test(part)) card.hanja = stripLabel(part, ["한자"]);
    else if (/^뜻\s*:/.test(part)) card.meaning = stripLabel(part, ["뜻"]);
    else if (/^보완오행\s*:/.test(part) || /^오행\s*:/.test(part)) card.elements = stripLabel(part, ["보완오행", "오행"]);
    else if (/^소리오행\s*:/.test(part) || /^소리\s*:/.test(part)) card.soundFlow = stripLabel(part, ["소리오행", "소리"]);
    else if (/^수리\s*:/.test(part)) card.suri = stripLabel(part, ["수리"]);
    else if (/^총평\s*:/.test(part)) card.summary = stripLabel(part, ["총평"]);
    else if (!card.hanja && /[一-鿿]/.test(part)) card.hanja = part;
    else if (!card.summary) card.summary = part;
  }
  if (!card.name) return null;
  return card;
}

function parseFinalLine(line) {
  const body = cleanLine(line).replace(/^최종\s*:\s*/, "");
  const parts = body.split("|").map((part) => cleanLine(part)).filter(Boolean);
  if (!parts.length) return null;
  const pick = { name: stripLabel(parts[0], ["이름", "최종"]), reason: "" };
  for (const part of parts.slice(1)) {
    if (/^이유\s*:/.test(part)) pick.reason = stripLabel(part, ["이유"]);
    else if (!pick.reason) pick.reason = part;
  }
  if (!pick.name) return null;
  return pick;
}

/**
 * LLM 응답에서 이름 카드 블록을 파싱하고 본문에서 제거한다.
 * 어떤 실패든 { cards: [], finalPick: null, cleanText: 원문 }으로 강등한다 —
 * 카드는 부가 UI일 뿐이고, 결제된 본문은 어떤 경우에도 그대로 전달되어야 한다.
 * @param {string} text
 * @returns {{ cards: Array<object>, finalPick: object|null, cleanText: string }}
 */
export function parseNamingResultCards(text) {
  const source = String(text ?? "");
  const fallback = { cards: [], finalPick: null, cleanText: source };
  try {
    const openIndex = source.lastIndexOf(BLOCK_OPEN);
    if (openIndex < 0) return fallback;
    const closeIndex = source.indexOf(BLOCK_CLOSE, openIndex);
    const blockBody = closeIndex >= 0
      ? source.slice(openIndex + BLOCK_OPEN.length, closeIndex)
      : source.slice(openIndex + BLOCK_OPEN.length);

    const cards = [];
    let finalPick = null;
    for (const rawLine of blockBody.split(/\n+/)) {
      const line = cleanLine(rawLine);
      if (!line) continue;
      if (/^후보\s*:/.test(line)) {
        const card = parseCandidateLine(line);
        if (card) cards.push(card);
      } else if (/^최종\s*:/.test(line)) {
        const pick = parseFinalLine(line);
        if (pick) finalPick = pick;
      }
    }
    if (!cards.length && !finalPick) return fallback;

    const blockEnd = closeIndex >= 0 ? closeIndex + BLOCK_CLOSE.length : source.length;
    let cleanText = (source.slice(0, openIndex) + source.slice(blockEnd)).trim();
    // 블록 직전에 계약 안내용으로 남는 헤딩/구분선 잔재를 정리한다.
    cleanText = cleanText
      .replace(/\n#{2,3}\s*\[?이름\s*카드[^\n]*$/i, "")
      .replace(/\n-{3,}\s*$/, "")
      .trim();
    if (!cleanText) return fallback;
    return { cards, finalPick, cleanText };
  } catch (e) {
    void e;
    return fallback;
  }
}
