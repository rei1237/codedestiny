const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

// 화면이 세 파일로 나뉘어 있다: 오케스트레이터(Client) · 표현 계층(thread) · 결과 본문(ResultThread).
const CLIENT = "app/fusion-fortune/FusionFortuneClient.tsx";
const THREAD = "app/fusion-fortune/fusion-thread.tsx";
const RESULT = "app/fusion-fortune/FusionResultThread.tsx";

test("fusion fortune renders the premium flow and optimized hero asset", () => {
  const client = read(CLIENT);
  assert.match(client, /여섯 체계 교차 판정/);
  assert.match(client, /여섯 체계 · 20,000자 이상/);
  assert.match(client, /fusion-guardian-celestial-hero\.webp/);
  assert.match(client, /priority/);
  assert.ok(fs.existsSync(path.join(root, "public/images/fusion-fortune/fusion-guardian-celestial-hero.webp")));
});

test("fusion fortune charges through the shared coin gate, not its own PortOne flow", () => {
  const client = read(CLIENT);
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
  const client = read(CLIENT);
  const lib = read("worker/lib/fusion-fortune.js");
  // 선착순 하루 100명은 비용 통제 장치였고 폐지됐다. 마감 상태를 되살리지 말 것.
  assert.doesNotMatch(client, /isSoldOut|dailyLimit|선착순/);
  assert.doesNotMatch(lib, /SOLD_OUT|FusionFortuneDailyLimit|successCount/);
  // 결제 증빙은 여전히 requestId 에 묶인다 — 재시도로 결과를 받을 수 있는 근거다.
  assert.match(client, /paidRequestIdRef/);
});

test("the final cross verdict is rendered as the last part of the result", () => {
  const resultThread = read(RESULT);
  const prompt = read("worker/lib/fusion-fortune-prompt.js");
  // 여섯 해석이 아니라 그 여섯이 만나 남긴 답 하나가 이 상품이 파는 것이다.
  assert.match(prompt, /FUSION_FINAL_VERDICT_SCHEMA/);
  assert.match(prompt, /systemVerdicts/);
  assert.match(resultThread, /result\.finalVerdict/);
  assert.match(resultThread, /copy\.stanceLabels\[item\.stance\]/);
  // 결론은 마지막에 온다 — 맺음말보다 앞이어야 한다.
  assert.ok(resultThread.indexOf("fusion-final-verdict-heading") > 0);
  assert.ok(resultThread.indexOf("fusion-final-verdict-heading") < resultThread.indexOf("fusion-closing-message"));
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
  const thread = read(THREAD);
  const resultThread = read(RESULT);
  assert.match(css, /max-width:\s*760px/);
  assert.match(css, /max-width:\s*390px/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /min-height:\s*50px/);
  assert.match(css, /\.form fieldset label[\s\S]*?min-height:\s*44px/);
  // 상담 대화(생성·결과)는 Tailwind 로 옮겼다. 같은 계약을 새 위치에서 확인한다.
  assert.match(thread, /\[content-visibility:auto\]/);
  assert.match(thread, /motion-reduce:animate-none/);
  assert.match(resultThread, /min-h-11/);
});

/**
 * 실측 2026-09-02(360x640): 히어로 아래 폼이 4128px(약 6.5화면) 지점이라 첫 화면에서
 * 폼으로 갈 방법이 아예 없었다. 앵커와 목적지는 한 쌍이라 한쪽만 사라지면 링크가
 * 조용히 죽는다 — 목적지 이름을 박지 않고 소스에서 읽어 짝을 맞춘다.
 */
test("the hero reaches the form in one tap", () => {
  const client = read(CLIENT);
  const css = read("app/fusion-fortune/fusion-fortune.module.css");
  const anchor = client.match(/href="#([a-z0-9-]+)"/);
  assert.ok(anchor, "히어로에 폼으로 가는 앵커가 없다");
  assert.match(client, new RegExp(`id="${anchor[1]}"`), `앵커 #${anchor?.[1]} 의 목적지가 없다`);
  assert.match(client, /styles\.heroCta/);
  // 44px 최소 터치 타깃 — 히어로 CTA 도 예외가 아니다.
  assert.match(css, /\.heroCta \{[\s\S]*?min-height: 48px/);
});

test("fusion fortune consumes server-sent completion stages", () => {
  const client = read(CLIENT);
  const thread = read(THREAD);
  assert.match(client, /fusion-fortune\/generate\/stream/);
  assert.match(client, /consumeFusionStream/);
  assert.match(client, /buildFusionStages/);
  assert.match(client, /Fusion Core 진행 방식 보기/);
  assert.match(client, /<dialog/);
  // 접히는 섹션은 결과 본문이 소유한다.
  assert.match(read(RESULT), /aria-expanded/);
  assert.match(client, /useAiProfileSeed/);
  // 진행 중인 체계는 끝난 체계와 눈으로 구분돼야 한다(대화 말풍선의 data-state).
  assert.match(client, /dataState=\{state\}/);
  assert.match(thread, /data-state=\{dataState\}/);
  // 4그룹 병렬 생성이 실제 진행률로 보여야 한다 — 여섯 체계 계산 뒤 이 단계가 가장 길다.
  assert.match(client, /streamPayload\.stage === "compose"/);
  assert.match(client, /composeProgress/);
  assert.match(client, /composeProgress\.completed \/ Math\.max\(1, composeProgress\.total\)/);
});

test("the generating view and the result live in one conversation thread", () => {
  const client = read(CLIENT);
  // 생성 화면과 결과 화면이 갈라지면 3만원짜리 상담이 "로딩 → 리포트"로 끊긴다.
  assert.match(client, /\{\(loading \|\| result \|\| failure\) && <section/);
  // 아리아 라벨 문구는 12로케일 카피 객체에서 온다(useFusionFortuneCopy) — 한국어 리터럴은
  // ko 로케일 항목으로 남아 있고, JSX 는 그 항목을 가리키는 copy.threadAriaLabel 을 쓴다.
  assert.match(client, /aria-label=\{copy\.threadAriaLabel\}/);
  assert.match(client, /threadAriaLabel: "초융합 상담 대화"/);
  // 아직 끝나지 않은 체계에 말풍선을 미리 만들지 않는다(없는 내용을 자리로 약속하지 않기).
  assert.match(client, /if \(state === "pending"\) return null;/);
  // 실패는 폼이 아니라 대화 안에 남고, 결제 증빙이 있으면 그 자리에서 재시도한다.
  assert.match(client, /추가 결제 없이 다시 시도하기/);
});

test("fusion visualization is inline SVG so the PDF capture keeps it", () => {
  const visual = read("app/fusion-fortune/FusionVisualization.tsx");
  const resultThread = read(RESULT);
  // 🔴 canvas 기반 차트는 html2canvas 캡처에서 빈 상자로 남는다. recharts 를 새로 들이지 말 것.
  assert.match(visual, /<svg/);
  assert.doesNotMatch(visual, /from "recharts"|<canvas/);
  // 레이더 · 12개월 라인 · 교차 검증 게이지 세 가지를 모두 그린다.
  assert.match(visual, /체계별 신호 강도/);
  assert.match(visual, /copy\.timelineHeading/);
  assert.match(visual, /교차 검증/);
  // 차트는 오브와 같은 색을 말해야 한다.
  assert.match(visual, /FUSION_ORB_BY_KEY/);
  // 도표에도 스크린리더용 설명이 붙어야 한다.
  assert.match(visual, /role="img"/);
  assert.match(visual, /aria-label=/);
  // 점수를 사람의 우열로 읽히게 두지 않는다.
  assert.match(visual, /copy\.radarCaption/);
  assert.match(resultThread, /<FusionVisualization data=/);
});

test("fusion hero states the raised length contract", () => {
  const client = read(CLIENT);
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
  // family 는 초융합(30,000원)을 커버한다 — 건당 상한이 없는 유일한 등급이기 때문이다.
  // "별도 상담권"·"초융합 제외"는 사실과 다르고, 2026-08-24 부터 "포함 횟수"도 사실이 아니다
  // (PREMIUM_QUOTA_INCLUDED_USES_BY_TIER 가 빈 표 = 횟수 제도 폐지). 남은 제약은 월 이용 한도뿐.
  assert.match(points, /초융합 심층 리딩까지 이용권으로/);
  assert.doesNotMatch(points, /초융합 제외/);
  assert.doesNotMatch(points, /Fusion Fortune excluded/);
  assert.doesNotMatch(points, /별도 상담권/);
  assert.doesNotMatch(points, /모든 유료 서비스(?:를)? 이용/);
  assert.match(html, /이용권 대상 전체\(초융합 심층 리딩 포함\) · 월 최대 50만원 상당/);
  assert.doesNotMatch(html, /모든 유료 서비스(?:를)? 이용/);
  // 🔴 월 이용 한도가 있는 등급에 '무제한'·'월 누적'을 쓰지 않는다(2026-08-24 문구 정책).
  assert.doesNotMatch(points, /상담 10회|무제한\(월/);
  assert.doesNotMatch(html, /기능 무제한|월 누적/);
});

test("the destiny gate states the free quota before the paid price", () => {
  const html = read("index.html");
  // 🔴 계정 무료 3회는 총량이다(worker/lib/guardian-fortune-usage.js: "lifetime-scoped").
  //    "매일" 로 쓰면 매일 지급을 약속하는 문구가 된다.
  // 태그에 속성을 허용한다 — i18n 마커(data-cd-trans)가 붙어도 계약은 그대로다.
  // 텍스트만 어디 있어도 통과하는 형태로 풀지는 않는다: 굵게 표시되는지까지가 계약이다.
  assert.match(html, /<b[^>]*>회원가입 무료 1회<\/b>/);
  assert.match(html, /이후 1회 5,000원/);
  assert.doesNotMatch(html, /매일 무료|하루 무료|매일 3회/);
});

test("a finished reading is saved and can be reopened without paying again", () => {
  const client = read(CLIENT);
  const route = read("worker/routes/fusion-fortune.js");
  const store = read("worker/lib/fusion-fortune-consultation.js");

  // 예전에는 결과가 어디에도 남지 않아 새로고침 한 번에 3만원짜리 리딩이 사라졌다.
  assert.match(route, /GET" && path === "\/result"/);
  assert.match(route, /persistFusionDelivery/);
  // 저장은 SSE 배달보다 먼저 — 마지막 write 직전 연결이 끊겨도 결과가 남아야 한다.
  assert.ok(route.indexOf("consultationId = await persistFusionDelivery") < route.indexOf('writeFusionFortuneSse(writer, "result"'));
  // 저장 실패가 배달을 막으면 안 된다.
  assert.match(route, /\[fusion-fortune-persist-failed\]/);
  // 재열람은 생성 플래그와 무관하게 열려 있어야 한다(이미 결제해 받은 결과다).
  assert.match(route, /재열람은 생성 플래그와 무관/);

  // 결제 1회 = 보관본 1개. 같은 requestId 재시도는 같은 문서를 갱신한다.
  assert.match(store, /idempotencyKey/);
  assert.match(store, /upsert: true/);
  // 🔴 프라이버시 경계 — 생년월일·고민 원문은 보관본에 넣지 않는다.
  assert.doesNotMatch(store, /birthDate:|concern:/);

  // 클라이언트는 목록·딥링크(?cid=)로 저장본을 연다.
  assert.match(client, /\/api\/fusion-fortune\/result/);
  assert.match(client, /get\("cid"\)/);
  assert.match(client, /rememberConsultationUrl/);
  assert.match(client, /FusionRecentList/);
  // page.tsx 의 "저장하지 않는다" 카피는 사실과 어긋나므로 남아 있으면 안 된다.
  assert.doesNotMatch(read("app/fusion-fortune/page.tsx"), /재열람하는 상품이 아닙니다/);
});

test("the result screen can be exported to PDF without blank pages", () => {
  const client = read(CLIENT);
  const resultThread = read(RESULT);
  const thread = read(THREAD);

  // 본문은 결과 JSON 에서 직접 조판한다 — 2만 자를 JPEG 로 찍으면 용량이 크고 글자 선택이 안 된다.
  assert.match(client, /exportFusionReportPdf\(/);
  assert.match(client, /lib\/pdf\/export-fusion-report-pdf/);
  // 🔴 R2 한글 폰트를 못 실으면 텍스트 조판은 통째로 깨진다. 그때만 캡처 방식으로 되돌아간다.
  assert.match(client, /FusionPdfFontError/);
  assert.match(client, /exportResultPdf\(/);
  assert.match(client, /lib\/pdf\/export-result-pdf/);
  // 도표만 그림이라 그 블록 하나를 캡처한다.
  assert.match(client, /data-fusion-visual/);
  assert.match(resultThread, /data-fusion-visual/);
  // 폴백 캡처가 쓰는 마커는 그대로 남아 있어야 한다.
  assert.match(client, /data-fusion-pdf-section/);
  assert.match(resultThread, /data-fusion-pdf-section/);
  // 재열람 PDF 의 표지는 폼이 아니라 보관본 요약에서 온다(새 탭에서 열면 폼이 비어 있다).
  assert.match(client, /openedSummary\?\.topic \|\| form\.topic/);

  // 🔴 캡처 전에 접힌 섹션을 모두 펼치고 두 프레임을 기다린다 — 접힌 섹션은 display:none 이
  //    아니라 아예 렌더되지 않으므로 그냥 캡처하면 본문이 통째로 빠진다.
  assert.match(client, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
  assert.match(resultThread, /exporting \|\| openSection === key/);

  // 🔴 content-visibility 와 진입 애니메이션은 html2canvas 클론에서 빈 상자·백지를 만든다.
  assert.match(thread, /deferRender && !exporting/);
  assert.match(thread, /exporting \? "" : "animate-fade-in-up opacity-0/);
});

test("fusion colour and type come from one scoped token set", () => {
  const css = read("app/fusion-fortune/fusion-fortune.module.css");

  // 🔴 예전에는 리터럴 hex 30여 개가 네 파일에 흩어져 있었고, 본문 회색만 여섯 종류였다.
  //    위계가 읽히지 않았던 실제 원인이 그것이다. 색은 .page 스코프에서 **세트로** 나온다.
  for (const token of ["--fx-ink-1", "--fx-ink-2", "--fx-ink-3", "--fx-ink-4", "--fx-gold", "--fx-violet", "--fx-serif"]) {
    assert.match(css, new RegExp(`${token}:`), `토큰 누락: ${token}`);
  }
  // 리딩 본문은 자체 호스팅 세리프, 조작 UI 는 Pretendard 로 나뉜다.
  assert.match(css, /\.reading\s*\{[\s\S]*?font-family:\s*var\(--fx-serif\)/);
  assert.match(css, /\.readingTitle\s*\{[\s\S]*?font-family:\s*var\(--fx-serif\)/);
  // 새 서체를 들이지 않는다 — styles/fonts-serif.css 가 이미 R2 에서 싣는다.
  assert.match(css, /--fx-serif:\s*var\(--font-serif/);

  // 토큰 밖으로 새는 리터럴 색을 막는다. 대상은 **전수 발견**한다 — 파일명을 손으로 나열한
  // 목록은 가드가 아니다(새 파일이 생기면 조용히 빠진다).
  //
  // 예외는 셋뿐이고 전부 var() 를 안전하게 쓸 수 없는 자리다:
  //  · html2canvas 의 backgroundColor — JS 문자열이라 CSS 변수를 못 읽는다
  //  · SVG presentation attribute(fill=/stroke=) — var() 지원이 브라우저마다 갈리고,
  //    이 SVG 는 PDF 캡처를 타므로 캡처기가 변수를 못 풀면 도표가 통째로 사라진다
  //  · `|| "#…"` 형태의 JS 폴백 값 — 런타임에 문자열로 쓰인다
  const dir = path.join(root, "app/fusion-fortune");
  const offenders = [];
  for (const name of fs.readdirSync(dir).filter((file) => file.endsWith(".tsx"))) {
    const source = read(`app/fusion-fortune/${name}`);
    for (const [index, line] of source.split("\n").entries()) {
      if (/backgroundColor:\s*"#/.test(line)) continue;
      if (/(?:fill|stroke)="#/.test(line)) continue;
      if (/\|\|\s*"#/.test(line)) continue;
      const hex = line.match(/#[0-9a-fA-F]{6}\b/);
      if (hex) offenders.push(`${name}:${index + 1} ${hex[0]}`);
    }
  }
  assert.deepEqual(offenders, [], `토큰 대신 리터럴 색을 쓴 곳: ${offenders.join(", ")}`);
});

test("a paid request survives a page reload so nobody is charged twice", () => {
  const client = read(CLIENT);

  // 🔴 결제 증빙 id 가 메모리에만 있으면, 멈춤 화면을 본 사용자가 새로고침하는 순간 id 가
  //    사라지고 다음 제출이 **새 id 로 결제를 한 번 더** 요청한다. 서버는 requestId 로만
  //    증빙을 찾으므로(findPaidPayment) 잃어버린 id 의 30,000원은 회수할 방법이 없다.
  assert.match(client, /sessionStorage\.setItem\(PAID_REQUEST_KEY/);
  assert.match(client, /sessionStorage\.getItem\(PAID_REQUEST_KEY/);
  // 제출 시 저장소까지 본다 — ref 만 보면 새로고침 뒤 복구가 안 된다.
  assert.match(client, /paidRequestIdRef\.current \|\| readStoredPaidRequestId\(\)/);
  // 지우는 시점은 결과를 실제로 받은 뒤 하나뿐이다.
  assert.match(client, /결과를 받았으면 이 결제는 소진됐다[\s\S]{0,120}rememberPaidRequestId\(""\)/);
  // 남아 있는 결제를 사용자에게 먼저 알린다(모르면 처음부터 다시 하는 줄 알고 또 결제한다).
  assert.match(client, /이미 결제가 끝난 요청이 남아 있어요/);

  // 서버도 실패 응답에 retryable 을 실어야 화면이 메모리 상태에 기대지 않는다.
  assert.match(read("worker/lib/fusion-fortune.js"), /retryable: true,\s*\n\s*issues:/);
});

test("the stream never goes silent long enough to look dead", () => {
  const client = read(CLIENT);
  const route = read("worker/routes/fusion-fortune.js");

  // 네 묶음을 병렬로 쓰는 동안 이벤트가 55~110초 나가지 않는다. 그 침묵을 중간 프록시가 끊으면
  // 클라이언트는 result 없이 스트림이 닫힌 것만 본다.
  assert.match(route, /FUSION_SSE_HEARTBEAT_MS = \d+/);
  assert.match(route, /writeFusionFortuneSse\(writer, "ping"/);
  // 심박은 반드시 멈춰야 한다 — 안 멈추면 닫힌 writer 에 계속 쓴다.
  assert.match(route, /stopHeartbeat\(\);\s*\n\s*await writer\.close/);

  // 클라이언트는 무음을 감지해 보관함으로 안내한다(이 화면에는 타임아웃이 하나도 없었다).
  assert.match(client, /STREAM_SILENCE_MS = \d+/);
  assert.match(client, /lastEventAtRef\.current = Date\.now\(\)/);
  assert.match(client, /연결이 조용해진 지 좀 됐어요/);
});

test("progress never reports more groups than there are", () => {
  const lib = read("worker/lib/fusion-fortune.js");

  // 🔴 예전에는 1차 병렬과 재생성이 카운터 하나를 공유해 화면에 "6 / 4 묶음 완성"이 떴다.
  assert.match(lib, /composeProgress = \{ phase: "compose", total: FUSION_SECTION_GROUP_SPECS\.length, done: 0 \}/);
  assert.match(lib, /repairProgress = \{ phase: "repair", total: retryTargets\.length, done: 0 \}/);
  assert.match(lib, /completedGroups: progress\.done, totalGroups: progress\.total/);
  // 국면 이름이 SSE 로 나가야 화면이 "보완 중"을 구분해 그린다.
  assert.match(lib, /phase: progress\.phase/);
});
