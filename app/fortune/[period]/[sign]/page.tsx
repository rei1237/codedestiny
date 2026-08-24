/**
 * /fortune/{today|tomorrow|weekly|monthly}/{별자리·띠 24종} — 정적 생성 96 라우트.
 *
 * 원래 이 자리에는 fortune/{period}/{sign}.html 정적 셸 96개가 있었다. 본문을 브라우저에서
 * 그렸고(크롤러가 받는 텍스트 0자), JSON-LD 가 `{}` 였고, sitemap 에도 내부 링크에도 없었다.
 * 게다가 js/fortune-engine.js 의 getDateStr 은 weekly/monthly 를 분기하지 않아 네 기간이
 * 같은 파일을 읽었다 — 기간별 본문이 100% 같았다는 뜻이다.
 *
 * 지금은 기간마다 실제로 다른 축을 쓴다(lib/fortune/build-view.ts 참고).
 */
import { notFound } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildWebPageJsonLd,
} from "@/lib/structured-data";
import { buildSignViewModel } from "@/lib/fortune/build-view";
import { buildPeriodFaqs } from "@/lib/fortune/period-faqs";
import { FORTUNE_PERIOD_IDS, PERIOD_LABEL, PERIOD_TITLE, isFortunePeriodId } from "@/lib/fortune/periods";
import { SIGN_PROFILES, getSignProfile } from "@/lib/fortune/sign-profiles";
import SignFortuneView from "./SignFortuneView";

export const dynamicParams = false;

export function generateStaticParams() {
  return FORTUNE_PERIOD_IDS.flatMap((period) =>
    SIGN_PROFILES.map((profile) => ({ period, sign: profile.id })),
  );
}

/** 메타 설명 상한. 한국어 SERP 는 대략 이 길이에서 잘린다. */
const DESCRIPTION_MAX = 155;

/**
 * sign 고유 문장을 앞세운 메타 설명을 만든다.
 *
 * 재료는 그날 그 sign 의 키워드와 총평이다. 둘 다 scripts/gen-daily.mjs 가 dateStr 과 sign 을
 * 함께 시드로 넣어 풀에서 뽑으므로 sign 축과 날짜 축이 동시에 갈라진다.
 *
 * 🔴 relation.detail 을 쓰지 말 것. 그럴듯해 보이지만 kind 가 "neutral" 인 sign 이 다수라
 *    ("특별한 합이나 충을 이루지 않는 날" 계열) 그 문장 자체가 또 하나의 공용 템플릿이다 —
 *    2026-08-24 에 실제로 그렇게 바꿨다가 설명 근중복 쌍이 295 → 301 로 **늘었다**.
 */
function buildSignDescription(
  vm: NonNullable<ReturnType<typeof buildSignViewModel>>,
  nameKo: string,
  periodTitle: string,
): string {
  const keyword = vm.entry.keyword?.kr?.trim();
  const head = keyword
    ? `${vm.rangeLabel} ${nameKo} ${periodTitle} 운세 — ${keyword}. `
    : `${vm.rangeLabel} ${nameKo} ${periodTitle} 운세. `;
  const tail = vm.entry.sections.overall?.kr?.trim()
    || `총운 ${vm.score.overall}점, 애정운·재물운·건강운·직장운과 행운의 색 ${vm.entry.lucky.color_kr}까지 함께 봅니다.`;
  const full = head + tail;
  if (full.length <= DESCRIPTION_MAX) return full;
  // 문장 경계에서 자른다 — 낱말 중간에서 끊기면 SERP 에서 읽히지 않는다.
  const cut = full.slice(0, DESCRIPTION_MAX);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("다. "), cut.lastIndexOf("요. "));
  return lastStop > head.length ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}…`;
}

function seoText(periodParam: string, signParam: string) {
  if (!isFortunePeriodId(periodParam)) return null;
  const profile = getSignProfile(signParam);
  if (!profile) return null;
  const vm = buildSignViewModel(profile, periodParam);
  if (!vm) return null;

  const kindLabel = profile.kind === "zodiac" ? "별자리" : "띠";
  // 검색어로 쓰이는 형태는 "띠 운세" 가 아니라 "띠별 운세" 다. 화면 문구(kindLabel)와
  // 분리해 둔다 — 브레드크럼·본문은 "띠" 가 자연스럽다.
  const kindSearchLabel = profile.kind === "zodiac" ? "별자리" : "띠별";
  const title = PERIOD_TITLE[periodParam];
  return {
    vm,
    kindLabel,
    path: `/fortune/${periodParam}/${profile.id}`,
    // 🔴 사이트 규약은 브랜드 접미사 없이 `무료 <키워드> | <보조 키워드>` 약 28자다
    // (/saju·/manse·/today·/ziwei 실측 25~28자). 이 라우트만 44자에 브랜드까지 붙어
    // 한국어 SERP 폭을 넘겼고, 잘린 꼬리가 하필 "무료 별자리 운세" 였다.
    title: `${profile.nameKo} ${title} 운세 ${vm.titleDateLabel} | 무료 ${kindSearchLabel} 운세`,
    // 🔴 설명은 이 sign 고유 문장으로 연다. 예전에는 총운 점수·행운의 색·행운의 숫자로
    //    시작했는데, 그 셋은 같은 날 여러 sign 이 같은 값을 갖는 일이 흔하다. 그러면 sign
    //    이름 하나만 다른 설명이 24개 깔린다 — 2026-08-24 실측: 색인 378개 중 설명이 70%
    //    이상 닮은 쌍이 295개였고 그중 264쌍이 /fortune 이었다("총운 6점 … 행운의 색
    //    아이보리" 가 양자리·천칭자리·궁수자리에 그대로 반복). GSC 「크롤링됨 – 현재 색인이
    //    생성되지 않음」이 380쪽인 상태에서 이 모양은 그 판정을 그대로 부른다.
    //    vm.relation.detail 은 그날 일진·달자리와 이 sign 의 관계를 서술한 문장이라
    //    sign 마다 실제로 다르다(본문에도 같은 문장이 쓰인다).
    description: buildSignDescription(vm, profile.nameKo, title),
    keywords: [
      `${profile.nameKo} 운세`,
      `${profile.nameKo} ${PERIOD_LABEL[periodParam]} 운세`,
      `${title} 운세`,
      `${kindSearchLabel} 운세`,
      "무료 운세",
      "오늘의 운세",
    ],
  };
}

export function generateMetadata({ params }: { params: { period: string; sign: string } }) {
  const seo = seoText(params.period, params.sign);
  if (!seo) return {};
  return buildSeoMetadata({
    path: seo.path,
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    // 이 라우트는 Article JSON-LD 를 내면서 og:type 만 기본값 website 였다(lib/seo.ts:87).
    // 기간 허브(/fortune/{period})는 목록이라 website 가 맞으므로 상세만 바꾼다.
    ogType: "article",
  });
}

export default function SignFortunePage({ params }: { params: { period: string; sign: string } }) {
  const seo = seoText(params.period, params.sign);
  if (!seo) notFound();

  const { vm, kindLabel } = seo;

  const webPageJsonLd = buildWebPageJsonLd({
    title: seo.title,
    description: seo.description,
    path: seo.path,
  });
  const articleJsonLd = buildArticleJsonLd({
    title: seo.title,
    description: seo.description,
    path: seo.path,
    category: `${kindLabel} 운세`,
    keywords: seo.keywords,
    datePublished: `${vm.dateKey.length === 7 ? `${vm.dateKey}-01` : vm.dateKey}T00:00:00+09:00`,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "오늘의 운세", path: "/today" },
    { name: `${PERIOD_LABEL[vm.period]} ${kindLabel} 운세`, path: `/fortune/${vm.period}` },
    { name: vm.profile.nameKo, path: seo.path },
  ]);
  const faqJsonLd = buildFaqPageJsonLd(buildPeriodFaqs(vm.profile, vm.period));

  return (
    <>
      <SignFortuneView vm={vm} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
