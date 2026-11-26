// PRIV-008: console 로그에 넘기는 메타데이터에서 개인정보를 키 이름 기준으로 가린다.
// 생년월일은 연도만 남기고(디버깅용), 시각·이메일·전화·토큰·질문·프롬프트·이름·상대방 정보는 통째로 가린다.
// 불리언 플래그(birthTimeUnknown 등)는 개인정보가 아니므로 그대로 둔다.

const REDACTED = "[redacted]";
const MAX_DEPTH = 3;
const MAX_KEYS = 40;
const MAX_ITEMS = 20;
const MAX_STRING = 300;

const BIRTH_DATE_KEY = /^(birth[_-]?date|date[_-]?of[_-]?birth|dob)$/i;
const SENSITIVE_KEY = /birth|email|phone|mobile|token|secret|password|authorization|cookie|question|prompt|message|^name$|name$|partner/i;

function truncate(text) {
  return text.length > MAX_STRING ? `${text.slice(0, MAX_STRING - 1)}…` : text;
}

function redactBirthDate(value) {
  const match = typeof value === "string" ? value.match(/^\s*(\d{4})/) : null;
  return match ? `${match[1]}-**-**` : REDACTED;
}

function redactValue(value, depth) {
  if (typeof value === "string") return truncate(value);
  if (!value || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[omitted]";
  if (Array.isArray(value)) return value.slice(0, MAX_ITEMS).map((entry) => redactValue(entry, depth + 1));
  const output = {};
  for (const [key, entry] of Object.entries(value).slice(0, MAX_KEYS)) {
    if (typeof entry === "boolean" || entry === null || entry === undefined) {
      output[key] = entry;
    } else if (BIRTH_DATE_KEY.test(key)) {
      output[key] = redactBirthDate(entry);
    } else if (SENSITIVE_KEY.test(key)) {
      output[key] = REDACTED;
    } else {
      output[key] = redactValue(entry, depth + 1);
    }
  }
  return output;
}

export function redactForLog(value) {
  return redactValue(value, 0);
}
