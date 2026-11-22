/**
 * /saju/sinsal — 신살 뜻과 종류(2026-11-22).
 *
 * "신살 종류", "신살 뜻", "신살표" 처럼 신살 전체를 훑는 검색의 허브다. 개별 신살은 insights 글(app/insights/sinsal-articles.mjs)이 맡는다.
 * 규칙표는 lib/saju/sinsal-rules.mjs 한 곳에서 나오고, 두 엔진과의 일치는 __tests__/saju/sinsal-rules.test.mjs 가 대조한다.
 * 원국 명식·12신살 칸 읽기는 /saju/natal-chart 가 맡으므로 그 페이지의 검색어(사주 12신살·별신살)를 제목에 쓰지 않는다.
 * FAQPage JSON-LD 는 두지 않는다 — 질문은 화면에만 보인다.
 */
import Link from "next/link";
import { buildSeoMetadata, seoDisplayWidth } from "@/lib/seo";
import { SERP_TITLE_WIDTH_LIMIT } from "@/lib/fortune/seo-title.mjs";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "@/lib/structured-data";
import { SINSAL_RULES } from "@/lib/saju/sinsal-rules.mjs";

const PATH = "/saju/sinsal";
const CARD = "cd-card";
const BODY = "mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.82)]";
const TH = "px-3 py-3 text-left font-bold";
const TD = "px-3 py-3 align-top";
const TITLE = "신살 뜻과 종류";
const DESCRIPTION =
  "신살은 원국 간지 조합에 붙인 이름표로, 삼합·일간·간지·지지 짝 가운데 하나를 기준으로 정해집니다. 도화살·역마살·화개살·양인살 기준표와 12신살 표를 정리했습니다.";

const BASES = [
  { basis: "삼합(일지·년지)", how: "내 지지가 속한 삼합 무리에서 정해진 자리", examples: "도화살·역마살·화개살, 12신살" },
  { basis: "일간", how: "일간 글자마다 정해진 지지", examples: "양인살·홍염살·천을귀인" },
  { basis: "간지 자체", how: "특정 두 글자 조합이 기둥에 있는지", examples: "괴강살·백호살" },
  { basis: "지지 짝·순", how: "두 지지의 관계나 일주가 속한 순(旬)", examples: "원진살·귀문관살·상충·공망" },
];

const FEATURED = [
  { href: "/insights/dohwa-sal-saju/", name: "도화살", line: "자·오·묘·유. 사람을 끄는 매력과 드러나는 힘." },
  { href: "/insights/yeokma-sal-meaning/", name: "역마살", line: "인·신·사·해. 이동·이직·확장의 기운, 삼재와 같은 뿌리." },
  { href: "/insights/hwagae-sal-meaning/", name: "화개살", line: "진·술·축·미. 혼자 깊어지는 집중력과 예술·학문." },
  { href: "/insights/yangin-sal-meaning/", name: "양인살", line: "양간 일간의 제왕 자리. 강한 추진력과 과열의 경계." },
  { href: "/insights/sangmun-sal-meaning/", name: "상문살", line: "년지에서 두 칸 앞. 민속 신살이며 이 사이트는 계산하지 않음." },
];

const OTHERS = [
  { href: "/insights/hongyeom-sal-meaning/", name: "홍염살", line: "일간별로 정해진 지지. 도화와 함께 매력 계열로 읽지만 기준이 다릅니다." },
  { href: "/insights/cheoneul-gwiin-meaning/", name: "천을귀인", line: "일간별 두 지지. 도움을 주는 사람과 위기에서 길이 열리는 힘으로 읽습니다." },
  { href: "/insights/goegang-sal-meaning/", name: "괴강살", line: "경진·경술·임진·무술 네 간지가 기둥에 있을 때. 강한 결단과 권한의 기질." },
  { href: "/insights/baekho-sal-meaning/", name: "백호살", line: "갑진·을미·병술·정축·무진·임술·계축 일곱 간지. 속도와 단호함, 서두름의 경계." },
  { href: "/insights/gongmang-meaning/", name: "공망", line: "일주가 속한 순에서 빠진 두 지지. 비어 있는 자리라 집착을 덜어 내라는 뜻으로 읽습니다." },
  { href: "/insights/gwimun-gwan-sal-meaning/", name: "귀문관살", line: "원국 두 지지가 자유·축오·인미 등 여섯 쌍을 이룰 때. 예민한 직관과 몰입." },
  { href: "/insights/wonjin-sal-meaning/", name: "원진살", line: "자미·축오·인유 등 여섯 쌍. 까닭 모를 서운함으로 읽고 띠궁합에서도 씁니다." },
  { href: "/insights/sangchung-yukchung/", name: "상충", line: "정반대 자리 지지끼리의 육충 여섯 쌍. 변화와 긴장이 커지는 자리." },
];

function titleOf() {
  const base = `${TITLE} | 도화살·역마살 기준표`;
  const branded = `${base} | 꿀꿀 운세`;
  return seoDisplayWidth(branded) <= SERP_TITLE_WIDTH_LIMIT ? branded : base;
}

export function generateMetadata() {
  return buildSeoMetadata({
    path: PATH,
    title: titleOf(),
    description: DESCRIPTION,
    keywords: ["신살 종류", "신살 뜻", "신살표", "도화살", "역마살", "화개살", "양인살", "살풀이"],
  });
}

export default function SinsalHubPage() {
  const twelve = SINSAL_RULES["12신살"];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "사주", path: "/saju" },
    { name: TITLE, path: PATH },
  ]);
  const webPageJsonLd = buildWebPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH });

  return (
    <>
      <main className="cd-main-shell cd-guide">
        <nav className="cd-chip-wrap" aria-label="위치">
          <Link href="/" className="cd-chip">홈</Link>
          <Link href="/saju" className="cd-chip">사주</Link>
          <span className="cd-chip" aria-current="page">{TITLE}</span>
        </nav>

        <header className="cd-main-header">
          <p className="text-xs font-bold tracking-[0.18em] text-[#e8d5a3]">도화·역마·화개·양인·상문 기준표</p>
          <h1 className="cd-main-title">{TITLE}</h1>
          <p className="cd-main-intro">
            <strong>신살은 원국 간지 조합에 붙인 이름표이며 길흉을 단정하지 않습니다.</strong> 같은 글자라도 명식 전체의 균형과
            놓인 자리에 따라 강점이 되기도, 주의할 점이 되기도 합니다. 이 페이지는 신살이 무엇을 기준으로 붙는지, 대표 신살은 어느
            지지에 붙는지를 표로 정리하고 개별 해설로 이어 줍니다.
          </p>
        </header>

        <section className={`${CARD} mt-8`} aria-labelledby="bases-heading">
          <h2 id="bases-heading">신살이 붙는 네 가지 기준</h2>
          <p className={BODY}>
            신살 이름은 수십 가지지만 붙는 방식은 크게 넷으로 묶입니다. 어떤 기준인지 알면 같은 사람이 곳에 따라 도화살이 있다고도,
            없다고도 듣는 이유를 이해할 수 있습니다. 대부분의 차이는 년지만 보느냐, 일지까지 보느냐에서 생깁니다.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <caption className="sr-only">신살 기준별 정하는 방법과 예</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>기준</th>
                  <th scope="col" className={TH}>정하는 방법</th>
                  <th scope="col" className={TH}>대표 신살</th>
                </tr>
              </thead>
              <tbody>
                {BASES.map((row) => (
                  <tr key={row.basis} className="border-t border-[rgba(244,238,255,0.12)]">
                    <th scope="row" className={TH}>{row.basis}</th>
                    <td className={TD}>{row.how}</td>
                    <td className={TD}>{row.examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${CARD} mt-8`} aria-labelledby="featured-heading">
          <h2 id="featured-heading">많이 찾는 신살 다섯 가지</h2>
          <p className={BODY}>
            도화·역마·화개는 모두 삼합에서 나옵니다. 삼합 무리의 첫 글자와 부딪는 자리가 역마, 무리가 단장하는 목욕 자리가 도화, 무리가
            창고에 드는 마지막 자리가 화개입니다. 양인은 일간을, 상문은 태어난 해의 지지를 기준으로 합니다.
          </p>
          <ul className="mt-4 space-y-3">
            {FEATURED.map((item) => (
              <li key={item.href} className="break-keep text-sm leading-7">
                <Link href={item.href} className="font-bold text-[#e8d5a3] underline underline-offset-4">{item.name} 뜻과 기준표</Link>
                <span className="text-[rgba(244,238,255,0.78)]"> — {item.line}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${CARD} mt-8`} aria-labelledby="twelve-heading">
          <h2 id="twelve-heading">년지별 12신살 표</h2>
          <p className={BODY}>
            12신살은 태어난 해의 지지가 속한 삼합에서 겁살부터 화개살까지 열두 이름을 차례로 돌려 붙입니다. 내 년지가 있는 줄을 찾은 뒤,
            원국 네 지지가 어느 칸에 해당하는지 보면 됩니다. 년살 칸은 도화와 같은 자리입니다.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
              <caption className="sr-only">년지 삼합별 12신살 지지</caption>
              <thead>
                <tr>
                  {twelve.head.map((cell) => (
                    <th key={cell} scope="col" className={TH}>{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {twelve.rows.map((row) => (
                  <tr key={row[0]} className="border-t border-[rgba(244,238,255,0.12)]">
                    <th scope="row" className={TH}>{row[0]}</th>
                    {row.slice(1).map((cell, index) => (
                      <td key={twelve.head[index + 1]} className={TD}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[rgba(244,238,255,0.6)]">{twelve.basis}</p>
        </section>

        <section className={`${CARD} mt-8`} aria-labelledby="others-heading">
          <h2 id="others-heading">그 밖의 신살</h2>
          <ul className="mt-4 space-y-3">
            {OTHERS.map((item) => (
              <li key={item.href} className="break-keep text-sm leading-7">
                <Link href={item.href} className="font-bold text-[#e8d5a3] underline underline-offset-4">{item.name} 뜻과 기준표</Link>
                <span className="text-[rgba(244,238,255,0.78)]"> — {item.line}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${CARD} mt-8`} aria-labelledby="salpuri-heading">
          <h2 id="salpuri-heading">살풀이는 꼭 해야 할까</h2>
          <p className={BODY}>
            살(煞)이라는 글자 때문에 신살을 풀어야 할 액운으로 여기는 경우가 많습니다. 하지만 신살은 원국에 이미 있는 글자 조합에 붙인
            이름이라 굿이나 부적으로 지워지는 대상이 아닙니다. 쓸모 있는 살풀이는 그 기운이 과해질 때의 모습을 알고 생활의 습관으로 균형을
            잡는 것입니다. 역마라면 이동 전에 목적을 적어 보고, 화개라면 혼자 있는 시간과 사람을 만나는 시간을 함께 정해 두는 식입니다.
          </p>
          <p className={BODY}>
            신살이 많다고 팔자가 세거나 적다고 평탄한 것도 아닙니다. 12신살은 네 기둥 모두에 이름이 하나씩 붙으므로 신살 이름이 전혀
            없는 명식은 없습니다. 개수보다 어느 자리에 무엇이 놓였는지가 해석의 출발점입니다.
          </p>
        </section>

        <section className={`${CARD} mt-8`} aria-labelledby="site-heading">
          <h2 id="site-heading">이 사이트에서 신살을 보는 곳</h2>
          <p className={BODY}>
            <Link href="/manse" className="underline underline-offset-4">만세력</Link>은 네 기둥 아래 년지 기준 12신살 칸을 붙이고, 원국에서
            도화·홍염·천을귀인·양인·괴강·백호·공망·원진·귀문 등 별신살 열세 가지를 찾아 자리와 함께 보여 줍니다. 역마와 화개는 12신살 칸에만
            나타납니다. <Link href="/saju" className="underline underline-offset-4">사주 풀이</Link>는 도화·역마·화개를 일지와 년지 두 기준으로
            찾습니다. 상문살과 조객살은 두 화면 모두 계산하지 않습니다. 명식과 12신살 칸을 읽는 순서는{" "}
            <Link href="/saju/natal-chart" className="underline underline-offset-4">사주 명식 읽기</Link>에 정리했습니다.
          </p>
        </section>

        <section className="mt-8" aria-labelledby="sinsal-faq-heading">
          <h2 id="sinsal-faq-heading">신살 자주 묻는 질문</h2>
          <div className="mt-4 space-y-3">
            <details className={CARD}>
              <summary className="cursor-pointer font-bold text-[#f4eeff]">만세력 별신살 목록이 비어 있으면 운이 나쁜 건가요?</summary>
              <p className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.78)]">
                아닙니다. 별신살은 특정 조합에 이름을 붙인 것일 뿐이라 목록이 비었다는 것은 그 조합이 원국에 없다는 뜻입니다. 운의 흐름은 오행의
                균형과 십성, 대운에서 더 구체적으로 읽습니다.
              </p>
            </details>
            <details className={CARD}>
              <summary className="cursor-pointer font-bold text-[#f4eeff]">사이트마다 신살 결과가 다른 이유는 무엇인가요?</summary>
              <p className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.78)]">
                년지만 보는지 일지까지 보는지, 음간에도 양인을 두는지처럼 기준이 다르기 때문입니다. 출생 시각 보정이나 자시 처리 방식이
                다르면 시주가 바뀌어 신살도 달라집니다. 결과를 비교할 때는 먼저 네 기둥이 같은지 확인하세요.
              </p>
            </details>
            <details className={CARD}>
              <summary className="cursor-pointer font-bold text-[#f4eeff]">운에서 들어오는 신살도 같은 방식으로 보나요?</summary>
              <p className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.78)]">
                세운이나 대운의 지지가 신살 자리에 해당하면 그 시기의 주제로 참고합니다. 예를 들어 2026년 병오년의 오(午)는 사·유·축
                무리의 도화 자리입니다. 사건을 예고하는 신호가 아니라 그 시기에 살펴볼 질문으로 쓰는 편이 정확합니다.
              </p>
            </details>
          </div>
        </section>

        <nav className="cd-chip-wrap mt-8" aria-label="함께 보는 사주 정보">
          <Link href="/manse" className="cd-chip">만세력</Link>
          <Link href="/saju" className="cd-chip">사주 보기</Link>
          <Link href="/saju/natal-chart" className="cd-chip">사주 명식 읽기</Link>
          <Link href="/saju/ten-gods" className="cd-chip">십성 가이드</Link>
          <Link href="/fortune/samjae" className="cd-chip">삼재띠 계산표</Link>
        </nav>

        <p className="mt-10 break-keep text-xs leading-6 text-[rgba(244,238,255,0.55)]">
          신살은 전통 명리의 해석 용어이며 길흉을 예언하지 않습니다. 건강·법률·투자·결혼 같은 중요한 결정을 대신하지 않습니다. 규칙표는
          이 사이트의 만세력·사주 계산과 같은 기준이며, 상문살은 민속 통설로만 소개합니다.
        </p>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </>
  );
}
