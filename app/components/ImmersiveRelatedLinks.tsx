import Link from "next/link";
import ContentIntegrityNote from "./ContentIntegrityNote";
import { getSeoRouteProfile, getTopicClusterLinks } from "../../lib/seo/entity-registry.mjs";

/**
 * 몰입형 운세 라우트의 내부 링크 출구.
 *
 * 왜 있는가: 렌더 실측(2026-08-27, dist·out 양쪽 388개 색인 URL 전량)에서 **18개 라우트가
 * `<a href>` 를 하나도 서버 렌더하지 않았다.** 링크를 받기만 하고 내보내지 않는 막다른 길이
 * 색인 대상의 4.6% 였다. 원인은 사고가 아니라 docs/CURRENT_DEV_BASELINE.md 의 Working Rule 4 —
 * 몰입형 라우트는 공유 헤더·푸터·하단 네비를 렌더하지 않는다 — 의 부작용이다.
 *
 * 🔴 그 Working Rule 은 그대로 둔다. 이 컴포넌트는 공유 크롬이 아니라 **페이지 자신의 본문
 *    최하단 블록**이고, 몰입 구간을 지난 뒤에 나온다(ServiceIntroSection 의 "배치는 인터랙티브
 *    앱 아래" 와 같은 판단).
 *
 * 🔴 링크는 서버에서 렌더해야 의미가 있다 — 크롤러가 보는 것은 정적 HTML 이고, 클라이언트
 *    컴포넌트 안에 넣으면 산출물의 `<a href>` 수가 그대로 0 이다. 그래서 서버 컴포넌트다.
 *
 * 선례: app/tarot/mindscan/page.tsx 가 같은 모양(몰입형 클라이언트 뒤의 서버 렌더 <nav>)이고,
 * 그래서 /tarot/mindscan 은 18개 목록에 없었다.
 *
 * 링크 출처는 손으로 든 목록이 아니라 lib/seo/entity-registry.mjs 의 토픽 클러스터다.
 * 레지스트리에 프로필이 없는 라우트만 CURATED_RELATED_PATHS 로 보완하고, 라벨은 어느 쪽이든
 * 레지스트리 프로필의 title 을 쓴다(문구가 두 벌로 갈리지 않게).
 */

const RELATED_LINK_LIMIT = 4;

/**
 * 몰입형 라우트의 발행일(page.tsx 첫 커밋일, `git log --diff-filter=A --format=%as -- <page>`)과
 * 검수 노트를 붙인 날. 검수 노트(ContentIntegrityNote)는 저자·발행/수정일·정책 링크 4개를 서버 렌더하는데,
 * 이 19개 라우트는 공유 크롬을 렌더하지 않아 그 신호가 0 이었다(AdSense "가치 낮은 콘텐츠" 반려 축, 2026-09-06).
 *
 * 🔴 fromPath 가 이 표에 없으면 빌드가 선다 — 날짜 없는 노트("발행 불명")를 조용히 내보내지 않기 위해서다
 *    (CURATED_RELATED_PATHS 의 오타 판정과 같은 fail-closed).
 */
const ROUTE_DATES: Record<string, { datePublished: string; dateModified: string }> = {
  "/life-book-ai": { datePublished: "2026-06-27", dateModified: "2026-09-06" },
  "/love-secret-ai": { datePublished: "2026-06-27", dateModified: "2026-09-06" },
  "/master-love-codex": { datePublished: "2026-07-29", dateModified: "2026-09-06" },
  "/naming-ai": { datePublished: "2026-07-11", dateModified: "2026-09-06" },
  "/neo-operation-room": { datePublished: "2026-06-30", dateModified: "2026-09-06" },
  "/new-year-ai-consultation": { datePublished: "2026-06-27", dateModified: "2026-09-06" },
  "/oracle/rune": { datePublished: "2026-05-01", dateModified: "2026-09-06" },
  "/reviews": { datePublished: "2026-07-29", dateModified: "2026-09-06" },
  "/saju-fpti": { datePublished: "2026-05-19", dateModified: "2026-09-06" },
  "/saju-guardian": { datePublished: "2026-06-17", dateModified: "2026-09-06" },
  "/saju/destiny-bias": { datePublished: "2026-05-12", dateModified: "2026-09-06" },
  "/saju/destiny-meeting-place": { datePublished: "2026-05-19", dateModified: "2026-09-06" },
  "/saju/love-simulation": { datePublished: "2026-04-04", dateModified: "2026-09-06" },
  "/sukuyo-compatibility-ai": { datePublished: "2026-06-27", dateModified: "2026-09-06" },
  "/tarot/prompt-maker": { datePublished: "2026-05-31", dateModified: "2026-09-06" },
  "/vedic-ai": { datePublished: "2026-06-27", dateModified: "2026-09-06" },
  "/yeon-star-hug": { datePublished: "2026-05-18", dateModified: "2026-09-06" },
  "/ziwei-ai": { datePublished: "2026-06-27", dateModified: "2026-09-06" },
  "/ziwei/chart": { datePublished: "2026-04-02", dateModified: "2026-09-06" },
};
const FUSION_PATH = "/fusion-fortune";

/**
 * 레지스트리에 프로필이 없는 라우트의 보완표.
 *
 * 🔴 여기에 프로필을 새로 만들어 entity-registry 에 넣지 않는 이유 — SEO_ROUTE_PROFILES 는
 *    랜딩 템플릿의 키워드·클러스터 링크·구조화 데이터가 함께 읽는 공용 정본이라, 항목을
 *    추가하면 이 작업 범위 밖의 페이지 문구까지 움직인다.
 *
 * 값은 목적지 **경로**만 둔다. 라벨은 목적지 프로필의 title 에서 가져오므로 여기서 문구를
 * 다시 쓰지 않는다(= 목적지 제목이 바뀌면 이 표를 고칠 필요가 없다).
 */
const CURATED_RELATED_PATHS: Record<string, readonly string[]> = {
  "/neo-operation-room": ["/saju", "/today", "/manse"],
  "/reviews": ["/saju", "/tarot", "/ziwei"],
  "/saju-guardian": ["/saju", "/manse", "/today"],
  "/saju-fpti": ["/saju", "/animal/mbti", "/manse"],
  "/saju/destiny-bias": ["/saju", "/saju/compatibility", "/compatibility"],
  "/saju/destiny-meeting-place": ["/love", "/compatibility", "/saju"],
  "/saju/love-simulation": ["/love", "/saju/compatibility", "/compatibility"],
  "/tarot/prompt-maker": ["/tarot", "/tarot/mindscan", "/tarot/guide"],
  "/yeon-star-hug": ["/astrology", "/today", "/tarot"],
  "/ziwei/chart": ["/ziwei", "/ziwei-ai", "/saju"],
};

/* ServiceIntroSection(app/components/ServiceIntroSection.tsx)과 같은 토큰을 쓴다 — 그 패널
   바로 아래에 붙는 경우가 9개라, 색이 갈리면 두 블록이 서로 다른 페이지처럼 보인다.
   light 는 /yeon-star-hug 하나뿐이다(그 라우트만 크림색 배경 위에 흰 카드를 쌓는다). */
const TONE = {
  dark: {
    section: "mx-auto w-full max-w-3xl px-4 pb-14 md:px-6",
    panel: "rounded-3xl border border-white/10 bg-[#10172b] px-5 py-6 md:px-8",
    heading: "text-sm font-semibold text-amber-100",
    link: "inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 text-sm text-slate-200 transition hover:border-amber-100/50 hover:text-amber-50",
  },
  light: {
    section: "mx-auto w-full max-w-[1440px] px-4 pb-10 md:px-6 lg:px-8",
    panel: "rounded-3xl border border-[#f4d8e3] bg-white/85 px-5 py-6 md:px-8",
    heading: "text-sm font-bold text-[#b31955]",
    link: "inline-flex min-h-11 items-center rounded-full border border-[#f4d8e3] px-4 text-sm text-[#70445c] transition hover:border-[#b31955]/50 hover:text-[#b31955]",
  },
} as const;

function resolveRelatedLinks(fromPath: string) {
  const clusterLinks = getTopicClusterLinks(fromPath) as { href: string; label: string }[];
  if (clusterLinks.length > 0) return clusterLinks.slice(0, RELATED_LINK_LIMIT);

  const curated = CURATED_RELATED_PATHS[fromPath] || [];
  return [...curated, FUSION_PATH]
    .map((path) => {
      const profile = getSeoRouteProfile(path) as { path: string; title: string } | null;
      /* 목적지를 오타로 적으면 라벨이 조용히 비는 대신 빌드가 선다 — 이 컴포넌트가
         서버 렌더라 정적 export 단계에서 터진다. */
      if (!profile) throw new Error(`ImmersiveRelatedLinks: ${fromPath} 의 관련 링크 목적지 ${path} 가 SEO_ROUTE_PROFILES 에 없다`);
      return { href: profile.path, label: profile.title };
    })
    .slice(0, RELATED_LINK_LIMIT);
}

export default function ImmersiveRelatedLinks({
  fromPath,
  tone = "dark",
}: {
  fromPath: string;
  tone?: keyof typeof TONE;
}) {
  const skin = TONE[tone];
  const links = resolveRelatedLinks(fromPath);
  if (links.length === 0) {
    throw new Error(`ImmersiveRelatedLinks: ${fromPath} 의 관련 링크가 0개다 — CURATED_RELATED_PATHS 에 항목을 넣을 것`);
  }
  const dates = ROUTE_DATES[fromPath];
  if (!dates) {
    throw new Error(`ImmersiveRelatedLinks: ${fromPath} 의 발행일이 ROUTE_DATES 에 없다 — page.tsx 첫 커밋일을 넣을 것`);
  }

  return (
    <div className={skin.section}>
      <nav aria-label="관련 운세" className={skin.panel}>
        <h2 className={skin.heading}>이어서 볼 만한 운세</h2>
        {/* 🔴 클릭 계측을 새로 만들지 않는다 — js/core/analytics.js:143 의 앵커 위임이 이 표식을 보고
            cross_sell_click{from_service,to_service} 로 집계한다. 서버 컴포넌트라 onClick 을 달 수도 없다.
            표식이 없으면 이 19개 라우트의 이어보기 클릭이 어디에도 안 잡힌다(docs/analytics-kpi.md §3 크로스셀 KPI 의 분자). */}
        <ul className="mt-4 flex flex-wrap gap-3" data-cd-cross-sell={fromPath}>
          {links.map((link) => (
            <li key={link.href}>
              <Link href={`${link.href}/`} className={skin.link}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* 검수 노트는 관련 링크와 같은 폭·같은 톤으로 그 아래에 둔다(app/guides/[slug]/page.js 의 본문 하단 배치와 같은 판단).
          이 컴포넌트가 몰입형 19개 라우트의 유일한 서버 렌더 하단 블록이라, 여기가 저자·날짜·정책 링크의 유일한 자리다. */}
      <ContentIntegrityNote
        contentSource="authored"
        datePublished={dates.datePublished}
        dateModified={dates.dateModified}
        tone={tone}
      />
    </div>
  );
}
