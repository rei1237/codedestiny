/**
 * /fortune/samjae — 삼재 뜻과 삼재띠 계산표.
 *
 * "삼재", "삼재띠", "삼재 나이", "들삼재 눌삼재 날삼재" 는 내 띠가 언제 삼재인지 찾는 조회형 검색이다.
 * 연도별 판정은 /fortune/2027 과 같은 samjaeFor(lib/fortune/new-year-sign.ts) 한 곳에서 나온다.
 * 그해 띠별 운세는 /fortune/2027 이 맡고, 이 페이지는 삼재의 뜻과 계산 원리, 여러 해의 표를 맡는다.
 */
import Link from "next/link";
import { buildSeoMetadata, seoDisplayWidth } from "@/lib/seo";
import { SERP_TITLE_WIDTH_LIMIT } from "@/lib/fortune/seo-title.mjs";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "@/lib/structured-data";
import {
  AGE_BASE_YEARS,
  ZODIAC_ANIMALS,
  animalLabel,
  birthYearInfo,
  birthYearsByAnimal,
  joinAnimals,
  samjaeGroups,
  samjaeOf,
  type SamjaeGroup,
  type ZodiacAnimal,
} from "@/lib/fortune/zodiac-folk";

const PATH = "/fortune/samjae";
const CARD = "cd-card";
const BODY = "mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.82)]";
const TH = "px-3 py-3 text-left font-bold";

const BASE_YEAR = AGE_BASE_YEARS[0];
const STATUS_YEARS = [BASE_YEAR, BASE_YEAR + 1, BASE_YEAR + 2];
/** 년생 열에 싣는 가장 이른 해. 그보다 앞은 /fortune/tti-age 표가 맡는다. */
const BIRTH_FROM = 1950;
/** 삼합의 가운데 글자(왕지)가 정하는 오행 국(局). */
const SAMHAP_ELEMENT: Record<number, string> = { 0: "수국(水局)", 3: "목국(木局)", 6: "화국(火局)", 9: "금국(金局)" };

function titleOf() {
  const base = "삼재띠 계산표 | 들삼재·눌삼재·날삼재 연도";
  const branded = `${base} | 꿀꿀 운세`;
  return seoDisplayWidth(branded) <= SERP_TITLE_WIDTH_LIMIT ? branded : base;
}

/** 삼합은 생지(寅·巳·申·亥)부터 4칸씩 읽는다. 예: 申子辰 */
function samhapOrder(group: SamjaeGroup): ZodiacAnimal[] {
  const start = group.members.find((m) => m.branchIndex % 3 === 2);
  if (!start) throw new RangeError("삼합 무리에 생지가 없습니다.");
  return [0, 4, 8].map((step) => ZODIAC_ANIMALS[(start.branchIndex + step) % 12]);
}

function groupsInYear(year: number) {
  return samjaeGroups()
    .map((group) => ({ group, stage: samjaeOf(group.members[0].branchIndex, year).stage }))
    .filter((g) => g.stage);
}

function yearLine(year: number) {
  return groupsInYear(year)
    .map(({ group, stage }) => `${joinAnimals(group.members)} ${stage}`)
    .join(", ");
}

function description() {
  return `삼재는 12년마다 드는 3년의 시기로 들삼재·눌삼재·날삼재로 나뉩니다. ${STATUS_YEARS[1]}년은 ${yearLine(STATUS_YEARS[1])}이며, 12띠별 삼재 연도와 년생을 표로 정리했습니다.`;
}

function currentOrNextCycle(branch: number) {
  const status = samjaeOf(branch, BASE_YEAR);
  const start = status.stage ? status.years[0].year : (status.nextStartYear as number);
  return { start, end: start + 2, running: Boolean(status.stage) };
}

export function generateMetadata() {
  return buildSeoMetadata({
    path: PATH,
    title: titleOf(),
    description: description(),
    keywords: ["삼재", "삼재띠", "삼재 계산", "삼재 나이", "들삼재", "눌삼재", "날삼재", `${STATUS_YEARS[2]} 삼재띠`],
  });
}

export default function SamjaePage() {
  const groups = samjaeGroups();
  const birthYears = new Map(birthYearsByAnimal().map((row) => [row.animal.branchIndex, row.years.filter((y) => y >= BIRTH_FROM)]));
  const nextIpchun = birthYearInfo(STATUS_YEARS[2]).ipchun;
  const startingNext = groupsInYear(STATUS_YEARS[2]).filter((g) => g.stage === "들삼재");
  const title = "삼재 뜻과 삼재띠 표";
  const desc = description();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세", path: "/fortune" },
    { name: title, path: PATH },
  ]);
  const webPageJsonLd = buildWebPageJsonLd({ title, description: desc, path: PATH });
  const faqs = [
    {
      question: "삼재는 몇 년마다 돌아오나요?",
      answer:
        "12년마다 한 번, 3년 동안 듭니다. 띠는 열두 가지가 해마다 하나씩 돌아오고 삼재는 그중 연속한 세 해에 걸리므로, 같은 띠라면 삼재 3년이 끝난 뒤 9년을 쉬고 다시 들어옵니다. 평생으로 치면 여러 번 겪는 일이라, 한 번의 삼재를 인생 전체의 고비로 볼 이유는 없습니다.",
    },
    {
      question: "삼재는 1월 1일, 설날, 입춘 중 언제 시작하나요?",
      answer: `명리에서는 해가 바뀌는 기준을 입춘으로 보므로 삼재도 입춘에 들고 입춘에 나갑니다. 예를 들어 ${STATUS_YEARS[2]}년 들삼재는 ${STATUS_YEARS[2]}년 ${nextIpchun.month}월 ${nextIpchun.day}일 ${nextIpchun.hour}시 ${nextIpchun.minute}분(한국 시간) 입춘부터입니다. 민간에서는 음력 설을 기준으로 삼는 경우도 있어, 1~2월생이라면 두 기준을 함께 알아 두면 헷갈리지 않습니다.`,
    },
    {
      question: "삼재에는 이사나 결혼을 피해야 하나요?",
      answer:
        "삼재는 무리한 확장을 줄이고 건강과 안전을 챙기라는 민속의 경고에 가깝고, 큰일을 금하는 규칙은 아닙니다. 민간에서도 삼재에 좋은 일이 겹치는 경우를 복삼재라 부르며 구분합니다. 이사나 결혼은 집과 사람, 비용 같은 현실 조건으로 정하고, 삼재는 계약서와 일정을 한 번 더 확인하는 계기로 쓰는 편이 낫습니다.",
    },
    {
      question: "부부나 가족의 삼재가 겹치면 더 나쁜가요?",
      answer:
        "같은 삼합에 속한 띠는 같은 해에 삼재가 들기 때문에 가족 중 여러 명이 함께 삼재일 수 있습니다. 이를 더 나쁜 징조로 보는 정해진 규칙은 없습니다. 함께 조심할 시기가 겹친다는 뜻으로 받아들이고, 큰 지출이나 보증처럼 가족 전체가 묶이는 결정만 조금 더 신중하게 하면 됩니다.",
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
          <p className="text-xs font-bold tracking-[0.18em] text-[#e8d5a3]">삼합 띠별 · {STATUS_YEARS[0]}~{STATUS_YEARS[2]}년 기준</p>
          <h1 className="cd-main-title">{title}</h1>
          <p className="cd-main-intro">
            <strong>삼재는 12년마다 돌아오는 3년의 시기로, 차례대로 들삼재·눌삼재·날삼재라 부릅니다.</strong> 태어난 해의 띠가 같은
            삼합에 속하면 삼재도 같은 해에 듭니다. {STATUS_YEARS[0]}년은 {yearLine(STATUS_YEARS[0])}, {STATUS_YEARS[1]}년은{" "}
            {yearLine(STATUS_YEARS[1])}이고, {STATUS_YEARS[2]}년 입춘부터는 {startingNext.map((g) => joinAnimals(g.group.members)).join(", ")}의
            들삼재가 시작됩니다.
          </p>
        </header>

        <section className="mt-8" aria-labelledby="status-heading">
          <h2 id="status-heading">12띠 삼재 연도표</h2>
          <p className={BODY}>
            띠별로 {STATUS_YEARS.join("·")}년의 삼재 단계와, 지금 겪고 있거나 다음에 들 삼재 3년을 정리했습니다. 년생 칸은 {BIRTH_FROM}년
            이후 출생연도이며, 1~2월생은 입춘 전에 태어났다면 앞 해의 띠로 봅니다.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <caption className="sr-only">12띠의 년생, {STATUS_YEARS.join("·")}년 삼재 단계, 진행 중이거나 다음에 드는 삼재 연도</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>띠</th>
                  <th scope="col" className={TH}>년생</th>
                  {STATUS_YEARS.map((y) => (
                    <th key={y} scope="col" className={TH}>{y}년</th>
                  ))}
                  <th scope="col" className={TH}>삼재 3년</th>
                </tr>
              </thead>
              <tbody>
                {ZODIAC_ANIMALS.map((animal) => {
                  const cycle = currentOrNextCycle(animal.branchIndex);
                  return (
                    <tr key={animal.id}>
                      <th scope="row" className="px-3 py-3 text-left align-top font-bold whitespace-nowrap">
                        {animalLabel(animal)}
                      </th>
                      <td className="px-3 py-3 align-top text-[rgba(244,238,255,0.78)]">{(birthYears.get(animal.branchIndex) || []).join("·")}</td>
                      {STATUS_YEARS.map((y) => {
                        const stage = samjaeOf(animal.branchIndex, y).stage;
                        return (
                          <td key={y} className={`px-3 py-3 align-top whitespace-nowrap${stage ? " font-bold text-[#f4eeff]" : ""}`}>
                            {stage || "—"}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        {cycle.start}~{cycle.end}년{cycle.running ? " (진행 중)" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${CARD} mt-8`} aria-labelledby="rule-heading">
          <h2 id="rule-heading">삼재 계산법 — 삼합 네 무리</h2>
          <p className={BODY}>
            삼재는 띠 하나하나가 아니라 삼합(三合)으로 묶인 세 띠가 함께 겪습니다. 삼합은 지지 열둘을 네 칸씩 건너 묶은 무리로, 각 무리의
            첫 글자와 정면으로 부딪치는(충) 해에 삼재가 들어와 3년 동안 머뭅니다. 예를 들어 申子辰 무리는 申과 충하는 寅년에 들삼재를 맞고
            卯년 눌삼재, 辰년 날삼재를 지납니다. 아래 표는 그 규칙으로 계산한 무리별 삼재 연도입니다.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <caption className="sr-only">삼합 네 무리별 띠, 삼재가 드는 해의 지지, 삼재 연도</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>삼합</th>
                  <th scope="col" className={TH}>띠</th>
                  <th scope="col" className={TH}>삼재 드는 해</th>
                  <th scope="col" className={TH}>삼재 연도</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const order = samhapOrder(group);
                  return (
                    <tr key={order[0].id}>
                      <th scope="row" className="px-3 py-3 text-left align-top font-bold whitespace-nowrap">
                        {order.map((a) => a.branchHanja).join("")} {SAMHAP_ELEMENT[order[1].branchIndex]}
                      </th>
                      <td className="px-3 py-3 align-top">{joinAnimals(order)}</td>
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        {group.yearBranches.map((a) => a.branchHanja).join("")}년 ({group.yearBranches.map((a) => a.animal).join("·")}의 해)
                      </td>
                      <td className="px-3 py-3 align-top">{group.cycles.map((c) => `${c.start}~${c.end}년`).join(", ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="stage-heading">
          <h2 id="stage-heading">들삼재·눌삼재·날삼재의 뜻</h2>
          <p className={BODY}>
            <strong>들삼재</strong>는 삼재가 들어오는 첫해입니다. 환경이 바뀌거나 예상하지 못한 일이 생기기 쉬운 때로 보아, 새로 벌이는
            일의 규모를 조절하라고 일러 줍니다. <strong>눌삼재</strong>는 삼재가 눌러앉아 머무는 둘째 해로, 앞에서 시작된 일이 무겁게
            이어지는 시기입니다. 체력과 돈의 여유를 지키는 쪽이 중요합니다. <strong>날삼재</strong>는 삼재가 나가는 마지막 해입니다. 끝이
            보인다고 서두르기보다 3년 동안 벌어진 일을 정리하고 마무리하는 해로 씁니다.
          </p>
          <p className={BODY}>
            민간에서는 세 해 중 들삼재를 가장 조심하고 날삼재를 가장 가볍게 보는 경우가 많지만, 어느 해가 더 나쁘다는 정해진 규칙은
            없습니다. 같은 삼재라도 그해 띠와 맺는 관계에 따라 체감이 달라집니다. 특정 해에 띠가 어떤 합·충을 만나는지는{" "}
            <Link href="/fortune/2027" className="underline decoration-[rgba(232,213,163,0.5)] underline-offset-4">
              2027년 띠별 운세
            </Link>
            에서 띠마다 따로 볼 수 있습니다.
          </p>
        </section>

        <section className={`${CARD} mt-8`} aria-labelledby="meaning-heading">
          <h2 id="meaning-heading">삼재를 어떻게 받아들이면 좋을까</h2>
          <p className={BODY}>
            삼재(三災)라는 이름은 불·물·바람의 세 가지 재난이나 전쟁·질병·기근을 가리키던 말에서 왔습니다. 오랫동안 집안 어른들이 이
            시기에 부적을 쓰거나 절에서 삼재풀이를 하며 조심하라고 일러 온 데서 지금의 인식이 굳었습니다. 다만 삼재는 띠만 보고 정하는
            가장 넓은 기준이라, 같은 해에 태어난 사람이라면 모두 같은 삼재를 겪는다는 한계가 있습니다. 개인의 흐름은 태어난 달·날·시까지
            본 사주와 대운에서 더 구체적으로 드러납니다.
          </p>
          <p className={BODY}>
            삼재를 현실적으로 쓰는 방법은 단순합니다. 3년 단위로 건강검진과 보험을 점검하고, 보증이나 큰 대출처럼 되돌리기 어려운 결정은
            한 번 더 따져 보며, 운전과 여행에서 안전을 챙기는 것입니다. 걱정 때문에 필요한 결정까지 미루면 오히려 기회를 놓칠 수 있습니다.
          </p>
        </section>

        <section className="mt-8" aria-labelledby="samjae-faq-heading">
          <h2 id="samjae-faq-heading">삼재 자주 묻는 질문</h2>
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
          <Link href="/fortune/2027" className="cd-chip">2027년 띠별 운세</Link>
          <Link href="/fortune/tti-age" className="cd-chip">띠별 나이표</Link>
          <Link href="/compatibility/tti" className="cd-chip">띠궁합 표</Link>
          <Link href="/fortune/son-eomneun-nal" className="cd-chip">손없는날 달력</Link>
          <Link href="/saju" className="cd-chip">사주 보기</Link>
        </nav>

        <p className="mt-10 break-keep text-xs leading-6 text-[rgba(244,238,255,0.55)]">
          삼재는 민속 해석이며 개인 사주를 대신하지 않습니다. 삼재 연도는 입춘을 해의 경계로 계산했고, 입춘 시각은 한국 음양력 계산 코어의
          절기 값입니다.
        </p>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </>
  );
}
