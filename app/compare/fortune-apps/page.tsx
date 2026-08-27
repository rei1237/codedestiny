import Link from "next/link";
import GuideCta from "@/app/components/GuideCta";
import { GUIDE_CTA_TARGETS } from "@/app/components/guide-cta-targets";
import { generatePageMetadata } from "@/lib/generate-page-metadata";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildWebPageJsonLd } from "@/lib/structured-data";

/**
 * 체계 간 비교 문서 3호 — 그리고 **처음으로 외부 서비스 이름이 들어가는 문서**다.
 *
 * 왜 만드는가: 타이틀이 전부 "무료 사주"·"무료 타로" 같은 대표 검색어를 노리는데 그 자리는
 * 신규 도메인이 이기지 못한다(2026-08-20 실측: dist 360개 라우트 title 중복 0건 — 위생은
 * 이미 깨끗하고 남은 문제는 검색어 선택이다). 반면 "앱마다 말이 다르다"는 실제로 반복되는
 * 이용자 불만이고, 그 답이 우리 대표 상품의 가치 제안(교차 검증)과 정확히 같다.
 *
 * 🔴 사실 가드 — 이 문서에서 지킬 것
 *  1. 외부 서비스의 기능·가격·정확도를 **단정하지 않는다.** 아래 표는 이용자 후기에서 반복되는
 *     인상이며, 그 사실을 본문에 명시한다. 각 서비스의 공식 설명이 아니고 구성은 수시로 바뀐다.
 *  2. 우열을 매기지 않는다. "우리가 더 낫다"는 문장을 쓰지 않는다.
 *  3. 검증 가능한 설명(사주·타로·점성술이 각각 무엇에 답하는 체계인가)이 본문의 중심이고,
 *     서비스 이름은 그 설명이 걸리는 고리로만 쓴다. 이름만 반복하는 구성은 금지 대상이다.
 *
 * 🔴 게이트 제약 (saju-vs-ziwei 문서에서 확인된 것과 동일)
 *  - `/compare` 는 adsense-route-policy 의 CONTENT_PREFIXES 에 없다 → canLoadAdsense=false →
 *    verify-adsense-readiness 의 **1,800자** 기준을 탄다(1,200자가 아니다).
 *  - H1 은 정확히 1개(verify:seo-heading-integrity 가 산출물을 전수 스캔).
 *  - title·description 은 사이트맵 전역에서 유일해야 한다.
 *  - 전부 서버 렌더다. dynamic(..., { ssr: false }) 로 붙이면 가시 텍스트 0자로 세어진다.
 *  - 새 라우트는 scripts/generate-sitemap.mjs 의 배열에 함께 등록해야 색인에서 조용히 빠지지 않는다.
 */

const PATH = "/compare/fortune-apps";
const TITLE = "운세 앱마다 답이 다른 이유 | 점신·포스텔러·헬로우봇 비교";
const DESCRIPTION =
  "점신, 포스텔러, 헬로우봇처럼 많이 쓰는 운세 앱이 같은 생년월일에 서로 다른 답을 내는 이유를 사주·타로·점성술이 각각 무엇에 답하는 체계인지로 정리합니다.";

export function generateMetadata() {
  return generatePageMetadata({
    path: PATH,
    title: TITLE,
    description: DESCRIPTION,
    keywords: [
      "운세 앱 비교",
      "사주 앱 추천",
      "점신",
      "포스텔러",
      "헬로우봇",
      "운세 앱마다 다른 결과",
      "사주 타로 점성술 차이",
      "Code Destiny",
    ],
  });
}

/**
 * 🔴 각 서비스의 공식 설명이 아니라 **이용자 후기에서 반복되는 인상**이다.
 * 기능·구성은 수시로 바뀌므로 단정형 문장을 쓰지 않는다. 우열 표현 금지.
 */
const appRows = [
  {
    app: "점신",
    known: "전통 사주 풀이를 전면에 두는 쪽으로 알려져 있습니다.",
    axis: "타고난 기질과 한 해의 배경을 명식에서 읽는 방식",
  },
  {
    app: "포스텔러",
    known: "사주와 함께 별자리·점성술 콘텐츠가 함께 언급되는 편입니다.",
    axis: "출생 차트와 지금 지나는 행성 흐름으로 시기를 보는 방식",
  },
  {
    app: "헬로우봇",
    known: "캐릭터와 대화하는 형식, 그중에서도 타로가 자주 언급됩니다.",
    axis: "지금 던진 질문 하나에 카드로 답하는 방식",
  },
];

const systemRows = [
  {
    system: "사주",
    question: "나는 어떤 기질이고, 무엇에 힘이 실리는가",
    time: "대운·세운으로 열 해와 한 해의 배경을 봅니다",
    weak: "오늘 당장의 선택처럼 짧은 구간에는 해상도가 낮습니다",
  },
  {
    system: "타로",
    question: "지금 이 질문에서 무엇을 보고 있는가",
    time: "질문을 던진 그 시점을 봅니다",
    weak: "타고난 구조나 장기 흐름을 설명하지는 않습니다",
  },
  {
    system: "서양 점성술",
    question: "지금 시기가 나에게 무엇을 요구하는가",
    time: "행성이 지나는 위치로 시기를 봅니다",
    weak: "출생 시각과 출생지가 정확하지 않으면 해상도가 크게 떨어집니다",
  },
  {
    system: "자미두수",
    question: "일·돈·관계 중 지금 어느 영역이 움직이는가",
    time: "대한·유년으로 궁을 옮겨 가며 봅니다",
    weak: "태어난 시각이 없으면 명반 자체가 서지 않습니다",
  },
];

const faqItems = [
  {
    question: "앱마다 결과가 다른데 어떤 앱이 맞는 건가요?",
    answer:
      "어느 하나가 맞고 나머지가 틀린 구조가 아닙니다. 앱이 전면에 두는 체계가 다르면 애초에 다른 질문에 답합니다. 사주는 타고난 기질과 한 해의 배경을 묻고, 타로는 지금 던진 질문 하나를 묻고, 점성술은 지금 시기가 무엇을 요구하는지를 묻습니다. 같은 사람을 다른 축으로 본 결과이므로 문장이 갈리는 것이 정상입니다.",
  },
  {
    question: "그러면 여러 앱을 다 봐야 하나요?",
    answer:
      "같은 답을 여러 번 확인하려는 목적이라면 권하지 않습니다. 여러 체계를 볼 때 실제로 정보가 되는 것은 겹치는 대목이 아니라 어긋나는 대목입니다. 두 체계 이상이 같은 방향을 가리키면 그 신호는 우선순위로 올리고, 갈리면 어떤 조건에서 갈리는지를 질문으로 남기는 편이 낫습니다.",
  },
  {
    question: "출생 시간을 모르면 어떤 것부터 봐야 하나요?",
    answer:
      "사주는 시주를 비워 두고도 연·월·일의 구조로 큰 흐름을 읽을 수 있습니다. 반면 자미두수는 태어난 시각으로 명궁을 정하기 때문에 시간이 없으면 명반이 서지 않고, 서양 점성술도 상승궁과 하우스 계산이 흔들립니다. 시간을 모른다면 사주부터 보는 편이 현실적입니다.",
  },
  {
    question: "무료로 볼 수 있는 범위는 어디까지인가요?",
    answer:
      "Code Destiny 에서는 오늘의 운세, 별자리·띠별 운세, 사주 기본 풀이, 타로 리딩을 로그인 없이 무료로 볼 수 있습니다. 여러 체계를 한 번에 교차 검증해 하나의 결론으로 모으는 초융합 심층 리딩은 유료이며, 금액과 결제 수단은 해당 화면에서 결제 전에 표시됩니다.",
  },
];

const breadcrumb = buildBreadcrumbJsonLd([
  { name: "홈", path: "/" },
  { name: "운세 앱 비교", path: PATH },
]);
const webPage = buildWebPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH });
const faqPage = buildFaqPageJsonLd(faqItems);

export default function FortuneAppsComparePage() {
  return (
    <main className="cd-main-shell cd-guide">
      <header className="cd-main-header">
        <h1 className="cd-main-title">운세 앱마다 답이 다른 이유</h1>
        <p className="cd-main-intro">
          운세 앱을 두세 개만 같이 써 봐도 금방 겪는 일이 있습니다. 같은 생년월일을 넣었는데 앱마다 다른
          이야기가 나옵니다. 한쪽은 올해가 정리의 해라 하고, 다른 쪽은 지금 밀어붙이라고 합니다. 그래서
          어느 앱이 맞는지 고르려다 결국 아무것도 믿지 않게 되기 쉽습니다. 이 문서는 그 차이가 왜 생기는지를
          앱의 문제가 아니라 <strong>체계의 문제</strong>로 설명하고, 갈린 해석을 어떻게 읽어야 하는지를 정리합니다.
        </p>
      </header>

      <section className="cd-card">
        <h2>많이 쓰는 앱들이 각각 무엇을 전면에 두는가</h2>
        <p>
          아래는 각 서비스의 공식 설명이 아니라 <strong>이용자 후기에서 반복적으로 언급되는 인상</strong>을 정리한
          것입니다. 앱의 기능과 구성은 수시로 바뀌므로 지금 시점의 기능을 단정하지 않으며, 어느 쪽이 더 낫다는
          평가도 하지 않습니다. 여기서 보려는 것은 순위가 아니라 <strong>어떤 체계를 앞에 두면 어떤 답이
          나오는가</strong>입니다.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <caption className="sr-only">운세 앱이 전면에 두는 체계와 그 체계가 답하는 방식</caption>
            <thead>
              <tr>
                <th scope="col" className="px-3 py-3 text-left font-bold">서비스</th>
                <th scope="col" className="px-3 py-3 text-left font-bold">후기에서 자주 언급되는 성격</th>
                <th scope="col" className="px-3 py-3 text-left font-bold">그 방식이 답하는 것</th>
              </tr>
            </thead>
            <tbody>
              {appRows.map((row) => (
                <tr key={row.app}>
                  <th scope="row" className="px-3 py-3 text-left align-top font-semibold">{row.app}</th>
                  <td className="px-3 py-3 align-top leading-7 break-keep">{row.known}</td>
                  <td className="px-3 py-3 align-top leading-7 break-keep">{row.axis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          표를 가로로 읽으면 답이 갈리는 이유가 드러납니다. 사주를 앞에 둔 서비스는 올해 전체의 배경을 말하고,
          타로를 앞에 둔 서비스는 지금 던진 질문 하나에 답하며, 점성술을 앞에 둔 서비스는 지금 지나는 시기를
          말합니다. 셋은 서로를 부정하는 것이 아니라 시간의 축이 다릅니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>체계마다 잘 답하는 질문이 다릅니다</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <caption className="sr-only">체계별로 잘 답하는 질문과 시간을 보는 방식</caption>
            <thead>
              <tr>
                <th scope="col" className="px-3 py-3 text-left font-bold">체계</th>
                <th scope="col" className="px-3 py-3 text-left font-bold">잘 답하는 질문</th>
                <th scope="col" className="px-3 py-3 text-left font-bold">시간을 보는 방식</th>
                <th scope="col" className="px-3 py-3 text-left font-bold">이건 답하지 않습니다</th>
              </tr>
            </thead>
            <tbody>
              {systemRows.map((row) => (
                <tr key={row.system}>
                  <th scope="row" className="px-3 py-3 text-left align-top font-semibold">{row.system}</th>
                  <td className="px-3 py-3 align-top leading-7 break-keep">{row.question}</td>
                  <td className="px-3 py-3 align-top leading-7 break-keep">{row.time}</td>
                  <td className="px-3 py-3 align-top leading-7 break-keep">{row.weak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          같은 사람에게 올해 이직해도 되는지를 물었다고 해 봅시다. 사주는 올해가 밀어붙이기 좋은 배경인지
          아닌지를 말하고, 자미두수는 관록궁이 움직이는지 재백궁이 움직이는지를 말하고, 타로는 지금 그 질문을
          하는 사람의 상태를 말하고, 점성술은 지금 시기가 어떤 종류의 변화를 요구하는지를 말합니다. 네 문장이
          다르게 들리는 것은 당연하고, 오히려 그 <strong>차이 자체가 정보</strong>입니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>갈린 해석을 읽는 세 가지 방법</h2>
        <ul>
          <li>
            <strong>겹치는 신호를 먼저 찾습니다.</strong> 두 체계 이상이 같은 방향을 가리키면 그것부터 우선순위에
            둡니다. 서로 다른 규칙에서 같은 결론이 나왔다는 뜻이기 때문입니다.
          </li>
          <li>
            <strong>엇갈리는 신호는 조건으로 바꿉니다.</strong> 어느 쪽이 맞는지 고르는 대신 어떤 조건이면
            이쪽이고 어떤 조건이면 저쪽인지로 다시 씁니다. 대부분의 어긋남은 시간 축이 달라서 생깁니다.
          </li>
          <li>
            <strong>시기를 묻는 질문과 성향을 묻는 질문을 섞지 않습니다.</strong> 나는 어떤 사람인가와 지금
            움직여도 되는가는 다른 체계가 답합니다. 한 번에 물으면 답이 뭉개집니다.
          </li>
        </ul>
      </section>

      <section className="cd-card">
        <h2>Code Destiny 는 이 문제를 어떻게 다루는가</h2>
        <p>
          여기서는 체계를 하나 고르게 하지 않습니다. 사주·자미두수·베다점·숙요점·서양 점성술·타로를 각각 그
          전통의 언어로 따로 읽은 뒤, 여섯 해석이 겹치는 지점과 엇갈리는 지점을 갈라 하나의 결론으로 모으는
          방식을 씁니다. 위에서 정리한 겹치면 우선순위, 갈리면 조건이라는 읽기를 사람이 손으로 하는 대신 한
          번에 해 두는 것입니다.
        </p>
        <p>
          체계별 기본 풀이는 무료로 열려 있습니다. 오늘의 운세와 별자리·띠별 운세, 사주 기본 풀이, 타로 리딩은
          로그인 없이 볼 수 있고, 여섯 체계를 한 상담 안에서 교차 검증하는 초융합 심층 리딩만 유료입니다. 금액과
          결제 수단은 결제 전에 화면에서 확인할 수 있습니다.
        </p>
      </section>

      <section className="cd-card-grid" aria-labelledby="compare-fortune-apps-faq-title">
        <h2 id="compare-fortune-apps-faq-title" className="sr-only">자주 묻는 질문</h2>
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
          이 문서에 등장하는 외부 서비스 이름은 각 사업자의 상표이며, 비교와 설명을 위해서만 언급했습니다.
          제휴 관계가 없고 후원을 받지 않았으며, 어느 서비스의 정확도나 품질을 평가하지 않습니다. 표에 적은
          성격은 이용자 후기에서 반복되는 인상이므로 실제 기능과 다를 수 있고, 최신 정보는 각 서비스에서
          직접 확인하시는 편이 정확합니다.
        </p>
        <p>
          운세 해석은 전통 문헌의 규칙을 계산해 얻은 문화적 해석 콘텐츠입니다. 의료 진단, 법률 판단, 투자 결정,
          결혼과 이혼의 근거로 삼기에는 적합하지 않습니다. 해석이 잘 맞는다고 느껴질수록 현실의 정보와 함께
          두고 보는 태도가 필요합니다.
        </p>
      </section>

      <GuideCta target={GUIDE_CTA_TARGETS["/compare/fortune-apps"]} />

      <nav className="cd-chip-wrap" aria-label="관련 문서 링크">
        <Link href="/saju/" className="cd-chip">무료 사주 풀이</Link>
        <Link href="/tarot/" className="cd-chip">무료 타로 리딩</Link>
        <Link href="/astrology/" className="cd-chip">무료 점성술</Link>
        <Link href="/today/" className="cd-chip">오늘의 운세</Link>
        <Link href="/compare/saju-vs-ziwei/" className="cd-chip">사주와 자미두수 비교</Link>
        <Link href="/fusion-fortune/" className="cd-chip">초융합 심층 리딩</Link>
        <Link href="/methodology/" className="cd-chip">콘텐츠 방법론</Link>
        <Link href="/disclaimer/" className="cd-chip">면책 고지</Link>
      </nav>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
    </main>
  );
}
