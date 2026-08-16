import LocaleFooterHub from "../components/LocaleFooterHub";

/**
 * `app/ja/tokushoho`(특정상거래법 표기)는 **리터럴 세그먼트**라 `app/[locale]/layout.js` 를 받지 못한다.
 * 이 레이아웃이 없으면 `AppChrome` 이 로케일 경로라며 한국어 푸터를 건너뛰는데 로케일 푸터도 안 붙어
 * 가시 텍스트가 3,168 → 900자로 떨어지고 `verify-adsense-readiness` 의 1,800자 게이트에서 실패한다.
 */
export default function JaLiteralLayout({ children }) {
  return (
    <>
      {children}
      <LocaleFooterHub locale="ja" />
    </>
  );
}
