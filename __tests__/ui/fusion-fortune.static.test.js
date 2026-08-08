const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("fusion fortune renders the premium flow and optimized hero asset", () => {
  const client = read("app/fusion-fortune/FusionFortuneClient.tsx");
  assert.match(client, /여섯 체계 교차 판정/);
  assert.match(client, /여섯 체계 · 20,000자 이상/);
  assert.match(client, /fusion-guardian-celestial-hero\.webp/);
  assert.match(client, /priority/);
  assert.ok(fs.existsSync(path.join(root, "public/images/fusion-fortune/fusion-guardian-celestial-hero.webp")));
});

test("fusion fortune charges through the shared coin gate, not its own PortOne flow", () => {
  const client = read("app/fusion-fortune/FusionFortuneClient.tsx");
  // 전용 상담권을 폐지하고 표준 회당 결제로 옮겼다(300코인 = 30,000원).
  assert.match(client, /PAID_FEATURE_KEY = "fusion-fortune-consultation"/);
  assert.match(client, /useCoinGate/);
  assert.match(client, /ensurePaidAccess/);
  // 결제 게이트와 생성이 같은 requestId 를 써야 증빙이 잡힌다.
  assert.match(client, /paidRequestIdRef/);
  // 페이지 전용 결제창을 되살리지 말 것 — 공용 게이트만 이용권 카드를 띄운다.
  assert.doesNotMatch(client, /cdn\.portone\.io/);
  assert.doesNotMatch(client, /fusion_fortune_ticket_1/);
  assert.doesNotMatch(client, /payments\/fusion-fortune\/(?:prepare|confirm|catalog)/);
});

test("the retired daily quota leaves no sell-out path behind", () => {
  const client = read("app/fusion-fortune/FusionFortuneClient.tsx");
  const lib = read("worker/lib/fusion-fortune.js");
  // 선착순 하루 100명은 비용 통제 장치였고 폐지됐다. 마감 상태를 되살리지 말 것.
  assert.doesNotMatch(client, /isSoldOut|dailyLimit|선착순/);
  assert.doesNotMatch(lib, /SOLD_OUT|FusionFortuneDailyLimit|successCount/);
  // 결제 증빙은 여전히 requestId 에 묶인다 — 재시도로 결과를 받을 수 있는 근거다.
  assert.match(client, /paidRequestIdRef/);
});

test("the final cross verdict is rendered as the last part of the result", () => {
  const client = read("app/fusion-fortune/FusionFortuneClient.tsx");
  const prompt = read("worker/lib/fusion-fortune-prompt.js");
  // 여섯 해석이 아니라 그 여섯이 만나 남긴 답 하나가 이 상품이 파는 것이다.
  assert.match(prompt, /FUSION_FINAL_VERDICT_SCHEMA/);
  assert.match(prompt, /systemVerdicts/);
  assert.match(client, /result\.finalVerdict/);
  assert.match(client, /STANCE_LABEL/);
  // 결론은 마지막에 온다 — 맺음말보다 앞이어야 한다.
  assert.ok(client.indexOf("fusion-final-verdict-heading") > 0);
  assert.ok(client.indexOf("fusion-final-verdict-heading") < client.indexOf("fusion-closing-message"));
});

test("fusion orbs come from the generated crops with a documented tarot gap", () => {
  const orbs = read("app/fusion-fortune/fusionOrbs.ts");
  for (const key of ["saju", "ziwei", "vedic", "sukuyo", "astrology", "core"]) {
    assert.ok(fs.existsSync(path.join(root, `public/images/fusion-fortune/orbs/${key}.webp`)), `missing orb: ${key}`);
  }
  // 타로 오브는 원본 시트에 없다. image: null 이면 화면이 CSS 오브로 대체한다.
  assert.match(orbs, /key: "tarot"[\s\S]*?image: null/);
  assert.ok(fs.existsSync(path.join(root, "scripts/build-fusion-orb-assets.mjs")));
});

test("fusion fortune mobile UI covers compact widths and reduced motion", () => {
  const css = read("app/fusion-fortune/fusion-fortune.module.css");
  const client = read("app/fusion-fortune/FusionFortuneClient.tsx");
  assert.match(css, /max-width:\s*760px/);
  assert.match(css, /max-width:\s*390px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /min-height:\s*50px/);
  assert.match(css, /\.form fieldset label[\s\S]*?min-height:\s*44px/);
  // 상담 대화(생성·결과)는 Tailwind 로 옮겼다. 같은 계약을 새 위치에서 확인한다.
  assert.match(client, /\[content-visibility:auto\]/);
  assert.match(client, /motion-reduce:animate-none/);
  assert.match(client, /min-h-11/);
});

test("fusion fortune consumes server-sent completion stages", () => {
  const client = read("app/fusion-fortune/FusionFortuneClient.tsx");
  assert.match(client, /fusion-fortune\/generate\/stream/);
  assert.match(client, /consumeFusionStream/);
  assert.match(client, /FUSION_STAGES/);
  assert.match(client, /Fusion Core 진행 방식 보기/);
  assert.match(client, /<dialog/);
  assert.match(client, /aria-expanded/);
  assert.match(client, /useAiProfileSeed/);
  // 진행 중인 체계는 끝난 체계와 눈으로 구분돼야 한다(대화 말풍선의 data-state).
  assert.match(client, /dataState=\{state\}/);
  assert.match(client, /data-state=\{dataState\}/);
  // 4그룹 병렬 생성이 실제 진행률로 보여야 한다 — 여섯 체계 계산 뒤 이 단계가 가장 길다.
  assert.match(client, /streamPayload\.stage === "compose"/);
  assert.match(client, /composeProgress/);
  assert.match(client, /composeProgress\.completed \/ Math\.max\(1, composeProgress\.total\)/);
});

test("the generating view and the result live in one conversation thread", () => {
  const client = read("app/fusion-fortune/FusionFortuneClient.tsx");
  // 생성 화면과 결과 화면이 갈라지면 3만원짜리 상담이 "로딩 → 리포트"로 끊긴다.
  assert.match(client, /\{\(loading \|\| result \|\| failure\) && <section/);
  assert.match(client, /aria-label="초융합 상담 대화"/);
  // 아직 끝나지 않은 체계에 말풍선을 미리 만들지 않는다(없는 내용을 자리로 약속하지 않기).
  assert.match(client, /if \(state === "pending"\) return null;/);
  // 실패는 폼이 아니라 대화 안에 남고, 결제 증빙이 있으면 그 자리에서 재시도한다.
  assert.match(client, /추가 결제 없이 다시 시도하기/);
});

test("fusion visualization is inline SVG so the PDF capture keeps it", () => {
  const visual = read("app/fusion-fortune/FusionVisualization.tsx");
  const client = read("app/fusion-fortune/FusionFortuneClient.tsx");
  // 🔴 canvas 기반 차트는 html2canvas 캡처에서 빈 상자로 남는다. recharts 를 새로 들이지 말 것.
  assert.match(visual, /<svg/);
  assert.doesNotMatch(visual, /from "recharts"|<canvas/);
  // 레이더 · 12개월 라인 · 교차 검증 게이지 세 가지를 모두 그린다.
  assert.match(visual, /체계별 신호 강도/);
  assert.match(visual, /앞으로 12개월의 시기 라인/);
  assert.match(visual, /교차 검증/);
  // 차트는 오브와 같은 색을 말해야 한다.
  assert.match(visual, /FUSION_ORB_BY_KEY/);
  // 도표에도 스크린리더용 설명이 붙어야 한다.
  assert.match(visual, /role="img"/);
  assert.match(visual, /aria-label=/);
  // 점수를 사람의 우열로 읽히게 두지 않는다.
  assert.match(visual, /사람을 평가하는 점수가 아닙니다/);
  assert.match(client, /<FusionVisualization data=/);
});

test("fusion hero states the raised length contract", () => {
  const client = read("app/fusion-fortune/FusionFortuneClient.tsx");
  const prompt = read("worker/lib/fusion-fortune-prompt.js");
  // 30,000원으로 오른 만큼 분량 계약도 함께 올렸다. 화면 문구와 서버 계약이 어긋나면 안 된다.
  assert.match(client, /20,000자 이상/);
  assert.doesNotMatch(client, /10,000~15,000자/);
  assert.match(prompt, /total: Object\.freeze\(\{ min: 20000/);
});

test("fusion fortune production switches enable the approved live flow and keep mock off", () => {
  const wrangler = read("worker/wrangler.toml");
  for (const flag of [
    "ENABLE_FUSION_FORTUNE_UI",
    "ENABLE_FUSION_FORTUNE_API",
    "ENABLE_FUSION_FORTUNE_REAL_LLM",
    "ALLOW_FUSION_FORTUNE_REAL_LLM",
  ]) {
    assert.match(wrangler, new RegExp(`${flag}\\s*=\\s*"true"`));
  }
  assert.match(wrangler, /ENABLE_FUSION_FORTUNE_MOCK_FLOW\s*=\s*"false"/);
});

test("family shop copy states the real fusion coverage", () => {
  const points = read("app/points/PointsClient.tsx");
  const html = read("index.html");
  // family 는 초융합을 커버한다(이용권 기간당 10회). "별도 상담권" 문구는 사실과 다르다.
  assert.match(points, /초융합 포함 전문가 상담 10회/);
  assert.doesNotMatch(points, /초융합 제외/);
  assert.doesNotMatch(points, /별도 상담권/);
  assert.doesNotMatch(points, /모든 유료 서비스(?:를)? 이용/);
  assert.match(html, /3만원 미만 기능 무제한 · 초융합 포함 전문가 상담 10회/);
  assert.doesNotMatch(html, /모든 유료 서비스(?:를)? 이용/);
});

test("the destiny gate states the free quota before the paid price", () => {
  const html = read("index.html");
  // 🔴 계정 무료 3회는 총량이다(worker/lib/guardian-fortune-usage.js: "lifetime-scoped").
  //    "매일" 로 쓰면 매일 지급을 약속하는 문구가 된다.
  assert.match(html, /<b>무료 3회<\/b>/);
  assert.match(html, /비로그인 1회 · 이후 1회 5,000원/);
  assert.doesNotMatch(html, /매일 무료|하루 무료|매일 3회/);
});
