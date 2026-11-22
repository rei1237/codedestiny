/**
 * /fortune/son-eomneun-nal — 손없는날 달력.
 *
 * "손없는날", "이사 손없는날", "12월 손없는날" 은 날짜를 바로 찾는 조회형 검색이다. 표의 음력 날짜는
 * 한국 음양력 코어(lib/korean-calendar)로 날마다 계산한다 — 손으로 적은 달력은 한 칸만 틀려도 이사
 * 날짜를 잘못 잡게 만든다. 범위는 lib/fortune/zodiac-folk.ts 의 SON_EOMNEUN_RANGE 한 곳에서 정한다.
 */
import Link from "next/link";
import { buildSeoMetadata, seoDisplayWidth } from "@/lib/seo";
import { SERP_TITLE_WIDTH_LIMIT } from "@/lib/fortune/seo-title.mjs";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "@/lib/structured-data";
import { SON_EOMNEUN_RANGE, leapMonthStart, sonEomneunMonths, type SonMonth } from "@/lib/fortune/zodiac-folk";

const PATH = "/fortune/son-eomneun-nal";
const CARD = "cd-card";
const BODY = "mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.82)]";
const TH = "px-3 py-3 text-left font-bold";
const TD = "px-3 py-3 align-top";

const FOCUS_YEAR = SON_EOMNEUN_RANGE.to.year;

function titleOf() {
  const base = `손없는날 달력 | ${FOCUS_YEAR}년 이사 날짜표`;
  const branded = `${base} | 꿀꿀 운세`;
  return seoDisplayWidth(branded) <= SERP_TITLE_WIDTH_LIMIT ? branded : base;
}

function summarize(months: SonMonth[]) {
  const focus = months.filter((m) => m.year === FOCUS_YEAR);
  const days = focus.flatMap((m) => m.days);
  const weekend = days.filter((d) => d.weekend);
  const saturdays = weekend.filter((d) => d.weekday === "토").length;
  return { focus, total: days.length, weekend: weekend.length, saturdays, sundays: weekend.length - saturdays };
}

function rangeLabel() {
  const { from, to } = SON_EOMNEUN_RANGE;
  return `${from.year}년 ${from.month}월 ~ ${to.year}년 ${to.month}월`;
}

function description() {
  const s = summarize(sonEomneunMonths());
  return `손없는날은 음력 9·10·19·20·29·30일입니다. ${FOCUS_YEAR}년 손없는날 ${s.total}일(주말 ${s.weekend}일)을 양력 날짜·요일·음력으로 정리했습니다.`;
}

/** 윤달 안내 — 음력 연도마다 코어에 물어 만든다. 손으로 적으면 해가 바뀔 때 틀린다. */
function leapNote() {
  const current = [FOCUS_YEAR - 1, FOCUS_YEAR].map((y) => ({ y, leap: leapMonthStart(y) }));
  const solarLabel = (s: { year: number; month: number; day: number }) => `양력 ${s.year}년 ${s.month}월 ${s.day}일 시작`;
  const head = current.every((c) => !c.leap)
    ? `음력 ${FOCUS_YEAR - 1}·${FOCUS_YEAR}년에는 윤달이 없습니다.`
    : current
        .filter((c) => c.leap)
        .map((c) => `음력 ${c.y}년에는 윤${c.leap!.lunarMonth}월(${solarLabel(c.leap!.solar)})이 있습니다.`)
        .join(" ");
  const next = [FOCUS_YEAR + 1, FOCUS_YEAR + 2, FOCUS_YEAR + 3]
    .map((y) => ({ y, leap: leapMonthStart(y) }))
    .find((c) => c.leap);
  return next ? `${head} 그다음 윤달은 음력 ${next.y}년 윤${next.leap!.lunarMonth}월(${solarLabel(next.leap!.solar)})입니다.` : head;
}

const DIRECTIONS: [string, string][] = [
  ["1일·2일 (11·12·21·22일)", "동쪽"],
  ["3일·4일 (13·14·23·24일)", "남쪽"],
  ["5일·6일 (15·16·25·26일)", "서쪽"],
  ["7일·8일 (17·18·27·28일)", "북쪽"],
  ["9일·10일 (19·20·29·30일)", "없음 — 손없는날"],
];

export function generateMetadata() {
  return buildSeoMetadata({
    path: PATH,
    title: titleOf(),
    description: description(),
    keywords: ["손없는날", "손없는날 달력", `${FOCUS_YEAR} 손없는날`, "이사 손없는날", "손없는날 계산", "주말 손없는날"],
  });
}

export default function SonEomneunNalPage() {
  const months = sonEomneunMonths();
  const s = summarize(months);
  const title = "손없는날 달력";
  const desc = description();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세", path: "/fortune" },
    { name: title, path: PATH },
  ]);
  const webPageJsonLd = buildWebPageJsonLd({ title, description: desc, path: PATH });
  const faqs = [
    {
      question: "손없는날은 어떻게 계산하나요?",
      answer:
        "음력 날짜의 끝자리만 보면 됩니다. 끝자리가 9나 0인 날, 곧 음력 9·10·19·20·29·30일이 손없는날입니다. 양력 날짜로는 달마다 위치가 바뀌므로 음력으로 바꾼 뒤 확인해야 하며, 위 달력은 그 변환을 날마다 계산해 둔 결과입니다.",
    },
    {
      question: `${FOCUS_YEAR}년 손없는날 중 주말은 며칠인가요?`,
      answer: `${FOCUS_YEAR}년 손없는날은 모두 ${s.total}일이고, 그중 토요일이 ${s.saturdays}일, 일요일이 ${s.sundays}일입니다. 주말 손없는날은 이사 수요가 한꺼번에 몰리는 편이라, 날짜를 정했다면 업체 예약과 엘리베이터 사용 신청을 일찍 해 두는 것이 좋습니다.`,
    },
    {
      question: "손없는날이 아니면 이사하면 안 되나요?",
      answer:
        "그렇지 않습니다. 손없는날은 날짜마다 방위를 옮겨 다닌다고 믿은 귀신을 피하려던 민속 관습입니다. 관습을 따르는 쪽에서도 손이 있는 방향으로만 옮기지 않으면 된다고 보는 해석이 있습니다. 잔금일, 입주 가능일, 아이의 전학 시기처럼 현실의 조건이 날짜를 정하는 더 확실한 기준입니다.",
    },
    {
      question: "손없는날과 길일은 같은 말인가요?",
      answer:
        "다릅니다. 택일에는 황도일, 생기복덕일, 개인 사주와 맞춘 날처럼 여러 기준이 있고, 손없는날은 그중 방위 귀신 하나만 보는 가장 단순한 기준입니다. 그래서 손없는날이라도 다른 기준으로는 피하는 날일 수 있고, 반대의 경우도 있습니다.",
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
          <p className="text-xs font-bold tracking-[0.18em] text-[#e8d5a3]">음력 끝자리 9·0 · {rangeLabel()}</p>
          <h1 className="cd-main-title">{title}</h1>
          <p className="cd-main-intro">
            <strong>손없는날은 음력 9·10·19·20·29·30일입니다.</strong> 음력 날짜 끝자리가 9나 0인 날에는 사람의 일을 방해한다는
            &lsquo;손&rsquo;이 하늘로 올라가 어느 방향에도 없다고 보아, 이사·혼례·개업 날짜로 많이 고릅니다. {FOCUS_YEAR}년에는 손없는날이{" "}
            {s.total}일 있고, 그중 토·일요일은 {s.weekend}일입니다. 아래 달력에서 양력 날짜와 요일, 음력 날짜를 함께 확인하세요.
          </p>
        </header>

        <section className="mt-8" aria-labelledby="calendar-heading">
          <h2 id="calendar-heading">{rangeLabel()} 손없는날</h2>
          <p className={BODY}>
            양력 날짜 뒤 괄호는 요일, 작은 글씨는 음력 월·일입니다. 주말 칸에는 토·일요일에 해당하는 손없는날만 다시 모았습니다.
            음력 날짜는 이 사이트 만세력과 같은 한국 음양력 계산 코어로 하루씩 변환해 얻은 값입니다.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <caption className="sr-only">{rangeLabel()} 월별 손없는날의 양력 날짜, 요일, 음력 날짜와 주말 손없는날</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>양력 월</th>
                  <th scope="col" className={TH}>손없는날 (요일 · 음력)</th>
                  <th scope="col" className={TH}>주말</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => {
                  const weekend = m.days.filter((d) => d.weekend);
                  return (
                    <tr key={`${m.year}-${m.month}`}>
                      <th scope="row" className="px-3 py-3 text-left align-top font-bold whitespace-nowrap">
                        {m.year}년 {m.month}월
                      </th>
                      <td className={TD}>
                        <ul className="flex flex-wrap gap-x-4 gap-y-1">
                          {m.days.map((d) => (
                            <li key={d.day} className={d.weekend ? "font-bold text-[#f4eeff]" : undefined}>
                              {d.day}일({d.weekday})
                              <span className="ml-1 text-xs text-[rgba(244,238,255,0.58)]">
                                음{d.isLeapMonth ? "윤" : ""}{d.lunarMonth}.{d.lunarDay}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className={TD}>{weekend.length ? weekend.map((d) => `${d.day}일(${d.weekday})`).join(", ") : "없음"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${CARD} mt-8`} aria-labelledby="direction-heading">
          <h2 id="direction-heading">음력 날짜와 손이 있는 방향</h2>
          <p className={BODY}>
            민속에서 손은 음력 날짜를 따라 네 방위를 차례로 돈다고 봅니다. 끝자리가 1·2인 날은 동쪽, 3·4인 날은 남쪽, 5·6인 날은
            서쪽, 7·8인 날은 북쪽에 있고, 9·0인 날에는 하늘로 올라가 어느 방향에도 없습니다. 손없는날을 고르지 못할 때 손이 있는
            방향만 피해 옮긴다는 해석이 여기서 나옵니다.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[24rem] border-collapse text-sm">
              <caption className="sr-only">음력 날짜 끝자리별 손의 방향</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>음력 날짜</th>
                  <th scope="col" className={TH}>손이 있는 방향</th>
                </tr>
              </thead>
              <tbody>
                {DIRECTIONS.map(([days, dir]) => (
                  <tr key={days}>
                    <th scope="row" className="px-3 py-3 text-left font-bold">{days}</th>
                    <td className="px-3 py-3">{dir}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="origin-heading">
          <h2 id="origin-heading">손없는날의 &lsquo;손&rsquo;은 무엇인가요?</h2>
          <p className={BODY}>
            &lsquo;손&rsquo;은 날짜에 따라 방위를 옮겨 다니며 사람이 하는 일에 해를 끼친다고 믿은 귀신을 가리키는 말로, 태백살(太白殺)이라고도
            부릅니다. 집을 옮기거나 혼례를 치르는 것처럼 방향을 바꾸는 큰일을 할 때 이 귀신과 마주치지 않으려고 날을 고르던 풍습이
            지금의 &lsquo;손없는날 이사&rsquo;로 남았습니다. 명리학의 일진이나 개인 사주와는 별개인 민간 관습이라, 같은 날이 누구에게나 똑같이
            손없는날입니다.
          </p>
          <p className={BODY}>
            윤달을 귀신이 탈을 부리지 않는 &lsquo;공달&rsquo;로 여겨 이사, 수의 장만, 묘 이장을 몰아서 하던 풍습도 같은 갈래입니다.{" "}
            {leapNote()}
          </p>
        </section>

        <section className={`${CARD} mt-8`} aria-labelledby="moving-heading">
          <h2 id="moving-heading">이사 날짜를 정할 때 손없는날보다 먼저 볼 것</h2>
          <p className={BODY}>
            손없는날, 그중에서도 주말 손없는날은 이사가 한꺼번에 몰리는 날이라 원하는 업체와 시간대를 잡기 어렵고 견적이 높게 나오는
            경우가 많습니다. 날짜를 고를 때는 잔금일과 입주 가능일, 전입신고와 확정일자를 받을 수 있는 평일 여부, 아이의 전학과 출퇴근
            동선, 장마·한파 같은 날씨를 먼저 맞춘 뒤 그 범위 안에서 손없는날을 고르는 순서가 현실적입니다. 손없는날을 꼭 지키고 싶다면
            두세 달 전에 예약하고, 평일 손없는날을 함께 후보에 넣으면 선택지가 넓어집니다.
          </p>
          <p className={BODY}>
            택일을 어떻게 받아들이면 좋은지, 날짜 하나에 결정을 다 맡기지 않는 방법은{" "}
            <Link href="/insights/lucky-day-selection-without-superstition" className="underline decoration-[rgba(232,213,163,0.5)] underline-offset-4">
              좋은 날 고르기 글
            </Link>
            에서 더 자세히 다룹니다.
          </p>
        </section>

        <section className="mt-8" aria-labelledby="son-faq-heading">
          <h2 id="son-faq-heading">손없는날 자주 묻는 질문</h2>
          <div className="mt-4 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className={CARD}>
                <summary className="cursor-pointer font-bold text-[#f4eeff]">{faq.question}</summary>
                <p className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.78)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <nav className="cd-chip-wrap mt-8" aria-label="함께 보는 민속 달력">
          <Link href="/fortune/samjae" className="cd-chip">삼재띠 계산표</Link>
          <Link href="/fortune/tti-age" className="cd-chip">띠별 나이표</Link>
          <Link href="/compatibility/tti" className="cd-chip">띠궁합 표</Link>
          <Link href="/fortune/2027" className="cd-chip">2027년 띠별 운세</Link>
          <Link href="/today" className="cd-chip">오늘의 운세</Link>
          <Link href="/manse" className="cd-chip">무료 만세력</Link>
        </nav>

        <p className="mt-10 break-keep text-xs leading-6 text-[rgba(244,238,255,0.55)]">
          손없는날은 민속 관습을 정리한 참고 정보이며 개인 사주를 대신하지 않습니다. 음력 날짜는 이 사이트 만세력과 같은 한국 음양력
          계산 코어로 구했고, 공휴일과 지역 행사는 반영하지 않았습니다.
        </p>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </>
  );
}
