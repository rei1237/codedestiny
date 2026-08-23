/**
 * i18n 소스 스캔 공용 모듈.
 *
 * i18n-extract-ko.mjs(원문 수집)와 i18n-key-usage.mjs(사용처 진단)가 같은 규칙으로
 * 소스를 읽어야 두 리포트가 서로 모순되지 않는다. 파일 순회·AST 환원·네임스페이스
 * 유도는 여기 한 곳에만 둔다.
 */
import { readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import * as acorn from "acorn";

import { BUILD_ARTIFACT_DIRS } from "./source-scan-ignore.mjs";

/** 모듈 KO 테이블/상대 키가 어느 사전 네임스페이스로 들어가는지 (자동 유도 실패분만). */
export const MANUAL_NAMESPACE = {
  "js/tarot-self-esteem-experience.js": "home.tarotSelfEsteem",
  "worker/lib/destiny-flower-engine.js": "fortune.destinyFlower",
};

/** 키를 접두어 없이 그대로 넘기는 래퍼들. */
export const PASSTHROUGH_WRAPPERS = [
  "cdTranslate", "__cdText", "__cdHeroText", "_cdPaymentI18n",
  "_fsajTr", "_pvwTr", "themeCopy",
];

/**
 * 자체 접두어를 붙여 cdTranslate 로 넘기는 래퍼들 (래퍼명 → 접두어).
 * 이걸 모르면 `_fsajDetailCopy('portraitAlt', …)` 이 네임스페이스 없는
 * 단일 세그먼트 키 `portraitAlt` 로 잘못 수집된다.
 */
export const PREFIXED_WRAPPERS = {
  _fsajDetailCopy: "famousSaju.detail",
};

/** 모듈별 KO 테이블 변수명 패턴. */
export const TABLE_NAME_RE = /(?:_TEXT_TRANSLATIONS|_TRANSLATIONS|_COPY_BY_LOCALE|_BY_LOCALE|_LOCALE_COPY)$/;

// 빌드 산출물(공용 목록) + 이 스캔만의 제외(reports·apps·.claude). 합집합이다.
// 🔴 .claude 제외: 이 저장소에서 여러 세션이 `.claude/worktrees/` 아래 병렬 워크트리(전체
// 체크아웃)를 동시에 쓴다. 이 이름이 빠져 있으면 로컬/에이전트 실행 시 소스 전체를 워크트리
// 개수만큼 중복 스캔해 이 파일을 쓰는 11개 스크립트(walkSourceFiles 소비자) 전부가 실제로는
// 없는 대량 회귀를 보고한다(2026-08-21 실측: verify-i18n-no-fallback 이 30배 부풀려짐).
const SKIP_DIR_NAMES = new Set([...BUILD_ARTIFACT_DIRS, "reports", "apps", ".claude"]);

export function* walkSourceFiles(rootDir, { extensions, includePublic = false } = {}) {
  const exts = new Set(extensions || [".js", ".mjs", ".ts", ".tsx", ".jsx"]);
  function* recurse(dir) {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIR_NAMES.has(name)) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        const rel = relative(rootDir, p).split("\\").join("/");
        // public/ 은 루트 소스의 파생 미러다. 중복 집계를 막기 위해 기본 제외한다.
        if (!includePublic && (rel === "public" || rel.startsWith("public/"))) continue;
        yield* recurse(p);
      } else if (exts.has(extname(p))) yield p;
    }
  }
  yield* recurse(rootDir);
}

export function flatten(node, prefix = "", out = {}) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => flatten(item, `${prefix}.${i}`, out));
    return out;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
    return out;
  }
  out[prefix] = node;
  return out;
}

export function parseJs(source) {
  for (const sourceType of ["module", "script"]) {
    try {
      return acorn.parse(source, { ecmaVersion: "latest", sourceType, allowReturnOutsideFunction: true });
    } catch {}
  }
  return null;
}

export function walkAst(node, visit) {
  if (!node || typeof node.type !== "string") return;
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === "type" || key === "start" || key === "end" || key === "loc") continue;
    const child = node[key];
    if (Array.isArray(child)) child.forEach((c) => c && typeof c.type === "string" && walkAst(c, visit));
    else if (child && typeof child.type === "string") walkAst(child, visit);
  }
}

/** acorn 노드를 순수 JS 값으로 환원. 정적으로 못 푸는 노드는 undefined. */
export function literalValue(node) {
  if (!node) return undefined;
  if (node.type === "Literal") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis[0].value.cooked;
  if (node.type === "ArrayExpression") {
    const items = node.elements.map(literalValue);
    return items.some((v) => v === undefined) ? undefined : items;
  }
  if (node.type === "ObjectExpression") {
    const out = {};
    for (const prop of node.properties) {
      if (prop.type !== "Property" || prop.computed) continue;
      const key = prop.key.type === "Identifier" ? prop.key.name : prop.key.value;
      const value = literalValue(prop.value);
      if (value !== undefined) out[String(key)] = value;
    }
    return out;
  }
  if (node.type === "BinaryExpression" && node.operator === "+") {
    const left = literalValue(node.left);
    const right = literalValue(node.right);
    if (typeof left === "string" && typeof right === "string") return left + right;
  }
  return undefined;
}

/**
 * 파일이 쓰는 사전 네임스페이스 접두어.
 * `cdTranslate("<prefix>." + key)` 패턴에서 유도하고, 실패하면 수기 맵을 본다.
 * 이 접두어가 있어야 `'flowers.' + i` 같은 **상대 키**를 절대 키로 복원할 수 있다.
 */
export function deriveNamespace(source, relPath) {
  const normalized = String(relPath).split("\\").join("/");
  if (MANUAL_NAMESPACE[normalized]) return MANUAL_NAMESPACE[normalized];
  const m = source.match(/cdTranslate\(\s*["']([A-Za-z][A-Za-z0-9_.]*?)\.?["']\s*\+/);
  return m ? m[1].replace(/\.$/, "") : null;
}

export function decodeEscapes(text) {
  return String(text)
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\n/g, "\n")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"');
}
