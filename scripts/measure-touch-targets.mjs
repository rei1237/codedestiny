/**
 * 실효 터치 타깃 측정기 (판정용 아님 — 측정 도구다)
 *
 * 사용: node scripts/measure-touch-targets.mjs [url] [width] [height]
 *   기본값: https://staging.code-destiny.com/ 390x844
 *
 * 🔴 왜 rect 로 재면 안 되는가 (2026-09-02 실측으로 확인)
 *   1) 셸 최상위에 `button,[role="button"],input[type=button|submit|reset]{min-height:48px;min-width:48px}`
 *      규칙이 있다(index.html 의 첫 <style>, @media 밖). min-height 는 height 를 이기므로
 *      `height:34px` 이라고 선언된 버튼도 실제로는 48px 로 렌더된다.
 *   2) 이 레포는 시각 크기를 유지한 채 `::after` 로 히트 영역만 넓히는 관례를 쓴다
 *      (index.html 의 `.cd-mobile-appbar__action::after` 계열). 이 확장은 rect 에 안 잡힌다.
 *   그래서 선언값이나 getBoundingClientRect 로 세면 미달 건수가 크게 부풀려진다
 *   (같은 페이지에서 rect 기준 36건 vs 실효 기준 5건).
 *
 * 이 스크립트는 elementFromPoint 로 중심에서 사방으로 탐침해 **실제로 탭이 먹는 범위**를 잰다.
 * 가려졌거나 화면 밖이라 판정 못 한 개수를 함께 찍는다 — "미달 0건"이 스캔 실패를 감추지 않게.
 */
import { chromium } from "@playwright/test";

const url = process.argv[2] || "https://staging.code-destiny.com/";
const width = Number(process.argv[3] || 390);
const height = Number(process.argv[4] || 844);
const FLOOR = 44;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);
// 지연 마운트 구역을 깨운다
await page.evaluate(async () => {
  const step = window.innerHeight;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1200);

const result = await page.evaluate((FLOOR) => {
  const sel = 'a[href], button, [role="button"], input:not([type="hidden"]), select, summary, label[for]';
  const owns = (el, hit) => !!hit && (hit === el || el.contains(hit) || hit.contains(el));
  const probe = (el, cx, cy, dx, dy) => {
    let n = 0;
    for (let d = 1; d <= 32; d++) {
      if (!owns(el, document.elementFromPoint(cx + dx * d, cy + dy * d))) break;
      n = d;
    }
    return n;
  };
  // 🔴 smooth 스크롤이 켜져 있으면 scrollIntoView 직후 rect 가 아직 안 따라와 대부분이 "화면 밖"으로 빠진다.
  document.documentElement.style.setProperty("scroll-behavior", "auto", "important");
  document.body.style.setProperty("scroll-behavior", "auto", "important");

  let scanned = 0;
  let skipped = 0;
  const blockers = new Map();
  const bad = new Map();
  for (const el of Array.from(document.querySelectorAll(sel))) {
    let r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.pointerEvents === "none") continue;
    el.scrollIntoView({ block: "center", behavior: "instant" });
    r = el.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);
    if (cx < 1 || cy < 1 || cx > innerWidth - 1 || cy > innerHeight - 1) { skipped++; continue; }
    const top = document.elementFromPoint(cx, cy);
    if (!owns(el, top)) {
      skipped++;
      const sig = top ? `${top.tagName.toLowerCase()}.${(typeof top.className === "string" ? top.className.trim().split(/\s+/)[0] : "") || top.id}` : "null";
      blockers.set(sig, (blockers.get(sig) || 0) + 1);
      continue;
    }
    scanned++;
    const w = probe(el, cx, cy, -1, 0) + probe(el, cx, cy, 1, 0) + 1;
    const h = probe(el, cx, cy, 0, -1) + probe(el, cx, cy, 0, 1) + 1;
    if (w >= FLOOR && h >= FLOOR) continue;
    const cls = typeof el.className === "string"
      ? el.className.trim().split(/\s+/).filter((c) => c !== "notranslate").slice(0, 2).join(".")
      : "";
    const key = `${el.tagName.toLowerCase()}${cls ? "." + cls : el.id ? "#" + el.id : ""}`;
    const prev = bad.get(key);
    if (prev) { prev.count++; prev.min = Math.min(prev.min, Math.min(w, h)); }
    else bad.set(key, { key, count: 1, hit: `${w}x${h}`, rect: `${Math.round(r.width)}x${Math.round(r.height)}`, min: Math.min(w, h) });
  }
  window.scrollTo(0, 0);
  return {
    scanned,
    skipped,
    blockers: [...blockers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    bad: [...bad.values()].sort((a, b) => a.min - b.min),
  };
}, FLOOR);

const total = result.bad.reduce((s, b) => s + b.count, 0);
console.log(`# ${url} @ ${width}x${height}`);
console.log(`# 판정 ${result.scanned}개 · 판정 불가 ${result.skipped}개(가려짐·화면 밖) · ${FLOOR}px 미달 ${total}개`);
if (result.blockers.length) console.log(`# 가림 상위: ${result.blockers.map(([k, v]) => `${k}×${v}`).join(", ")}`);
console.log("# 실효히트   선언rect    요소");
for (const b of result.bad) console.log(`${String(b.count).padStart(3)}x  ${b.hit.padEnd(9)} ${b.rect.padEnd(10)} ${b.key}`);
await browser.close();
