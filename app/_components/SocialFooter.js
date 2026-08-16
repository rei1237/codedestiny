import styles from "../components/SiteFooterHub.module.css";
import { SOCIAL_PROFILES } from "../../lib/seo/siteSeo";

// 표시용 메타데이터만 여기서 관리한다. URL 정본은 lib/seo/siteSeo.ts 의 SOCIAL_PROFILES 이며
// schema.org Organization 의 sameAs 가 같은 배열에서 파생된다 — 링크와 스키마가 갈라지지 않게
// URL 은 반드시 그쪽만 고친다.
const SOCIAL_PRESENTATION = {
  youtube: { label: "유튜브", icon: "▶", tone: "Youtube", ariaLabel: "Code Destiny 공식 유튜브 새 창으로 열기" },
  threads: { label: "쓰레드", icon: "@", tone: "Threads", ariaLabel: "Code Destiny 공식 쓰레드 새 창으로 열기" },
  instagram: { label: "인스타그램", icon: "◎", tone: "Instagram", ariaLabel: "Code Destiny 공식 인스타그램 새 창으로 열기" },
  naverBlog: { label: "블로그", icon: "N", tone: "Blog", ariaLabel: "Code Destiny 공식 블로그 새 창으로 열기" },
  x: { label: "X", icon: "X", tone: "X", ariaLabel: "Code Destiny 공식 X 새 창으로 열기" },
};

const SOCIAL_LINKS = SOCIAL_PROFILES
  .filter((profile) => SOCIAL_PRESENTATION[profile.key])
  .map((profile) => ({ href: profile.url, ...SOCIAL_PRESENTATION[profile.key] }));

export default function SocialFooter() {
  return (
    <section className={styles.sfhSocialCard} aria-label="Code Destiny 공식 SNS 채널">
      <div className={styles.sfhSocialHeader}>
        <span className={styles.sfhSocialKicker}>Official Channels</span>
        <strong className={styles.sfhSocialTitle}>Code Destiny 공식 채널</strong>
      </div>
      <nav className={styles.sfhSocialGrid} aria-label="Code Destiny SNS 바로가기">
        {SOCIAL_LINKS.map((link) => (
          <a
            key={link.href}
            className={`${styles.sfhSocialLink} ${styles[`sfhSocialLink${link.tone}`]}`}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.ariaLabel}
          >
            <span className={styles.sfhSocialIcon} aria-hidden="true">{link.icon}</span>
            <span className={styles.sfhSocialText}>{link.label}</span>
          </a>
        ))}
      </nav>
    </section>
  );
}
