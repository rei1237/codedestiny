import styles from "./SiteFooterHub.module.css";
import SocialFooter from "../_components/SocialFooter";
import {
  FOOTER_LINK_GROUPS,
  FOOTER_POLICY_HREFS,
  SITE_FOOTER_HUB_COPY,
} from "../../lib/i18n/siteFooterHubCopy";
import { getRefundSection, LEGAL_TRANSLATION_NOTICE } from "../../lib/legal/refundContent";

/**
 * 로케일(`/ja`·`/zh`·`/zh-tw`·`/en`) 전용 푸터.
 *
 * 🔴 **`"use client"` 를 붙이지 말 것.** 이 컴포넌트가 서버 전용이라는 점이 이 설계의 전부다.
 * 번역 테이블(약 10,400자)을 클라이언트 컴포넌트인 `AppChrome` 쪽에 두면 그대로 클라이언트
 * 번들로 들어가 `layout-*.js`(41,007B)가 거의 2배가 된다. 로케일 페이지는 429개 중 41개인데
 * 비용은 100% 모든 사용자가 낸다. 서버 컴포넌트로 두면 클라이언트 번들 증가가 0이다.
 *
 * 한국어 푸터는 `SiteFooterHub` 가 그대로 담당한다(`AppChrome` 이 로케일 경로에서만 건너뛴다).
 * 두 컴포넌트의 href 집합은 같아야 하며 `__tests__/ui/locale-footer.static.test.js` 가 단언한다.
 *
 * 환불 정책 본문은 `lib/legal/legalContent.ts` 의 이용약관 12조를 **전문 그대로** 렌더한다.
 * 🔴 요약본으로 줄이지 말 것 — `/zh/insights` 는 자체 콘텐츠가 369자뿐이라 푸터가 1,431자 이상을
 * 내야 `verify-adsense-readiness` 의 1,800자 게이트를 넘는다. zh 전문이 971자이고 링크·라벨이
 * 약 729자라 마진이 400자 남짓밖에 없다.
 */

/** 사업자 정보는 **등록된 원문이 곧 법적 형식**이라 값을 번역하지 않는다(라벨만 번역). */
const BUSINESS_INFO_VALUES = {
  name: "코드 데스티니 (Code Destiny)",
  representative: "박병하",
  registrationNo: "372-23-02329",
  mailOrderNo: "제 2026-화성호-0264 호",
  phone: "050-6664-7398",
  email: "admin@code-destiny.com",
  address: "경기도 화성시 효행구 비봉면 새비봉동로 37, 101동 1207호",
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

/** `legalContent` 문단의 `**강조**` 마커를 없앤다. 푸터는 한국어판과 동일하게 평문으로 렌더한다. */
function stripEmphasis(text) {
  return String(text).replace(/\*\*/g, "");
}

export default function LocaleFooterHub({ locale }) {
  const copy = SITE_FOOTER_HUB_COPY[locale];
  const refundSection = getRefundSection(locale);
  const translationNotice = LEGAL_TRANSLATION_NOTICE[locale];

  return (
    <footer className={styles.sfhRoot} aria-label={copy.footerAriaLabel}>
      <div className={`${styles.sfhNebula} ${styles.sfhNebulaLeft}`} aria-hidden />
      <div className={`${styles.sfhNebula} ${styles.sfhNebulaRight}`} aria-hidden />
      <div className={`${styles.sfhStars} ${styles.sfhStarsNear}`} aria-hidden />
      <div className={`${styles.sfhStars} ${styles.sfhStarsFar}`} aria-hidden />

      <div className={styles.sfhShell}>
        <section aria-label={copy.hubAriaLabel}>
          <p className={styles.sfhKicker}>{copy.kicker}</p>
          <p className={styles.sfhTitle}>{copy.title}</p>
          <p className={styles.sfhSubtitle}>{copy.subtitle}</p>

          <div className={styles.sfhGroupGrid}>
            {FOOTER_LINK_GROUPS.map((group) => {
              const groupTitle = copy.groupTitles[group.titleKey];
              return (
                <section key={group.titleKey} className={styles.sfhCard} aria-label={groupTitle}>
                  <h2 className={styles.sfhGroupTitle}>{groupTitle}</h2>
                  <nav className={styles.sfhLinkNav} aria-label={`${groupTitle} ${copy.linkNavSuffix}`}>
                    {group.hrefs.map((href) => (
                      <a key={href} href={href} className={styles.sfhLink}>
                        {copy.linkLabels[href]}
                      </a>
                    ))}
                  </nav>
                </section>
              );
            })}
          </div>

          <section aria-label={copy.refundAriaLabel}>
            <h2 style={{ fontSize: '1.25rem', marginTop: '2rem', marginBottom: '1rem', fontWeight: 600 }}>{copy.refundTitle}</h2>
            <p style={{ marginBottom: '1.5rem', lineHeight: 1.6 }}>{copy.refundIntro}</p>
            <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
              {refundSection.paragraphs.map((rule) => (
                <li key={rule} style={{ marginBottom: '0.75rem', lineHeight: 1.6 }}>
                  {stripEmphasis(rule)}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: '0.95rem', color: '#666', lineHeight: 1.6, marginBottom: '0.5rem' }}>
              {copy.refundClosingPolicy}
            </p>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#333', marginBottom: '0.5rem' }}>
              {copy.refundClosingMethod}
            </p>
            <p style={{ fontSize: '0.85rem', color: '#777', lineHeight: 1.6 }}>{translationNotice}</p>
          </section>
        </section>

        {/* 카피를 prop 으로 내린다 — SocialFooter 가 직접 import 하면 클라이언트 번들로 샌다. */}
        <SocialFooter copy={copy.social} />

        <section aria-label={copy.businessAriaLabel} style={{ marginTop: '1.5rem', fontSize: '0.8rem', lineHeight: 1.7, opacity: 0.85 }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>{copy.businessTitle}</h2>
          <p style={{ margin: 0 }}>
            {BUSINESS_INFO_KEYS.map((key, index) => (
              <span key={key}>
                {index > 0 ? " | " : null}
                <strong>{copy.businessLabels[key]}</strong>:{" "}
                {/* 법인 상호·대표자명·신고번호·사업장 주소는 **등록된 그대로가 법적 형식**이라
                    번역하지 않는다. data-cd-no-trans 로 런타임 번역 대상에서 명시적으로 제외한다. */}
                <span data-cd-no-trans>{BUSINESS_INFO_VALUES[key]}</span>
              </span>
            ))}
          </p>
        </section>

        <nav aria-label={copy.policyNavAriaLabel} className={styles.sfhPolicyNav}>
          {FOOTER_POLICY_HREFS.map((href) => (
            <a key={href} href={href} className={styles.sfhPolicyLink}>
              {copy.policyLabels[href]}
            </a>
          ))}
        </nav>

        <p className={styles.sfhCopyright}>{copy.copyright}</p>
      </div>
    </footer>
  );
}
