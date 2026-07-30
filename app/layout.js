import "../styles/globals.css";
import "../styles/theme-tokens.css";
import "../styles/mobile-bottom-nav.css";
import { ToastProvider } from "./components/Toast";
import { PaymentProcessingProvider } from "./components/PaymentProcessingContext";
import { Suspense } from "react";
import NavigationProvider from "./providers/NavigationProvider";
import UserSessionProvider from "./providers/UserSessionProvider";
import AppChrome from "./components/AppChrome";
import RuntimeClientGuards from "./components/RuntimeClientGuards";
import { SEO_CORE_KEYWORDS } from "../lib/seo-metadata";
import { siteSeo } from "../lib/seo/siteSeo";
import {
  buildOrganizationJsonLd,
  buildWebPageJsonLd,
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
  // verification: Google Search Console 등록 후 아래 주석을 해제하고 실제 코드를 넣을 것.
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
    // 두 코드 모두 유지: 정적 index.html(구 등록분)과 Next 레이아웃(신 등록분)이 서로 다른
    // 네이버 서치어드바이저 확인 코드를 쓰고 있었음. 어느 쪽 등록이 유효한지 확인 전까지 병기.
    "naver-site-verification": [
      "b0fd5fe51988d4063ba5ae1875a97d5531bc1a1e",
      "7b6c0226cae15c61e2582eea0d9378e241ef2167",
    ],
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

const BRAND_WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "꿀꿀 운세 — Code Destiny",
  alternateName: ["꿀꿀 만세력", "코드 데스티니", "Code Destiny"],
  url: "https://code-destiny.com",
  description: "생년월일로 무료 사주팔자·타로·궁합·신년운세를 제공하는 한국 운세 플랫폼",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://code-destiny.com/?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

const jsonLdGraph = {
  "@context": "https://schema.org",
  "@graph": [
    buildOrganizationJsonLd(),
    BRAND_WEBSITE_JSON_LD,
    buildWebPageJsonLd({
      title: ROOT_SEO.title,
      description: ROOT_SEO.description,
      path: "/",
    }),
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" dir="ltr" className={notoSansKRVariable}>
      <head>
        <link rel="preload" as="font" href="https://assets.code-destiny.com/Mulmaru.woff2" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" as="image" href="https://assets.code-destiny.com/%EB%A7%88%EC%95%BC%EC%A0%90.webp" />
        <link rel="alternate" type="application/rss+xml" title={ROOT_LAYOUT_COPY.ko.insightsRssTitle} href="https://code-destiny.com/rss.xml" />
        <link rel="alternate" hrefLang="ko" href="https://code-destiny.com/" />
        <link rel="alternate" hrefLang="ja" href="https://code-destiny.com/ja/" />
        <link rel="alternate" hrefLang="zh-CN" href="https://code-destiny.com/zh/" />
        <link rel="alternate" hrefLang="en" href="https://code-destiny.com/en/" />
        <link rel="alternate" hrefLang="x-default" href="https://code-destiny.com/" />
        <meta property="og:site_name" content={siteSeo.siteName} />
        <meta property="og:locale" content="ko_KR" />
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

            대상은 <script> 와 <link rel=stylesheet> 둘 다다. 2026-07-30 에 메인 Tailwind 번들
            (_next/static/css/*.css, 592KB)이 엣지에 404 로 박혀 모든 React 라우트가 무스타일로
            나왔다 — 그때 이 리스너가 SCRIPT 만 보고 있어 CSS 를 몸랏다. 스타일은 실패해도
            예외가 안 나고 화면만 깨져 에러 폴백조차 안 걸린다.

            경로가 둘이라 장치도 둘이다(둘 다 필요 — 서로 대체 불가):
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
            __html: "(function(){function bust(u){return u+(u.indexOf(\"?\")>-1?\"&\":\"?\")+\"cdcb=\"+Date.now()}var hit={};try{window.addEventListener(\"error\",function(e){try{var t=e&&e.target;if(!t)return;var tag=t.nodeName;var isScript=tag===\"SCRIPT\";var isStyle=tag===\"LINK\"&&String(t.rel||\"\").toLowerCase()===\"stylesheet\";if(!isScript&&!isStyle)return;var url=(isScript?t.src:t.href)||\"\";if(url.indexOf(\"/_next/static/\")<0||url.indexOf(\"cdcb=\")>-1||hit[url])return;hit[url]=1;if(isScript){var s=document.createElement(\"script\");s.src=bust(url);s.async=t.async;if(t.crossOrigin)s.crossOrigin=t.crossOrigin;(document.head||document.documentElement).appendChild(s);return}var l=document.createElement(\"link\");l.rel=\"stylesheet\";l.href=bust(url);if(t.media)l.media=t.media;if(t.crossOrigin)l.crossOrigin=t.crossOrigin;(document.head||document.documentElement).appendChild(l)}catch(x){}},true)}catch(x){}try{var g=self.webpackChunk_N_E=self.webpackChunk_N_E||[];g.push([[\"cd-chunk-retry\"],{},function(wr){try{if(!wr||typeof wr.l!==\"function\"||wr.__cdChunkRetry)return;wr.__cdChunkRetry=1;var orig=wr.l,busted={};wr.l=function(url,done,key,chunkId){orig(url,function(ev){if(ev&&ev.type===\"error\"&&url.indexOf(\"cdcb=\")<0){if(!busted[url])busted[url]=bust(url);orig(busted[url],done,undefined,chunkId);return}done(ev)},key,chunkId)}}catch(x){}}])}catch(x){}})();",
          }}
        />
      </head>
      <body className={notoSansKRVariable}>
        <PaymentProcessingProvider>
          <Suspense>
            <UserSessionProvider>
              <NavigationProvider>
                <RuntimeClientGuards />
                <ToastProvider />
                <AppChrome>{children}</AppChrome>
              </NavigationProvider>
            </UserSessionProvider>
          </Suspense>
        </PaymentProcessingProvider>
      </body>
    </html>
  );
}
