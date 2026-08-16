import Link from "next/link";
import { generatePageMetadata } from "@/lib/generate-page-metadata";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildWebPageJsonLd } from "@/lib/structured-data";

/**
 * 체계 간 비교 문서 2호. 레시피는 docs/handoff/system-comparison-docs-2026-08-16.md 참고.
 *
 * 이 짝을 2호로 고른 이유: 27수를 **공유**하는데 해석 축이 달라 실제로 가장 헷갈리고,
 * 한국어로 제대로 정리된 문서가 거의 없어 인용 기회가 크다. `/nakshatra` 통합 페이지가
 * 이미 있어 근거도 갖춰져 있다.
 *
 * 🔴 용어는 lib/seo/entity-registry.mjs 의 허브 프로필에서 확인한 것만 쓴다
 *    (숙요점·본명숙·27수 / 베다 점성술·조티쉬·라그나·다샤). 없는 개념을 지어내지 않는다.
 */

const PATH = "/compare/sukuyo-vs-vedic";
const TITLE = "숙요점과 베다 점성술은 같은 27수를 왜 다르게 읽는가 | Code Destiny";
const DESCRIPTION =
  "숙요점과 베다 점성술은 27수라는 같은 재료를 쓰면서도 다른 것을 묻습니다. 본명숙과 라그나, 관계의 거리와 시간의 주기가 어떻게 갈리는지 비교해 정리합니다.";

export function generateMetadata() {
  return generatePageMetadata({
    path: PATH,
    title: TITLE,
    description: DESCRIPTION,
    keywords: ["숙요점 베다 차이", "27수", "본명숙", "조티쉬", "나크샤트라", "베다 점성술", "Code Destiny"],
  });
}

const comparisonRows = [
  {
    axis: "27수를 무엇으로 쓰는가",
    sukuyo: "사람마다 본명숙 하나를 정해 관계를 재는 좌표로 씁니다.",
    vedic: "달이 지나는 27개 구간으로, 차트를 읽는 여러 층 중 하나로 씁니다.",
  },
  {
    axis: "중심이 되는 기준점",
    sukuyo: "태어난 날 달이 머문 자리, 곧 본명숙입니다.",
    vedic: "태어난 시각에 동쪽 지평선에 떠오른 자리, 곧 라그나입니다.",
  },
  {
    axis: "잘 답하는 질문",
    sukuyo: "이 사람과 나는 어떤 거리에서 편안한가.",
    vedic: "지금 나는 어떤 시기를 지나고 있는가.",
  },
  {
    axis: "시간을 보는 방식",
    sukuyo: "날짜 단위로 순환하는 관계의 리듬을 봅니다.",
    vedic: "다샤라는 긴 주기로 몇 해 단위의 국면을 봅니다.",
  },
  {
    axis: "출생시간의 무게",
    sukuyo: "본명숙은 날짜로 정해져 시간은 경계에 걸릴 때만 중요합니다.",
    vedic: "라그나가 두 시간마다 바뀌어 시간이 어긋나면 차트가 통째로 달라집니다.",
  },
  {
    axis: "결과가 향하는 곳",
    sukuyo: "상대와의 관계에서 취할 태도와 거리.",
    vedic: "지금 국면에서 힘을 쓸 영역과 아껴야 할 영역.",
  },
];

const faqItems = [
  {
    question: "27수가 같은데 왜 결과가 다른가요?",
    answer:
      "재료가 같아도 그 재료로 세우는 질문이 다르기 때문입니다. 숙요점은 27수를 사람과 사람 사이의 거리를 재는 자로 씁니다. 베다 점성술은 27수를 달의 위치를 세분하는 눈금으로 쓰고, 실제 해석의 중심은 라그나와 다샤에 있습니다. 같은 눈금을 다른 도구에 붙인 셈입니다.",
  },
  {
    question: "출생시간을 모르면 어느 쪽을 봐야 하나요?",
    answer:
      "숙요점입니다. 본명숙은 태어난 날 달이 머문 자리로 정해지므로 날짜만으로도 읽을 수 있고, 시간은 달이 자리를 옮기는 경계에 걸릴 때만 문제가 됩니다. 베다 점성술은 라그나가 대략 두 시간마다 바뀌기 때문에 시간이 부정확하면 차트 전체가 어긋납니다.",
  },
  {
    question: "숙요점은 궁합만 보는 건가요?",
    answer:
      "관계 해석이 가장 두드러지지만 그것만은 아닙니다. 본명숙은 타고난 기질과 하루의 리듬을 보는 데도 쓰입니다. 다만 숙요점의 구조가 두 자리 사이의 관계를 재는 데 특히 선명하기 때문에, 실제로 가장 많이 쓰이는 자리가 관계입니다.",
  },
  {
    question: "둘을 같이 보면 더 정확해지나요?",
    answer:
      "정확도가 올라간다기보다 보는 축이 늘어납니다. 관계에서 반복되는 거리감은 숙요점이, 그 관계가 왜 지금 이렇게 흐르는지는 베다의 다샤가 설명하는 편입니다. 두 결과가 어긋난다면 어느 쪽이 틀린 것이 아니라 서로 다른 층을 말하고 있을 가능성이 큽니다.",
  },
];

const breadcrumb = buildBreadcrumbJsonLd([
  { name: "홈", path: "/" },
  { name: "숙요점과 베다 점성술 비교", path: PATH },
]);

const webPage = buildWebPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH });
const faqPage = buildFaqPageJsonLd(faqItems);

export default function SukuyoVsVedicPage() {
  return (
    <main className="cd-main-shell cd-guide">
      <header className="cd-main-header">
        <h1 className="cd-main-title">숙요점과 베다 점성술은 같은 27수를 왜 다르게 읽는가</h1>
        <p className="cd-main-intro">
          숙요점과 베다 점성술은 하늘을 스물일곱으로 나눈다는 같은 뿌리에서 나왔습니다. 그래서 낯선 이름이 겹쳐 보이고, 한쪽에서 들은 말을 다른 쪽에 그대로 옮겨도 될 것처럼 느껴집니다. 그러나 두 체계는 그 스물일곱을 서로 다른 도구에 붙였습니다. 숙요점은 사람 사이의 거리를 재는 자로, 베다 점성술은 시간의 국면을 읽는 눈금으로 씁니다.
        </p>
      </header>

      <section className="cd-card">
        <h2>한눈에 보는 차이</h2>
        {/* 넓은 표는 자기 컨테이너 안에서만 가로 스크롤한다 — 본문이 가로로 밀리면 안 된다. */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <caption className="sr-only">숙요점과 베다 점성술의 해석 기준 비교</caption>
            <thead>
              <tr>
                <th scope="col" className="px-3 py-3 text-left font-bold">비교 축</th>
                <th scope="col" className="px-3 py-3 text-left font-bold">숙요점</th>
                <th scope="col" className="px-3 py-3 text-left font-bold">베다 점성술</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.axis}>
                  <th scope="row" className="px-3 py-3 text-left align-top font-semibold">{row.axis}</th>
                  <td className="px-3 py-3 align-top leading-7 break-keep">{row.sukuyo}</td>
                  <td className="px-3 py-3 align-top leading-7 break-keep">{row.vedic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cd-card">
        <h2>숙요점은 거리를 잽니다</h2>
        <p>
          숙요점에서 나를 가리키는 것은 태어난 날 달이 머문 자리, 본명숙입니다. 달은 하루에 한 자리 남짓 옮겨 가므로 본명숙은 날짜로 정해집니다. 여기서 중요한 것은 내 자리가 무엇이냐보다, 내 자리에서 상대의 자리가 몇 칸 떨어져 있느냐입니다.
        </p>
        <p>
          그래서 숙요점의 결과는 성격 판정보다 관계의 태도에 가깝습니다. 가까이 붙어야 편한 사이가 있고, 한 걸음 떨어져야 오래가는 사이가 있으며, 서로 배우는 자리에 놓인 사이가 있습니다. 같은 사람이라도 누구와 놓이느냐에 따라 읽히는 내용이 달라지는 것이 이 체계의 특징입니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>베다 점성술은 국면을 봅니다</h2>
        <p>
          베다 점성술, 곧 조티쉬의 출발점은 라그나입니다. 태어난 시각에 동쪽 지평선에 떠오르던 자리를 첫 칸으로 삼아 차트를 세웁니다. 라그나는 대략 두 시간마다 바뀌기 때문에, 출생시간이 어긋나면 첫 칸이 통째로 옮겨 가고 그 위에 세운 해석도 함께 흔들립니다.
        </p>
        <p>
          여기에 다샤가 더해집니다. 다샤는 어떤 기운이 몇 해 동안 삶의 배경음이 되는지를 나누는 긴 주기입니다. 27수는 이 다샤의 출발점을 정하는 데 쓰이며, 그래서 베다에서 27수는 목적지가 아니라 시간표를 읽기 위한 눈금에 가깝습니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>어느 쪽부터 보면 좋은가</h2>
        <ul>
          <li>특정한 사람과의 관계가 왜 늘 그 거리에서 멈추는지 궁금하다면 숙요점부터 봅니다.</li>
          <li>요즘 몇 해째 흐름이 달라졌다고 느낀다면 베다의 다샤가 그 배경을 설명합니다.</li>
          <li>출생시간을 모른다면 숙요점이 현실적입니다. 베다는 라그나가 서지 않으면 해석이 성립하지 않습니다.</li>
          <li>두 결과가 어긋난다면 어느 쪽을 버리기보다, 서로 다른 층을 말하고 있다고 보는 편이 정확합니다.</li>
        </ul>
      </section>

      <section className="cd-card-grid" aria-labelledby="compare-sukuyo-vedic-faq-title">
        <h2 id="compare-sukuyo-vedic-faq-title" className="sr-only">자주 묻는 질문</h2>
        {faqItems.map((item) => (
          <article key={item.question} className="cd-card">
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </article>
        ))}
      </section>

      <section className="cd-card">
        <h2>해석을 받아들일 때</h2>
        <p>
          두 체계 모두 전통 문헌의 해석 규칙을 계산해 얻은 구조이며, 문화적 해석 콘텐츠입니다. 의료 진단, 법률 판단, 투자 결정, 결혼과 이혼의 근거로 삼기에는 적합하지 않습니다. 관계에 대한 해석은 특히 상대를 규정하는 말로 쓰기 쉬우니, 상대를 판단하는 근거보다 내 태도를 돌아보는 자료로 두는 편이 안전합니다.
        </p>
      </section>

      <nav className="cd-chip-wrap" aria-label="비교 문서 관련 링크">
        <Link href="/sukuyo/" className="cd-chip">숙요점 보러 가기</Link>
        <Link href="/vedic/" className="cd-chip">베다 점성술 보러 가기</Link>
        <Link href="/nakshatra/" className="cd-chip">27수 도감</Link>
        <Link href="/compare/saju-vs-ziwei/" className="cd-chip">사주와 자미두수 비교</Link>
        <Link href="/methodology/" className="cd-chip">콘텐츠 방법론</Link>
        <Link href="/disclaimer/" className="cd-chip">면책 고지</Link>
      </nav>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
    </main>
  );
}
