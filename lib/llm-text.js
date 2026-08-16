// LLM 응답 필드를 화면에 안전하게 뿌리기 위한 공용 텍스트 유틸.
// String(value)가 객체/배열에서 "[object Object]"를 만들어 그대로 노출되는 사고를 막는다.
// (이미 DB에 저장된 "[object Object]" 오염 문자열도 렌더 시점에 제거한다.)

const OBJECT_TOKEN = "[object Object]";
const TEXT_KEYS = ["description", "text", "content", "summary", "reading", "body", "value"];

/**
 * LLM이 반환한 임의 값(문자열/숫자/배열/중첩 객체)을 읽을 수 있는 문자열로 평탄화한다.
 * @param {unknown} value
 * @param {number} [depth]
 * @returns {string}
 */
export function toDisplayText(value, depth = 0) {
  if (value == null) return "";
  if (typeof value === "string") return scrubObjectToken(stripEmptyParens(value));
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (depth >= 3) return "";
  if (Array.isArray(value)) {
    return value.map((item) => toDisplayText(item, depth + 1).trim()).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    const record = /** @type {Record<string, unknown>} */ (value);
    const title = typeof record.title === "string" ? scrubObjectToken(stripEmptyParens(record.title)).trim() : "";
    for (const key of TEXT_KEYS) {
      const bodyText = toDisplayText(record[key], depth + 1).trim();
      if (bodyText) return title && title !== bodyText ? `${title} — ${bodyText}` : bodyText;
    }
    const joined = Object.values(record)
      .map((item) => toDisplayText(item, depth + 1).trim())
      .filter(Boolean)
      .join("\n");
    return title && joined && joined !== title ? `${title} — ${joined}` : joined || title;
  }
  return "";
}

/**
 * 장문 프로즈를 2~4문장 단위의 문단 배열로 나눈다 (벽글 가독성 개선용).
 * 기존 개행(\n)은 하드 문단 경계로 존중하고, 개행 없는 장문만 문장 단위로 청킹한다.
 * 짧은 텍스트(2문장 이하 또는 maxChars 이하)는 원문 그대로 1개 문단으로 반환.
 * @param {unknown} value
 * @param {{ maxSentences?: number, maxChars?: number }} [options]
 * @returns {string[]}
 */
export function splitIntoParagraphs(value, options) {
  const { maxSentences = 3, maxChars = 240 } = options || {};
  const text = toDisplayText(value).trim();
  if (!text) return [];
  const paragraphs = [];
  for (const block of text.split(/\n+/)) {
    const trimmed = block.trim();
    if (trimmed) paragraphs.push(...chunkProseBlock(trimmed, maxSentences, maxChars));
  }
  return paragraphs;
}

function chunkProseBlock(block, maxSentences, maxChars) {
  if (block.length <= maxChars) return [block];
  const sentences = splitSentences(block);
  if (sentences.length <= 2) return [block];
  const chunks = [];
  let current = [];
  let currentLength = 0;
  for (const sentence of sentences) {
    if (current.length >= 2 && (current.length >= maxSentences || currentLength + sentence.length > maxChars)) {
      chunks.push(current.join(" "));
      current = [];
      currentLength = 0;
    }
    current.push(sentence);
    currentLength += sentence.length + 1;
  }
  if (current.length) chunks.push(current.join(" "));
  // 마지막 문단이 외톨이 한 문장이면 직전 문단에 붙인다 (고아 문단 방지).
  if (chunks.length > 1 && splitSentences(chunks[chunks.length - 1]).length === 1) {
    const orphan = chunks.pop();
    chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${orphan}`;
  }
  return chunks;
}

// 종결부호(+닫는 따옴표/괄호) 뒤 공백에서만 문장을 나눈다.
// lookbehind 미사용(구형 Safari 정규식 파싱 호환) — 캡처 분할 후 [본문, 구두점] 쌍을 재결합한다.
// "3.5" 같은 소수점, 공백 없는 인용부호("해라."라고)는 분리되지 않는다.
// 전각 종결부호(。！？)는 일본어·중국어에서 뒤에 공백을 두지 않는다. 반각 규칙만 쓰면
// ja/zh 응답이 통째로 한 문장이 돼 문단 분할이 붕괴한다. 두 규칙을 나눠 쓴다.
export function splitSentences(block) {
  const pieces = block.split(/((?:[.!?…]+["'”’)\]]*\s+)|(?:[。！？]+["'”’)\]』」）]*\s*))/);
  const sentences = [];
  for (let i = 0; i < pieces.length; i += 2) {
    const sentence = `${pieces[i] || ""}${pieces[i + 1] || ""}`.trim();
    if (sentence) sentences.push(sentence);
  }
  return sentences;
}

/** 저장 단계에서 이미 오염된 "[object Object]" 토큰을 제거한다. */
function scrubObjectToken(text) {
  if (!text.includes(OBJECT_TOKEN)) return text;
  return text.split(OBJECT_TOKEN).join("").replace(/[ \t]{2,}/g, " ");
}

// 내용이 공백뿐인 빈 괄호를 앞쪽 군더더기 가로 공백까지 함께 제거한다.
// LLM이 "명궁(命宮)"을 병기하려다 한자를 못 채워 "명궁(　)"처럼 남기는 사고를 표시 시점에 정리한다
// (전각공백 U+3000·반각공백·비바꿈공백 포함). 내용이 있는 괄호 "자미(紫微)", "(1)"은 절대 건드리지 않는다.
const EMPTY_PARENS_PATTERN = /[ \t　 ]*[(（][\s　]*[)）]/g;
export function stripEmptyParens(text) {
  if (!text || (!text.includes("(") && !text.includes("（"))) return text;
  return text.replace(EMPTY_PARENS_PATTERN, "");
}

/**
 * 문장이 온전히 끝났는지에 대한 간이 휴리스틱.
 * 종결부호(다./요!/…/。/！/？), 닫는 따옴표/괄호로 끝나면 true.
 * 한국어 종결어미 whitelist 는 비한국어 텍스트에서 무해하므로 로케일 분기하지 않는다.
 * @param {string} text
 * @returns {boolean}
 */
export function endsWithSentence(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return false;
  return /(?:[.!?…。！？]|[다요죠까네라자])[\s"'”’)\]』」）】]*$/.test(trimmed);
}

// 문장 종결 경계. splitSentences 와 같은 이유로 반각·전각 규칙을 나눈다 — 전각 종결부호는
// 일본어·중국어에서 뒤에 공백을 두지 않으므로 반각 규칙(뒤에 공백/끝)을 그대로 쓰면 ja/zh
// 응답에서 경계가 하나도 안 잡혀 전부 말줄임표 경로로 떨어진다.
// 반각은 뒤가 공백이거나 문자열 끝일 때만 — 소수점("3.5")·약어가 걸리지 않게 한다.
// lookbehind 미사용(구형 Safari 호환)이라 "3." 처럼 상한 끝에 숫자 뒤 마침표가 남는 경우만
// 스캔 쪽에서 따로 걸러낸다.
const SENTENCE_BOUNDARY_PATTERN = /(?:[.!?…]+["'”’)\]』」）]*(?=\s|$))|(?:[。！？]+["'”’)\]』」）]*)/g;
// 절 경계. 숫자 자릿점("1,000")은 뒤에 공백이 없어 걸리지 않는다.
const CLAUSE_BOUNDARY_PATTERN = /[,，、;；](?=\s|$)/g;

function lastSentenceBoundaryEnd(window) {
  SENTENCE_BOUNDARY_PATTERN.lastIndex = 0;
  let end = 0;
  let match = SENTENCE_BOUNDARY_PATTERN.exec(window);
  while (match) {
    // "3.5"가 상한 끝에서 "3."로 잘린 경우 — 숫자 뒤 마침표는 문장 끝이 아니다.
    const isDecimalTail = match[0] === "." && /[0-9]/.test(window[match.index - 1] || "");
    if (!isDecimalTail) end = match.index + match[0].length;
    match = SENTENCE_BOUNDARY_PATTERN.exec(window);
  }
  return end;
}

function lastClauseBoundaryEnd(window) {
  CLAUSE_BOUNDARY_PATTERN.lastIndex = 0;
  let end = 0;
  let match = CLAUSE_BOUNDARY_PATTERN.exec(window);
  while (match) {
    end = match.index + match[0].length;
    match = CLAUSE_BOUNDARY_PATTERN.exec(window);
  }
  return end;
}

/**
 * 상한을 넘는 텍스트를 **문장 중간에서 끊지 않고** 줄인다.
 *
 * 하드 슬라이스(`text.slice(0, max)`)는 "그는 반복되는 선택을 하"처럼 글자 한복판에서 끊긴
 * 문장을 결과에 남긴다. 여기서는 상한 안의 마지막 완결 문장까지만 남긴다 — 짧아지더라도
 * 끊긴 문장을 내보내지 않는 쪽을 택한다.
 *
 * 상한 안에 문장 경계가 하나도 없으면(= 상한보다 긴 단일 문장) 마지막 절 경계까지 자르고
 * 말줄임표를 붙인다. 이 경로는 최후 수단이며, 호출부가 상한을 문장 하나보다 넉넉히 잡아
 * 여기에 닿지 않게 해야 한다.
 *
 * @param {string} text
 * @param {number} maxLength 0 이하면 원문 그대로.
 * @returns {string}
 */
export function trimToSentenceBoundary(text, maxLength) {
  const raw = String(text ?? "");
  if (!(maxLength > 0) || raw.length <= maxLength) return raw;

  const sentenceEnd = lastSentenceBoundaryEnd(raw.slice(0, maxLength));
  if (sentenceEnd > 0) return raw.slice(0, sentenceEnd).trim();

  // 최후 수단: 상한보다 긴 단일 문장. 말줄임표 자리로 1자를 남긴다.
  const shortened = raw.slice(0, Math.max(1, maxLength - 1));
  const clauseEnd = lastClauseBoundaryEnd(shortened);
  const body = clauseEnd > 0 ? shortened.slice(0, clauseEnd) : shortened;
  return `${body.trim()}…`;
}

// 공백·구두점만 다른 항목을 같은 것으로 본다. 의미가 다른 반복은 남긴다.
const DEDUPE_NOISE_PATTERN = /[\s.,!?…。！？、·;:'"“”‘’()[\]{}「」『』（）\-—–]+/g;

function defaultDedupeKey(value) {
  return String(value ?? "").toLowerCase().replace(DEDUPE_NOISE_PATTERN, "");
}

/**
 * 리스트에서 **완전히 같은** 항목을 앞의 것만 남기고 제거한다(유사도 비교 없음).
 * 섹션별로 따로 생성된 LLM 리스트가 같은 문장을 그대로 반복하는 것을 병합 시점에 정리한다.
 * @template T
 * @param {T[]} items
 * @param {(value: T) => string} [keyOf] 기본값은 공백·구두점을 지운 소문자 키.
 * @returns {T[]}
 */
export function dedupeTextList(items, keyOf = defaultDedupeKey) {
  const seen = new Set();
  const result = [];
  for (const item of Array.isArray(items) ? items : []) {
    // 키가 비면(구두점뿐인 항목) 원문을 키로 써서 정상 항목을 조용히 버리지 않는다.
    const key = keyOf(item) || String(item ?? "");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

/**
 * 구조화 파싱에 실패한 원문이 사실상 JSON(잘린 JSON 포함)인지 판별한다.
 * true면 원문을 그대로 프로즈로 렌더링하지 말 것 (중괄호/키 노출).
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikeRawJson(text) {
  const trimmed = String(text || "").trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith("```json");
}

function stripCodeFence(text) {
  const raw = String(text ?? "").trim();
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : raw;
}

/**
 * 토큰 상한 절단으로 잘린 JSON을 마지막 완결 값 경계까지 잘라내고 열린 괄호를 닫아
 * 파싱 가능한 부분만이라도 복구한다(하드 실패 대신 degrade — 완결성 검증은 호출부가 수행).
 * 복구 불가면 null.
 * @param {string} text
 * @returns {Record<string, unknown>|unknown[]|null}
 */
export function salvageTruncatedJsonObject(text) {
  const raw = stripCodeFence(text);
  const start = raw.indexOf("{");
  if (start < 0) return null;
  const body = raw.slice(start);

  // 한 번의 전방 스캔으로 "문자열 밖 완결 경계" 후보 위치와 그 시점의 괄호 스택을 수집.
  const candidates = [];
  const stack = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      if (inString) escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      if (!inString) candidates.push({ end: i + 1, stack: stack.slice() });
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}" || ch === "]") {
      stack.pop();
      candidates.push({ end: i + 1, stack: stack.slice() });
    }
  }

  // 뒤쪽 후보부터(가장 많은 내용을 보존) 닫는 괄호를 보충해 파싱을 시도.
  const maxTries = 40;
  for (let idx = candidates.length - 1, tried = 0; idx >= 0 && tried < maxTries; idx -= 1, tried += 1) {
    const { end, stack: openBrackets } = candidates[idx];
    if (!openBrackets.length && end < body.length) continue;
    const candidate = body.slice(0, end);
    let closers = "";
    for (let i = openBrackets.length - 1; i >= 0; i -= 1) {
      closers += openBrackets[i] === "{" ? "}" : "]";
    }
    try {
      const parsed = JSON.parse(candidate + closers);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // 다음 후보로 계속
    }
  }
  return null;
}

/**
 * 파싱에 실패한(잘린) JSON 원문에서 사람이 읽을 수 있는 한국어 문장 값만 추출해
 * 프로즈로 복원한다. 키 이름/짧은 토큰은 버린다. 복원 실패 시 빈 문자열.
 * @param {string} text
 * @returns {string}
 */
export function extractReadableTextFromJsonLike(text) {
  const raw = String(text || "");
  const values = [];
  const pattern = /"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = pattern.exec(raw))) {
    pushReadableValue(values, match[1]);
  }
  // MAX_TOKENS 잘림은 대개 문자열 중간에서 끊긴다 — 닫는 따옴표 없는 꼬리도 복원.
  const tail = raw.match(/"((?:[^"\\]|\\.)*)$/);
  if (tail) pushReadableValue(values, tail[1]);
  return values.join("\n\n");
}

// 한글·가나·한자. 이 셋 중 하나라도 있으면 CJK 본문으로 보고 기존 임계(12자)를 그대로 쓴다.
const CJK_SCRIPT_PATTERN = /[가-힣぀-ヿ㐀-䶿一-鿿]/;

/**
 * 사람이 읽을 본문인지 판별한다.
 *
 * 🔴 예전에는 `/[가-힣]/` 하나로 걸렀다. 그래서 영어 응답이 잘린 JSON 으로 오면 모든 값이
 *    폐기돼 hasRenderableLlmText 가 false 를 돌려주고, 결제된 요청이 환불 처리됐다.
 *    모델이 영어로 15,000자를 정상 생성했는데도 그랬다.
 *
 * 라틴 문자 비율 휴리스틱은 쓰지 않는다 — "The 紫微 star governs…" 같은 혼합 텍스트는
 * CJK 분기로 통과하는 게 맞다.
 */
function isReadableValue(value) {
  if (CJK_SCRIPT_PATTERN.test(value)) return value.length >= 12;
  if (!/[A-Za-z]/.test(value)) return false; // 숫자·날짜·기호만 있는 값
  // 공백이 없으면 JSON 키(camelCase)이거나 enum·모델명이다: overallVibe, MAX_TOKENS, gemini-2.5-flash
  if (!/\s/.test(value)) return false;
  const words = value.split(/\s+/).filter(Boolean);
  return words.length >= 5 && value.replace(/\s+/g, "").length >= 30;
}

function pushReadableValue(values, rawValue) {
  const value = String(rawValue || "")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim();
  if (isReadableValue(value)) values.push(value);
}

/**
 * @typedef {{ type: 'h3', text: string }
 *   | { type: 'p', lines: string[] }
 *   | { type: 'ul' | 'ol', items: string[] }
 *   | { type: 'blockquote', text: string }} ProseBlock
 */

/**
 * LLM 텍스트를 문단/리스트/인용/소제목 블록으로 분해한다(제한된 마크다운 서브셋: `**굵게**`,
 * `1.`/`-` 리스트, `> 인용`, `## 소제목`). react-markdown 없이 화면 렌더러가 그대로 소비할 수
 * 있는 순수 데이터 배열을 반환한다 — 기호가 없는 순수 프로즈는 p 블록으로 폴백(과거 저장 데이터 호환).
 * @param {unknown} value
 * @returns {ProseBlock[]}
 */
export function parseProseBlocks(value) {
  const text = toDisplayText(value).trim();
  if (!text) return [];
  const blocks = [];
  for (const rawBlock of text.split(/\n{2,}/)) {
    const rawLines = rawBlock.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!rawLines.length) continue;
    // 소제목 줄은 뒤에 빈 줄이 없어도 독립 블록으로 떼어낸다.
    // LLM 은 "### 제목\n본문"처럼 붙여 쓰는 일이 흔한데, 그대로 두면 '###' 가 본문에 그대로 노출된다.
    for (const lines of splitLeadingHeadings(rawLines)) {
    if (lines.length === 1 && /^#{2,3}\s+/.test(lines[0])) {
      blocks.push({ type: "h3", text: lines[0].replace(/^#{2,3}\s+/, "").trim() });
      continue;
    }
    if (lines.every((line) => /^\d+[.)]\s+/.test(line))) {
      blocks.push({ type: "ol", items: lines.map((line) => line.replace(/^\d+[.)]\s+/, "")) });
      continue;
    }
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      blocks.push({ type: "ul", items: lines.map((line) => line.replace(/^[-*]\s+/, "")) });
      continue;
    }
    if (lines.every((line) => /^>\s?/.test(line))) {
      blocks.push({ type: "blockquote", text: lines.map((line) => line.replace(/^>\s?/, "")).join(" ") });
      continue;
    }
    // 문장부호로 안 끝난 줄은 다음 줄에 이어붙은 줄바꿈(래핑)으로 보고 병합, 문장이 끝난 줄에서 문단을 끊는다.
    for (const paragraph of mergeWrappedLines(lines).flatMap((line) => chunkProseBlock(line, 3, 240))) {
      blocks.push({ type: "p", lines: [paragraph] });
    }
    }
  }
  return blocks;
}

// "### 제목" 줄을 만나면 거기서 그룹을 끊어 제목이 항상 단독 블록이 되게 한다.
function splitLeadingHeadings(lines) {
  const groups = [];
  let current = [];
  for (const line of lines) {
    if (/^#{2,3}\s+/.test(line)) {
      if (current.length) groups.push(current);
      groups.push([line]);
      current = [];
      continue;
    }
    current.push(line);
  }
  if (current.length) groups.push(current);
  return groups;
}

function mergeWrappedLines(lines) {
  const merged = [];
  let buffer = [];
  lines.forEach((line, index) => {
    buffer.push(line);
    if (index === lines.length - 1 || endsWithSentence(line)) {
      merged.push(buffer.join(" "));
      buffer = [];
    }
  });
  return merged;
}

/**
 * @typedef {{ titleKeywords?: RegExp, fallbackTitles?: string[], minHeadings?: number }} AssistantSectionOptions
 */

/**
 * 채팅형 LLM 응답을 제목/본문 섹션 배열로 나눈다(기능마다 중복 구현된 splitAssistantSections 일반화).
 * 원문 앞부분 줄바꿈 뒤 "짧은 제목처럼 보이는 줄"을 헤딩 후보로 훑고, `titleKeywords`에 매치되는
 * 후보가 `minHeadings`개 이상이면 그 경계로 섹션을 나눈다. 못 찾으면 문단을 `fallbackTitles` 개수만큼
 * 균등 분배한다. 원시(잘린) JSON은 `extractReadableTextFromJsonLike`로 먼저 복원한다.
 * @param {string} content
 * @param {AssistantSectionOptions} [options]
 * @returns {{ title: string, body: string }[]}
 */
export function parseAssistantSections(content, options) {
  const { titleKeywords, fallbackTitles = ["핵심 요약"], minHeadings = 3 } = options || {};
  let normalized = String(content || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (looksLikeRawJson(normalized)) {
    normalized = extractReadableTextFromJsonLike(normalized);
    if (!normalized) return [];
  }

  if (titleKeywords) {
    const headingMatches = [];
    const headingPattern = /^(?:#{1,3}\s*)?(\d{1,2}[.)]\s*)?([^\n]{2,46})\n+/gm;
    let match = headingPattern.exec(normalized);
    while (match) {
      if (titleKeywords.test(match[2] || "")) headingMatches.push(match);
      match = headingPattern.exec(normalized);
    }
    if (headingMatches.length >= minHeadings) {
      return headingMatches
        .map((item, index) => {
          const start = item.index + item[0].length;
          const end = headingMatches[index + 1]?.index ?? normalized.length;
          return { title: item[2].replace(/\*\*/g, "").trim(), body: normalized.slice(start, end).trim() };
        })
        .filter((section) => section.body);
    }
  }

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunkSize = Math.max(1, Math.ceil(paragraphs.length / fallbackTitles.length));
  return fallbackTitles
    .map((title, index) => ({ title, body: paragraphs.slice(index * chunkSize, (index + 1) * chunkSize).join("\n\n") }))
    .filter((section) => section.body);
}
