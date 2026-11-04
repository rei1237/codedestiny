// Gemini 계열의 실제 한도보다 보수적으로 잡아 시스템 지시·출력·thinking 여유를 남긴다.
export const FOLLOWUP_CONTEXT_SAFE_CHARS = 50000;
export const FOLLOWUP_HISTORY_SAFE_CHARS = 24000;
export const FOLLOWUP_RECENT_EXCHANGES = 2;

const clean = (value, max = 0) => {
  const text = String(value ?? "").normalize("NFC").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return max > 0 ? Array.from(text).slice(0, max).join("") : text;
};

function sentenceEdge(value, max = 360) {
  const text = clean(value).replace(/\s+/g, " ");
  if (text.length <= max) return text;
  const head = text.slice(0, Math.ceil(max * 0.65));
  const tail = text.slice(-Math.floor(max * 0.35));
  return `${head.trim()} … ${tail.trim()}`;
}

function exchangeParts(exchange) {
  const reply = exchange?.reply || exchange || {};
  return {
    id: clean(exchange?.id, 100),
    question: clean(exchange?.question, 1200),
    kind: clean(reply?.kind, 40),
    text: clean(reply?.text || exchange?.text, 20000),
    sources: Array.isArray(reply?.sources || exchange?.sources) ? (reply.sources || exchange.sources).map((id) => clean(id, 160)).filter(Boolean).slice(0, 20) : [],
  };
}

// 계산 근거는 호출부가 별도로 보존한다. 여기서는 오래된 대화 산문만 결정적으로 줄인다.
export function compactFollowupHistory(exchanges, { maxChars = FOLLOWUP_HISTORY_SAFE_CHARS, recent = FOLLOWUP_RECENT_EXCHANGES } = {}) {
  const rows = Array.isArray(exchanges) ? exchanges.map(exchangeParts) : [];
  const split = Math.max(0, rows.length - Math.max(0, recent));
  const compacted = rows.slice(0, split).map((row) => ({
    id: row.id,
    question: sentenceEdge(row.question, 260),
    kind: row.kind,
    text: sentenceEdge(row.text, 520),
    sources: row.sources,
    compacted: true,
  }));
  const full = rows.slice(split).map((row) => ({ ...row, compacted: false }));
  const kept = [];
  let used = 0;
  for (const row of [...compacted, ...full]) {
    const size = JSON.stringify(row).length;
    if (used + size > maxChars && row.compacted) continue;
    kept.push(row);
    used += size;
  }
  return kept;
}

export function compactFollowupMessages(messages, options = {}) {
  const rows = Array.isArray(messages) ? messages : [];
  const exchanges = [];
  for (let index = 0; index < rows.length; index += 2) {
    const first = rows[index] || {};
    const second = rows[index + 1] || {};
    exchanges.push({
      id: `message-${index}`,
      question: first.role === "user" ? first.content : "",
      reply: { kind: "answer", text: second.role === "assistant" ? second.content : first.content, sources: [] },
    });
  }
  return compactFollowupHistory(exchanges, options).flatMap((row) => [
    { role: "user", content: row.question, ...(row.compacted ? { compacted: true } : {}) },
    { role: "assistant", content: row.text, ...(row.compacted ? { compacted: true } : {}) },
  ]).filter((row) => row.content);
}

export function buildFollowupContextInput(payload, { maxChars = FOLLOWUP_CONTEXT_SAFE_CHARS } = {}) {
  const input = JSON.stringify(payload);
  return { input, chars: input.length, requiresContinuation: input.length > maxChars };
}
