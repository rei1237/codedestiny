import Link from "next/link";
import { buildSeoMetadata } from "@/lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildFaqPageJsonLd,
  buildWebPageJsonLd,
} from "@/lib/structured-data";
import { SIGN_PROFILES } from "@/lib/fortune/sign-profiles";
import { resolveFortuneArchiveDates } from "@/lib/fortune/daily-data";

const ANIMAL_PROFILES = SIGN_PROFILES.filter((profile) => profile.kind === "animal");
const TITLE = "최근 30일 띠별 날짜 운세";
const PATH = "/fortune/date";
const FAQS = [
  {
    question: "날짜별 띠 운세는 얼마나 오래 볼 수 있나요?",
    answer:
      "공개 날짜별 띠 운세는 한국 표준시 기준 최근 30일을 보관합니다. 날짜가 지나면 새 archive가 갱신되고 오래된 페이지는 목록과 사이트맵에서 빠집니다.",
  },
  {
    question: "오늘의 띠 운세와 날짜별 운세는 무엇이 다른가요?",
    answer:
      "오늘의 띠 운세는 현재 날짜에 맞춰 바뀌는 rolling 페이지이고, 날짜별 띠 운세는 특정 날짜의 일진 근거와 총운·재물운·연애운·직장운·건강운을 다시 확인하는 고정 페이지입니다.",
  },
  {
    question: "원숭이띠처럼 특정 띠의 날짜 운세는 어디서 보나요?",
    answer:
      "아래 날짜 목록에서 원하는 날을 고른 뒤 원숭이띠를 포함한 12띠 중 하나를 선택하면 해당 날짜의 띠별 운세로 이동합니다.",
  },
];

export function generateMetadata() {
  return buildSeoMetadata({
    path: PATH,
    title: TITLE,
    description:
      "최근 30일의 날짜별 띠 운세를 한곳에서 확인하세요. 12띠별 총운·재물운·연애운·직장운·건강운과 일진 근거를 날짜별로 정리합니다.",
    keywords: ["날짜별 띠 운세", "띠별 날짜 운세", "최근 30일 띠 운세", "원숭이띠 날짜 운세"],
  });
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${Number(year)}년 ${Number(month)}월 ${Number(day)}일`;
}

export default function DateFortuneArchivePage() {
  const dates = [...resolveFortuneArchiveDates()].reverse();
  const description = "최근 30일의 날짜별 띠 운세를 한곳에서 확인하세요. 12띠별 일진과 영역별 흐름을 날짜별로 정리합니다.";
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "오늘의 운세", path: "/today" },
    { name: TITLE, path: PATH },
  ]);
  const webPageJsonLd = buildWebPageJsonLd({ title: TITLE, description, path: PATH });
  const collectionJsonLd = buildCollectionPageJsonLd({ title: TITLE, description, path: PATH });
  const faqJsonLd = buildFaqPageJsonLd(FAQS);

  return (
    <>
      <main className="cd-main-shell cd-guide">
        <nav className="cd-chip-wrap" aria-label="위치">
          <Link href="/" className="cd-chip">홈</Link>
          <Link href="/today" className="cd-chip">오늘의 운세</Link>
          <span className="cd-chip" aria-current="page">날짜별 띠 운세</span>
        </nav>

        <header className="cd-main-header">
          <p className="text-xs font-bold tracking-[0.18em] text-[#e8d5a3]">KST · 최근 30일 archive</p>
          <h1 className="cd-main-title">{TITLE}</h1>
          <p className="cd-main-intro">
            특정 날짜의 원숭이띠 운세처럼 검색한 날과 띠를 직접 고를 수 있도록, 한국 표준시 기준 최근 30일의
            날짜별 운세를 모았습니다. 각 상세 페이지에서는 해당 날짜의 일진과 월건, 총운·재물운·연애운·직장운·건강운을
            함께 보여 드립니다. 오늘의 운세가 매일 바뀌는 현재 흐름이라면, 이 목록은 이미 지나간 날짜의 해석을 다시 확인하는
            보관함입니다.
          </p>
        </header>

        <section className="cd-card" aria-labelledby="archive-guide-heading">
          <h2 id="archive-guide-heading">날짜별 띠 운세 읽는 법</h2>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-[rgba(244,238,255,0.8)]">
            <li><span className="mr-2 font-bold text-[#e8d5a3]">1.</span>확인하려는 날짜를 고릅니다.</li>
            <li><span className="mr-2 font-bold text-[#e8d5a3]">2.</span>원숭이띠·용띠 등 자신의 띠를 선택합니다.</li>
            <li><span className="mr-2 font-bold text-[#e8d5a3]">3.</span>일진 근거와 총운·재물운·연애운·직장운·건강운의 흐름을 함께 읽습니다.</li>
            <li><span className="mr-2 font-bold text-[#e8d5a3]">4.</span>중요한 결정은 운세보다 실제 조건과 자신의 판단을 우선합니다.</li>
          </ol>
        </section>

        <section className="mt-12" aria-labelledby="archive-list-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="archive-list-heading">최근 날짜 목록</h2>
              <p className="mt-2 break-keep text-sm leading-7 text-[rgba(244,238,255,0.7)]">
                날짜마다 12띠 상세 페이지로 연결됩니다. 오래된 날짜는 30일 보관 기준에 따라 목록에서 자동으로 빠집니다.
              </p>
            </div>
            <Link href="/fortune/today" className="cd-chip">오늘의 띠 운세로 이동</Link>
          </div>

          <div className="mt-5 space-y-5">
            {dates.map((date) => (
              <article key={date} className="cd-card">
                <h3 className="text-base font-extrabold text-[#f4eeff]">{formatDate(date)} 띠별 운세</h3>
                <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {ANIMAL_PROFILES.map((profile) => (
                    <li key={profile.id}>
                      <Link
                        href={`/fortune/date/${date}/${profile.id}`}
                        className="flex min-h-11 items-center rounded-xl border border-[#e8d5a3]/25 bg-white/5 px-3 py-2 text-sm font-bold text-[#f4eeff] transition-colors hover:border-[#e8d5a3]/70"
                      >
                        {profile.nameKo} 운세
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="archive-faq-heading">
          <h2 id="archive-faq-heading">자주 묻는 질문</h2>
          <div className="mt-4 space-y-3">
            {FAQS.map((faq) => (
              <details key={faq.question} className="cd-card">
                <summary className="cursor-pointer font-bold text-[#f4eeff]">{faq.question}</summary>
                <p className="mt-3 break-keep text-sm leading-7 text-[rgba(244,238,255,0.78)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-10 break-keep text-xs leading-6 text-[rgba(244,238,255,0.55)]">
          운세 콘텐츠는 오락과 자기성찰을 위한 참고 정보입니다. 건강·법률·재무처럼 중요한 결정은 실제 조건과 해당 분야 전문가의 조언을 함께 확인하세요.
        </p>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
