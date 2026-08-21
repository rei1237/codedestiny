import LocaleFooterHub from "../components/LocaleFooterHub";
import { resolveLocale } from "./_lib";
import { LOCALE_CONFIG } from "../../lib/i18n/locales";

/**
 * `/ja`·`/zh`·`/zh-tw`·`/en` 하위 전 페이지에 **서버 렌더** 로케일 푸터를 붙인다.
 * `AppChrome` 은 같은 경로에서 한국어 `SiteFooterHub` 를 건너뛴다(`localeFromPathname` 공유).
 *
 * 🔴 리터럴 세그먼트 라우트는 이 레이아웃을 받지 못한다 — `app/ja/tokushoho` 가 그래서
 * `app/ja/layout.js` 를 따로 갖는다. 새 리터럴 로케일 라우트를 만들면 레이아웃도 함께 만들 것
 * (`__tests__/ui/locale-footer.static.test.js` 가 프리픽스↔레이아웃 1:1 을 단언한다).
 */
export default async function LocaleLayout({ children, params }) {
  const locale = resolveLocale((await params).locale);
  return (
    <>
      {/* root layout(app/layout.js)의 <html lang="ko">는 이 라우트에서도 그대로 나간다 —
          Next App Router 규칙상 중첩 레이아웃은 <html>을 재선언할 수 없고, root layout은
          middleware 없이 하위 [locale] 세그먼트를 알 방법이 없다(이 레포는 middleware 재도입을
          과거 사고 이력 때문에 고위험으로 다룬다). 대신 app/layout.js의 테마 FOUC 방지
          동기 스크립트와 같은 패턴으로, 파싱 중(페인트 전) document.documentElement.lang을
          맞춰준다 — LocaleRuntimeBridge가 하이드레이션 후 하는 동일 교정을 더 이르게 당길 뿐,
          SSR로 나가는 <html> 태그 자체의 lang="ko"는 여전히 못 고친다(JS 미실행 시엔 남는다). */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang=${JSON.stringify(LOCALE_CONFIG[locale].htmlLang)};`,
        }}
      />
      {children}
      <LocaleFooterHub locale={locale} />
    </>
  );
}
