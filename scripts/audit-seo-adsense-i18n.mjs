// Offline audit of the files actually served by the static build. Never executes page scripts.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { parse } from "parse5";

const root = process.cwd();
const directory = resolve(root, process.argv.find(a => a.startsWith("--dir="))?.slice(6) || "dist");
const origin = "https://code-destiny.com";
const normalize = path => path === "/" ? "/" : `${path.replace(/\/+$/, "")}/`;
const xml = readFileSync(resolve(directory, "sitemap.xml"), "utf8");
const indexed = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => normalize(new URL(m[1]).pathname)));
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (["_next", "node_modules", "assets", "fuctionassets", "images"].includes(entry.name)) return [];
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? files(path) : entry.name.endsWith(".html") ? [path] : [];
  });
}
const attr = (node, key) => node.attrs?.find(a => a.name === key)?.value || "";
function visit(node, fn) { fn(node); for (const child of node.childNodes || []) visit(child, fn); }
function text(node, skipChrome = false) {
  if (["script", "style", "svg", "template", "noscript"].includes(node.tagName)) return "";
  if (skipChrome && ["nav", "footer"].includes(node.tagName)) return "";
  if (node.attrs?.some(a => (a.name === "hidden" && !/^S:/.test(attr(node, "id"))) || a.name === "data-cd-no-trans") || attr(node, "aria-hidden") === "true" || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attr(node, "style"))) return "";
  return node.nodeName === "#text" ? node.value : (node.childNodes || []).map(child => text(child, skipChrome)).join(" ");
}
const compact = value => value.replace(/\s+/g, " ").trim();
const rows = [];
for (const file of files(directory)) {
  const rel = relative(directory, file).replace(/\\/g, "/");
  let route = rel === "index.html" ? "/" : rel.endsWith("/index.html") ? `/${rel.slice(0, -10)}` : `/${rel}`;
  if (route.endsWith(".html") && indexed.has(normalize(route.slice(0, -5)))) route = normalize(route.slice(0, -5));
  const tree = parse(readFileSync(file, "utf8"));
  const row = { route, indexed: indexed.has(normalize(route)), title: "", description: "", h1: [], canonical: "", hreflang: {}, robots: "", schemas: [], links: [], lang: "", mainChars: 0, koreanChars: 0, issues: [] };
  let main;
  let body;
  visit(tree, node => {
    if (node.tagName === "html") row.lang = attr(node, "lang");
    if (node.tagName === "body") body = node;
    if (node.tagName === "main" && !main) main = node;
    if (node.tagName === "title") row.title = compact(text(node));
    if (node.tagName === "h1") row.h1.push(compact(text(node)));
    if (node.tagName === "meta" && attr(node, "name") === "description") row.description = attr(node, "content");
    if (node.tagName === "meta" && ["robots", "googlebot"].includes(attr(node, "name"))) row.robots += ` ${attr(node, "content")}`;
    if (node.tagName === "link" && attr(node, "rel") === "canonical") row.canonical = attr(node, "href");
    if (node.tagName === "link" && attr(node, "hreflang")) row.hreflang[attr(node, "hreflang")] = attr(node, "href");
    if (node.tagName === "a") row.links.push(attr(node, "href"));
    if (node.tagName === "script" && attr(node, "type") === "application/ld+json") {
      try { const data = JSON.parse((node.childNodes || []).map(n => n.value || "").join("")); row.schemas.push(data); }
      catch { row.issues.push("구조화 데이터 JSON 오류"); }
    }
  });
  const content = compact(text(body || tree, true));
  row.mainChars = content.length;
  row.koreanChars = (content.match(/[가-힣]/g) || []).length;
  if (row.indexed) {
    if (!row.title || !row.description) row.issues.push("title/description 누락");
    if (row.h1.length !== 1) row.issues.push(`H1 ${row.h1.length}개`);
    if (!row.canonical || normalize(new URL(row.canonical, origin).pathname) !== normalize(route)) row.issues.push("self canonical 불일치");
    if (/noindex/.test(row.robots)) row.issues.push("사이트맵/noindex 충돌");
    if (content.length < 800 && !/\/(about|contact|disclaimer|faq|privacy|privacy-policy|terms|terms-of-service|refund-policy)\/$/.test(route)) row.issues.push("본문 800자 미만: 편집 검토");
    if (/^\/(ja|en|zh|zh-tw)\//.test(route) && row.koreanChars) row.issues.push(`본문 한국어 ${row.koreanChars}자: 문맥 확인`);
  }
  rows.push(row);
}
const byPath = new Map(rows.map(row => [normalize(row.route), row]));
for (const row of rows.filter(r => r.indexed)) {
  for (const [lang, href] of Object.entries(row.hreflang)) {
    const target = byPath.get(normalize(new URL(href, origin).pathname));
    if (!target || !target.indexed) row.issues.push(`hreflang ${lang}: 색인 정본 대상 없음`);
    else if (!Object.values(target.hreflang).some(url => normalize(new URL(url, origin).pathname) === normalize(row.route))) row.issues.push(`hreflang ${lang}: 역참조 없음`);
  }
}
for (const field of ["title", "description"]) {
  const groups = new Map();
  for (const row of rows.filter(r => r.indexed)) { const list = groups.get(row[field]) || []; list.push(row); groups.set(row[field], list); }
  for (const [value, list] of groups) if (value && list.length > 1) list.forEach(row => row.issues.push(`${field} 중복 ${list.length}개`));
}
const missing = [...indexed].filter(path => !byPath.has(path));
const cell = value => String(value).replace(/\|/g, "／").replace(/[\r\n]/g, " ");
const sourceRoutes = [];
function sourceWalk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) sourceWalk(path);
    else if (/^page\.(js|jsx|ts|tsx)$/.test(entry.name)) sourceRoutes.push(relative(resolve(root, "app"), path).replace(/\\/g, "/").replace(/\/?page\.[^.]+$/, "") || "/");
  }
}
sourceWalk(resolve(root, "app"));
const report = { generatedAt: new Date().toISOString(), directory, limitation: "초기 HTML 정적 분석. CSS 가시성·클라이언트 상태·HTTP 헤더는 별도 검사. 한국어 법적 식별자는 data-cd-no-trans 제외.", sourceRoutes, missing, rows };
const technicalIssues = rows.flatMap(row => row.issues.filter(issue => !/^본문 /.test(issue)).map(issue => ({ route: row.route, issue })));
report.technicalIssues = technicalIssues;
mkdirSync("seo-qa", { recursive: true });
writeFileSync("seo-qa/audit.json", JSON.stringify(report, null, 2) + "\n");
const summary = [
  "# SEO · AdSense · i18n 감사", "", `검사 산출물: ${directory}`, `생성: ${report.generatedAt}`, "",
  "아래는 초기 HTML 정적 검사이며 특정 URL이 AdSense 거절 원인이라는 판정이 아니다. 계정 실측·수동 검수·운영 우선순위는 [운영 기록](docs/seo/GROWTH_OPERATIONS.md)과 [상태 파일](docs/seo/SEO_STATE.json)을 별도로 확인한다.",
  "본문 수는 script/style/nav/footer/hidden을 제외한 body의 텍스트다. main 밖의 SSR 설명도 포함한다. 글자 수는 Google 승인 기준이 아니라 이번 작업의 편집 점검 기준이다. CSS와 hydration 후 상태는 별도 검증한다.",
  "", `페이지 템플릿 ${sourceRoutes.length}개, HTML ${rows.length}개, 사이트맵 ${indexed.size}개, 누락 산출물 ${missing.length}개.`,
  `메타·H1·canonical·hreflang·사이트맵/noindex 기술 오류 ${technicalIssues.length}건. 한국어 탐지는 언어 선택기의 한국어 표기와 등록 사업자명도 포함하므로 실제 혼입과 구분해 검토한다.`,
  "", "## 주요 관측과 조치", "",
  "- 아래 행별 메타·본문·언어 탐지를 검토한다. 글자 수나 한국어 포함만으로 삭제·noindex를 결정하지 않는다.",
  "- 초기 HTML 통과는 hydration 이후 번역, 광고, 결제·상담 상태 또는 실제 HTTP 상태의 검증을 대신하지 않는다.",
  "- 비교 기간과 완료 이력은 상태 파일에서 관리한다. 이 생성기는 과거 작업의 완료 문구나 오래된 계정 수치를 새 검사 결과처럼 복제하지 않는다.",
  "", "## 라우트별 초기 HTML", "",
  "| route | 색인/사이트맵 | title | description | H1 | 본문 문자 | canonical | hreflang | robots meta | 번역 | AdSense 위험/개선 |",
  "|---|---|---|---|---|---:|---|---|---|---|---|",
  ...rows.sort((a,b) => a.route.localeCompare(b.route)).map(r => `| ${[r.route, r.indexed ? "대상/포함" : "제외/미포함", r.title, r.description, r.h1.length, r.mainChars, r.canonical || "없음", Object.keys(r.hreflang).join(",") || "없음", r.robots || "명시 없음", `${r.lang}; 한글 ${r.koreanChars}자`, r.issues.join("; ") || (r.indexed ? "기술 점검 이상 없음; 품질 수동 확인" : "별칭·도구·비공개 분류 확인")].map(cell).join(" | ")} |`),
  "", "## 소스 라우트 인벤토리", "동적 템플릿의 실제 발행 경로는 위 HTML 표에서 확인한다.", ...sourceRoutes.map(route => `- /${route === "/" ? "" : route}`),
  "", "## Search Console 후속 확인", "페이지 색인 보고서의 제외 사유, URL 검사의 Google 선택 canonical·최근 크롤링·렌더링 HTML, sitemap 가져오기 상태, 국가/검색어/언어별 노출을 배포 후 확인한다.",
  "", "## 근거", "- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics", "- https://developers.google.com/search/docs/specialty/international/localized-versions", "- https://support.google.com/adsense/answer/7299563", "",
];
writeFileSync("SEO_ADSENSE_AUDIT.md", summary.join("\n"));
const matrix = ["# 번역 상태 매트릭스", "", report.limitation, "정적 본문만 검사한다. 버튼/토스트/오류는 런타임 별도 검증이 없으면 미검증으로 표시한다.", "", "| route | ko | ja | en | zh | zh-tw | title/meta | 본문 | 버튼/토스트/오류 | 한국어 잔존 |", "|---|---|---|---|---|---|---|---|---|---|"];
for (const row of rows.filter(r => r.indexed)) {
  const lang = row.route.match(/^\/(ja|en|zh|zh-tw)\//)?.[1] || "ko";
  const status = l => l === lang ? "초기 HTML 존재" : "대응 페이지 별도 행/미확인";
  matrix.push(`| ${[row.route, status("ko"), status("ja"), status("en"), status("zh"), status("zh-tw"), row.title && row.description ? "존재; 문체 검수 별도" : "누락", `${row.mainChars}자`, "미검증", lang === "ko" ? "한국어 원문" : `${row.koreanChars}자(문맥 확인)`].map(cell).join(" | ")} |`);
}
if (existsSync("reports/i18n-hardcoded-audit.json")) {
  const scan = JSON.parse(readFileSync("reports/i18n-hardcoded-audit.json", "utf8"));
  matrix.push("", `## 하드코딩 후보: ${scan.totalFindings}건 / ${scan.scannedFiles}파일`, "한국어 전용 글·관리자·fixture·결제 보호 파일을 포함하므로 모든 건이 외국어 노출 오류는 아니다.", ...Object.entries(scan.byFile).sort((a,b) => b[1]-a[1]).map(([file,count]) => `- ${file}: ${count}`));
}
writeFileSync("I18N_TRANSLATION_MATRIX.md", matrix.join("\n") + "\n");
console.log(JSON.stringify({ html: rows.length, indexed: indexed.size, missing, technicalIssues: technicalIssues.length, routesWithFindings: rows.filter(r => r.issues.length).length }));
if (process.argv.includes("--strict") && (missing.length || technicalIssues.length)) process.exitCode = 1;
