/**
 * `/fortune/` 허브 셸(`fortune/index.html`)을 소스에서 생성한다.
 *
 * 왜 생성기인가 — 이 셸은 App Router 가 아니라 정적 HTML 이라 `lib/fortune/*` 를 런타임에
 * 읽을 수 없다. 링크 24개와 띠·별자리 이름을 손으로 적으면 종수가 바뀔 때 사이트맵·
 * generateStaticParams 와 조용히 어긋난다(코딩 원칙 10). 그래서 `sign-profiles.ts` 와
 * `periods.ts` 에서 전수 발견해 셸을 다시 쓰고, `verify-fortune-hub-shell.mjs` 가 커밋된
 * 셸이 이 생성물과 같은지 대조한다.
 *
 * 🔴 외부 호출 0 — 파일 두 개를 읽어 HTML 문자열을 만들 뿐이다.
 * 🔴 산출물은 UTF-8, BOM 없음. `sync:public` 이 `public/fortune/index.html` 로 미러한다.
 *
 * 사용: node scripts/build-fortune-hub-shell.mjs [--check]
 *   --check 를 주면 쓰지 않고 현재 파일과 비교만 한다(가드가 쓰는 모드).
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

export const HUB_SHELL_PATH = path.join(root, "fortune", "index.html");

/** 기간 설명문은 이 파일이 정본이다 — 기간 id 자체는 periods.ts 에서 전수 발견한다. */
const PERIOD_COPY = {
  today: {
    emoji: "📅",
    desc: "그날의 일진(日辰) 간지가 각 띠·별자리와 맺는 합·충·비화 관계를 봅니다. 매일 한국 시간 자정 직후 새로 계산해 발행합니다.",
  },
  tomorrow: {
    emoji: "📆",
    desc: "다음 날 일진을 미리 봅니다. 약속을 잡을지 결정을 하루 미룰지 고를 때, 오늘 것과 나란히 놓고 비교하면 결이 분명해집니다.",
  },
  weekly: {
    emoji: "🗓️",
    desc: "월요일부터 일요일까지 이레의 일진을 모두 계산해 요일별 표로 보여 줍니다. 한 주 안에서 가장 좋은 날과 조심할 날이 함께 나옵니다.",
  },
  monthly: {
    emoji: "📜",
    desc: "월건(月建)과 절기 구간을 축으로 봅니다. 절입일에 월건이 바뀌므로 달력의 1일이 아니라 절기가 달의 경계입니다. 삭과 망 날짜도 함께 실립니다.",
  },
};

const PERIOD_LABEL = {
  today: "오늘",
  tomorrow: "내일",
  weekly: "이번 주",
  monthly: "이번 달",
};

const FAQS = [
  [
    "운세를 보려면 회원가입이나 결제가 필요한가요?",
    "아닙니다. 이 페이지에서 이어지는 별자리 12종·띠 12종의 오늘·내일·이번 주·이번 달 운세 96가지는 모두 로그인 없이 무료로 열립니다. 생년월일을 입력할 필요도 없습니다.",
  ],
  [
    "운세는 얼마나 자주 바뀌나요?",
    "한국 시간 자정이 지난 뒤 그날의 일진으로 다시 계산해 사이트를 통째로 다시 배포합니다. 오늘과 내일은 매일, 이번 주는 월요일에, 이번 달은 절기가 바뀔 때 결과가 달라집니다.",
  ],
  [
    "별자리 운세와 띠 운세는 무엇이 다른가요?",
    "별자리는 태양의 위치와 달이 머무는 궁을 축으로 보고, 띠는 지지(地支) 열두 자리가 그날 일진과 맺는 합·충 관계를 축으로 봅니다. 계산에 쓰는 근거가 서로 달라 두 결과가 어긋날 수 있으며, 그것은 오류가 아닙니다.",
  ],
  [
    "점수는 어떤 근거로 나온 숫자인가요?",
    "각 페이지에 산출 근거를 그대로 공개합니다. 어떤 일진과 어떤 관계를 맺었는지, 달의 위상과 궁이 어떠했는지가 항목별로 적히고 그 합이 총운입니다. 근거를 감추지 않는 것이 이 운세의 원칙입니다.",
  ],
];

function readPeriodIds() {
  const source = readFileSync(path.join(root, "lib", "fortune", "periods.ts"), "utf8");
  const match = source.match(/FORTUNE_PERIOD_IDS[^=]*=\s*\[([^\]]*)\]/);
  const ids = match ? [...match[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]) : [];
  const unknown = ids.filter((id) => !PERIOD_COPY[id] || !PERIOD_LABEL[id]);
  if (ids.length === 0 || unknown.length > 0) {
    throw new Error(
      `[fortune-hub-shell] lib/fortune/periods.ts 의 기간을 못 읽었거나 설명문이 없는 기간이 있습니다: ${unknown.join(", ") || "(0개)"}`,
    );
  }
  return ids;
}

function readSignProfiles() {
  const source = readFileSync(path.join(root, "lib", "fortune", "sign-profiles.ts"), "utf8");
  const rowRe =
    /id:\s*"([a-z]+)",\s*[\r\n]+\s*kind:\s*"(zodiac|animal)",\s*[\r\n]+\s*nameKo:\s*"([^"]+)",\s*[\r\n]+\s*nameEn:\s*"[^"]*",\s*[\r\n]+\s*symbol:\s*"([^"]+)",\s*[\r\n]+\s*rangeLabel:\s*"([^"]+)"/g;
  const rows = [...source.matchAll(rowRe)].map((m) => ({
    id: m[1],
    kind: m[2],
    nameKo: m[3],
    symbol: m[4],
    range: m[5],
  }));
  const zodiac = rows.filter((r) => r.kind === "zodiac");
  const animal = rows.filter((r) => r.kind === "animal");
  if (zodiac.length !== 12 || animal.length !== 12) {
    throw new Error(
      `[fortune-hub-shell] sign-profiles.ts 에서 별자리 12·띠 12를 찾지 못했습니다(별자리 ${zodiac.length}, 띠 ${animal.length}). 파일 구조가 바뀌었다면 이 추출기를 함께 고치세요.`,
    );
  }
  return { zodiac, animal };
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderGrid(list) {
  return list
    .map(
      (r) =>
        `      <a class="fi-item" href="/fortune/today/${r.id}/"><span aria-hidden="true">${r.symbol}</span>${esc(r.nameKo)}<em class="fi-item-sub">${esc(r.range)}</em></a>`,
    )
    .join("\n");
}

/**
 * 기간 허브(오늘 말고 나머지)로 가는 24종 링크 목록.
 * 🔴 이 셸이 96개 전부를 링크하지 않으면 나머지 72개는 홈에서 3홉이 되고,
 * 그러면 구글이 발견만 하고 크롤하지 않는다(2026-08-30 GSC 실측).
 */
function renderPeriodLinkList(periodId, list) {
  return list
    .map((r) => `        <a class="fi-chip" href="/fortune/${periodId}/${r.id}/">${esc(r.nameKo)}</a>`)
    .join("\n");
}

export function buildHubShell() {
  const periodIds = readPeriodIds();
  const { zodiac, animal } = readSignProfiles();

  const periodCards = periodIds
    .map(
      (id) => `      <li class="fi-period">
        <a class="fi-period-link" href="/fortune/${id}/">${PERIOD_COPY[id].emoji} ${PERIOD_LABEL[id]} 운세</a>
        <p class="fi-period-desc">${esc(PERIOD_COPY[id].desc)}</p>
      </li>`,
    )
    .join("\n");

  const otherPeriodIds = periodIds.filter((id) => id !== "today");
  const allSigns = [...animal, ...zodiac];
  const periodLinkBlocks = otherPeriodIds
    .map(
      (id) => `      <div class="fi-periodlinks">
        <h3 class="fi-periodlinks-title"><a href="/fortune/${id}/">${PERIOD_COPY[id].emoji} ${PERIOD_LABEL[id]} 운세 ${allSigns.length}종</a></h3>
        <div class="fi-chiplist">
${renderPeriodLinkList(id, allSigns)}
        </div>
      </div>`,
    )
    .join("\n");

  const faqHtml = FAQS.map(
    ([q, a]) => `      <div class="fi-faq">
        <h3 class="fi-faq-q">${esc(q)}</h3>
        <p class="fi-faq-a">${esc(a)}</p>
      </div>`,
  ).join("\n");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "무료 운세 모음 — 별자리 12종·띠 12종",
        description:
          "별자리 12종과 띠 12종의 오늘·내일·이번 주·이번 달 운세를 산출 근거와 함께 무료로 제공합니다.",
        url: "https://code-destiny.com/fortune/",
        inLanguage: "ko-KR",
        isPartOf: { "@type": "WebSite", name: "Code Destiny", url: "https://code-destiny.com/" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "홈", item: "https://code-destiny.com/" },
          { "@type": "ListItem", position: 2, name: "무료 운세 모음", item: "https://code-destiny.com/fortune/" },
        ],
      },
      {
        "@type": "ItemList",
        name: "기간별 운세 허브",
        itemListElement: periodIds.map((id, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${PERIOD_LABEL[id]} 운세`,
          url: `https://code-destiny.com/fortune/${id}/`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map(([q, a]) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>무료 운세 | 오늘·내일·주간·월간 별자리·띠별 운세</title>
  <meta name="description" content="별자리 12종과 띠 12종의 오늘·내일·이번 주·이번 달 운세 96가지를 로그인 없이 무료로 봅니다. 일진·월건·절기·달의 위상 등 산출 근거를 함께 공개합니다.">
  <meta name="keywords" content="무료 운세,오늘의 운세,띠별 운세,별자리 운세,주간 운세,월간 운세,내일의 운세">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="무료 운세 | 오늘·내일·주간·월간 별자리·띠별 운세">
  <meta property="og:description" content="별자리 12종·띠 12종의 기간별 운세 96가지를 산출 근거와 함께 무료로 제공합니다.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://code-destiny.com/fortune/">
  <meta property="og:site_name" content="꿀꿀 운세">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:image" content="https://code-destiny.com/icons/app-logo-512.png">
  <meta name="google-adsense-account" content="ca-pub-9863227498729828">
  <link rel="canonical" href="https://code-destiny.com/fortune/">
  <link rel="icon" href="/icons/app-logo-192.png">
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>
<link rel="stylesheet" href="/css/fortune.css">
  <style>
    .fi-hero{text-align:center;padding:40px 16px 28px;background:linear-gradient(160deg,rgba(88,28,135,.4),rgba(15,14,26,.9));border-radius:0 0 24px 24px;margin-bottom:24px;border-bottom:1px solid rgba(232,121,249,.15);}
    .fi-hero-title{font-size:1.6rem;font-weight:900;color:#f0e6ff;text-shadow:0 0 20px rgba(232,121,249,.4);margin-bottom:10px;word-break:keep-all;}
    .fi-hero-sub{font-size:.88rem;color:rgba(232,224,240,.74);word-break:keep-all;line-height:1.78;max-width:44em;margin:0 auto;}
    .fi-section{margin-bottom:32px;}
    .fi-section-title{font-size:1rem;font-weight:900;color:#e879f9;margin-bottom:14px;display:flex;align-items:center;gap:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.06);}
    .fi-lead{font-size:.86rem;color:rgba(232,224,240,.72);line-height:1.8;word-break:keep-all;margin:0 0 16px;}
    .fi-periods{list-style:none;padding:0;margin:0;display:grid;gap:12px;}
    @media(min-width:640px){.fi-periods{grid-template-columns:repeat(2,1fr);}}
    .fi-period{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;}
    .fi-period-link{display:inline-block;font-size:.95rem;font-weight:900;color:#e879f9;text-decoration:none;margin-bottom:8px;}
    .fi-period-link:hover,.fi-period-link:focus{text-decoration:underline;}
    .fi-period-desc{font-size:.82rem;color:rgba(232,224,240,.68);line-height:1.78;word-break:keep-all;margin:0;}
    .fi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
    @media(min-width:480px){.fi-grid{grid-template-columns:repeat(3,1fr);}}
    @media(min-width:720px){.fi-grid{grid-template-columns:repeat(4,1fr);}}
    .fi-item{display:block;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px 8px;text-align:center;text-decoration:none;color:rgba(232,224,240,.84);font-size:.82rem;font-weight:700;transition:all .2s;-webkit-tap-highlight-color:transparent;}
    .fi-item:hover,.fi-item:focus{background:rgba(124,58,237,.15);border-color:rgba(124,58,237,.4);color:#e879f9;}
    .fi-item span{display:block;font-size:1.6rem;margin-bottom:6px;}
    .fi-item-sub{display:block;margin-top:5px;font-size:.68rem;font-weight:600;font-style:normal;color:rgba(232,224,240,.56);line-height:1.5;word-break:keep-all;}
    .fi-periodlinks{margin-bottom:18px;}
    .fi-periodlinks-title{font-size:.9rem;font-weight:900;margin:0 0 10px;}
    .fi-periodlinks-title a{color:#e879f9;text-decoration:none;}
    .fi-periodlinks-title a:hover,.fi-periodlinks-title a:focus{text-decoration:underline;}
    .fi-chiplist{display:flex;flex-wrap:wrap;gap:8px;}
    .fi-chip{display:inline-block;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:999px;padding:7px 13px;text-decoration:none;color:rgba(232,224,240,.82);font-size:.78rem;font-weight:700;-webkit-tap-highlight-color:transparent;}
    .fi-chip:hover,.fi-chip:focus{background:rgba(124,58,237,.15);border-color:rgba(124,58,237,.4);color:#e879f9;}
    .fi-faq{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:16px;margin-bottom:10px;}
    .fi-faq-q{font-size:.9rem;font-weight:900;color:#f0e6ff;margin:0 0 8px;word-break:keep-all;}
    .fi-faq-a{font-size:.82rem;color:rgba(232,224,240,.7);line-height:1.8;margin:0;word-break:keep-all;}
    .fi-cta{background:linear-gradient(135deg,rgba(88,28,135,.3),rgba(15,14,26,.8));border:1px solid rgba(232,121,249,.2);border-radius:16px;padding:20px 16px;text-align:center;margin-bottom:20px;}
    .fi-cta-title{font-size:1rem;font-weight:900;color:#f0e6ff;margin-bottom:8px;}
    .fi-cta-desc{font-size:.82rem;color:rgba(232,224,240,.66);line-height:1.78;margin-bottom:14px;word-break:keep-all;}
    .fi-cta-btn{display:inline-block;background:linear-gradient(90deg,#7c3aed,#e879f9);color:#fff;font-weight:900;font-size:.9rem;padding:12px 24px;border-radius:12px;text-decoration:none;-webkit-tap-highlight-color:transparent;}
  </style>
<link rel="preconnect" href="https://assets.code-destiny.com" crossorigin>
<style data-cd-r2-static-fonts>
@font-face{font-family:'CodeDestinyStaticDisplay';src:url('https://assets.code-destiny.com/Mulmaru.woff2') format('woff2');font-weight:500;font-style:normal;font-display:swap}
@font-face{font-family:'CodeDestinyStaticDecorative';src:url('https://assets.code-destiny.com/Galmuri11-Bold.woff2') format('woff2');font-weight:700;font-style:normal;font-display:optional}
:root{--font-body:'Apple SD Gothic Neo','Malgun Gothic',system-ui,-apple-system,'Segoe UI',sans-serif;--font-display:'CodeDestinyStaticDisplay',var(--font-body);--font-decorative:'CodeDestinyStaticDecorative',var(--font-display)}
body{font-family:var(--font-body)!important;line-height:1.68;letter-spacing:0;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
h1,h2,h3,.title,.cover-title,.hero-title,.card-title,.section-title{font-family:var(--font-display)!important;letter-spacing:0;word-break:keep-all}
button,input,select,textarea{font-family:var(--font-body)!important}
</style>
</head>
<body>
<nav class="fe-gnb" role="navigation" aria-label="사이트 탐색">
  <a href="/" class="fe-gnb-logo">🌸 연이의 꿀꿀 운세</a>
  <a href="/fortune/">📅 운세 홈</a>
</nav>

<div class="fi-hero">
  <h1 class="fi-hero-title">무료 운세 모음 — 별자리 12종 · 띠 12종</h1>
  <p class="fi-hero-sub">별자리 열두 자리와 띠 열두 자리의 오늘 · 내일 · 이번 주 · 이번 달 운세 96가지를 모아 둔 곳입니다. 로그인도 생년월일 입력도 필요 없고, 총운과 애정운 · 재물운 · 건강운 · 직장운을 점수로 함께 봅니다. 무엇보다 그 점수가 어떤 일진과 어떤 관계에서 나왔는지, 산출 근거를 페이지마다 그대로 공개합니다.</p>
</div>

<main class="fe-wrap">

  <section class="fi-section" id="periods">
    <h2 class="fi-section-title"><span aria-hidden="true">🧭</span> 기간마다 보는 축이 다릅니다</h2>
    <p class="fi-lead">같은 운세를 기간만 바꿔 재탕하지 않습니다. 하루는 하루의 간지로, 한 주는 이레의 흐름으로, 한 달은 월건과 절기로 각각 따로 계산합니다. 아래 넷은 서로 다른 근거를 쓰는 별개의 페이지입니다.</p>
    <ul class="fi-periods">
${periodCards}
    </ul>
  </section>

  <section class="fi-section" id="animal-section">
    <h2 class="fi-section-title"><span aria-hidden="true">🐾</span> 띠별 운세 12종</h2>
    <p class="fi-lead">태어난 해의 지지(地支)로 봅니다. 아래에서 자신의 띠를 고르면 오늘의 운세로 이어지고, 그 페이지 안에서 내일 · 이번 주 · 이번 달로 바로 옮겨 갈 수 있습니다.</p>
    <div class="fi-grid" id="animal-grid">
${renderGrid(animal)}
    </div>
  </section>

  <section class="fi-section" id="zodiac-section">
    <h2 class="fi-section-title"><span aria-hidden="true">✨</span> 별자리 운세 12종</h2>
    <p class="fi-lead">태어난 날의 태양 위치로 봅니다. 띠 운세와는 계산 축이 달라 두 결과가 어긋날 수 있는데, 그때는 두 흐름이 서로 다른 이야기를 하고 있다고 읽으면 됩니다.</p>
    <div class="fi-grid" id="zodiac-grid">
${renderGrid(zodiac)}
    </div>
  </section>

  <section class="fi-section" id="other-periods">
    <h2 class="fi-section-title"><span aria-hidden="true">🗓️</span> ${otherPeriodIds.map((id) => PERIOD_LABEL[id]).join(" · ")} 운세 ${otherPeriodIds.length * allSigns.length}종</h2>
    <p class="fi-lead">위 두 목록은 오늘 운세로 이어집니다. 내일이나 이번 주, 이번 달을 바로 보고 싶다면 아래에서 고르세요. 기간마다 간지를 따로 뽑아 계산하기 때문에 같은 띠라도 오늘과 이번 달의 결과가 서로 다를 수 있습니다.</p>
${periodLinkBlocks}
  </section>

  <section class="fi-section" id="method">
    <h2 class="fi-section-title"><span aria-hidden="true">📐</span> 점수는 이렇게 계산합니다</h2>
    <p class="fi-lead">먼저 그 기간의 간지를 만세력으로 구합니다. 하루짜리는 일진, 한 달짜리는 절입일 기준의 월건입니다. 그다음 각 띠와 별자리가 그 간지와 맺는 관계를 봅니다. 삼합이면 흐름이 열리고, 충이면 부딪히며, 같은 지지가 겹치는 비화는 힘이 한쪽으로 몰립니다. 별자리 쪽은 여기에 달이 머무는 궁과 위상을 더합니다.</p>
    <p class="fi-lead">이 항목들을 더해 총운을 내고, 애정 · 재물 · 건강 · 직장은 각 축의 가중치를 달리해 따로 냅니다. 결과 페이지에는 어떤 항목이 몇 점을 올리고 내렸는지 표로 남습니다. 운세를 믿고 말고는 읽는 사람의 몫이지만, 적어도 숫자가 어디서 왔는지는 감추지 않습니다.</p>
  </section>

  <section class="fi-section" id="faq">
    <h2 class="fi-section-title"><span aria-hidden="true">💬</span> 자주 묻는 질문</h2>
${faqHtml}
  </section>

  <div class="fi-cta">
    <div class="fi-cta-title">🔮 더 정확한 운세를 원한다면?</div>
    <p class="fi-cta-desc">띠와 별자리는 태어난 해와 날만 씁니다. 태어난 시각까지 넣으면 사주 명리학으로 대운 · 십성 · 궁합까지 훨씬 깊게 볼 수 있습니다.</p>
    <a class="fi-cta-btn" href="/">🐷 무료 사주 분석 하러가기</a>
  </div>

</main>

<footer class="fe-footer">
  © 2026 연이의 꿀꿀 운세 &middot;
  <a href="/">홈</a> &middot;
  <a href="/today/">오늘의 운세</a> &middot;
  <a href="/privacy-policy/">개인정보처리방침</a> &middot;
  <a href="/terms-of-service/">이용약관</a> &middot;
  <a href="/contact-us/">문의하기</a>
</footer>
</body>
</html>
`;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const html = buildHubShell();
  if (process.argv.includes("--check")) {
    const current = readFileSync(HUB_SHELL_PATH, "utf8");
    if (current !== html) {
      console.error(
        "[fortune-hub-shell] fortune/index.html 이 생성물과 다릅니다. " +
          "`node scripts/build-fortune-hub-shell.mjs` 로 다시 만들고 `npm run sync:public` 을 함께 돌리세요.",
      );
      process.exit(1);
    }
    console.log("[fortune-hub-shell] OK — 셸이 sign-profiles·periods 와 일치합니다.");
  } else {
    writeFileSync(HUB_SHELL_PATH, html, "utf8");
    const visible = html
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<style[\s\S]*?<\/style>/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    console.log(`[fortune-hub-shell] 생성 완료 — 가시 텍스트 ${visible.length}자, H1 ${(html.match(/<h1/g) || []).length}개`);
  }
}
