// LLM 이 뱉은 JSON 텍스트의 "되살릴 수 있는 손상"만 고친다. 의존성 없음 —
// worker 라우트뿐 아니라 plain node 검증 스크립트(scripts/verify-*.mjs)도 프롬프트 모듈을
// 거쳐 이 파일을 로드하므로, 여기에 .ts 나 LLM 클라이언트를 끌어오지 않는다.

/**
 * JSON 문자열 리터럴 안에 들어온 raw 제어문자를 이스케이프해 되살린다.
 *
 * 🔴 실측(2026-08-01, 자미두수 6그룹 병렬 라이브 호출): `responseMimeType: "application/json"`
 * 을 줘도 gemini-2.5-flash 는 긴 한국어 상담문에서 문단을 나누며 **문자열 안에 raw 개행을
 * 그대로** 넣는다. 그러면 JSON.parse 가 `Bad control character in string literal` 로 죽고,
 * 토큰은 정상 생성됐는데도 그 그룹이 통째로 0자로 집계된다. 6그룹 중 2그룹이 이렇게 날아가
 * 합계가 목표의 66%에 머물렀다. 파싱은 값을 버리는 자리라, 되살릴 수 있으면 되살리는 편이 낫다.
 */
export function escapeRawControlCharsInJsonStrings(value) {
  let output = "";
  let inString = false;
  let escaped = false;
  for (const char of String(value ?? "")) {
    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }
    if (char === "\\" && inString) {
      output += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      output += char;
      continue;
    }
    if (inString && char.charCodeAt(0) < 32) {
      if (char === "\n") output += "\\n";
      else if (char === "\r") output += "\\r";
      else if (char === "\t") output += "\\t";
      else output += `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
      continue;
    }
    output += char;
  }
  return output;
}

const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const safeKey = key => !["__proto__", "constructor", "prototype"].includes(key);
const wrappers = new Set(["result", "output", "data", "response"]);
const schemaType = schema => String(schema?.type || "").toLowerCase();

// For existing, code-owned output examples (not prompts or customer data).
// Empty arrays in these report examples are text lists; object lists supply an item.
export function jsonSchemaFromExample(example) {
  if (Array.isArray(example)) return { type: "ARRAY", items: jsonSchemaFromExample(example[0] ?? "") };
  if (object(example)) {
    const properties = Object.fromEntries(Object.entries(example).filter(([key]) => safeKey(key)).map(([key, value]) => [key, jsonSchemaFromExample(value)]));
    return { type: "OBJECT", properties, required: Object.keys(properties) };
  }
  return { type: typeof example === "number" ? "NUMBER" : typeof example === "boolean" ? "BOOLEAN" : "STRING" };
}
function sameType(value, schema) {
  if (value === null) return schema?.nullable === true;
  switch (schemaType(schema)) {
    case "object": return object(value);
    case "array": return Array.isArray(value);
    case "string": return typeof value === "string";
    case "boolean": return typeof value === "boolean";
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "integer": return Number.isInteger(value);
    default: return false;
  }
}

/**
 * Correct locations only against a caller-owned schema. No field-name guessing,
 * coercion, invented values, overwritten canonical fields or cross-item moves.
 * A key with several possible destinations/sources stays for normal validation.
 */
export function repairJsonFieldLocations(value, schema) {
  if (!schema || !value || typeof value !== "object") return value;
  let copy;
  try { copy = JSON.parse(JSON.stringify(value)); } catch { return value; }
  let changed = false, visited = 0;
  const budget = depth => { if (depth > 32 || ++visited > 20000) throw new Error("JSON repair limit"); };
  const countTargets = (spec, key, depth = 0) => {
    budget(depth);
    // Arrays are independent scopes. Do not borrow from another chapter or item.
    if (schemaType(spec) !== "object") return 0;
    return Object.entries(spec.properties || {}).reduce((sum, [name, child]) => sum + Number(name === key) + countTargets(child, key, depth + 1), 0);
  };
  function repair(node, spec, depth = 0) {
    budget(depth);
    if (spec?.anyOf || spec?.oneOf || spec?.$ref) return;
    if (Array.isArray(node) && schemaType(spec) === "array") {
      node.forEach(item => repair(item, spec.items, depth + 1));
      return;
    }
    if (!object(node) || schemaType(spec) !== "object" || !object(spec.properties)) return;
    for (const [key, target] of Object.entries(spec.properties)) {
      if (!safeKey(key) || Object.hasOwn(node, key) || countTargets(spec, key) !== 1) continue;
      const required = target?.required || [];
      if (schemaType(target) === "object" && required.length && required.every(name => safeKey(name)
        && !Object.hasOwn(spec.properties, name) && countTargets(spec, name) === 1
        && Object.hasOwn(node, name) && sameType(node[name], target.properties?.[name]))) {
        node[key] = {};
        for (const name of Object.keys(target.properties || {})) {
          if (safeKey(name) && !Object.hasOwn(spec.properties, name) && countTargets(spec, name) === 1 && Object.hasOwn(node, name) && sameType(node[name], target.properties[name])) {
            node[key][name] = node[name]; delete node[name];
          }
        }
        changed = true;
        continue;
      }
      const candidates = [];
      function search(parent, parentSchema, level) {
        budget(level);
        if (!object(parent)) return;
        if (Object.hasOwn(parent, key) && !Object.hasOwn(parentSchema?.properties || {}, key)) candidates.push(parent);
        for (const [name, child] of Object.entries(parent)) {
          const childSchema = parentSchema?.properties?.[name];
          if (safeKey(name) && object(child) && (schemaType(childSchema) === "object" || (!childSchema && wrappers.has(name)))) search(child, childSchema, level + 1);
        }
      }
      for (const [name, child] of Object.entries(node)) {
        const childSchema = spec.properties[name];
        if (safeKey(name) && object(child) && (schemaType(childSchema) === "object" || (!childSchema && wrappers.has(name)))) search(child, childSchema, depth + 1);
      }
      if (candidates.length !== 1 || !sameType(candidates[0][key], target)) continue;
      node[key] = candidates[0][key];
      delete candidates[0][key];
      changed = true;
    }
    for (const [key, childSchema] of Object.entries(spec.properties)) {
      if (safeKey(key) && Object.hasOwn(node, key)) repair(node[key], childSchema, depth + 1);
    }
    if (changed) for (const key of Object.keys(node)) {
      if (wrappers.has(key) && !Object.hasOwn(spec.properties, key) && object(node[key]) && !Object.keys(node[key]).length) delete node[key];
    }
  }
  try { repair(copy, schema); } catch { return value; }
  return changed ? copy : value;
}

// Framing/control-character repair applies to every JSON caller; field relocation
// requires its explicit schema. Truncation and semantic checks remain with callers.
export function repairStructuredJsonText(text, schema) {
  if (typeof text !== "string" || text.length > 2000000) return text;
  const source = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed;
  try { parsed = JSON.parse(escapeRawControlCharsInJsonStrings(source)); } catch { return text; }
  if (!parsed || typeof parsed !== "object") return text;
  const repaired = repairJsonFieldLocations(parsed, schema);
  return source === text && repaired === parsed && escapeRawControlCharsInJsonStrings(source) === source ? text : JSON.stringify(repaired);
}
