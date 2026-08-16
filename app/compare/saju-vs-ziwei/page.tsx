import Link from "next/link";
import { generatePageMetadata } from "@/lib/generate-page-metadata";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildWebPageJsonLd } from "@/lib/structured-data";

/**
 * 체계 간 비교 문서 1호.
 *
 * 경쟁사 비교가 아니라 **우리가 실제로 제공하는 두 체계**의 비교다. 지어낸 내용이 없고,
 * 사주 허브와 자미두수 허브를 잇는 내부 링크 역할도 한다.
 *
 * 🔴 게이트 제약 (착수 전 실측)
 *  - `/compare` 는 adsense-route-policy 의 CONTENT_PREFIXES 에 없다 → canLoadAdsense=false →
 *    verify-adsense-readiness 의 **1,800자** 기준을 탄다(1,200자가 아니다). 광고 정책은 이 문서
 *    때문에 바꾸지 않는다 — 그건 수익·UX 판단이라 별건이다.
 *  - H1 은 정확히 1개여야 한다(verify:seo-heading-integrity 가 산출물을 전수 스캔한다).
 *  - title·description 은 사이트맵 전역에서 유일해야 한다(같은 게이트가 중복을 잡는다).
 *  - 본문을 `dynamic(..., { ssr: false })` 로 붙이면 가시 텍스트 0자로 세어진다. 전부 서버 렌더다.
 */

const PATH = "/compare/saju-vs-ziwei";
const TITLE = "사주와 자미두수는 무엇이 다른가 | Code Destiny";
const DESCRIPTION =
  "같은 생년월일로 사주와 자미두수를 보면 왜 다른 이야기가 나오는지, 두 체계가 각각 무엇을 세우고 무엇을 답하는지 비교해 정리합니다.";

export function generateMetadata() {
  return generatePageMetadata({
    path: PATH,
    title: TITLE,
    description: DESCRIPTION,
    keywords: ["사주 자미두수 차이", "사주 vs 자미두수", "명리 비교", "자미두수 명반", "사주팔자", "Code Destiny"],
  });
}

const comparisonRows = [
  {
    axis: "무엇을 세우는가",
    saju: "천간과 지지로 네 기둥(년·월·일·시)을 세웁니다.",
    ziwei: "열두 궁에 별을 배치해 명반 한 장을 만듭니다.",
  },
  {
    axis: "중심이 되는 기준점",
    saju: "태어난 날의 천간, 곧 일간이 기준입니다.",
    ziwei: "명궁의 위치와 그 궁에 앉은 주성이 기준입니다.",
  },
  {
    axis: "해석의 언어",
    saju: "오행의 생극과 십성으로 관계와 역할을 읽습니다.",
    ziwei: "별의 성질과 궁의 주제, 사화의 변화를 읽습니다.",
  },
  {
    axis: "잘 답하는 질문",
    saju: "나는 어떤 기질이고 무엇에 힘이 실리는가.",
    ziwei: "재물·관계·직업처럼 영역별로 무엇이 어떻게 흐르는가.",
  },
  {
    axis: "시간을 보는 방식",
    saju: "대운과 세운으로 열 해와 한 해의 배경을 봅니다.",
    ziwei: "대한과 유년으로 궁을 옮겨 가며 영역별 시기를 봅니다.",
  },
  {
    axis: "출생시간의 무게",
    saju: "시주가 빠져도 큰 구조는 읽을 수 있습니다.",
    ziwei: "명궁 자체가 시간으로 정해져 시간이 없으면 명반이 서지 않습니다.",
  },
];

const faqItems = [
  {
    question: "사주와 자미두수 중 어느 쪽이 더 정확한가요?",
    answer:
      "정확도를 겨루는 관계가 아닙니다. 두 체계는 질문의 종류가 다릅니다. 사주는 타고난 기질과 힘의 방향을 묻는 데 강하고, 자미두수는 재물·관계·직업처럼 영역을 나눠 묻는 데 강합니다. 같은 사람을 서로 다른 축으로 본 결과이므로 어느 한쪽이 다른 쪽을 부정하지 않습니다.",
  },
  {
    question: "같은 생년월일인데 결과가 다르게 나오는 이유는 무엇인가요?",
    answer:
      "기준점이 다르기 때문입니다. 사주는 태어난 날의 천간을 나로 두고 나머지 글자와의 관계를 읽고, 자미두수는 태어난 시각으로 명궁을 정한 뒤 그 궁에 앉은 별로 읽습니다. 출발점이 다르면 같은 자료에서도 다른 문장이 나옵니다. 어긋난 것이 아니라 다른 질문에 답한 것입니다.",
  },
  {
    question: "출생시간을 모르면 둘 다 못 보나요?",
    answer:
      "사주는 시주를 비워 두고도 연·월·일의 구조로 큰 흐름을 읽을 수 있습니다. 반면 자미두수는 태어난 시각으로 명궁을 정하기 때문에 시간이 없으면 명반 자체가 서지 않습니다. 시간을 모르는 경우에는 사주부터 보는 편이 현실적입니다.",
  },
  {
    question: "둘을 같이 보면 더 좋은가요?",
    answer:
      "같은 결론을 두 번 확인하려는 목적이라면 권하지 않습니다. 두 체계가 겹치는 지점보다 어긋나는 지점이 더 많은 정보를 주기 때문입니다. 기질은 사주로, 영역별 흐름은 자미두수로 나눠 읽고 차이가 나는 대목을 질문으로 남기는 방식이 실제로 도움이 됩니다.",
  },
];

// `/compare` 허브는 아직 없다. 없는 URL 을 브레드크럼에 넣으면 안 되므로 중간 단계를 두지 않는다.
// 비교 문서가 4개가 되면 그때 허브를 만들고 이 배열에 한 단계를 넣는다.
const breadcrumb = buildBreadcrumbJsonLd([
  { name: "홈", path: "/" },
  { name: "사주와 자미두수 비교", path: PATH },
]);

const webPage = buildWebPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH });
const faqPage = buildFaqPageJsonLd(faqItems);

export default function SajuVsZiweiPage() {
  return (
    <main className="cd-main-shell cd-guide">
      <header className="cd-main-header">
        <h1 className="cd-main-title">사주와 자미두수는 무엇이 다른가</h1>
        <p className="cd-main-intro">
          사주와 자미두수는 같은 생년월일을 재료로 쓰지만 서로 다른 것을 세웁니다. 사주는 태어난 순간을 네 기둥으로 세워 기질과 힘의 방향을 읽고, 자미두수는 열두 궁에 별을 배치해 삶의 영역별 흐름을 읽습니다. 그래서 두 결과가 다르게 보이는 것은 어느 한쪽이 틀렸기 때문이 아니라, 애초에 다른 질문에 답하고 있기 때문입니다.
        </p>
      </header>

      <section className="cd-card">
        <h2>한눈에 보는 차이</h2>
        {/* 넓은 표는 자기 컨테이너 안에서만 가로 스크롤한다 — 본문이 가로로 밀리면 안 된다. */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <caption className="sr-only">사주와 자미두수의 해석 기준 비교</caption>
            <thead>
              <tr>
                <th scope="col" className="px-3 py-3 text-left font-bold">비교 축</th>
                <th scope="col" className="px-3 py-3 text-left font-bold">사주</th>
                <th scope="col" className="px-3 py-3 text-left font-bold">자미두수</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.axis}>
                  <th scope="row" className="px-3 py-3 text-left align-top font-semibold">{row.axis}</th>
                  <td className="px-3 py-3 align-top leading-7 break-keep">{row.saju}</td>
                  <td className="px-3 py-3 align-top leading-7 break-keep">{row.ziwei}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cd-card">
        <h2>사주는 관계로 읽습니다</h2>
        <p>
          사주의 출발점은 태어난 날의 천간인 일간입니다. 이 한 글자를 나로 두고, 나머지 일곱 글자가 나를 돕는지 누르는지 끌어내는지를 봅니다. 오행의 개수를 세는 것이 아니라 계절의 온도와 글자 사이의 힘 관계를 보기 때문에, 같은 오행을 가지고 있어도 태어난 달이 다르면 전혀 다른 결로 읽힙니다.
        </p>
        <p>
          십성은 그 관계에 이름을 붙인 언어입니다. 나를 돕는 기운, 내가 만들어 내는 기운, 나를 통제하는 기운을 사람과 일, 책임과 재물의 자리로 옮겨 읽습니다. 그래서 사주가 잘 답하는 질문은 무엇을 하게 되는가보다 어떤 방식으로 하게 되는가에 가깝습니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>자미두수는 자리로 읽습니다</h2>
        <p>
          자미두수는 태어난 시각으로 명궁을 정하고, 그 자리를 시작으로 열두 궁을 펼칩니다. 재백궁은 재물, 관록궁은 일, 부처궁은 배우자처럼 궁마다 맡은 주제가 정해져 있고, 그 궁에 어떤 별이 앉았는지로 해당 영역의 성격을 읽습니다. 영역이 먼저 나뉘어 있다는 점이 사주와 가장 크게 다릅니다.
        </p>
        <p>
          여기에 사화가 더해지면 같은 별도 다르게 움직입니다. 어떤 해에 어떤 궁이 힘을 받고 어떤 궁이 흔들리는지를 보기 때문에, 자미두수는 시기와 영역을 함께 묻는 질문에 강합니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>어느 쪽부터 보면 좋은가</h2>
        <ul>
          <li>내가 어떤 사람인지, 왜 같은 상황에서 늘 비슷하게 반응하는지 궁금하다면 사주부터 봅니다.</li>
          <li>올해 일과 돈과 관계 중 어디가 움직이는지 영역을 나눠 보고 싶다면 자미두수가 맞습니다.</li>
          <li>출생시간을 모른다면 자미두수는 명반이 서지 않으므로 사주부터 보는 편이 현실적입니다.</li>
          <li>두 체계를 모두 봤다면 겹치는 대목보다 어긋나는 대목을 먼저 살피는 편이 얻는 것이 많습니다.</li>
        </ul>
      </section>

      <section className="cd-card-grid" aria-labelledby="compare-saju-ziwei-faq-title">
        <h2 id="compare-saju-ziwei-faq-title" className="sr-only">자주 묻는 질문</h2>
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
          두 체계 모두 전통 문헌의 해석 규칙을 계산해 얻은 구조이며, 문화적 해석 콘텐츠입니다. 의료 진단, 법률 판단, 투자 결정, 결혼과 이혼의 근거로 삼기에는 적합하지 않습니다. 해석이 잘 맞는다고 느껴질수록 현실의 정보와 함께 두고 보는 태도가 필요합니다.
        </p>
      </section>

      <nav className="cd-chip-wrap" aria-label="비교 문서 관련 링크">
        <Link href="/saju/" className="cd-chip">사주 보러 가기</Link>
        <Link href="/ziwei/" className="cd-chip">자미두수 보러 가기</Link>
        <Link href="/saju/guide/" className="cd-chip">사주 기본 가이드</Link>
        <Link href="/ziwei/guide/" className="cd-chip">자미두수 가이드</Link>
        <Link href="/methodology/" className="cd-chip">콘텐츠 방법론</Link>
        <Link href="/disclaimer/" className="cd-chip">면책 고지</Link>
      </nav>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
    </main>
  );
}
