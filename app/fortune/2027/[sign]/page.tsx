import Link from "next/link";
import { notFound } from "next/navigation";
import { buildSeoMetadata, seoDisplayWidth } from "@/lib/seo";
import { SERP_TITLE_WIDTH_LIMIT } from "@/lib/fortune/seo-title.mjs";
import GuideCta from "@/app/components/GuideCta";
import { GUIDE_CTA_TARGETS } from "@/app/components/guide-cta-targets";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildWebPageJsonLd,
} from "@/lib/structured-data";
import {
  ELEMENT_RELATION_LABEL,
  buildNewYearSignPage,
  getNewYearSignIds,
  getNewYearSignPages,
  josa,
  relationSummary,
  type NewYearSignPage,
} from "@/lib/fortune/new-year-sign";
import { NEW_YEAR_SEASON } from "@/lib/fortune/new-year-registry.mjs";

export const dynamicParams = false;

const CARD = "cd-card";
const BODY = "mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.82)]";
const TH = "px-3 py-3 text-left font-bold";

type PageParams = { sign: string };

const TONE_LABEL = {
  harmony: "합",
  clash: "충",
  friction: "조정",
  mixed: "합+조정",
  same: "같은 지지",
  neutral: "—",
} as const;

/** 브랜드 꼬리는 SERP 폭(60) 안에 들어올 때만 붙인다 — 띠 이름 길이에 따라 갈린다. */
function titleOf(page: NewYearSignPage) {
  const head = `${NEW_YEAR_SEASON.year}년 ${page.sign.name} 운세 | ${NEW_YEAR_SEASON.ganjiKo}년 년생별·월별 풀이`;
  const branded = `${head} | 꿀꿀 운세`;
  return seoDisplayWidth(branded) <= SERP_TITLE_WIDTH_LIMIT ? branded : head;
}

function descriptionOf(page: NewYearSignPage) {
  const years = page.birthRows.slice(0, 3).map((r) => r.year).join("·");
  return `${NEW_YEAR_SEASON.year}년 ${page.sign.name} 운세. ${page.branchHanja}${josa(page.branchKo, "과/와")} ${NEW_YEAR_SEASON.ganjiHanja}년 ${page.season.branchHanja}의 관계(${relationSummary(page.yearRelations)}), ${page.samjae.label}, ${years}년생 등 년생별 차이와 절기 기준 12개월 흐름을 정리했습니다.`;
}

function relationSentence(page: NewYearSignPage) {
  const { sign, season, yearRelations } = page;
  if (yearRelations.length === 0) {
    return `${sign.name}의 지지 ${page.branchHanja}${josa(page.branchKo, "은/는")} ${season.pillarHanja}년의 ${season.branchHanja}${josa(season.branchKo, "과/와")} 합·충·형·파·해·원진 어느 쪽으로도 직접 묶이지 않습니다.`;
  }
  if (yearRelations[0].kind === "same") {
    return `${sign.name}의 지지 ${page.branchHanja}${josa(page.branchKo, "은/는")} ${season.pillarHanja}년의 지지와 같은 글자라, 2027년은 ${sign.name}에게 자기 띠의 해(본명년)입니다.`;
  }
  return `${sign.name}의 지지 ${page.branchHanja}${josa(page.branchKo, "은/는")} ${season.pillarHanja}년의 ${season.branchHanja}${josa(season.branchKo, "과/와")} ${relationSummary(yearRelations)} 관계입니다.`;
}

function samjaeSentence(page: NewYearSignPage) {
  const { sign, samjae } = page;
  const span = `${samjae.years[0].year}~${samjae.years[2].year}년`;
  if (samjae.stage) {
    return `${sign.name}는 ${span} 삼재 가운데 마지막 해인 ${samjae.stage}에 해당하며, 삼재는 ${page.season.end.label} 입춘에 끝납니다.`;
  }
  if (samjae.nextStartYear === NEW_YEAR_SEASON.year + 1) {
    return `${sign.name}는 2027년에는 삼재가 아니지만, 바로 다음 해인 ${span}이 삼재(들삼재·눌삼재·날삼재)입니다.`;
  }
  return `${sign.name}는 2027년 삼재가 아니며, 다음 삼재는 ${span}입니다.`;
}

function buildFaqs(page: NewYearSignPage) {
  const { sign, birthRows, season } = page;
  const stemWord = `${season.stemHanja}${season.stemElement}`;
  const example = birthRows[1];
  const hap = birthRows.filter((r) => r.stemNote.includes("천간합")).map((r) => `${r.year}년생`);
  const chung = birthRows.filter((r) => r.stemNote.includes("천간충")).map((r) => `${r.year}년생`);
  const extra = [
    hap.length ? `${hap.join("·")}은 ${stemWord}${josa(season.stemElement, "과/와")} 천간합을 이루어 협력과 계약의 비중이 커지고` : "",
    chung.length ? `${chung.join("·")}은 ${stemWord}${josa(season.stemElement, "과/와")} 천간충이라 일정과 판단이 흔들리지 않게 기준을 세워 둘 필요가 있습니다` : "",
  ].filter(Boolean).join(", ");
  return [
    {
      question: `2027년 ${sign.name}는 삼재인가요?`,
      answer: `${samjaeSentence(page)} 삼재는 태어난 해의 지지가 속한 삼합을 기준으로 3년씩 돌아오는 민속 해석이며, 개인 사주 원국의 길흉을 대신하지 않습니다.`,
    },
    {
      question: `1월이나 2월 초에 태어난 ${sign.name}도 같은 운세로 보나요?`,
      answer: `명리에서는 입춘을 한 해의 경계로 봅니다. 예를 들어 ${example.year + 1}년 입춘 전(대개 2월 4일 무렵)에 태어났다면 ${example.year}년생과 같은 ${example.pillarKo}년 ${sign.name}입니다. 민속에서는 음력 설을 경계로 쓰기도 하므로, 경계 근처 생일이라면 만세력에서 년주를 먼저 확인해 주세요.`,
    },
    {
      question: `같은 ${sign.name}라도 년생마다 2027년 운세가 다른가요?`,
      answer: `띠(지지)는 같아도 태어난 해의 천간이 달라서 세운 천간 ${stemWord}${josa(season.stemElement, "과/와")} 맺는 관계가 다릅니다. ${birthRows.slice(0, 4).map((r) => `${r.year}년생(${r.pillarHanja})은 ${r.stemRelation}`).join(", ")} 관계입니다.${extra ? ` 특히 ${extra}.` : ""} 실제 체감은 월주·일주와 대운까지 함께 봐야 정해집니다.`,
    },
  ];
}

export function generateStaticParams() {
  return getNewYearSignIds().map((sign) => ({ sign }));
}

export function generateMetadata({ params }: { params: PageParams }) {
  const page = buildNewYearSignPage(params.sign);
  if (!page) return {};
  return buildSeoMetadata({
    path: page.path,
    title: titleOf(page),
    description: descriptionOf(page),
    keywords: [
      `${NEW_YEAR_SEASON.year}년 ${page.sign.name} 운세`,
      `${NEW_YEAR_SEASON.ganjiKo}년 ${page.sign.name} 운세`,
      `${NEW_YEAR_SEASON.year} ${page.sign.name} 삼재`,
      `${page.birthRows[1].year}년생 ${NEW_YEAR_SEASON.year}년 운세`,
      "2027년 띠별 운세",
    ],
  });
}

function FortuneSection({ heading, text }: { heading: string; text: string }) {
  return (
    <article className={CARD}>
      <h3>{heading}</h3>
      <p className={BODY}>{text}</p>
    </article>
  );
}

export default function NewYearSignPageView({ params }: { params: PageParams }) {
  const page = buildNewYearSignPage(params.sign);
  if (!page) notFound();

  const { sign, season, samjae, birthRows, monthRows } = page;
  const title = `${NEW_YEAR_SEASON.year}년 ${sign.name} 운세`;
  const description = descriptionOf(page);
  const faqs = buildFaqs(page);
  const others = getNewYearSignPages().filter((p) => p.sign.id !== sign.id);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세", path: "/fortune" },
    { name: "2027년 띠별 운세", path: NEW_YEAR_SEASON.path },
    { name: title, path: page.path },
  ]);
  const webPageJsonLd = buildWebPageJsonLd({ title, description, path: page.path });
  const faqJsonLd = buildFaqPageJsonLd(faqs);

  return (
    <>
      <main className="cd-main-shell cd-guide">
        <nav className="cd-chip-wrap" aria-label="위치">
          <Link href="/" className="cd-chip">홈</Link>
          {/* /fortune 은 Next 라우트가 아닌 정적 셸이라 문서 이동으로 보낸다 */}
          <a href="/fortune/" className="cd-chip">운세</a>
          <Link href={NEW_YEAR_SEASON.path} className="cd-chip">2027년 띠별 운세</Link>
          <span className="cd-chip" aria-current="page">{sign.name}</span>
        </nav>

        <header className="cd-main-header">
          <p className="text-xs font-bold tracking-[0.18em] text-[#e8d5a3]">
            2027 {season.pillarKo}년({season.pillarHanja}年) · {NEW_YEAR_SEASON.colorAnimal}의 해
          </p>
          <h1 className="cd-main-title">{title}</h1>
          <p className="cd-main-intro">
            {relationSentence(page)} {samjaeSentence(page)} {sign.summary}
          </p>
        </header>

        <section className={CARD} aria-labelledby="summary-heading">
          <h2 id="summary-heading">2027년 {sign.name} 한눈에 보기</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">띠 지지</dt>
              <dd className="mt-1 font-bold text-[#f4eeff]">{page.branchHanja}({page.branchKo}) · {page.branchElement} 기운</dd>
            </div>
            <div>
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">세운 지지 {season.branchHanja}{josa(season.branchKo, "과/와")}의 관계</dt>
              <dd className="mt-1 font-bold text-[#f4eeff]">{relationSummary(page.yearRelations)}</dd>
            </div>
            <div>
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">세운 천간 {season.stemHanja}({season.stemElement}) → {sign.name}</dt>
              <dd className="mt-1 font-bold text-[#f4eeff]">{ELEMENT_RELATION_LABEL[page.stemElementRelation]}</dd>
            </div>
            <div>
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">세운 지지 {season.branchHanja}({season.branchElement}) → {sign.name}</dt>
              <dd className="mt-1 font-bold text-[#f4eeff]">{ELEMENT_RELATION_LABEL[page.branchElementRelation]}</dd>
            </div>
            <div>
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">삼재</dt>
              <dd className="mt-1 font-bold text-[#f4eeff]">{samjae.label}</dd>
            </div>
            <div>
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">적용 기간(입춘 기준)</dt>
              <dd className="mt-1 break-keep text-sm font-bold text-[#f4eeff]">{season.start.label} ~ {season.end.label} 전</dd>
            </div>
          </dl>
        </section>

        <section className="mt-8" aria-labelledby="overview-heading">
          <h2 id="overview-heading">{season.pillarKo}년과 {sign.name}의 관계</h2>
          <p className={BODY}>{sign.overview}</p>
        </section>

        <section className="mt-8" aria-labelledby="areas-heading">
          <h2 id="areas-heading">2027년 {sign.name} 재물운·연애운·직업운·건강운</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FortuneSection heading="재물운" text={sign.money} />
            <FortuneSection heading="연애운·관계" text={sign.love} />
            <FortuneSection heading="직업운·실행" text={sign.work} />
            <FortuneSection heading="건강운·회복" text={sign.health} />
          </div>
        </section>

        <section className="mt-8" aria-labelledby="birth-heading">
          <h2 id="birth-heading">{sign.name} 년생별 2027년 운세 차이</h2>
          <p className={BODY}>
            같은 {sign.name}라도 태어난 해의 천간이 다르면 세운 천간 {season.stemHanja}{season.stemElement}{josa(season.stemElement, "과/와")} 맺는 관계가
            달라집니다. 아래 표의 관계는 태어난 해 천간의 입장에서 본 것이며, 나이는 2027년 생일이 지난 뒤의 만 나이입니다.
            60년마다 같은 간지가 돌아오므로 표에 없는 해는 60을 더하거나 빼서 찾으면 됩니다.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <caption className="sr-only">{sign.name} 출생 연도별 간지·만 나이·납음과 2027년 세운 천간 관계</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>출생 연도</th>
                  <th scope="col" className={TH}>간지</th>
                  <th scope="col" className={TH}>2027년 만 나이</th>
                  <th scope="col" className={TH}>납음</th>
                  <th scope="col" className={TH}>{season.stemHanja}{season.stemElement}{josa(season.stemElement, "과/와")}의 관계</th>
                </tr>
              </thead>
              <tbody>
                {birthRows.map((row) => (
                  <tr key={row.year}>
                    <th scope="row" className="px-3 py-3 text-left font-bold">{row.year}년생</th>
                    <td className="px-3 py-3">{row.pillarKo}({row.pillarHanja})</td>
                    <td className="px-3 py-3">{row.age}세</td>
                    <td className="px-3 py-3">{row.nayin}</td>
                    <td className="px-3 py-3">{row.stemNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="month-heading">
          <h2 id="month-heading">2027년 {sign.name} 월별 운세 흐름(절기 기준)</h2>
          <p className={BODY}>
            각 달의 월건 지지와 {sign.name}의 지지 {page.branchHanja}{josa(page.branchKo, "이/가")} 맺는 관계를 계산했습니다. 달이 바뀌는 절입
            시각은 <Link href="/fortune/2027#months" className="underline underline-offset-4">2027년 절기별 월건 일정</Link>에 있습니다.
            {page.helpfulMonths.length ? ` 사람과 협력이 붙기 쉬운 달은 ${page.helpfulMonths.join(", ")}입니다.` : ""}
            {page.clashMonths.length ? ` 이동·변동이 생기기 쉬운 충의 달은 ${page.clashMonths.join(", ")}입니다.` : ""}
            {page.frictionMonths.length ? ` 오해와 조정을 살필 달은 ${page.frictionMonths.join(", ")}입니다.` : ""}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <caption className="sr-only">2027년 절기별 월건과 {sign.name} 지지의 관계</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>절기(양력)</th>
                  <th scope="col" className={TH}>월건</th>
                  <th scope="col" className={TH}>{page.branchHanja}{josa(page.branchKo, "과/와")}의 관계</th>
                  <th scope="col" className={TH}>읽는 법</th>
                </tr>
              </thead>
              <tbody>
                {monthRows.map((row) => (
                  <tr key={row.from.label}>
                    <th scope="row" className="px-3 py-3 text-left font-bold">
                      {row.from.name} {row.from.short}~
                    </th>
                    <td className="px-3 py-3">{row.pillarKo}({row.pillarHanja})월</td>
                    <td className="px-3 py-3">{row.relations.length ? relationSummary(row.relations) : TONE_LABEL.neutral}</td>
                    <td className="px-3 py-3">{row.point}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="cd-card mt-8" aria-labelledby="samjae-heading">
          <h2 id="samjae-heading">{sign.name} 삼재 시기</h2>
          <p className={BODY}>{samjaeSentence(page)}</p>
          <ul className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.82)]">
            {samjae.years.map((item) => (
              <li key={item.year}>{item.year}년 · {item.stage}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="2027년 행동 가이드">
          <article className="rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.06] p-5">
            <h2 className="text-base">2027년에 잘 풀리는 행동</h2>
            <p className={BODY}>{sign.action}</p>
          </article>
          <article className="rounded-2xl border border-rose-300/25 bg-rose-300/[0.06] p-5">
            <h2 className="text-base">주의할 패턴</h2>
            <p className={BODY}>{sign.caution}</p>
          </article>
        </section>

        <section className="cd-card mt-8" aria-labelledby="basis-heading">
          <h2 id="basis-heading">계산 기준과 읽는 범위</h2>
          <p className={BODY}>
            {sign.name}의 지지 {page.branchHanja}{josa(page.branchKo, "과/와")} 세운·월건의 관계, 삼재, 년생별 천간 관계는 만세력과 같은 계산
            코어로 구한 값이고, 영역별 해설 문장은 그 관계를 바탕으로 생성형 AI의 도움을 받아 미리 작성한 풀이입니다. 년주 하나만 본
            흐름이라 월주·일주·시주와 대운은 반영하지 않습니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/manse" className="cd-chip">무료 만세력에서 내 년주 확인</Link>
            <Link href="/saju" className="cd-chip">무료 사주 분석</Link>
            <Link href="/new-year-ai-consultation" className="cd-chip">2027 신년운세 개인 상담</Link>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="detail-faq-heading">
          <h2 id="detail-faq-heading">2027년 {sign.name} 운세 FAQ</h2>
          <div className="mt-4 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className={CARD}>
                <summary className="cursor-pointer font-bold text-[#f4eeff]">{faq.question}</summary>
                <p className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.78)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <nav className="cd-chip-wrap mt-8" aria-label="다른 띠 2027년 운세">
          <Link href={NEW_YEAR_SEASON.path} className="cd-chip">2027년 띠별 운세 전체</Link>
          {others.map((other) => (
            <Link key={other.sign.id} href={other.path} className="cd-chip">2027 {other.sign.name}</Link>
          ))}
          <Link href={`/fortune/today/${sign.id}`} className="cd-chip">{sign.name} 오늘의 운세</Link>
        </nav>

        <GuideCta target={GUIDE_CTA_TARGETS["/fortune/2027/[sign]"]} />

        <p className="mt-10 break-keep text-xs leading-6 text-[rgba(244,238,255,0.55)]">
          운세 콘텐츠는 자기성찰을 위한 참고 정보이며, 사주 전체 명식이나 현실의 조건을 대신하지 않습니다. 건강·법률·재무 등 중요한 판단은 전문가의 조언을 함께 확인하세요.
        </p>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
