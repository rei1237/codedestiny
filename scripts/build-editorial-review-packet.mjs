import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { EDITORIAL_READING_PATHS } from "../app/insights/editorial-reading-paths.mjs";

const bundled = await build({ entryPoints: ["app/insights/seed-articles.js"], bundle: true, write: false, platform: "node", format: "esm" });
const { INSIGHT_SEED_ARTICLES } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const escape = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const output = "docs/adsense/review";
await mkdir(output, { recursive: true });
const aiRecords = JSON.parse(await readFile(`${output}/ai-editorial-reviews.json`, "utf8"));
const manifest = [];
const pages = EDITORIAL_READING_PATHS.map((group) => `<h2>${escape(group.title)}</h2>${group.slugs.map((slug) => {
  const article = INSIGHT_SEED_ARTICLES.find((item) => item.slug === slug);
  if (!article?.contentHtml) throw new Error(`Missing manuscript: ${slug}`);
  const hash = createHash("sha256").update(article.contentHtml).digest("hex");
  const aiReview = aiRecords.find((record) => record.slug === slug);
  if (aiReview && (aiReview.manuscriptSha256 !== hash || aiReview.title !== article.title)) throw new Error(`AI editorial record is stale: ${slug}. Review the changed manuscript before updating its evidence.`);
  manifest.push({ slug, title: article.title, manuscriptSha256: hash, status: "pending", reviewer: null, reviewedAt: null, evidence: null, adsAllowed: false, aiEditorialReview: aiReview || null });
  return `<article id="${escape(slug)}"><h3>${escape(article.title)}</h3><p><a href="https://code-destiny.com/insights/${escape(slug)}/">현재 공개 페이지</a> · 인간 전문가 검수 미확인</p>${aiReview ? `<p>AI 편집 검토: ${escape(aiReview.reviewedAt)} · ${escape(aiReview.finding)}</p><p>검토 범위: ${escape(aiReview.limits)}</p>` : ""}<details><summary>원고 전문 펼치기</summary><div>${article.contentHtml}</div></details><fieldset><legend>박병하 님 확인 항목 (이 화면은 저장하거나 검수 상태를 변경하지 않습니다)</legend>${["계산 기준과 전문용어가 정확함", "사례와 경험의 출처가 사실임", "다른 유파와의 차이 및 해석의 한계를 설명함", "중복 일반론이 아닌 독립적인 읽을 가치가 있음", "제목·본문·출처·작성 책임이 일치함"].map((label) => `<label><input type="checkbox"> ${label}</label>`).join("")}<p>수정 요청·검수일·검수자·광고 적합 판단을 원고별로 회신해 주세요.</p></fieldset></article>`;
}).join("")}`).join("");
await writeFile(`${output}/manuscripts.json`, JSON.stringify(manifest, null, 2) + "\n");
await writeFile(`${output}/index.html`, `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Code Destiny 원고 검수 묶음</title><style>body{font:17px/1.8 system-ui,sans-serif;max-width:920px;margin:auto;padding:24px;color:#252130;background:#faf8f3}article{border-top:1px solid #bbb;padding:24px 0}h1,h2,h3{line-height:1.4}a{color:#654193}label{display:block}summary{cursor:pointer;padding:12px 0}table{display:block;overflow:auto;max-width:100%}img{max-width:100%}fieldset{margin-top:20px}input{width:20px;height:20px}</style><h1>원고별 전문가 검수</h1><p>20편은 AI 편집 검토를 거쳐 수정했습니다. AI 검토와 이 문서 생성은 인간 전문가 검수 완료를 의미하지 않습니다. 공개 문구와 schema에는 확인된 사실만 반영합니다.</p><p>원고별 수정 근거는 <a href="AI-EDITORIAL-REVIEW.md">AI 편집 검토 기록</a>에 정리했습니다. 계산과 전통 해석, 가정 사례와 실제 경험을 구분했습니다.</p>${pages}</html>`);
console.log(`[editorial-review] ${manifest.length} pending manuscripts; no approvals created`);
