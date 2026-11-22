/**
 * /compatibility/tti — 띠궁합 표.
 *
 * "띠궁합", "띠궁합표", "쥐띠 궁합" 은 두 띠가 맞는지 바로 찾는 조회형 검색이다. 12×12 격자는 모바일에서
 * 읽을 수 없어 띠마다 한 행으로 만든다. 관계 판정은 /fortune/2027 과 같은 branchRelations
 * (lib/fortune/new-year-sign.ts) 한 곳에서 나온다.
 */
import Link from "next/link";
import { buildSeoMetadata, seoDisplayWidth } from "@/lib/seo";
import { SERP_TITLE_WIDTH_LIMIT } from "@/lib/fortune/seo-title.mjs";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "@/lib/structured-data";
import { animalLabel, joinAnimals, ttiCompatibilityRows } from "@/lib/fortune/zodiac-folk";

const PATH = "/compatibility/tti";
const CARD = "cd-card";
const BODY = "mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.82)]";
const TH = "px-3 py-3 text-left font-bold";
const TD = "px-3 py-3 align-top";
const LINK = "underline decoration-[rgba(232,213,163,0.5)] underline-offset-4";

function titleOf() {
  const base = "띠궁합표 | 12띠 삼합·육합·충·원진";
  const branded = `${base} | 꿀꿀 운세`;
  return seoDisplayWidth(branded) <= SERP_TITLE_WIDTH_LIMIT ? branded : base;
}

const DESCRIPTION =
  "띠궁합은 태어난 해 지지끼리의 합·충·원진을 본 민속 궁합입니다. 12띠마다 삼합·육합으로 잘 맞는 띠와 충·원진으로 부딪치는 띠를 한 줄씩 정리했습니다.";

const RELATIONS: { name: string; body: string }[] = [
  {
    name: "삼합(三合)",
    body: "네 칸씩 떨어진 세 띠가 한 오행으로 모이는 관계입니다. 목표를 함께 세우고 밀고 나가는 힘이 좋아 띠궁합에서 가장 좋게 봅니다. ‘네 살 차이는 궁합도 안 본다’는 말이 여기서 나왔습니다. 띠가 네 칸 떨어지면 언제나 삼합이 되기 때문입니다.",
  },
  {
    name: "육합(六合)",
    body: "두 띠가 짝을 이뤄 묶이는 관계입니다. 서로 모자란 부분을 채워 주는 결이라 연인과 부부 사이의 정으로 많이 풀이합니다. 子丑·寅亥·卯戌·辰酉·巳申·午未의 여섯 쌍이 있습니다.",
  },
  {
    name: "충(沖)",
    body: "정반대 자리의 두 띠가 정면으로 부딪치는 관계로, 여섯 살 차이가 여기에 해당합니다. 생활 리듬과 가치관이 달라 갈등이 드러나기 쉽지만, 서로 없는 것을 가진 상대라 자극과 변화를 주기도 합니다. 충이 있다고 헤어진다는 뜻은 아닙니다.",
  },
  {
    name: "원진(怨嗔)",
    body: "까닭 없이 서운하고 미운 마음이 쌓인다는 관계입니다. 큰 충돌보다 사소한 말투와 습관에서 감정이 상하기 쉬워, 오래 함께 지내는 사이일수록 속마음을 바로 말하는 습관이 중요하다고 봅니다. 子未·丑午·寅酉·卯申·辰亥·巳戌의 여섯 쌍입니다.",
  },
  {
    name: "형·파·해",
    body: "형(刑)은 서로 부담을 주고받는 관계, 파(破)는 일이 어긋나는 관계, 해(害)는 은근히 손해를 끼치는 관계를 말합니다. 삼합·충·원진보다 약하게 보며, 같은 띠끼리 겹치는 자형(自刑)은 辰·午·酉·亥 띠에만 있습니다.",
  },
];

export function generateMetadata() {
  return buildSeoMetadata({
    path: PATH,
    title: titleOf(),
    description: DESCRIPTION,
    keywords: ["띠궁합", "띠궁합표", "띠별 궁합", "삼합 띠", "원진 띠", "충 띠", "네 살 차이 궁합"],
  });
}

export default function TtiCompatibilityPage() {
  const rows = ttiCompatibilityRows();
  const title = "띠궁합 표";
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "궁합", path: "/compatibility" },
    { name: title, path: PATH },
  ]);
  const webPageJsonLd = buildWebPageJsonLd({ title, description: DESCRIPTION, path: PATH });
  const sameSign = rows.filter((row) => row.minor.some((m) => m.animal.id === row.animal.id));
  const faqs = [
    {
      question: "띠궁합이 나쁘면 결혼하면 안 되나요?",
      answer:
        "띠궁합은 두 사람의 태어난 해 지지 한 글자씩만 비교한 가장 넓은 기준입니다. 같은 해에 태어난 사람이 모두 같은 결과를 받기 때문에, 개인의 성향이나 관계의 질을 가늠하기에는 정보가 너무 적습니다. 충이나 원진이 있다면 갈등이 생기기 쉬운 지점을 미리 알아 두는 참고로 쓰고, 결정은 실제로 함께 지내 본 경험으로 내리는 것이 맞습니다.",
    },
    {
      question: "같은 띠끼리는 궁합이 어떤가요?",
      answer: `같은 띠끼리는 성향과 속도가 비슷해 편하게 지내는 경우가 많고, 띠궁합에서도 대체로 무난하게 봅니다. 다만 ${joinAnimals(sameSign.map((r) => r.animal))}는 같은 글자가 겹칠 때 서로를 깎아 낸다는 자형(自刑)이 있어, 비슷한 고집이 부딪칠 수 있다고 풀이합니다.`,
    },
    {
      question: "띠궁합과 사주 궁합은 무엇이 다른가요?",
      answer:
        "띠궁합은 태어난 해의 지지만 봅니다. 사주 궁합은 두 사람의 연·월·일·시 여덟 글자를 모두 놓고, 특히 나 자신을 나타내는 일주(태어난 날)끼리의 관계와 오행의 균형을 봅니다. 그래서 띠궁합이 좋아도 사주 궁합에서 주의할 점이 나오거나, 그 반대인 경우가 흔합니다.",
    },
  ];

  return (
    <>
      <main className="cd-main-shell cd-guide">
        <nav className="cd-chip-wrap" aria-label="위치">
          <Link href="/" className="cd-chip">홈</Link>
          <Link href="/compatibility" className="cd-chip">궁합</Link>
          <span className="cd-chip" aria-current="page">{title}</span>
        </nav>

        <header className="cd-main-header">
          <p className="text-xs font-bold tracking-[0.18em] text-[#e8d5a3]">12띠 · 삼합 · 육합 · 충 · 원진</p>
          <h1 className="cd-main-title">{title}</h1>
          <p className="cd-main-intro">
            <strong>띠궁합은 태어난 해 지지끼리의 합·충·원진만 본 민속 궁합입니다.</strong> 삼합과 육합이면 잘 맞는 띠, 충과 원진이면
            부딪치기 쉬운 띠로 봅니다. 아래 표에서 내 띠의 행을 찾아 상대 띠가 어느 칸에 있는지 확인하세요. 1~2월생은 입춘 전에 태어났다면
            앞 해의 띠로 봅니다.
          </p>
        </header>

        <section className="mt-8" aria-labelledby="table-heading">
          <h2 id="table-heading">12띠 궁합표</h2>
          <p className={BODY}>
            띠 이름을 누르면 그 띠의 오늘 운세로 이동합니다. 형·파·해 칸은 영향이 약한 관계를 함께 모은 것입니다.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-sm">
              <caption className="sr-only">12띠별 삼합, 육합, 충, 원진, 형·파·해 관계에 있는 띠</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH}>내 띠</th>
                  <th scope="col" className={TH}>삼합 (잘 맞음)</th>
                  <th scope="col" className={TH}>육합 (잘 맞음)</th>
                  <th scope="col" className={TH}>충 (부딪침)</th>
                  <th scope="col" className={TH}>원진 (서운함)</th>
                  <th scope="col" className={TH}>형·파·해</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.animal.id}>
                    <th scope="row" className="px-3 py-3 text-left align-top font-bold whitespace-nowrap">
                      <Link href={`/fortune/today/${row.animal.id}`} className={LINK}>
                        {animalLabel(row.animal)}
                      </Link>
                      <span className="ml-1 text-xs font-normal text-[rgba(244,238,255,0.58)]">{row.animal.branchHanja}</span>
                    </th>
                    <td className={`${TD} font-bold text-[#f4eeff]`}>{joinAnimals(row.samhap)}</td>
                    <td className={`${TD} font-bold text-[#f4eeff]`}>{joinAnimals(row.yukhap)}</td>
                    <td className={TD}>{joinAnimals(row.chung)}</td>
                    <td className={TD}>{joinAnimals(row.wonjin)}</td>
                    <td className={`${TD} text-[rgba(244,238,255,0.78)]`}>
                      {row.minor.length ? row.minor.map((m) => `${m.animal.name}(${m.label})`).join(", ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${CARD} mt-8`} aria-labelledby="relations-heading">
          <h2 id="relations-heading">띠궁합 관계 읽는 법</h2>
          {RELATIONS.map((relation) => (
            <p key={relation.name} className={BODY}>
              <strong>{relation.name}</strong> {relation.body}
            </p>
          ))}
        </section>

        <section className="mt-8" aria-labelledby="limit-heading">
          <h2 id="limit-heading">띠궁합만으로 판단하지 않는 이유</h2>
          <p className={BODY}>
            띠는 태어난 해 하나만 보기 때문에, 같은 해에 태어난 사람이라면 누구와 비교해도 같은 결과가 나옵니다. 열두 띠 가운데 충이 되는
            띠는 하나, 원진도 하나뿐이라, 표만 보면 대부분의 조합은 특별한 관계가 없는 &lsquo;무난한&rsquo; 사이로 나옵니다. 실제 궁합은 생활
            습관, 대화 방식, 돈을 대하는 태도처럼 띠와 무관한 부분에서 더 크게 갈립니다.
          </p>
          <p className={BODY}>
            명리로 궁합을 더 깊이 보고 싶다면 태어난 날까지 넣어 두 사람의 일주와 오행을 비교하는{" "}
            <Link href="/compatibility" className={LINK}>
              궁합 보기
            </Link>
            나{" "}
            <Link href="/saju/compatibility" className={LINK}>
              사주 궁합
            </Link>
            을 이용해 보세요. 내 사주의 바탕부터 알고 싶다면{" "}
            <Link href="/saju" className={LINK}>
              무료 사주
            </Link>
            에서 시작할 수 있습니다.
          </p>
        </section>

        <section className="mt-8" aria-labelledby="tti-faq-heading">
          <h2 id="tti-faq-heading">띠궁합 자주 묻는 질문</h2>
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
          <Link href="/fortune/tti-age" className="cd-chip">띠별 나이표</Link>
          <Link href="/fortune/samjae" className="cd-chip">삼재띠 계산표</Link>
          <Link href="/fortune/2027" className="cd-chip">2027년 띠별 운세</Link>
          <Link href="/compatibility" className="cd-chip">궁합 보기</Link>
        </nav>

        <p className="mt-10 break-keep text-xs leading-6 text-[rgba(244,238,255,0.55)]">
          띠궁합은 민속 해석이며 개인 사주를 대신하지 않습니다. 관계 판정은 이 사이트의 2027년 띠별 운세와 같은 지지 관계 규칙으로
          계산했습니다.
        </p>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </>
  );
}
