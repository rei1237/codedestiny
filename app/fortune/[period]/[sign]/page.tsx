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
import { FORTUNE_PERIOD_IDS, PERIOD_LABEL, PERIOD_TITLE, isFortunePeriodId } from "@/lib/fortune/periods";
import { SIGN_PROFILES, getSignProfile } from "@/lib/fortune/sign-profiles";
import SignFortuneView from "./SignFortuneView";

export const dynamicParams = false;

export function generateStaticParams() {
  return FORTUNE_PERIOD_IDS.flatMap((period) =>
    SIGN_PROFILES.map((profile) => ({ period, sign: profile.id })),
  );
}

function seoText(periodParam: string, signParam: string) {
  if (!isFortunePeriodId(periodParam)) return null;
  const profile = getSignProfile(signParam);
  if (!profile) return null;
  const vm = buildSignViewModel(profile, periodParam);
  if (!vm) return null;

  const kindLabel = profile.kind === "zodiac" ? "별자리" : "띠";
  const title = PERIOD_TITLE[periodParam];
  return {
    vm,
    kindLabel,
    path: `/fortune/${periodParam}/${profile.id}`,
    title: `${profile.nameKo} ${title} 운세 (${vm.rangeLabel}) | 무료 ${kindLabel} 운세 - 코드 데스티니`,
    description:
      `${vm.rangeLabel} ${profile.nameKo} ${title} 운세. 총운 ${vm.score.overall}점, ` +
      `애정운·재물운·건강운·직장운과 행운의 색 ${vm.entry.lucky.color_kr}, 행운의 숫자 ${vm.entry.lucky.number}까지. ` +
      `${vm.facts[0]?.label} ${vm.facts[0]?.value} 기준으로 계산한 무료 운세이며 산출 근거를 함께 공개합니다.`,
    keywords: [
      `${profile.nameKo} 운세`,
      `${profile.nameKo} ${PERIOD_LABEL[periodParam]} 운세`,
      `${title} 운세`,
      `${kindLabel} 운세`,
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
  const faqJsonLd = buildFaqPageJsonLd(vm.profile.faqs);

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
