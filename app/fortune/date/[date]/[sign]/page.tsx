import { notFound } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildWebPageJsonLd } from "@/lib/structured-data";
import { buildDateSignViewModel } from "@/lib/fortune/build-view";
import { getSignProfile, getSiblingProfiles } from "@/lib/fortune/sign-profiles";
import { isValidFortuneDate, resolveFortuneArchiveDates } from "@/lib/fortune/daily-data";
import DateSignFortuneView from "./DateSignFortuneView";

export const dynamicParams = false;

type PageParams = { date: string; sign: string };

function dateTitleLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

function resolvePage(params: PageParams) {
  if (!isValidFortuneDate(params.date)) return null;
  if (!resolveFortuneArchiveDates().includes(params.date)) return null;
  const profile = getSignProfile(params.sign);
  if (!profile || profile.kind !== "animal") return null;
  const vm = buildDateSignViewModel(profile, params.date);
  return vm ? { vm, path: `/fortune/date/${params.date}/${params.sign}` } : null;
}

export function generateStaticParams() {
  const animalProfiles = getSiblingProfiles("animal");
  return resolveFortuneArchiveDates().flatMap((date) =>
    animalProfiles.map((profile) => ({ date, sign: profile.id })),
  );
}

export function generateMetadata({ params }: { params: PageParams }) {
  const page = resolvePage(params);
  if (!page) return {};
  const { vm } = page;
  const title = `${dateTitleLabel(vm.date)} ${vm.profile.nameKo} 운세`;
  const description = `${title}. 일진 ${vm.facts[0].value}, 월건 ${vm.facts[1].value}를 기준으로 총운·재물운·연애운·직장운·건강운을 정리합니다.`;
  return buildSeoMetadata({
    path: page.path,
    title,
    description,
    keywords: [title, `${vm.profile.nameKo} 일진 운세`, `${vm.profile.nameKo} 재물운`, `${vm.profile.nameKo} 연애운`],
  });
}

function buildDateFaqs(page: NonNullable<ReturnType<typeof resolvePage>>) {
  const { vm } = page;
  return [
    {
      question: `${dateTitleLabel(vm.date)} ${vm.profile.nameKo} 운세는 무엇을 기준으로 하나요?`,
      answer:
        `해당 날짜의 일진 ${vm.facts[0].value}, 월건 ${vm.facts[1].value}, 음력 날짜와 절기 값을 계산한 뒤 ${vm.profile.nameKo}의 띠 기질에 대입합니다. 총운·재물운·연애운·직장운·건강운은 기존 날짜 운세 패키지의 결정론적 결과를 사용합니다.`,
    },
    {
      question: `오늘의 ${vm.profile.nameKo} 운세와 날짜 페이지는 어떻게 다른가요?`,
      answer:
        "오늘의 운세는 현재 날짜로 움직이는 rolling 페이지이고, 날짜 페이지는 URL의 특정 날짜를 기준으로 보관된 결과를 보여 줍니다. 지난 날짜의 일진과 해석을 다시 확인하거나 검색 결과에서 바로 해당 날짜로 들어올 때 날짜 페이지를 이용할 수 있습니다.",
    },
    {
      question: `${vm.profile.nameKo} 운세를 사주 일간별 운세와 함께 봐도 되나요?`,
      answer:
        "띠별 날짜 운세는 태어난 해의 지지로 넓은 하루 흐름을 보고, 일간별 월간 운세는 태어난 날의 천간과 월건의 십성 관계를 봅니다. 서로 다른 축이므로 하나를 다른 것으로 바꾸지 말고, 필요한 질문에 맞춰 구분해 읽는 편이 좋습니다.",
    },
  ];
}

export default function DateAnimalFortunePage({ params }: { params: PageParams }) {
  const page = resolvePage(params);
  if (!page) notFound();
  const { vm } = page;
  const title = `${dateTitleLabel(vm.date)} ${vm.profile.nameKo} 운세`;
  const description = `${title}. 일진과 월건을 기준으로 총운·재물운·연애운·직장운·건강운을 살펴봅니다.`;
  const faqs = buildDateFaqs(page);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "오늘의 운세", path: "/today" },
    { name: `${vm.profile.nameKo} 오늘의 운세`, path: `/fortune/today/${params.sign}` },
    { name: title, path: page.path },
  ]);
  const webPageJsonLd = buildWebPageJsonLd({ title, description, path: page.path });
  const faqJsonLd = buildFaqPageJsonLd(faqs);

  return (
    <>
      <DateSignFortuneView vm={vm} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
