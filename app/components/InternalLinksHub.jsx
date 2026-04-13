/**
 * InternalLinksHub — SEO 내부 링크 강화 허브 (Server Component)
 *
 * 목적:
 *  - 구글 크롤러가 사이트의 모든 핵심 페이지를 "중요 페이지"로 인식하도록
 *    서비스 링크 + 최신 인사이트 + 가이드 아카이브를 한 곳에 집약
 *  - next/link prefetch(기본 활성) 로 크롤러 & 사용자 모두에게 빠른 네비게이션 제공
 *  - Space-themed 코즈믹 감성 유지 (퍼플/틸 팔레트, #070b1f 배경)
 */
import Link from "next/link";
import { INSIGHT_ARTICLES } from "../insights/articles";
import { HIGH_VALUE_PAGES } from "../high-value/content";

// ── 인기 서비스 링크 ───────────────────────────────────────────
const SERVICE_LINKS = [
  { href: "/saju/basic",           label: "사주팔자 기본 풀이",       badge: "무료",    icon: "🌸" },
  { href: "/tarot/mingri",         label: "명리학 AI 타로",           badge: "30코인",  icon: "🔮" },
  { href: "/tarot/healing",        label: "힐링 타로",                badge: "무료",    icon: "☀" },
  { href: "/ziwei/chart",          label: "자미두수 명반",            badge: "무료",    icon: "⭐" },
  { href: "/astrology/cosmic",     label: "코즈믹 점성술",            badge: "무료",    icon: "🌙" },
  { href: "/oracle/hwatu-life",    label: "화투 인생 패 테스트",      badge: "무료",    icon: "🎴" },
  { href: "/oracle/royal-tea",     label: "타세오그래피 찻잎 점",     badge: "무료",    icon: "☕" },
  { href: "/oracle/sikojen-povailu", label: "핀란드 주석점",          badge: "무료",    icon: "🌊" },
  { href: "/saju/love-simulation", label: "사주 연애 시뮬레이션",     badge: "무료",    icon: "💕" },
  { href: "/saju-picture",         label: "사주 그림 분석",           badge: "무료",    icon: "🖼" },
  { href: "/tarot/mindscan",       label: "마인드스캔 타로",          badge: "50코인",  icon: "🧠" },
  { href: "/tarot/crystal-soul",   label: "크리스탈 소울 타로",       badge: "50코인",  icon: "💎" },
];

// ── 스타일 상수 (Space-themed) ─────────────────────────────────
const WRAPPER_STYLE = {
  background:
    "linear-gradient(180deg, #070b1f 0%, rgba(15,5,40,0.98) 50%, #070b1f 100%)",
  borderTop: "1px solid rgba(124,58,237,0.18)",
  borderBottom: "1px solid rgba(78,205,196,0.12)",
  padding: "48px 0 40px",
  position: "relative",
  overflow: "hidden",
};

const INNER_STYLE = {
  maxWidth: "1100px",
  margin: "0 auto",
  padding: "0 20px",
};

const SECTION_HEADING_STYLE = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(167,139,250,0.7)",
  marginBottom: "14px",
  paddingBottom: "8px",
  borderBottom: "1px solid rgba(124,58,237,0.14)",
};

const DIVIDER_STYLE = {
  border: "none",
  borderTop: "1px solid rgba(78,205,196,0.10)",
  margin: "28px 0",
};

// ── 서비스 카드 ────────────────────────────────────────────────
function ServiceCard({ href, icon, label, badge }) {
  return (
    <Link
      href={href}
      prefetch={true}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "9px 13px",
        borderRadius: "8px",
        border: "1px solid rgba(124,58,237,0.2)",
        background: "rgba(124,58,237,0.07)",
        color: "rgba(255,255,255,0.82)",
        fontSize: "13px",
        textDecoration: "none",
        transition: "background 0.15s, border-color 0.15s",
        overflow: "hidden",
      }}
    >
      <span style={{ fontSize: "15px", flexShrink: 0 }}>{icon}</span>
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {badge && (
        <span
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: badge === "무료" ? "#4ecdc4" : "#a78bfa",
            background:
              badge === "무료"
                ? "rgba(78,205,196,0.12)"
                : "rgba(167,139,250,0.12)",
            borderRadius: "4px",
            padding: "1px 5px",
            flexShrink: 0,
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

// ── 아티클 행 ──────────────────────────────────────────────────
function ArticleRow({ href, title, category, updatedAt }) {
  return (
    <Link
      href={href}
      prefetch={true}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "8px 0",
        borderBottom: "1px solid rgba(124,58,237,0.08)",
        textDecoration: "none",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          marginTop: "2px",
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background: "linear-gradient(135deg,#a78bfa,#4ecdc4)",
          display: "inline-block",
        }}
      />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: "13px",
            color: "rgba(255,255,255,0.8)",
            lineHeight: "1.45",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: "11px",
            color: "rgba(167,139,250,0.55)",
            marginTop: "2px",
            display: "block",
          }}
        >
          {category}
          {updatedAt && (
            <> · <time dateTime={updatedAt}>{updatedAt.slice(0, 10)}</time></>
          )}
        </span>
      </span>
    </Link>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function InternalLinksHub() {
  // 최신 인사이트 15개 (updatedAt 기준 최신순)
  const recentInsights = [...INSIGHT_ARTICLES]
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    .slice(0, 15);

  // 가이드 아카이브 상위 10개
  const guidePages = HIGH_VALUE_PAGES.slice(0, 10);

  return (
    <section aria-label="서비스 및 콘텐츠 내부 링크 허브" style={WRAPPER_STYLE}>
      {/* 배경 장식 — 코즈믹 그래디언트 오브 */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-60px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "200px",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(124,58,237,0.09) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={INNER_STYLE}>
        {/* ── 1. 인기 서비스 ──────────────────────────────── */}
        <h2 style={SECTION_HEADING_STYLE}>✦ 인기 서비스</h2>
        <nav aria-label="인기 서비스 목록">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))",
              gap: "8px",
            }}
          >
            {SERVICE_LINKS.map((s) => (
              <ServiceCard key={s.href} {...s} />
            ))}
          </div>
        </nav>

        <hr style={DIVIDER_STYLE} />

        {/* ── 2. 최신 인사이트 + 가이드 아카이브 (2열) ────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "32px",
          }}
        >
          {/* 최신 인사이트 */}
          <div>
            <h2 style={SECTION_HEADING_STYLE}>📖 최신 인사이트</h2>
            <nav aria-label="최신 인사이트 목록">
              {recentInsights.map((article) => (
                <ArticleRow
                  key={article.slug}
                  href={`/insights/${article.slug}`}
                  title={article.title}
                  category={article.category}
                  updatedAt={article.updatedAt}
                />
              ))}
              <Link
                href="/insights"
                prefetch={true}
                style={{
                  display: "inline-block",
                  marginTop: "10px",
                  fontSize: "12px",
                  color: "#4ecdc4",
                  textDecoration: "none",
                  letterSpacing: "0.04em",
                }}
              >
                → 전체 인사이트 보기
              </Link>
            </nav>
          </div>

          {/* 가이드 아카이브 */}
          <div>
            <h2 style={SECTION_HEADING_STYLE}>📚 가이드 아카이브</h2>
            <nav aria-label="가이드 아카이브 목록">
              {guidePages.map((page) => (
                <ArticleRow
                  key={page.slug}
                  href={`/high-value/${page.slug}`}
                  title={page.title}
                  category={page.category}
                  updatedAt={page.updatedAt}
                />
              ))}
              <Link
                href="/high-value"
                prefetch={true}
                style={{
                  display: "inline-block",
                  marginTop: "10px",
                  fontSize: "12px",
                  color: "#4ecdc4",
                  textDecoration: "none",
                  letterSpacing: "0.04em",
                }}
              >
                → 전체 가이드 보기
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}
