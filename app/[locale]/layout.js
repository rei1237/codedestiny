import LocaleFooterHub from "../components/LocaleFooterHub";
import { resolveLocale } from "./_lib";

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
      {children}
      <LocaleFooterHub locale={locale} />
    </>
  );
}
