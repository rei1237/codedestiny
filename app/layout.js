import "../styles/globals.css";
import "../styles/theme-tokens.css";
import "../styles/mobile-bottom-nav.css";
import { ToastProvider } from "./components/Toast";
import { PaymentProcessingProvider } from "./components/PaymentProcessingContext";
import { Suspense } from "react";
import Script from "next/script";
import NavigationProvider from "./providers/NavigationProvider";
import UserSessionProvider from "./providers/UserSessionProvider";
import UnlockProvider from "./providers/UnlockProvider";
import AppChrome from "./components/AppChrome";
import RuntimeClientGuards from "./components/RuntimeClientGuards";
import ShellHomeHardNavGuard from "./components/ShellHomeHardNavGuard";
import { SEO_CORE_KEYWORDS } from "../lib/seo-metadata";
import { siteSeo } from "../lib/seo/siteSeo";
import {
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
} from "../lib/structured-data";

const notoSansKRVariable = "font-noto-sans-kr-offline";

const ROOT_LAYOUT_COPY = {
  ko: {
    insightsRssTitle: "Code Destiny Insights RSS",
  },
  en: {
    insightsRssTitle: "Code Destiny Insights RSS",
  },
  ja: {
    insightsRssTitle: "Code Destiny Insights RSS",
  },
  zh: {
    insightsRssTitle: "Code Destiny Insights RSS",
  },
};

const ROOT_SEO = {
  title: "꿀꿀 운세 | 무료 사주팔자·타로·궁합 — Code Destiny",
  description:
    "꿀꿀 운세(구 꿀꿀 만세력) — 생년월일 하나로 무료 사주팔자, 타로, 궁합, 자미두수, 신년운세까지. 코드 데스티니(Code Destiny).",
  ogTitle: "꿀꿀 운세 | 무료 사주·타로·궁합 — Code Destiny",
  ogDescription:
    "꿀꿀 운세 — 생년월일 하나로 사주팔자, 타로, 자미두수, 궁합, 신년운세를 재밌고 정확하게 보는 코드 데스티니 공식 서비스.",
};

export const metadata = {
  charset: "utf-8",
  metadataBase: new URL(siteSeo.siteUrl),
  applicationName: siteSeo.siteName,
  title: {
    default: ROOT_SEO.title,
    template: siteSeo.titleTemplate,
  },
  description: ROOT_SEO.description,
  keywords: SEO_CORE_KEYWORDS,
  creator: siteSeo.siteName,
  publisher: siteSeo.siteName,
  category: "Fortune & Astrology",
  classification: "Fortune telling, astrology, saju, tarot",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/icons/app-logo-96.png",
    shortcut: "/favicon.ico",
    apple: "/icons/app-logo-180.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: siteSeo.siteName,
    statusBarStyle: "default",
  },
  alternates: {
    canonical: "/",
    languages: {
      ko: "/",
      "ko-KR": "/",
      ja: "/ja/",
      "ja-JP": "/ja/",
      "zh-CN": "/zh/",
      zh: "/zh/",
      "zh-TW": "/zh-tw/",
      "zh-Hant": "/zh-tw/",
      en: "/en/",
      "en-US": "/en/",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteSeo.siteUrl,
    siteName: siteSeo.siteName,
    title: ROOT_SEO.ogTitle,
    description: ROOT_SEO.ogDescription,
    images: [
      {
        url: siteSeo.defaultOgImage,
        width: 1200,
        height: 630,
        alt: "Code Destiny 무료 사주 타로 오늘의 운세 플랫폼",
      },
    ],
  },
  twitter: {
    card: siteSeo.twitterCard,
    title: ROOT_SEO.ogTitle,
    description: ROOT_SEO.ogDescription,
    images: [siteSeo.defaultOgImage],
  },
  // verification: 손대지 말 것 — 2026-08-13 Cloudflare DNS TXT 로 GSC 도메인 속성 인증을 마쳤다.
  // DNS 인증은 서브도메인과 http/https 를 전부 커버하므로 이 메타태그는 필요 없다.
  // (아래 주석은 URL 접두어 속성을 따로 만들 때를 위한 참고로만 남긴다. 정적 셸의 같은
  //  placeholder 도 주석 안이라 아무것도 나가지 않는다.)
  // 원래 안내: Google Search Console 등록 후 아래 주석을 해제하고 실제 코드를 넣을 것.
  // GSC(https://search.google.com/search-console) → 속성 추가 → "HTML 태그" 방식의 content 값.
  // 정적 홈(index.html)의 <head>에도 동일한 <meta name="google-site-verification">를 넣어야 함(루트 index.html 수정 후 npm run sync:public).
  // verification: {
  //   google: "GOOGLE_SITE_VERIFICATION_CODE_HERE",
  // },
  other: {
    // Google AdSense 소유권 검증 메타태그. 광고를 서빙하지 않는 검증 전용 신호라
    // canLoadAdsense 정책(홈/도구 페이지 광고 차단)과 무관하게 전 페이지에 넣어도 안전.
    // 정적 셸 홈(/)은 이 레이아웃이 커버하지 못하므로 6미러 <head>에도 별도 삽입됨.
    "google-adsense-account": "ca-pub-9863227498729828",
    // 2026-08-14 확인: 유효한 등록 코드는 이것 하나다(사용자가 서치어드바이저에서 재등록).
    // 예전에 정적 셸(구 등록분)과 이 레이아웃(신 등록분)이 서로 다른 코드를 병기하고 있었다.
    "naver-site-verification": "7b6c0226cae15c61e2582eea0d9378e241ef2167",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070b1f" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  colorScheme: "dark light",
};

// 🔴 name 을 여기에 손으로 적지 않는다. 정본은 lib/seo/siteSeo.ts 의 brandName 이다.
//
// 같은 @id(https://code-destiny.com/#website)를 홈(승격된 정적 셸)과 나머지 400여 Next 라우트
// (이 레이아웃)가 각각 선언하므로 두 값이 글자 단위로 같아야 한다. 예전에는 여기 이름을 손으로
// 적어 두는 바람에 **3중 드리프트**가 났다 — 셸 "CODE DESTINY (꿀꿀 운세)" vs 여기
// "꿀꿀 운세 — Code Destiny" vs buildWebsiteJsonLd 기본값 "Code Destiny"(2026-08-16 실측).
// 이제 override 를 없애 세 번째 값이 생길 자리를 아예 지웠다. 셸과의 일치는
// __tests__/ui/locale-footer.static.test.js 가 강제한다.
const BRAND_WEBSITE_JSON_LD = {
  ...buildWebsiteJsonLd("ko"),
  description: "생년월일로 무료 사주팔자·타로·궁합·신년운세를 제공하는 한국 운세 플랫폼",
};

// 🔴 WebPage 노드를 여기에 넣지 말 것. 이 layout 은 모든 Next 라우트의 <head> 이므로
// 홈 기준 WebPage 를 박으면 전 페이지가 "나는 홈페이지"라고 선언하게 된다
// (2026-08-16 실측: out/saju/index.html 에 `/#webpage`(홈 name·url)와 `/saju/#webpage` 가 공존).
// 게다가 홈 `/` 은 승격된 정적 셸이 서빙하므로 이 노드는 홈에는 애초에 닿지도 않았다.
// Organization·WebSite 는 @id 앵커된 사이트 단위 엔티티라 전 페이지 반복이 정상이다.
// 페이지별 WebPage 는 각 라우트가 만든다(SeoLandingTemplate·buildFortuneJsonLd·I18nSeoPageTemplate).
const jsonLdGraph = {
  "@context": "https://schema.org",
  "@graph": [buildOrganizationJsonLd(), BRAND_WEBSITE_JSON_LD],
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" dir="ltr" className={notoSansKRVariable}>
      <head>
        <Script src="/js/core/pass-verdict.js?v=20260804-core-runtime-v1" strategy="beforeInteractive" />
        {/* 앱 판별 정본. checkout-entry 가 진입 분기에서 읽으므로 그보다 먼저 둔다. */}
        <Script src="/js/core/app-context.js?v=20260812-app-context-v1" strategy="beforeInteractive" />
        <Script src="/js/core/checkout-entry.js?v=20260820-display-locale-v1" strategy="beforeInteractive" />
        <Script src="/js/core/access-store.js?v=20260804-access-v3" strategy="beforeInteractive" />
        <Script src="/js/core/payment-service.js?v=20260804" strategy="beforeInteractive" />
        {/* GA4 측정 ID 는 공개 식별자다. 값이 없으면 analytics.js 가 통째로 no-op 이 되므로
            (아래 스크립트는 항상 붙여 두고) 여기서만 주입한다. 정적 셸은 자기 <head> 에서
            같은 전역(window.__CD_GA_ID)을 설정한다 — 런타임 계약은 하나다. */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__CD_GA_ID=${JSON.stringify(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)};`,
            }}
          />
        ) : null}
        <Script src="/js/core/analytics.js?v=20260814-ga4-v1" strategy="afterInteractive" />
        <link rel="alternate" type="application/rss+xml" title={ROOT_LAYOUT_COPY.ko.insightsRssTitle} href="https://code-destiny.com/rss.xml" />
        {/* hreflang / og:site_name / og:locale 을 여기서 하드코딩하지 말 것.
            이 layout 은 모든 Next 라우트의 <head> 이므로, 홈 기준 값을 박으면 전 페이지가
            "내 한국어판은 홈페이지"라고 선언하게 된다(2026-08-13 실측: 색인 가능 355개 중 350개가
            canonical=/saju/ 인데 hreflang ko=/ 를 함께 내보내는 자기모순 상태였다).
            로케일 대체 URL 은 metadata.alternates.languages 가, og 는 metadata.openGraph 가
            페이지별로 생성한다. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph) }} />
        {/* 정적 셸과 동일한 연이/네오 테마 키 공유 — hydration 전에 html 속성으로 반영 (FOUC 방지).

            예전에는 Capacitor 앱이면 저장값이 없을 때 네오(다크)를 기본으로 강제했다. 그때는 앱이
            /app 허브(다크)를 띄웠기 때문이다. 지금 앱은 셸(연이 라이트)을 띄우므로 그 강제가
            셸↔React 페이지를 오갈 때마다 다크↔라이트 번쩍임을 만든다(앱에서 테마 토글도 제거했다).
            그래서 앱 분기를 없애고 웹과 동일하게 '저장값이 neo 일 때만 네오'로 통일한다. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(localStorage.getItem('fortuneThemeModeStateV1')==='neo'){document.documentElement.dataset.cdTheme='neo';}}catch(e){}",
          }}
        />
        {/* 청크 로드 실패 1회 재시도 — 실패한 URL 에 캐시 우회 쿼리를 붙여 다시 받는다.

            Cloudflare 는 Pages 가 배포 전환 틈새에 내보낸 404 를 max-age=172800(2일)로 캐시한다.
            그러면 오리진에 파일이 멀쩡히 있어도 그 URL 만 이틀간 죽어, HTML 은 no-store 라
            새로고침해도 같은 URL 을 다시 요청하므로 화면이 계속 에러 폴백에 갇힌다
            (2026-07-22 운명 찻집 사고 — 같은 파일이 쿼리를 붙이면 200 이었다).
            app/error.tsx 의 '경로당 1회 새로고침'은 구 HTML 이 삭제된 청크를 가리키는 경우용이라
            이 케이스를 못 고친다. 그래서 계층을 달리해 로더 자체에서 끊는다.

            경로가 셋이라 장치도 셋이다(셋 다 필요 — 서로 대체 불가):
            (0) 스타일시트: <link rel="stylesheet"> 는 webpack 로더를 아예 타지 않고, 실패해도
                리액트가 살아 있어 화면은 그려진다 → "기능은 되는데 CSS 만 통째로 깨진" 상태가 된다
                (2026-07-30 사고 — /_next/static/css 공용 청크 하나가 죽어 React 라우트 전부가
                무스타일로 떴다). 죽은 태그 바로 뒤에 우회 URL <link> 를 꽂아 캐스케이드 순서를
                보존한 채 되받는다(head 끝에 붙이면 뒤 시트를 덮어써 순서가 뒤집힌다).
                🔴 여기서 error 리스너만으로는 못 잡는다 — Next 는 스타일시트 <link> 를 <head>
                맨 앞(이 스크립트보다 20여 태그 앞)에 박으므로, 이 스크립트가 파싱될 때쯤이면
                그 링크들의 error 는 이미 끝나 있다(실측: 리스너를 addInitScript 로 더 먼저
                걸면 잡히고, 배포본에서는 재시도 노드가 0개였다). 그래서 '이미 실패해 있는'
                링크를 나중에 훑는 스윕을 함께 돌린다. 실패 판정은 같은 출처인데도
                sheet.cssRules 접근이 throw 하거나 sheet 가 null 인 것으로 한다(정상 시트는
                빈 파일이어도 CSSRuleList 를 돌려준다).
                DOMContentLoaded 에서는 'sheet 는 있는데 cssRules 가 throw' 인 확실한 실패만
                걷고(아직 로딩 중인 것을 오판하지 않게), 전부 정착한 load 에서 null 까지 본다.
            (1) 클라이언트 사이드 이동: 청크를 __webpack_require__.l 이 동적으로 받는다 → 로더를 감싼다.
            (2) 직접 진입·새로고침: 청크가 문서에 <script> 로 박혀 온다 → 로더를 타지 않는다.
                게다가 .l 은 같은 src 의 기존 <script> 를 재사용하는데, 그 태그는 이미 error 를
                끝낸 뒤라 onerror/onload 가 다시 안 뛰어 약속이 영영 매달린다(에러조차 안 남).
                그래서 캡처 단계 error 리스너로 죽은 태그를 우회 URL 로 다시 꽂는다.
                되받은 스크립트가 청크를 등록하면 런타임이 대기 콜백을 풀어 하이드레이션이 이어진다.

            self.webpackChunk_N_E 항목의 세 번째 요소는 런타임이 __webpack_require__ 로 호출한다.
            런타임 전/후 어느 시점에 push 해도 처리되므로 순서에 의존하지 않는다.
            재시도는 원본 loader 를 직접 부르므로 래퍼를 다시 타지 않는다(= 무한 루프 불가).
            두 장치는 URL 에 cdcb= 가 이미 있으면 손대지 않아 서로를 되풀지 않는다.
            ⚠️ 반드시 순수 ES5 문자열 — 과거 인라인 스크립트에 TS 표기가 섞여 SyntaxError 로
            로그인·결제가 통째로 죽은 적이 있다. */}
        <script
          dangerouslySetInnerHTML={{
            __html: "(function(){function bust(u){return u+(u.indexOf(\"?\")>-1?\"&\":\"?\")+\"cdcb=\"+Date.now()}var hit={};function retryCss(l){var h=l.href||\"\";if(h.indexOf(\"/_next/static/\")<0||h.indexOf(\"cdcb=\")>-1||hit[h])return;hit[h]=1;var n=document.createElement(\"link\");n.rel=\"stylesheet\";n.href=bust(h);if(l.media)n.media=l.media;if(l.crossOrigin)n.crossOrigin=l.crossOrigin;if(l.parentNode)l.parentNode.insertBefore(n,l.nextSibling);else (document.head||document.documentElement).appendChild(n)}try{window.addEventListener(\"error\",function(e){try{var t=e&&e.target;if(!t)return;var isCss=t.nodeName===\"LINK\"&&String(t.rel||\"\").indexOf(\"stylesheet\")>-1;if(t.nodeName!==\"SCRIPT\"&&!isCss)return;if(isCss){retryCss(t);return}var u2=t.src||\"\";if(u2.indexOf(\"/_next/static/\")<0||u2.indexOf(\"cdcb=\")>-1||hit[u2])return;hit[u2]=1;var s2=document.createElement(\"script\");s2.src=bust(u2);s2.async=t.async;if(t.crossOrigin)s2.crossOrigin=t.crossOrigin;(document.head||document.documentElement).appendChild(s2)}catch(x){}},true)}catch(x){}try{var g=self.webpackChunk_N_E=self.webpackChunk_N_E||[];g.push([[\"cd-chunk-retry\"],{},function(wr){try{if(!wr||typeof wr.l!==\"function\"||wr.__cdChunkRetry)return;wr.__cdChunkRetry=1;var orig=wr.l,busted={};wr.l=function(url,done,key,chunkId){orig(url,function(ev){if(ev&&ev.type===\"error\"&&url.indexOf(\"cdcb=\")<0){if(!busted[url])busted[url]=bust(url);orig(busted[url],done,undefined,chunkId);return}done(ev)},key,chunkId)}}catch(x){}}])}catch(x){}})();",
          }}
        />
      </head>
      <body className={notoSansKRVariable}>
        <PaymentProcessingProvider>
          <UnlockProvider>
            <Suspense>
              <UserSessionProvider>
                <NavigationProvider>
                  <RuntimeClientGuards />
                  <ShellHomeHardNavGuard />
                  <ToastProvider />
                  <AppChrome>{children}</AppChrome>
                </NavigationProvider>
              </UserSessionProvider>
            </Suspense>
          </UnlockProvider>
        </PaymentProcessingProvider>
      </body>
    </html>
  );
}
