import Image from "next/image";
import { INTRO_LOCALES, INTRO_TOPICS, FEATURE_INTRODUCTIONS } from "../../lib/i18n/feature-introductions.mjs";
import { getLocalizedPublicHref } from "../../lib/i18n/routes";
import styles from "./SiteFooterHub.module.css";
import {
  FOOTER_LINK_GROUPS,
  FOOTER_POLICY_HREFS,
  FOOTER_TRUST_HREFS,
  SITE_FOOTER_HUB_COPY,
} from "../../lib/i18n/siteFooterHubCopy";
import { I18N_ROUTE_MAP } from "../../lib/i18n/routes";
import { BUSINESS_IDENTITY } from "../../lib/site-policy-config";
import { IS_APP_BUILD } from "../../lib/app-build-target";

/**
 * 로케일(`/ja`·`/zh`·`/zh-tw`·`/en`) 전용 푸터.
 *
 * 🔴 **`"use client"` 를 붙이지 말 것.** 이 컴포넌트가 서버 전용이라는 점이 이 설계의 전부다.
 * 번역 테이블을 클라이언트 컴포넌트인 `AppChrome` 쪽에 두면 그대로 클라이언트 번들로 들어간다.
 * 로케일 페이지는 일부인데 비용은 모든 사용자가 낸다. 서버 컴포넌트로 두면 클라이언트 번들 증가가 0이다.
 *
 * 한국어 푸터는 `SiteFooterHub` 가 그대로 담당한다(`AppChrome` 이 로케일 경로에서만 건너뛴다).
 * 두 컴포넌트는 같은 최소 규격(2026-10-16 "직관성", lib/brand/site-footer.ts)이고 href 집합도 같아야 한다 —
 * `__tests__/ui/locale-footer.static.test.js` 가 단언한다. 환불·면책 전문은 각 정책 페이지에 있다.
 */

/**
 * 사업자 정보는 **등록된 원문이 곧 법적 형식**이라 값을 번역하지 않는다(라벨만 번역).
 * 🔴 값을 여기 다시 적지 않는다 — 정본은 `lib/site-policy-config.js` 하나다.
 */
const BUSINESS_INFO_VALUES = {
  name: BUSINESS_IDENTITY.companyName,
  representative: BUSINESS_IDENTITY.representative,
  registrationNo: BUSINESS_IDENTITY.registrationNumber,
  mailOrderNo: BUSINESS_IDENTITY.mailOrderNumber,
  phone: BUSINESS_IDENTITY.phone,
  email: BUSINESS_IDENTITY.email,
  address: BUSINESS_IDENTITY.address,
};

const BUSINESS_INFO_KEYS = [
  "name",
  "representative",
  "registrationNo",
  "mailOrderNo",
  "phone",
  "email",
  "address",
];

/**
 * 같은 언어 목적지 링크. 경로는 `I18N_ROUTE_MAP` 에서 오므로 로케일별 실제 URL 과 어긋날 수 없다.
 * `/ja/tokushoho/` 는 사이트맵에 있으면서 내부 링크가 0이던 고아라 여기서 해소한다 —
 * 🔴 일본 특정상거래법 고지이므로 **한국어 푸터나 다른 로케일에 넣지 않는다**(관련성 신호 오염).
 */
function buildLocaleNavLinks(locale, labels) {
  const links = [
    { href: I18N_ROUTE_MAP.home[locale], text: labels.home },
    { href: I18N_ROUTE_MAP.ziwei[locale], text: labels.ziwei },
    { href: I18N_ROUTE_MAP.sukuyo[locale], text: labels.sukuyo },
    { href: I18N_ROUTE_MAP.today[locale], text: labels.today },
    { href: I18N_ROUTE_MAP.insights[locale], text: labels.insights },
  ].map((link) => ({ ...link, href: link.href.endsWith("/") ? link.href : `${link.href}/` }));

  if (INTRO_LOCALES.includes(locale)) {
    for (const topic of INTRO_TOPICS) links.push({ href: `/${locale}/${topic}/`, text: FEATURE_INTRODUCTIONS[topic][locale].heading });
  }

  if (locale === "ja" && labels.tokushoho) {
    links.push({ href: "/ja/tokushoho/", text: labels.tokushoho });
  }
  return links;
}

export default function LocaleFooterHub({ locale }) {
  const copy = SITE_FOOTER_HUB_COPY[locale];
  const localeNavLinks = buildLocaleNavLinks(locale, copy.localeNavLabels);
  const linkGroups = [
    { key: "locale", title: copy.localeNavTitle, links: localeNavLinks },
    ...FOOTER_LINK_GROUPS.map((group) => ({
      key: group.titleKey,
      title: copy.groupTitles[group.titleKey],
      links: group.hrefs.map((href) => ({ key: href, href: getLocalizedPublicHref(href, locale), text: copy.linkLabels[href] })),
    })),
  ];

  return (
    <footer className={styles.sfhRoot} aria-label={copy.footerAriaLabel}>
      <div className={styles.sfhShell}>
        <p className={styles.sfhByline}>
          <a href={getLocalizedPublicHref("/about/", locale)}>
            <Image src="/icons/moonlight-garden-v1-512.webp" alt="" width={512} height={512} sizes="28px" />
            <span><strong>꿀꿀 운세</strong> — {copy.byline}</span>
          </a>
        </p>

        {/* 🔴 정책 링크·안내·사업자 정보는 **앱에서도 남긴다** — Play 정책과 전자상거래법상 앱 안에 접근 경로가 있어야 한다. */}
        <nav aria-label={copy.policyNavAriaLabel} className={styles.sfhPolicyNav}>
          {FOOTER_POLICY_HREFS.map((href) => (
            <a key={href} href={getLocalizedPublicHref(href, locale)} className={href === "/privacy/" ? `${styles.sfhPolicyLink} ${styles.sfhPolicyLinkStrong}` : styles.sfhPolicyLink}>
              {copy.policyLabels[href]}
            </a>
          ))}
          <span className={styles.sfhBreak} aria-hidden="true" />
          {FOOTER_TRUST_HREFS.map((href) => (
            <a key={href} href={getLocalizedPublicHref(href, locale)} className={`${styles.sfhPolicyLink} ${styles.sfhPolicyLinkQuiet}`}>
              {copy.policyLabels[href]}
            </a>
          ))}
          {/* 동의 배너를 다시 연다(AnalyticsConsent 가 data-cd-cookie-settings 클릭을 받는다). 앱은 웹 배너를 쓰지 않는다. */}
          {!IS_APP_BUILD && (
            <button type="button" data-cd-cookie-settings className={`${styles.sfhPolicyLink} ${styles.sfhPolicyLinkQuiet} ${styles.sfhCookieButton}`}>
              {copy.cookieSettingsLabel}
            </button>
          )}
        </nav>

        <p className={styles.sfhNotice}>{copy.notice}</p>

        <section aria-label={copy.businessAriaLabel} className={styles.sfhBusiness}>
          {BUSINESS_INFO_KEYS.map((key) => (
            <span key={key}>
              {copy.businessLabels[key]}{" "}
              {/* 법인 상호·대표자명·신고번호·사업장 주소는 **등록된 그대로가 법적 형식**이라
                  번역하지 않는다. data-cd-no-trans 로 런타임 번역 대상에서 명시적으로 제외한다. */}
              <span data-cd-no-trans>{BUSINESS_INFO_VALUES[key]}</span>
            </span>
          ))}
        </section>

        {/* 서비스 링크는 검색 신호 전용이라 앱 번들에서는 렌더하지 않는다(2026-09-03 사용자 결정).
            접어 둘 뿐 지우지 않는다 — 고아 라우트의 유입 내부 링크다(SiteFooterHub 주석). */}
        {!IS_APP_BUILD && (
          <details className={styles.sfhAll}>
            <summary className={styles.sfhAllToggle}>{copy.allServicesLabel}</summary>
            <nav className={styles.sfhAllGrid} aria-label={copy.hubAriaLabel}>
              {linkGroups.map((group) => (
                <section key={group.key} aria-label={group.title}>
                  <h2 className={styles.sfhGroupTitle}>{group.title}</h2>
                  <ul className={styles.sfhLinkList}>
                    {group.links.map((link) => (
                      <li key={link.key || link.href}>
                        <a href={link.href} className={styles.sfhLink}>{link.text}</a>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </nav>
          </details>
        )}

        <p className={styles.sfhCopyright}>{copy.copyright}</p>
      </div>
    </footer>
  );
}
