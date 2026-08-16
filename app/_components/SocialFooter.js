import styles from "../components/SiteFooterHub.module.css";
import { SOCIAL_PROFILES } from "../../lib/seo/siteSeo";

// 아이콘·색 토큰만 여기서 관리한다.
// - URL 정본은 lib/seo/siteSeo.ts 의 SOCIAL_PROFILES 이며 schema.org Organization 의 sameAs 가
//   같은 배열에서 파생된다 — 링크와 스키마가 갈라지지 않게 URL 은 반드시 그쪽만 고친다.
// - 라벨·aria-label 은 **호출자가 prop 으로 내려준다.**
//
// 🔴 여기서 lib/i18n/siteFooterHubCopy 를 import 하지 말 것. 이 컴포넌트는
//    SiteFooterHub → AppChrome("use client") 경로에 있어 **클라이언트 번들에 포함된다.**
//    실측(2026-08-16): 5개 로케일 카피 테이블을 여기서 import 했더니
//    layout 청크가 41,007B → 63,469B(+22KB)로 늘었다 — 로케일 페이지는 429개 중 41개인데
//    비용은 전 사용자가 낸다. 이게 핸드오프에서 A안이 기각된 바로 그 이유다.
//    ko 문자열은 SiteFooterHub 가 자기 표에서, 로케일 문자열은 서버 전용 LocaleFooterHub 가 넘긴다.
const SOCIAL_PRESENTATION = {
  youtube: { icon: "▶", tone: "Youtube" },
  threads: { icon: "@", tone: "Threads" },
  instagram: { icon: "◎", tone: "Instagram" },
  naverBlog: { icon: "N", tone: "Blog" },
  x: { icon: "X", tone: "X" },
};

const SOCIAL_LINKS = SOCIAL_PROFILES
  .filter((profile) => SOCIAL_PRESENTATION[profile.key])
  .map((profile) => ({ key: profile.key, href: profile.url, ...SOCIAL_PRESENTATION[profile.key] }));

export default function SocialFooter({ copy }) {
  return (
    <section className={styles.sfhSocialCard} aria-label={copy.sectionAriaLabel}>
      <div className={styles.sfhSocialHeader}>
        <span className={styles.sfhSocialKicker}>{copy.kicker}</span>
        <strong className={styles.sfhSocialTitle}>{copy.title}</strong>
      </div>
      <nav className={styles.sfhSocialGrid} aria-label={copy.navAriaLabel}>
        {SOCIAL_LINKS.map((link) => {
          const label = copy.labels[link.key];
          return (
            <a
              key={link.href}
              className={`${styles.sfhSocialLink} ${styles[`sfhSocialLink${link.tone}`]}`}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.linkAriaTemplate.replace("{channel}", label)}
            >
              <span className={styles.sfhSocialIcon} aria-hidden="true">{link.icon}</span>
              <span className={styles.sfhSocialText}>{label}</span>
            </a>
          );
        })}
      </nav>
    </section>
  );
}
