import Link from "next/link";
import { buildSeoMetadata } from "../lib/seo";
import { publicSeoPages } from "../lib/seo/siteSeo";
import {
  buildOrganizationJsonLd,
  buildWebPageJsonLd,
  buildWebsiteJsonLd,
} from "../lib/structured-data";
import styles from "./home-cosmic.module.css";

const page = publicSeoPages.home;

export const metadata = buildSeoMetadata({
  path: page.path,
  title: page.title,
  description: page.description,
  keywords: page.keywords,
});

const SERVICE_LINKS = [
  { href: "/manse", label: "무료 만세력 사주 분석" },
  { href: "/saju/basic", label: "사주 만세력 기본 해석" },
  { href: "/tarot", label: "무료 타로 카드 리딩" },
  { href: "/today", label: "오늘의 운세 보기" },
  { href: "/saju/compatibility", label: "사주 궁합 해석" },
  { href: "/ziwei", label: "자미두수 12궁 명반" },
  { href: "/astrology", label: "점성술 출생차트" },
  { href: "/sukuyo", label: "숙요점 27숙 궁합" },
  { href: "/high-value", label: "운세 인사이트 가이드" },
];

const latestInsights = [
  {
    href: "/high-value/complete-guide-to-saju",
    category: "사주 입문",
    title: "사주를 처음 읽는 순서",
    excerpt: "명식, 오행, 십성, 대운을 어떤 순서로 살펴보면 좋은지 정리했습니다.",
  },
  {
    href: "/high-value/how-tarot-actually-works",
    category: "타로 리딩",
    title: "타로가 작동하는 방식",
    excerpt: "카드 상징을 질문과 행동으로 연결하는 안전한 리딩 방식을 설명합니다.",
  },
  {
    href: "/high-value/top-10-signs-of-compatibility",
    category: "궁합과 관계",
    title: "관계 궁합에서 확인할 신호",
    excerpt: "점수보다 중요한 소통 리듬, 갈등 회복, 경계 설정을 살펴봅니다.",
  },
];

export default function HomePage() {
  const orgJsonLd = buildOrganizationJsonLd();
  const websiteJsonLd = buildWebsiteJsonLd();
  const webPageJsonLd = buildWebPageJsonLd({
    title: page.title,
    description: page.description,
    path: page.path,
  });

  return (
    <main className={styles.pageWrap}>
      <div className={styles.pageGlow} aria-hidden />

      <header className={`${styles.panel} ${styles.heroPanel}`}>
        <span className={styles.heroKicker}>Code Destiny</span>
        <h1 className={styles.heroTitle}>{page.h1}</h1>
        <p className={styles.heroLead}>
          사주팔자, 만세력, 타로, 자미두수, 점성술, 숙요점, 궁합, 오늘의 운세를 한곳에서 살펴볼 수 있습니다.
          각 기능은 오락과 자기성찰을 위한 참고 정보로 제공되며, 중요한 판단은 현실의 정보와 함께 확인하도록 안내합니다.
        </p>
        <div className={styles.badgeRow}>
          <Link className={styles.badge} href="/manse">무료 사주 보기</Link>
          <Link className={styles.badge} href="/tarot">타로 카드 뽑기</Link>
          <Link className={styles.badge} href="/today">오늘의 운세 보기</Link>
        </div>
      </header>

      <section className={`${styles.panel} ${styles.musicPanel}`} data-marker="react-home-dest1nova-music-v20260615">
        <Link href="/music" className={styles.musicEntry} aria-label="DEST1NOVA 달빛 플레이리스트 감상하기">
          <span className={styles.musicCovers} aria-hidden="true">
            <span className={`${styles.musicAlbum} ${styles.musicAlbumNeo}`}>
              <img src="https://music.code-destiny.com/neosong/%EB%84%A4%EC%98%A4%20%EB%8D%B0%EB%B7%94.webp" alt="" loading="lazy" decoding="async" />
            </span>
            <span className={`${styles.musicAlbum} ${styles.musicAlbumYeoni}`}>
              <img src="https://music.code-destiny.com/yeonisong/%EA%BD%83%EB%8F%BC%EC%A7%80%201%EC%A7%91.webp" alt="" loading="lazy" decoding="async" />
            </span>
            <span className={`${styles.musicAlbum} ${styles.musicAlbumDest1nova}`}>
              <img src="https://music.code-destiny.com/DEST1NOVA/DEST1NOVA.webp" alt="" loading="lazy" decoding="async" />
            </span>
          </span>
          <span className={styles.musicCopy}>
            <span className={styles.musicKicker}>MOON MUSIC</span>
            <strong>달빛 아래, DEST1NOVA까지 열린 플레이리스트</strong>
            <span>네오와 연이의 미니 앨범, DEST1NOVA의 별빛 트랙까지 한 번에 이어집니다.</span>
          </span>
          <span className={styles.musicCta}>53곡 감상하기</span>
        </Link>
      </section>

      <section className={`${styles.panel} ${styles.sectionPanel}`}>
        <h2 className={styles.sectionTitle}>주요 운세 서비스</h2>
        <p className={styles.sectionLead}>
          검색과 사용 흐름이 분명하도록 대표 기능을 주제별 랜딩 페이지로 연결했습니다.
        </p>
        <div className={styles.serviceGrid}>
          {SERVICE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.serviceLink}>
              <span className={styles.serviceText}>{link.label}</span>
              <span className={styles.serviceArrow} aria-hidden>→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${styles.panel} ${styles.sectionPanel}`}>
        <h2 className={styles.sectionTitle}>운세 인사이트</h2>
        <p className={styles.sectionLead}>
          처음 방문한 사용자도 각 운세 체계의 핵심 개념과 활용 방법을 먼저 이해할 수 있도록 공개 가이드를 제공합니다.
        </p>
        <div className={styles.insightGrid}>
          {latestInsights.map((item) => (
            <Link key={item.href} href={item.href} className={styles.insightCard}>
              <p className={styles.insightCategory}>{item.category}</p>
              <h3 className={styles.insightTitle}>{item.title}</h3>
              <p className={styles.insightExcerpt}>{item.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    </main>
  );
}
