/**
 * 정적 셸(index.html)의 상세 시트 마케팅 카피 정본을 읽는 공용 모듈.
 *
 * 왜 공용인가: `FEATURE_MARKETING_COPY` / `FEATURE_MARKETING_TEMPLATES` 는 index.html 안에
 * 그대로 박힌 자바스크립트 객체 리터럴이고, 이걸 읽어야 하는 곳이 셋이다 —
 *   · `verify:feature-marketing-schema`      (스키마·금지 필드)
 *   · `verify:feature-marketing-dictionary`  (11개 로케일 사전 정합)
 *   · `sync:marketing-copy`                  (React 소비자용 생성 JSON)
 * 셋이 각자 파서를 들고 있으면 셸 문법이 조금만 달라져도 한 곳만 빗나가고 나머지는 초록불이라
 * 늦게 발견된다. 파서·키 정규화·해소 규칙을 여기 한 곳에 둔다.
 *
 * 🔴 이 모듈은 셸의 런타임 의미론을 그대로 옮긴 것이다. 대응 관계:
 *   extractObjectLiteral   ← 없음(도구)
 *   safeKey                ← index.html `_pvwSafeKey`
 *   clonePreviewData       ← index.html `_clonePreviewData`
 *   resolveMarketingCopy   ← index.html `_resolveMarketingCopy`
 * 셸 쪽이 바뀌면 여기도 같이 바꾼다. `verify:feature-marketing-dictionary` 가 `_pvwSafeKey`
 * 원문과 이 파일의 safeKey 를 대조해 어긋남을 잡는다.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** 마케팅 카피 정본. 여기 말고 다른 곳에 카피를 쓰지 않는다. */
export const SHELL_HTML_PATH = resolve(ROOT, "index.html");

/** `sync:marketing-copy` 산출물. React 소비자(허브 모달 등)가 읽는 사본이다. */
export const GENERATED_COPY_PATH = resolve(ROOT, "lib/marketing/feature-marketing-copy.generated.json");

export function readShellHtml() {
  return readFileSync(SHELL_HTML_PATH, "utf8");
}

/**
 * `var NAME={…}` 을 중괄호 균형으로 잘라 실제 값으로 평가한다.
 * 이름 grep 이 아니라 본문을 세므로 문자열 안의 중괄호에 속지 않는다.
 */
export function extractObjectLiteral(html, name) {
  const anchor = `var ${name}={`;
  const start = html.indexOf(anchor);
  if (start < 0) throw new Error(`${name} 을 찾을 수 없습니다.`);
  const open = start + anchor.length - 1;
  let depth = 0;
  let quote = null;
  for (let i = open; i < html.length; i++) {
    const c = html[i];
    if (quote) {
      if (c === "\\") { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { quote = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return new Function(`return ${html.slice(open, i + 1)};`)();
    }
  }
  throw new Error(`${name} 의 끝을 찾을 수 없습니다.`);
}

/** index.html 의 `_pvwSafeKey` 와 같은 계약. 여기가 어긋나면 사전 조회가 통째로 빗나간다. */
export function safeKey(value) {
  return String(value || "")
    .replace(/^#/, "")
    .replace(/^\//, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "default";
}

/* ── 상속 해소 (셸 `_resolveMarketingCopy` 이식) ────────────────────── */

const CLONE_OBJECT_FIELDS = ["valueCompare", "reportScale"];

function clonePreviewData(data) {
  const out = {};
  for (const key of Object.keys(data || {})) {
    if (key === "inherit") continue;
    const value = data[key];
    if (Array.isArray(value)) { out[key] = value.slice(); continue; }
    if (value && typeof value === "object" && CLONE_OBJECT_FIELDS.includes(key)) {
      out[key] = { ...value };
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * `inherit` 별칭을 원본 위에 펼쳐 하나의 항목으로 만든다. 셸과 같은 깊이 상한(6)을 쓴다.
 * 반환값에는 `inherit` 키가 남지 않는다 — 소비자가 다시 해소할 필요가 없다는 뜻이다.
 */
export function resolveMarketingCopy(copy, key, depth = 0) {
  if (!key || depth > 6) return null;
  const data = copy[key];
  if (!data) return null;
  if (data.inherit) {
    const inherited = resolveMarketingCopy(copy, data.inherit, depth + 1) || {};
    return { ...inherited, ...clonePreviewData(data) };
  }
  return clonePreviewData(data);
}

/**
 * `inherit` 을 끝까지 따라간 **원본 키**. 사전 네임스페이스는 이 키로 정한다.
 *
 * 🔴 별칭 자신의 키로 ns 를 만들면 11개 로케일에 한국어가 샌다 — 2026-09-03 실측:
 * COPY 141키 중 en 사전에 자기 네임스페이스가 없는 40키가 **전부** 별칭이고, 그 40개의
 * 원본은 **전부** 네임스페이스를 갖고 있다(고아 0). `verify:feature-marketing-dictionary` 는
 * 별칭을 건너뛰므로("별칭은 원본에서 검사된다") 이 어긋남을 잡지 못한다.
 */
export function originMarketingKey(copy, key, depth = 0) {
  if (!key || depth > 6) return key || "";
  const data = copy[key];
  if (data && data.inherit) return originMarketingKey(copy, data.inherit, depth + 1);
  return key;
}

/* ── 생성 JSON ─────────────────────────────────────────────────────── */

/**
 * 셸 HTML → 생성 JSON 데이터. 소비자가 셸 파싱도 상속 해소도 하지 않도록 미리 끝내 둔다.
 *   items[셸 카피 키]   = { dictNs, copy }   — dictNs 는 `featureMarketing.<dictNs>` 조회용
 *   templates[카테고리] = { dictNs, copy }   — 카테고리 템플릿, ns 는 `template_<카테고리>`
 *   categoryKeyByKo     = { 한국어 표기: 키 } — `featureMarketingCategory.<키>` 조회용
 */
export function buildFeatureMarketingCopy(html) {
  const rawCopy = extractObjectLiteral(html, "FEATURE_MARKETING_COPY");
  const rawTemplates = extractObjectLiteral(html, "FEATURE_MARKETING_TEMPLATES");
  // 카테고리 칩의 한국어 표기 → 사전 키. 셸 `_localizeMarketingCopy` 가 쓰는 표와 같은 것을
  // 그대로 옮긴다 — React 쪽에 손으로 베끼면 표가 갈려 칩만 한국어로 남는다(그 상태였다).
  const categoryKeyByKo = extractObjectLiteral(html, "_MARKETING_CATEGORY_KEY_BY_KO");

  const items = {};
  for (const key of Object.keys(rawCopy)) {
    const resolved = resolveMarketingCopy(rawCopy, key);
    if (!resolved) continue;
    items[key] = { dictNs: safeKey(originMarketingKey(rawCopy, key)), copy: resolved };
  }

  const templates = {};
  for (const [id, entry] of Object.entries(rawTemplates)) {
    templates[id] = { dictNs: `template_${id}`, copy: clonePreviewData(entry) };
  }

  return { categoryKeyByKo, templates, items };
}

/** 객체 키를 재귀적으로 정렬한다 — 셸에서 항목 순서만 바뀌어도 생성물이 흔들리지 않게. */
function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortDeep(value[key]);
    return out;
  }
  return value;
}

/** 결정적 직렬화. 같은 셸이면 OS·실행 순서와 무관하게 같은 바이트가 나와야 한다. */
export function serializeFeatureMarketingCopy(data) {
  return `${JSON.stringify(sortDeep(data), null, 2)}\n`;
}
