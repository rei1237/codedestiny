import Link from "next/link";
import { buildSeoMetadata, seoDisplayWidth } from "@/lib/seo";
import { SERP_TITLE_WIDTH_LIMIT } from "@/lib/fortune/seo-title.mjs";
import GuideCta from "@/app/components/GuideCta";
import { GUIDE_CTA_TARGETS } from "@/app/components/guide-cta-targets";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildWebPageJsonLd,
} from "@/lib/structured-data";
import { getNewYearSeason, getNewYearSignPages, relationSummary } from "@/lib/fortune/new-year-sign";
import { NEW_YEAR_SEASON } from "@/lib/fortune/new-year-registry.mjs";

const CARD = "cd-card";
const BODY = "mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.82)]";
const TH = "px-3 py-3 text-left font-bold";

function titleOf() {
  const branded = `${NEW_YEAR_SEASON.hubTitle} | 꿀꿀 운세`;
  return seoDisplayWidth(branded) <= SERP_TITLE_WIDTH_LIMIT ? branded : NEW_YEAR_SEASON.hubTitle;
}

function names(pages: ReturnType<typeof getNewYearSignPages>) {
  return pages.map((p) => p.sign.name).join("·");
}

function buildHub() {
  const season = getNewYearSeason();
  const pages = getNewYearSignPages();
  const samjaeNow = pages.filter((p) => p.samjae.stage);
  const samjaeNext = pages.filter((p) => p.samjae.nextStartYear === season.year + 1);
  const clash = pages.filter((p) => p.yearRelations.some((r) => r.kind === "chung"));
  const harmony = pages.filter((p) => p.yearRelations.some((r) => ["yukhap", "samhap", "banghap"].includes(r.kind)));
  const friction = pages.filter(
    (p) => !p.yearRelations.some((r) => r.kind === "chung") && p.yearRelations.some((r) => ["hyeong", "pa", "hae", "wonjin"].includes(r.kind)),
  );
  const same = pages.filter((p) => p.yearRelations.some((r) => r.kind === "same"));
  return { season, pages, samjaeNow, samjaeNext, clash, harmony, friction, same };
}

function description() {
  const { season, samjaeNow } = buildHub();
  return `2027년 띠별 운세. ${season.pillarKo}년(${season.pillarHanja}年) 12띠의 지지 관계와 삼재띠(${names(samjaeNow)}), 년생별 차이, 절기 기준 월별 흐름을 무료로 정리했습니다. 2027년 ${season.start.label} 입춘부터 적용됩니다.`;
}

function buildFaqs(hub: ReturnType<typeof buildHub>) {
  const { season, samjaeNow, samjaeNext } = hub;
  return [
    {
      question: "2027년 삼재띠는 무엇인가요?",
      answer: `2027년 ${season.pillarKo}년의 삼재띠는 ${names(samjaeNow)}이며, 세 띠 모두 2025년부터 이어진 삼재의 마지막 해인 날삼재입니다. 삼재는 ${season.end.label} 입춘에 끝나고, 같은 날부터 ${names(samjaeNext)}의 들삼재가 시작됩니다.`,
    },
    {
      question: "2027년은 무슨 띠의 해인가요?",
      answer: `2027년은 ${season.pillarKo}년(${season.pillarHanja}年)으로 ${NEW_YEAR_SEASON.colorAnimal}의 해입니다. 천간 ${season.stemHanja}은 불(${season.stemElement}), 지지 ${season.branchHanja}는 흙(${season.branchElement})이고 ${season.branchHanja}의 동물이 양이라 붉은 양이라고 부릅니다. 납음으로는 ${season.nayin}에 해당합니다.`,
    },
    {
      question: "2027년 띠 운세는 언제부터 적용되나요?",
      answer: `명리 기준으로는 ${season.start.label}(한국 시간) 입춘부터 ${season.end.label} 입춘 전까지가 2027년입니다. 양력 1월 1일이나 음력 설이 아니라 입춘이 경계라서, 2027년 1월과 2월 초는 아직 2026년 병오년의 흐름으로 봅니다.`,
    },
  ];
}

export function generateMetadata() {
  const { season } = buildHub();
  return buildSeoMetadata({
    path: NEW_YEAR_SEASON.path,
    title: titleOf(),
    description: description(),
    keywords: [
      NEW_YEAR_SEASON.hubPrimaryKeyword,
      "2027 삼재띠",
      "2027년 삼재",
      `${season.pillarKo}년 운세`,
      "2027년 운세",
    ],
  });
}

export default function NewYearHubPage() {
  const hub = buildHub();
  const { season, pages, samjaeNow, samjaeNext, clash, harmony, friction, same } = hub;
  const title = "2027년 띠별 운세";
  const desc = description();
  const faqs = buildFaqs(hub);
  const stemPolarity = season.stemIndex % 2 === 0 ? "양" : "음";
  const branchPolarity = season.branchIndex % 2 === 0 ? "양" : "음";
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세", path: "/fortune" },
    { name: title, path: NEW_YEAR_SEASON.path },
  ]);
  const webPageJsonLd = buildWebPageJsonLd({ title, description: desc, path: NEW_YEAR_SEASON.path });
  const faqJsonLd = buildFaqPageJsonLd(faqs);

  return (
    <>
      <main className="cd-main-shell cd-guide">
        <nav className="cd-chip-wrap" aria-label="위치">
          <Link href="/" className="cd-chip">홈</Link>
          {/* /fortune 은 Next 라우트가 아닌 정적 셸이라 문서 이동으로 보낸다 */}
          <a href="/fortune/" className="cd-chip">운세</a>
          <span className="cd-chip" aria-current="page">2027년 띠별 운세</span>
        </nav>

        <header className="cd-main-header">
          <p className="text-xs font-bold tracking-[0.18em] text-[#e8d5a3]">
            2027 {season.pillarKo}년({season.pillarHanja}年) · {NEW_YEAR_SEASON.colorAnimal}의 해
          </p>
          <h1 className="cd-main-title">{title}</h1>
          <p className="cd-main-intro">
            2027년은 {season.pillarKo}년({season.pillarHanja}年), {NEW_YEAR_SEASON.colorAnimal}의 해입니다. 명리 기준으로는 {season.start.label} 입춘부터
            {" "}{season.end.label} 입춘 전까지이며, 삼재띠는 {names(samjaeNow)}(날삼재)입니다. 세운 지지 {season.branchHanja}와 충이 드는 띠는{" "}
            {names(clash)}, 합으로 묶이는 띠는 {names(harmony)}입니다. 아래 표에서 내 띠를 고르면 년생별 차이와 절기 기준 월별 흐름까지 볼 수 있습니다.
          </p>
        </header>

        <section className={CARD} aria-labelledby="season-heading">
          <h2 id="season-heading">2027년 {season.pillarKo}년 기본 정보</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">세운 간지</dt>
              <dd className="mt-1 font-bold text-[#f4eeff]">{season.pillarKo}({season.pillarHanja}) · {NEW_YEAR_SEASON.colorAnimal}</dd>
            </div>
            <div>
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">천간 · 지지</dt>
              <dd className="mt-1 font-bold text-[#f4eeff]">
                {season.stemHanja} {stemPolarity}{season.stemElement} · {season.branchHanja} {branchPolarity}{season.branchElement}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">납음 · 지장간</dt>
              <dd className="mt-1 font-bold text-[#f4eeff]">{season.nayin} · {season.branchHanja} 속 {season.hiddenStems}</dd>
            </div>
            <div>
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">적용 기간(입춘 기준, 한국 시간)</dt>
              <dd className="mt-1 break-keep text-sm font-bold text-[#f4eeff]">{season.start.label} ~ {season.end.label} 전</dd>
            </div>
          </dl>
          <p className={BODY}>
            {season.stemHanja}화는 촛불이나 등불처럼 작고 오래 타는 불로, 드러내기보다 비추고 데우는 기운입니다. {season.branchHanja}토는 늦여름의
            마른 흙이며 안에 {season.hiddenStems}을 품어 목(木)의 기운을 저장하는 창고(목고) 역할을 합니다. 그래서 2027년은 크게 터뜨리기보다
            쌓아 둔 것을 정리하고 오래 갈 기반을 다지는 일에 무게가 실리는 해로 읽습니다.
          </p>
        </section>

        <section className="mt-8" aria-labelledby="table-heading">
          <h2 id="table-heading">2027년 띠별 운세 한눈에 보기</h2>
          <p className={BODY}>
            띠별 관계는 각 띠의 지지와 세운 지지 {season.branchHanja}의 합·충·형·파·해·원진을 계산한 값입니다.
            {same.length ? ` ${names(same)}는 자기 띠의 해(본명년)이고,` : ""}
            {friction.length ? ` ${names(friction)}는 충은 아니지만 형·파·해·원진으로 조정할 일이 생기기 쉬운 띠입니다.` : ""}
            {" "}최근 년생은 입춘 기준이라, 1월이나 2월 초에 태어났다면 앞 해의 띠로 봅니다.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <caption className="sr-only">2027년 정미년 12띠의 최근 년생, 未와의 관계, 삼재, 한 줄 요약</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>띠</th>
                  <th scope="col" className={TH}>최근 년생</th>
                  <th scope="col" className={TH}>{season.branchHanja}와의 관계</th>
                  <th scope="col" className={TH}>삼재</th>
                  <th scope="col" className={TH}>2027년 한 줄 요약</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.sign.id}>
                    <th scope="row" className="px-3 py-3 text-left font-bold">
                      <Link href={page.path} className="underline decoration-[rgba(232,213,163,0.5)] underline-offset-4">
                        {page.sign.name}({page.branchHanja})
                      </Link>
                    </th>
                    <td className="px-3 py-3">{page.birthRows.slice(0, 4).map((r) => r.year).join(" · ")}</td>
                    <td className="px-3 py-3">{relationSummary(page.yearRelations)}</td>
                    <td className="px-3 py-3">{page.samjae.stage || (page.samjae.nextStartYear === season.year + 1 ? "2028 들삼재 예정" : "—")}</td>
                    <td className="px-3 py-3">{page.sign.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 🔴 절입 시각은 12띠 모두 같은 값이라 여기 한 번만 둔다 — 띠 상세에 같은 표를 반복하면
            상세끼리 공유 본문이 50%를 넘는다(2026-10-29 실측 52%). 띠 상세는 이 표를 링크한다. */}
        <section id="months" className="mt-8" aria-labelledby="months-heading">
          <h2 id="months-heading">2027년 절기별 월건 일정</h2>
          <p className={BODY}>
            명리의 달은 양력 1일이 아니라 절기가 드는 시각에 바뀝니다. 2027년 정미년의 열두 달은 입춘부터 소한까지 아래 절입 시각(한국
            시간)에 시작하며, 각 달의 월건 지지와 내 띠 지지의 관계는 띠별 페이지의 월별 흐름 표에서 볼 수 있습니다.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <caption className="sr-only">2027년 절기별 절입 시각과 월건</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>절기</th>
                  <th scope="col" className={TH}>절입 시각(한국 시간)</th>
                  <th scope="col" className={TH}>다음 절기</th>
                  <th scope="col" className={TH}>월건</th>
                </tr>
              </thead>
              <tbody>
                {season.months.map((m) => (
                  <tr key={m.from.label}>
                    <th scope="row" className="px-3 py-3 text-left font-bold">{m.from.name}</th>
                    <td className="px-3 py-3">{m.from.label}</td>
                    <td className="px-3 py-3">{m.to.name} {m.to.label}</td>
                    <td className="px-3 py-3">{m.pillarKo}({m.pillarHanja})월</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="cd-card mt-8" aria-labelledby="samjae-heading">
          <h2 id="samjae-heading">2027년 삼재띠와 2028년 들삼재</h2>
          <p className={BODY}>
            삼재는 태어난 해의 지지가 속한 삼합(申子辰·亥卯未·寅午戌·巳酉丑)마다 3년씩 돌아오는 시기를 말합니다. 2027년에는
            {" "}{names(samjaeNow)}가 2025년 들삼재, 2026년 눌삼재에 이어 마지막 해인 날삼재를 지나며, {season.end.label} 입춘에 삼재가 끝납니다.
            같은 시각부터 {names(samjaeNext)}는 2028~2030년 삼재에 들어갑니다. 삼재는 민속에서 조심할 시기를 일러 주는 해석이고,
            개인 사주의 길흉을 그대로 정하지는 않습니다. 각 띠 페이지에서 삼재 연도와 함께 그해 실제로 겹치는 관계를 확인해 보세요.
          </p>
        </section>

        <section className="mt-8" aria-labelledby="relation-heading">
          <h2 id="relation-heading">충·합·형은 어떻게 읽나요?</h2>
          <p className={BODY}>
            충(沖)은 마주 보는 지지가 부딪쳐 고정된 것이 움직이는 관계라 이사·이직·역할 변화처럼 변동으로 나타나기 쉽고, 미리 계획한
            변화라면 오히려 기회가 됩니다. 육합·삼합·방합은 기운이 손을 잡는 관계라 협력과 인연이 붙기 쉽습니다. 형(刑)은 규칙·서류·조정,
            파(破)는 약속이 틀어지는 일, 해(害)와 원진(怨嗔)은 겉으로 드러나지 않는 서운함과 오해로 읽습니다. 어느 관계도 그 자체로
            좋다 나쁘다를 정하지 않으며, 어떤 영역에서 무엇을 먼저 챙길지 알려 주는 신호로 활용하는 편이 맞습니다.
          </p>
        </section>

        <section className="cd-card mt-8" aria-labelledby="personal-heading">
          <h2 id="personal-heading">띠별 운세와 내 사주 신년운세의 차이</h2>
          <p className={BODY}>
            띠별 운세는 태어난 해의 지지 하나로 2027년의 공통 흐름을 봅니다. 같은 띠라도 월주·일주·시주와 대운이 다르면 한 해의 체감이
            크게 달라지므로, 중요한 결정을 앞두고 있다면 생년월일시로 만든 개인 명식에서 세운 {season.pillarHanja}이 어디에 닿는지 확인하는
            것이 좋습니다. 무료 만세력으로 내 년주와 일주를 먼저 확인하고, 더 자세한 한 해 풀이가 필요하면 개인 신년운세 상담을 이용할 수 있습니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/manse" className="cd-chip">무료 만세력</Link>
            <Link href="/saju" className="cd-chip">무료 사주 분석</Link>
            <Link href="/new-year-ai-consultation" className="cd-chip">2027 신년운세 개인 상담</Link>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="hub-faq-heading">
          <h2 id="hub-faq-heading">2027년 띠별 운세 FAQ</h2>
          <div className="mt-4 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className={CARD}>
                <summary className="cursor-pointer font-bold text-[#f4eeff]">{faq.question}</summary>
                <p className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.78)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <nav className="cd-chip-wrap mt-8" aria-label="2027년 띠별 운세 상세">
          {pages.map((page) => (
            <Link key={page.sign.id} href={page.path} className="cd-chip">2027년 {page.sign.name} 운세</Link>
          ))}
        </nav>

        <GuideCta target={GUIDE_CTA_TARGETS["/fortune/2027"]} />

        <p className="mt-10 break-keep text-xs leading-6 text-[rgba(244,238,255,0.55)]">
          세운·월건·절입 시각과 띠별 관계는 이 사이트 만세력과 같은 한국 음양력 계산 코어로 구하고, 띠별 해설 문장은 그 관계를 바탕으로
          생성형 AI의 도움을 받아 미리 작성한 공통 풀이입니다. 운세 콘텐츠는 자기성찰을 위한 참고 정보이며 개인 명식이나 현실의 조건을
          대신하지 않습니다.
        </p>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
