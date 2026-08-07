/**
 * 반쪽 오버라이드 가드 — 토큰 밖에서 칠한 어두운 배경 + 스킴에 따라 뒤집히는 텍스트 토큰
 *
 * 배경:
 *   연애 비책 AI 히어로가 토큰을 거치지 않고 불투명 플럼(rgba(38,16,28,.98))을 직접 칠하면서,
 *   그 위 글자는 --ls-text 를 그대로 썼다. 이 토큰은 --ls-surface(라이트=#ffffff) 기준으로
 *   대비가 맞춰져 있어서, 라이트 모드에서 배경만 어두워지고 잉크는 라이트용(#3c1830)으로 남았다.
 *   실측 1.11:1 — 사실상 안 보인다.
 *
 *   CSS 커스텀 프로퍼티는 `@media (prefers-color-scheme: dark)` 한 블록이 surface/text/accent 를
 *   원자적으로 바꾸므로 반쪽 오버라이드를 구조적으로 막아준다. 단 그 보장은 **배경도 토큰에서
 *   나올 때만** 성립한다. 배경을 마크업에서 직접 칠하는 순간 보장이 깨지고, 그걸 눈으로
 *   잡아내지 못한다는 게 이 사고의 본질이다.
 *
 *   impeccable 훅은 이걸 못 잡는다 — low-contrast 룰은 브라우저/스크린샷 엔진에만 있고,
 *   파일 저장 시 도는 정적 엔진에는 대비 룰이 아예 없다. 설정으로 켤 수 있는 옵션도 없다.
 *   그래서 이 가드가 그 자리를 대신한다.
 *
 * 무엇을 보는가:
 *   컴포넌트 함수 하나를 단위로,
 *     (a) 마크업에서 직접 칠한 어두운 불투명 배경이 있고
 *     (b) 그 안의 텍스트가 CSS 모듈 토큰(text-[var(--x)])으로 색을 받는데
 *     (c) 그 토큰의 라이트/다크 실효값 중 하나라도 배경 위에서 대비가 무너지면
 *   실패시킨다.
 *
 *   컴포넌트가 무조건부 토큰 스코프 클래스(예: .onDark)를 달고 있으면 그쪽 값으로 해석한다.
 *   즉 "배경을 직접 칠했으면 잉크도 세트로 같이 바꿔라"가 통과 조건이다.
 *
 * 실행: npm run verify:hero-contrast
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname, join, relative } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

/* 3:1 미만은 큰 텍스트 기준으로도 실패라 글자 크기를 몰라도 확실한 결함이다.
 * 4.5 를 문턱으로 쓰면 장식용 대형 문구에서 오탐이 나므로 차단은 3.0 에서 한다. */
const FAIL_RATIO = 3.0;
const WARN_RATIO = 4.5;

/* 배경이 "어둡고 충분히 불투명"하다고 볼 기준. 옅은 베일은 밑 배경이 그대로 비쳐
 * 마크업만으로 실효 배경을 알 수 없으므로 판단하지 않는다. */
const MIN_VEIL_ALPHA = 0.5;
const MAX_VEIL_LUMINANCE = 0.18;

const SCAN_DIRS = ["app", "src"];

/* ── 색 계산 ──────────────────────────────────────────────────────────── */

function parseColor(raw) {
  const value = String(raw).trim();
  const hex = value.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hex) {
    const s = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    return { rgb: [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)), alpha: 1 };
  }
  const fn = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/);
  if (fn) return { rgb: [+fn[1], +fn[2], +fn[3]], alpha: fn[4] === undefined ? 1 : +fn[4] };
  return null; // color-mix()/var() 체인 등은 정적으로 못 푼다 — 판단 보류
}

const channel = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const composite = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ── CSS 모듈 파싱 ────────────────────────────────────────────────────── */

/**
 * 클래스 블록을 훑어 토큰을 모은다. prefers-color-scheme: dark 안쪽인지 함께 기록한다.
 * 반환: Map<className, { light: {token: value}, dark: {token: value} }>
 */
function parseCssModule(rawSource) {
  const classes = new Map();
  const darkRanges = [];

  /* 주석을 같은 길이의 공백으로 지운다(인덱스 보존).
   * 이 파일들의 주석은 규칙 자체를 설명하느라 `@media (prefers-color-scheme: dark)` 같은
   * 문구를 그대로 담고 있어서, 안 지우면 주석에서 시작한 가짜 미디어 범위가 뒤따르는
   * 라이트 팔레트 전체를 삼킨다(실제로 이 가드가 처음에 버그를 못 잡은 원인이다). */
  const source = rawSource.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));

  // 다크 미디어 블록의 문자 범위를 먼저 확보한다(중괄호 균형으로 실제 끝을 찾는다).
  const mediaRe = /@media[^{]*prefers-color-scheme:\s*dark[^{]*\{/g;
  for (let m; (m = mediaRe.exec(source)); ) {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < source.length && depth > 0) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") depth--;
      i++;
    }
    darkRanges.push([m.index, i]);
  }
  const inDark = (pos) => darkRanges.some(([s, e]) => pos >= s && pos < e);

  const ruleRe = /(^|[}\s])((?:\.[A-Za-z_][\w-]*\s*,?\s*)+)\{([^{}]*)\}/g;
  for (let m; (m = ruleRe.exec(source)); ) {
    const selectors = m[2].split(",").map((s) => s.trim()).filter((s) => /^\.[A-Za-z_][\w-]*$/.test(s));
    if (!selectors.length) continue;
    const tokens = {};
    for (const t of m[3].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) tokens[t[1]] = t[2].trim();
    if (!Object.keys(tokens).length) continue;

    const bucket = inDark(m.index) ? "dark" : "light";
    for (const sel of selectors) {
      const name = sel.slice(1);
      if (!classes.has(name)) classes.set(name, { light: {}, dark: {} });
      Object.assign(classes.get(name)[bucket], tokens);
    }
  }
  return classes;
}

/* ── TSX 파싱 ─────────────────────────────────────────────────────────── */

function splitComponents(source) {
  const marks = [...source.matchAll(/^(?:export\s+)?(?:default\s+)?function\s+([A-Z][\w]*)\s*\(/gm)];
  return marks.map((m, i) => ({
    name: m[1],
    body: source.slice(m.index, i + 1 < marks.length ? marks[i + 1].index : source.length),
    line: source.slice(0, m.index).split("\n").length,
  }));
}

/**
 * 컴포넌트를 통째로 덮는 어두운 풀블리드 오버레이(=베일)를 찾는다.
 *
 * `absolute/fixed inset-0` 로 좁히는 게 핵심이다. 이걸 안 걸면 배지·칩의 강조 배경
 * (`bg-[var(--ls-accent)]` = #b31955 처럼 어두운 브랜드색)까지 베일로 잡혀,
 * 그 요소와 아무 상관 없는 컴포넌트 내 다른 텍스트와 짝지어져 오탐이 쏟아진다.
 * 베일은 "그 안의 모든 글자가 실제로 그 위에 놓이는" 배경일 때만 성립한다.
 */
function findHardcodedVeils(body, resolveToken) {
  const veils = [];
  for (const literal of body.matchAll(/`[^`]*`|"[^"]*"|'[^']*'/g)) {
    const text = literal[0];
    if (!/\binset-0\b/.test(text) || !/\b(?:absolute|fixed)\b/.test(text)) continue;

    /* 배경을 토큰으로 옮겨도(권장) 계속 검사되도록 var() 참조를 실제 값으로 펼친다.
     * 색을 토큰으로 빼는 건 이 사고의 올바른 수습이므로, 그렇게 고친 코드가 오히려
     * 가드의 사각지대가 되면 안 된다. */
    let chunk = text;
    for (const ref of text.matchAll(/var\((--[a-z0-9-]+)\)/gi)) {
      const resolved = resolveToken(ref[1]);
      if (resolved) chunk += ` ${resolved}`;
    }
    for (const c of chunk.matchAll(/rgba?\([^)]*\)|#[0-9a-fA-F]{6}\b/g)) {
      const color = parseColor(c[0]);
      if (!color) continue;
      if (color.alpha < MIN_VEIL_ALPHA) continue;
      if (luminance(color.rgb) > MAX_VEIL_LUMINANCE) continue;
      veils.push({ ...color, raw: c[0], line: body.slice(0, literal.index).split("\n").length });
    }
  }
  // 가장 불투명한 것 하나면 충분하다(어두운 잉크에게 가장 불리한 지점).
  return veils.sort((a, b) => b.alpha - a.alpha).slice(0, 1);
}

/* 자기 표면을 직접 칠하는 요소를 알아보는 패턴. bg-cover/bg-right 같은 크기·위치 유틸은
 * 색을 정하지 않으므로 제외한다. */
const OWN_SURFACE =
  /\bbg-\[|\bbackground(?:-color|-image)?\s*:|\bbg-(?:white|black|transparent|current|inherit)\b|\bbg-[a-z]+-\d{2,3}\b/;

/**
 * 베일 위에 직접 놓이는 텍스트 토큰만 고른다.
 *
 * className 문자열 리터럴 단위로 보는 이유: 같은 리터럴에 배경 선언이 함께 있으면 그 요소는
 * 자기 표면을 칠하므로(예: 금색 CTA, 칩) 바깥 베일이 아니라 자기 배경 위에 놓인다.
 * 이걸 구분하지 않으면 멀쩡한 버튼 잉크가 베일 위에 있는 것으로 오탐된다.
 */
function findTextTokens(body) {
  const tokens = new Set();
  for (const literal of body.matchAll(/`[^`]*`|"[^"]*"|'[^']*'/g)) {
    if (OWN_SURFACE.test(literal[0])) continue;
    for (const m of literal[0].matchAll(/(?:text|fill)-\[var\((--[a-z0-9-]+)\)\]/gi)) tokens.add(m[1]);
  }
  return [...tokens];
}

/** 이 컴포넌트가 참조하는 CSS 모듈 클래스들(styles.x / theme.x). */
const findScopeClasses = (body) =>
  [...new Set([...body.matchAll(/\b(?:styles|theme)\.([A-Za-z_][\w]*)/g)].map((m) => m[1]))];

/* ── 파일 수집 ────────────────────────────────────────────────────────── */

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/* ── 검사 ─────────────────────────────────────────────────────────────── */

console.log("=== 반쪽 오버라이드(어두운 배경 + 라이트용 잉크) 검증 ===\n");

const violations = [];
const warnings = [];
let scanned = 0;
let componentsChecked = 0;

for (const dir of SCAN_DIRS) {
  for (const file of walk(resolve(root, dir))) {
    const source = readFileSync(file, "utf8");
    if (!/text-\[var\(--/.test(source)) continue;

    // 이 파일이 import 하는 CSS 모듈들의 토큰 테이블을 합친다.
    const classes = new Map();
    for (const imp of source.matchAll(/import\s+(\w+)\s+from\s+["']([^"']+\.module\.css)["']/g)) {
      const cssPath = resolve(dirname(file), imp[2]);
      let css;
      try { css = readFileSync(cssPath, "utf8"); } catch { continue; }
      for (const [name, buckets] of parseCssModule(css)) {
        if (!classes.has(name)) classes.set(name, { light: {}, dark: {} });
        Object.assign(classes.get(name).light, buckets.light);
        Object.assign(classes.get(name).dark, buckets.dark);
      }
    }
    if (!classes.size) continue;
    scanned++;

    for (const component of splitComponents(source)) {
      const scopes = findScopeClasses(component.body);
      // 무조건부(미디어 밖) 스코프 선언이 미디어 기반 기본값을 이긴다.
      const scoped = (token) => {
        for (const cls of scopes) {
          const v = classes.get(cls)?.light?.[token];
          if (v) return v;
        }
        return null;
      };
      /* 기본 팔레트는 "스킴에 반응하는" 클래스다 — 같은 토큰을 라이트/다크 양쪽에 선언한다.
       * .onDark 처럼 한쪽에만 있는 무조건부 스코프는 이 기준으로 걸러진다. 선언 순서에
       * 기대면 CSS 블록을 옮기는 순간 조용히 틀린 값을 읽는다. */
      const base = (token, bucket) => {
        let fallback = null;
        for (const [, buckets] of classes) {
          if (!buckets[bucket][token]) continue;
          if (buckets.light[token] && buckets.dark[token]) return buckets[bucket][token];
          if (fallback === null) fallback = buckets[bucket][token];
        }
        return fallback;
      };
      const resolveToken = (token) => scoped(token) || base(token, "light") || base(token, "dark");

      const veils = findHardcodedVeils(component.body, resolveToken);
      if (!veils.length) continue;
      const tokens = findTextTokens(component.body);
      if (!tokens.length) continue;
      componentsChecked++;

      const surfaceRaw = scoped("--ls-surface") || base("--ls-surface", "light");
      const surface = parseColor(surfaceRaw || "#ffffff") || { rgb: [255, 255, 255] };

      for (const veil of veils) {
        const bg = composite(veil.rgb, veil.alpha, surface.rgb);
        for (const token of tokens) {
          const override = scoped(token);
          const schemes = override
            ? [["scoped", override]]
            : [["light", base(token, "light")], ["dark", base(token, "dark")]];

          for (const [scheme, raw] of schemes) {
            if (!raw) continue;
            const ink = parseColor(raw);
            if (!ink || ink.alpha < 1) continue; // 반투명 잉크는 실효색을 정적으로 못 정한다
            const ratio = contrast(ink.rgb, bg);
            if (ratio >= WARN_RATIO) continue;
            const record = {
              file: relative(root, file).replace(/\\/g, "/"),
              component: component.name,
              line: component.line + veil.line - 1,
              token,
              scheme,
              ink: raw,
              veil: veil.raw,
              ratio,
            };
            (ratio < FAIL_RATIO ? violations : warnings).push(record);
          }
        }
      }
    }
  }
}

console.log(`[1] CSS 모듈 토큰을 쓰는 파일 ${scanned}개 / 배경을 직접 칠하는 컴포넌트 ${componentsChecked}개 검사`);

const format = (v) =>
  `  ${v.file}:${v.line}  <${v.component}>\n`
  + `    ${v.token} = ${v.ink} (${v.scheme}) on ${v.veil}  →  ${v.ratio.toFixed(2)}:1`;

if (warnings.length) {
  console.log(`\n[2] 경고 ${warnings.length}건 — 본문 기준(4.5:1) 미달이나 큰 텍스트면 허용될 수 있음:`);
  for (const w of warnings) console.log(format(w));
} else {
  console.log("[2] 경고 없음");
}

if (violations.length) {
  console.error(`\n[3] 실패 ${violations.length}건 — 어떤 글자 크기에서도 읽을 수 없습니다(3:1 미만):\n`);
  for (const v of violations) console.error(format(v));
  console.error(
    "\n고치는 법: 글자색만 유틸로 덮지 마세요. 그러면 다음에 한 곳 빠뜨렸을 때 같은 버그가 재발합니다.",
  );
  console.error(
    "  CSS 모듈에 무조건부 토큰 스코프(예: .onDark)를 만들어 surface/text/accent 를 세트로 교체하고,",
  );
  console.error("  배경을 직접 칠하는 래퍼에 그 클래스를 다세요.");
  process.exit(1);
}

console.log("\n[3] 실패 없음 — 직접 칠한 어두운 배경 위 텍스트가 모두 읽힙니다.\n");
console.log("반쪽 오버라이드 검증 통과.\n");
