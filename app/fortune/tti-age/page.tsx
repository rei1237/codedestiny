/**
 * /fortune/tti-age — 띠별 나이표.
 *
 * "띠 나이", "몇 년생 무슨 띠", "96년생 띠", "띠별 나이표" 는 출생연도·나이·띠를 서로 바꿔 찾는 조회형 검색이다.
 * 간지는 (연도 − 4) 나머지로, 입춘 시각과 설날은 한국 음양력 코어로 해마다 계산한다.
 * 기준 연도(AGE_BASE_YEARS)는 빌드 날짜가 아니라 상수다 — 해가 바뀌면 날짜를 적은 커밋으로 올린다.
 */
import Link from "next/link";
import GuideCta from "@/app/components/GuideCta";
import { GUIDE_CTA_TARGETS } from "@/app/components/guide-cta-targets";
import { buildSeoMetadata, seoDisplayWidth } from "@/lib/seo";
import { SERP_TITLE_WIDTH_LIMIT } from "@/lib/fortune/seo-title.mjs";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "@/lib/structured-data";
import {
  AGE_BASE_YEARS,
  TTI_AGE_FIRST_YEAR,
  animalLabel,
  birthYearInfo,
  birthYearTable,
  birthYearsByAnimal,
  type BirthYearInfo,
} from "@/lib/fortune/zodiac-folk";

const PATH = "/fortune/tti-age";
const CARD = "cd-card";
const BODY = "mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.82)]";
const TH = "px-3 py-3 text-left font-bold";
const [BASE_YEAR, NEXT_YEAR] = AGE_BASE_YEARS;
/** 설날이 입춘보다 먼저 와서 두 기준의 띠가 갈리는 예시 해. 표 범위 안에서 고른다. */
const SPLIT_EXAMPLE_YEAR = 1990;

const pad = (n: number) => String(n).padStart(2, "0");
const ipchunLabel = (row: BirthYearInfo) => `${row.ipchun.month}월 ${row.ipchun.day}일 ${pad(row.ipchun.hour)}:${pad(row.ipchun.minute)}`;

function titleOf() {
  const base = `띠 나이표 ${BASE_YEAR}·${NEXT_YEAR} | 년생별 띠·간지·만 나이`;
  const branded = `${base} | 꿀꿀 운세`;
  return seoDisplayWidth(branded) <= SERP_TITLE_WIDTH_LIMIT ? branded : base;
}

function description() {
  const now = birthYearInfo(BASE_YEAR);
  const next = birthYearInfo(NEXT_YEAR);
  return `띠는 입춘을 기준으로 바뀝니다. ${TTI_AGE_FIRST_YEAR}~${BASE_YEAR}년생의 띠·간지와 ${BASE_YEAR}·${NEXT_YEAR}년 만 나이를 표로 정리했습니다. ${BASE_YEAR}년은 ${now.pillarKo}년 ${now.animal.name}, ${NEXT_YEAR}년은 ${next.pillarKo}년 ${next.animal.name}입니다.`;
}

/** 설날 다음 날 — 설은 지났지만 입춘 전이라 민간과 명리의 띠가 갈리는 날. */
function splitExample() {
  const row = birthYearInfo(SPLIT_EXAMPLE_YEAR);
  const before = birthYearInfo(SPLIT_EXAMPLE_YEAR - 1);
  const day = new Date(Date.UTC(SPLIT_EXAMPLE_YEAR, row.seollal.month - 1, row.seollal.day + 1));
  const ipchun = Date.UTC(SPLIT_EXAMPLE_YEAR, row.ipchun.month - 1, row.ipchun.day);
  if (day.getTime() >= ipchun) throw new RangeError(`${SPLIT_EXAMPLE_YEAR}년은 설날이 입춘보다 늦어 예시로 쓸 수 없습니다.`);
  return { row, before, month: day.getUTCMonth() + 1, day: day.getUTCDate() };
}

export function generateMetadata() {
  return buildSeoMetadata({
    path: PATH,
    title: titleOf(),
    description: description(),
    keywords: ["띠 나이표", "띠별 나이", "년생별 띠", "띠 계산", `${BASE_YEAR} 나이표`, `${NEXT_YEAR} 띠 나이`, "만 나이 계산", "간지 연도"],
  });
}

export default function TtiAgePage() {
  const rows = birthYearTable();
  const byAnimal = birthYearsByAnimal();
  const now = birthYearInfo(BASE_YEAR);
  const next = birthYearInfo(NEXT_YEAR);
  const split = splitExample();
  const title = "띠별 나이표";
  const desc = description();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세", path: "/fortune" },
    { name: title, path: PATH },
  ]);
  const webPageJsonLd = buildWebPageJsonLd({ title, description: desc, path: PATH });
  const faqs = [
    {
      question: "1월이나 2월 초에 태어나면 띠는 무엇인가요?",
      answer: `입춘 전에 태어났다면 앞 해의 띠입니다. 입춘은 해마다 2월 4일 무렵이고 시각까지 달라지므로, 아래 표의 입춘 칸에서 태어난 해의 날짜와 시각을 확인하세요. 예를 들어 ${now.year}년 입춘은 ${ipchunLabel(now)}(한국 시간)이라, ${now.year}년 1월 1일부터 그 시각 전까지 태어난 아이는 ${birthYearInfo(BASE_YEAR - 1).animal.name}입니다.`,
    },
    {
      question: `${NEXT_YEAR}년은 무슨 띠의 해인가요?`,
      answer: `${NEXT_YEAR}년은 ${next.pillarKo}년(${next.pillarHanja}年) ${animalLabel(next.animal)}의 해입니다. ${NEXT_YEAR}년 ${ipchunLabel(next)} 입춘부터 ${NEXT_YEAR + 1}년 입춘 전까지 태어나면 ${next.animal.name}이고, 음력 설은 양력 ${next.seollal.month}월 ${next.seollal.day}일입니다.`,
    },
    {
      question: "띠동갑은 몇 살 차이인가요?",
      answer:
        "띠는 열두 가지가 차례로 돌아오므로 띠동갑은 12살, 24살, 36살 차이입니다. 다만 같은 띠라도 천간까지 같은 간지는 60년에 한 번 돌아오기 때문에, 12살 차이 띠동갑은 간지의 천간이 서로 다릅니다. 같은 간지의 해로 돌아오는 것이 환갑(만 60세)입니다.",
    },
    {
      question: "세는 나이는 이제 쓰지 않나요?",
      answer:
        "2023년 6월 28일부터 법령·계약·공문서의 나이는 만 나이로 통일되었습니다. 병역과 청소년보호법의 술·담배 구매 기준처럼 법에서 따로 정한 경우에는 해당 연도에서 출생연도를 뺀 연 나이를 그대로 쓰고, 태어나자마자 한 살로 치는 세는 나이는 일상 대화에서만 남아 있습니다.",
    },
  ];

  return (
    <>
      <main className="cd-main-shell cd-guide">
        <nav className="cd-chip-wrap" aria-label="위치">
          <Link href="/" className="cd-chip">홈</Link>
          {/* /fortune 은 Next 라우트가 아닌 정적 셸이라 문서 이동으로 보낸다 */}
          <a href="/fortune/" className="cd-chip">운세</a>
          <span className="cd-chip" aria-current="page">{title}</span>
        </nav>

        <header className="cd-main-header">
          <p className="text-xs font-bold tracking-[0.18em] text-[#e8d5a3]">
            {TTI_AGE_FIRST_YEAR}~{BASE_YEAR}년생 · {BASE_YEAR}·{NEXT_YEAR}년 기준
          </p>
          <h1 className="cd-main-title">{title}</h1>
          <p className="cd-main-intro">
            <strong>띠는 태어난 해의 지지로 정하며, 해가 바뀌는 기준은 1월 1일이 아니라 입춘입니다.</strong> {BASE_YEAR}년은{" "}
            {now.pillarKo}년 {animalLabel(now.animal)}, {NEXT_YEAR}년은 {next.pillarKo}년 {animalLabel(next.animal)}의 해입니다. 아래에서
            띠마다 해당하는 출생연도를 먼저 찾고, 연도별 표에서 간지와 입춘 시각, {BASE_YEAR}·{NEXT_YEAR}년 만 나이를 확인하세요.
          </p>
        </header>

        <section className="mt-8" aria-labelledby="by-animal-heading">
          <h2 id="by-animal-heading">띠별 출생연도</h2>
          <p className={BODY}>
            띠 이름을 누르면 그 띠의 오늘 운세로 이동합니다. 연도는 {BASE_YEAR}년생부터 {TTI_AGE_FIRST_YEAR}년생까지이며, 같은 띠는 12년
            간격으로 돌아옵니다.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <caption className="sr-only">12띠별 {TTI_AGE_FIRST_YEAR}~{BASE_YEAR}년 출생연도</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>띠</th>
                  <th scope="col" className={TH}>지지</th>
                  <th scope="col" className={TH}>출생연도</th>
                </tr>
              </thead>
              <tbody>
                {byAnimal.map(({ animal, years }) => (
                  <tr key={animal.id}>
                    <th scope="row" className="px-3 py-3 text-left align-top font-bold whitespace-nowrap">
                      <Link href={`/fortune/today/${animal.id}`} className="underline decoration-[rgba(232,213,163,0.5)] underline-offset-4">
                        {animalLabel(animal)}
                      </Link>
                    </th>
                    <td className="px-3 py-3 align-top whitespace-nowrap">
                      {animal.branchKo}({animal.branchHanja})
                    </td>
                    <td className="px-3 py-3 align-top">{years.map((y) => `${y}년`).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${CARD} mt-8`} aria-labelledby="ipchun-heading">
          <h2 id="ipchun-heading">1~2월생의 띠 — 입춘과 설날</h2>
          <p className={BODY}>
            띠가 바뀌는 날은 두 가지로 쓰입니다. 사주와 만세력은 입춘(2월 4일 무렵)을 한 해의 시작으로 보고, 민간에서는 음력 설을 기준으로
            말하는 경우가 많습니다. 양력 1월 1일은 어느 쪽의 기준도 아닙니다. 대부분은 두 기준이 같은 답을 내지만, 설날이 입춘보다 먼저 온
            해에는 그 사이에 태어난 사람의 띠가 갈립니다.
          </p>
          <p className={BODY}>
            예를 들어 {SPLIT_EXAMPLE_YEAR}년은 설날이 양력 {split.row.seollal.month}월 {split.row.seollal.day}일, 입춘이{" "}
            {ipchunLabel(split.row)}였습니다. {SPLIT_EXAMPLE_YEAR}년 {split.month}월 {split.day}일에 태어났다면 설은 지났으니 민간에서는{" "}
            {split.row.animal.name}라고 하지만, 입춘 전이라 사주에서는 {split.before.pillarKo}년 {split.before.animal.name}로 봅니다. 사주를 볼
            때는 입춘 기준을 따르세요.
          </p>
        </section>

        <section className="mt-8" aria-labelledby="table-heading">
          <h2 id="table-heading">연도별 띠·간지·나이표</h2>
          <p className={BODY}>
            만 나이는 그해 생일이 지난 뒤의 나이이고, 생일 전이면 한 살 적습니다. 연 나이는 생일과 관계없이 그해에서 출생연도를 뺀 값으로
            만 나이 칸의 숫자와 같습니다. 입춘 시각은 한국 시간입니다.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <caption className="sr-only">
                {BASE_YEAR}~{TTI_AGE_FIRST_YEAR}년 출생연도별 간지, 띠, 입춘 시각, 설날, {BASE_YEAR}·{NEXT_YEAR}년 만 나이
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>출생연도</th>
                  <th scope="col" className={TH}>간지</th>
                  <th scope="col" className={TH}>띠</th>
                  <th scope="col" className={TH}>입춘</th>
                  <th scope="col" className={TH}>설날</th>
                  {AGE_BASE_YEARS.map((y) => (
                    <th key={y} scope="col" className={TH}>{y}년 만 나이</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.year}>
                    <th scope="row" className="px-3 py-2 text-left font-bold whitespace-nowrap">{row.year}년생</th>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.pillarKo}({row.pillarHanja})
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.animal.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{ipchunLabel(row)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.seollal.month}월 {row.seollal.day}일
                    </td>
                    {row.ages.map((a) => (
                      <td key={a.baseYear} className="px-3 py-2 whitespace-nowrap">{a.age}세</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${CARD} mt-8`} aria-labelledby="age-kinds-heading">
          <h2 id="age-kinds-heading">만 나이·연 나이·세는 나이</h2>
          <p className={BODY}>
            <strong>만 나이</strong>는 태어난 날을 0살로 시작해 생일마다 한 살씩 더합니다. 2023년 6월 28일부터 법령과 계약, 공문서의 나이는
            만 나이로 통일되었습니다. <strong>연 나이</strong>는 그해 연도에서 출생연도를 뺀 값으로, 병역이나 청소년보호법의 술·담배 구매
            기준처럼 법에서 따로 정한 경우에 씁니다. <strong>세는 나이</strong>는 태어나자마자 한 살로 치고 해가 바뀔 때마다 한 살씩 더하는
            예전 방식으로, 연 나이에 1을 더한 값입니다.
          </p>
          <p className={BODY}>
            띠와 간지는 나이 계산과 별개로 출생연도(입춘 기준)에만 매입니다. 그래서 만 나이가 같은 친구라도 1~2월생과 3월 이후생은 띠가
            다를 수 있습니다. 같은 간지가 다시 돌아오는 데는 60년이 걸리고, 이것이 환갑의 뜻입니다.
          </p>
        </section>

        <section className="mt-8" aria-labelledby="age-faq-heading">
          <h2 id="age-faq-heading">띠 나이 자주 묻는 질문</h2>
          <div className="mt-4 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className={CARD}>
                <summary className="cursor-pointer font-bold text-[#f4eeff]">{faq.question}</summary>
                <p className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.78)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <nav className="cd-chip-wrap mt-8" aria-label="함께 보는 띠 정보">
          <Link href="/fortune/samjae" className="cd-chip">삼재띠 계산표</Link>
          <Link href="/compatibility/tti" className="cd-chip">띠궁합 표</Link>
          <Link href="/fortune/2027" className="cd-chip">2027년 띠별 운세</Link>
          <Link href="/fortune/son-eomneun-nal" className="cd-chip">손없는날 달력</Link>
          <Link href="/manse" className="cd-chip">무료 만세력</Link>
        </nav>

        <GuideCta target={GUIDE_CTA_TARGETS["/fortune/tti-age"]} />

        <p className="mt-10 break-keep text-xs leading-6 text-[rgba(244,238,255,0.55)]">
          띠와 간지는 민속 해석의 기준이며 개인 사주를 대신하지 않습니다. 입춘 시각과 설날은 이 사이트 만세력과 같은 한국 음양력 계산
          코어로 구했습니다.
        </p>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </>
  );
}
