#!/usr/bin/env node
/**
 * 인사이트 허브 저자 글 변환기 (마크다운 → contentHtml).
 *
 * 운영자가 톤 레퍼런스대로 쓴 .md 글을 허브 article 객체의 contentHtml 문자열로 바꾼다.
 * 변환 규칙(docs/insight-hub-authoring.md와 동일):
 *   - 최상단 `## 제목` → title 로만 추출(본문 미포함)
 *   - `### 소제목` → <h2>
 *   - 마크다운 표 → <table>
 *   - `**강조**` → <strong>, `[텍스트](url)` → <a>
 *   - `- ` 목록 → <ul><li>
 *   - 문단 → <p> (블록 내 줄바꿈은 공백으로 흐름 처리)
 *   - 제외: `[이미지 …]` 자리표시, 말미 `→ [Code Destiny…]`(또는 `🌙 →`) CTA 줄
 *
 * ⚠️ 한계(수작업 필요): 훅/마무리의 시적 줄바꿈(<br>)과 이모지 불릿(🌙 …)은 자동 판별하지
 * 않는다. 출력물을 붙인 뒤 원하는 곳에 <br>·<ul><li>를 손으로 다듬을 것.
 *
 * 사용법: node scripts/insight-md-to-html.mjs <path-to.md> [--slug my-slug] [--category 사주]
 */
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const getOpt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : "";
};
if (!file) {
  console.error("사용법: node scripts/insight-md-to-html.mjs <path-to.md> [--slug ...] [--category ...]");
  process.exit(1);
}

const raw = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const lines = raw.split("\n");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>');

const isImagePlaceholder = (l) => /\[이미지/.test(l);
const isCtaLine = (l) => /^\s*(🌙\s*)?→\s*\[/.test(l) || /Code Destiny에서/.test(l);
const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
const isSeparatorRow = (l) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l) && /-/.test(l);
const isListItem = (l) => /^\s*[-*]\s+/.test(l);

let title = "";
const out = [];
let para = [];
let list = [];

const flushPara = () => {
  if (para.length) out.push(`<p>${inline(para.join(" ").trim())}</p>`);
  para = [];
};
const flushList = () => {
  if (list.length) out.push(`<ul>\n${list.map((li) => `<li>${inline(li)}</li>`).join("\n")}\n</ul>`);
  list = [];
};
const flushAll = () => {
  flushPara();
  flushList();
};

function parseTableCells(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  if (!title && /^##\s+/.test(trimmed)) {
    title = trimmed.replace(/^##\s+/, "").trim();
    continue;
  }
  if (isImagePlaceholder(trimmed) || isCtaLine(trimmed)) continue;

  if (trimmed === "") {
    flushAll();
    continue;
  }
  if (/^###\s+/.test(trimmed)) {
    flushAll();
    out.push(`<h2>${inline(trimmed.replace(/^###\s+/, "").trim())}</h2>`);
    continue;
  }
  if (isListItem(trimmed)) {
    flushPara();
    list.push(trimmed.replace(/^\s*[-*]\s+/, "").trim());
    continue;
  }
  if (isTableRow(trimmed)) {
    flushAll();
    const rows = [];
    while (i < lines.length && isTableRow(lines[i])) {
      rows.push(lines[i]);
      i++;
    }
    i--;
    const hasHeader = rows.length > 1 && isSeparatorRow(rows[1]);
    const bodyStart = hasHeader ? 2 : 0;
    const thead = hasHeader
      ? `<thead><tr>${parseTableCells(rows[0]).map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>\n`
      : "";
    const body = rows
      .slice(bodyStart)
      .filter((r) => !isSeparatorRow(r))
      .map((r) => `<tr>${parseTableCells(r).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
      .join("\n");
    out.push(`<table>\n${thead}<tbody>\n${body}\n</tbody>\n</table>`);
    continue;
  }

  flushList();
  para.push(trimmed);
}
flushAll();

const contentHtml = out.join("\n");
const slug = getOpt("slug") || "TODO-slug";
const category = getOpt("category") || "TODO-category";

console.log(`// title: ${title}`);
console.log(`// ---- 붙여넣을 객체 스텁 (app/insights/articles.js) ----`);
console.log(`{
  slug: "${slug}",
  title: ${JSON.stringify(title || "TODO-title")},
  description: "TODO 메타 설명(120자 내외)",
  category: "${category}",
  updatedAt: "TODO-YYYY-MM-DD",
  keywords: ["TODO"],
  useOriginalContent: true,
  contentHtml: \`${contentHtml.replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\`,
},`);
