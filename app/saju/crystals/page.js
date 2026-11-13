import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import CutReader from "../../components/webtoon/CutReader";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../../lib/structured-data";
import { CRYSTAL_ELEMENTS, CRYSTAL_ELEMENT_KO, crystalsForElement } from "../../../lib/saju/crystal-catalog.mjs";
import CrystalCta from "./CrystalCta";
import StoneCard, { ElementChip } from "./StoneCard";
import { availableStoneIds, sajuCrystalWebtoonCuts } from "./crystal-assets";
import styles from "./crystals.module.css";

const PATH = "/saju/crystals";
const TITLE = "사주 원석 추천 | 나에게 좋은 오행 찾기 - 꿀꿀운세";
const H1 = "나에게 좋은 기운을 살펴보고, 어울리는 원석을 찾아보세요";
const DESCRIPTION =
  "좋았던 해와 힘들었던 해를 사주 흐름과 함께 살펴보세요. 꿀꿀운세가 도움이 되는 오행 후보와 그에 어울리는 원석, 추천 이유를 안내합니다";
const OG_IMAGE = "/images/saju-crystals/og-1200x630.jpg";
const DISCLAIMER = "원석의 오행과 의미는 전통적 해석과 문화적 상징을 바탕으로 하며, 건강이나 운세의 변화를 보장하지 않습니다.";
// 사주 결과의 진입 카드와 같은 연이 일러스트.
const ENTRY_PORTRAIT_ALT =
  "연꽃을 단 꽃돼지 연이가 원석 공방에서 초록빛 원석을 들여다보는 그림";

// OG 이미지는 사용자가 준 진입 그림에서 연이 부분을 잘라 만들었다. 파일이 없으면 사이트 기본 OG를 쓴다.
const hasOgImage = (() => {
  try {
    return fs.statSync(path.join(process.cwd(), "public", ...OG_IMAGE.split("/").filter(Boolean))).isFile();
  } catch {
    return false;
  }
})();

export function generateMetadata() {
  return generatePageMetadata({
    path: PATH,
    title: TITLE,
    description: DESCRIPTION,
    keywords: ["사주 원석 추천", "오행 원석", "나에게 맞는 원석", "용신 원석", "사주 오행", "꿀꿀운세"],
    ...(hasOgImage ? { image: OG_IMAGE } : {}),
  });
}

const STEPS = [
  { title: "사주 전체의 흐름 보기", body: "오행의 개수가 아니라 태어난 계절과 글자 사이의 관계로 도움이 되는 기운 후보를 찾아요." },
  { title: "좋았던 해·힘들었던 해 돌아보기", body: "기억나는 해를 1~3개씩 알려주시면 그때의 대운·세운과 함께 어떤 해석이 더 잘 이어지는지 비교해요." },
  { title: "어울리는 원석 고르기", body: "함께 살펴볼 기운과 이어지는 원석 2~3개를 오행·상징·추천 이유와 함께 보여드려요." },
];

const FAQ = [
  {
    q: "사주에 없는 오행의 원석을 고르면 되나요?",
    a: "아니요. 사주에 없는 오행이 반드시 필요한 오행은 아니에요. 꿀꿀운세는 오행의 개수를 세어 빈 곳을 채우지 않고, 태어난 계절과 일간의 힘, 글자 사이의 관계를 함께 보고 도움이 되는 기운을 고른 뒤 그 기운과 이어지는 원석을 제안해요.",
  },
  {
    q: "좋았던 해와 힘들었던 해는 왜 물어보나요?",
    a: "사주 전체의 흐름만으로도 도움이 되는 기운 후보를 정할 수 있지만, 관점에 따라 후보가 둘 이상 나오기도 해요. 실제로 좋았던 시기와 힘들었던 시기의 운 흐름을 함께 살피면 어느 해석이 내 경험과 더 잘 이어지는지 비교할 수 있어요.",
  },
  {
    q: "같은 해에 좋은 일과 나쁜 일이 함께 있었다면요?",
    a: "일·사업·학업, 돈·생활 여건, 연애·대인관계, 생활 전반으로 나눠 알려주시면 돼요. 한 해 안의 일을 하나로 합치지 않고 영역별로 따로 살펴요. 여러 일이 섞여 가르기 어렵다면 그 해는 비교에서 빼고 참고만 해요.",
  },
  {
    q: "기억나는 연도가 적어도 추천받을 수 있나요?",
    a: "네. 좋았던 해나 힘들었던 해 중 한쪽만 알려주셔도 되고, 떠오르는 해가 없어도 사주 전체의 흐름으로 추천해 드려요. 기억이 나지 않는다는 답은 좋거나 나빴다는 신호로 쓰지 않아요.",
  },
  {
    q: "출생시간을 몰라도 이용할 수 있나요?",
    a: "이용할 수 있어요. 출생시간을 모르면 10년 단위의 큰 흐름(대운)은 빼고 해마다의 흐름(세운)으로만 비교하고, 출생시간에 따라 달라질 수 있는 부분은 결과에 그 한계를 함께 적어 드려요.",
  },
  {
    q: "원석의 오행과 효능은 어떤 기준으로 설명하나요?",
    a: "원석의 오행은 색과 오행을 잇는 전통적 관점으로 배정하고, 원석의 의미는 널리 전해지는 문화적 상징으로 소개해요. 이는 건강이나 운세의 변화를 보장하는 효능이 아니며, 품종이 확인되지 않은 유통명 원석은 추천에서 뺐어요.",
  },
  {
    q: "답변을 수정하면 추천도 달라지나요?",
    a: "달라질 수 있어요. 사주 전체에서 본 후보는 그대로지만, 알려주신 시기에 따라 후보의 순서가 바뀌거나 여러 후보를 함께 보여드릴 수 있어요. 답변은 프로필마다 따로 보관되고 언제든 고칠 수 있어요.",
  },
];

const PREVIEW = {
  primary: "water",
  support: "metal",
  stones: [
    { id: "aquamarine", role: "우선 기운", reason: "사주 전체의 흐름에서 수(水) 기운이 도움이 되는 기운으로 꼽혀 함께 담았어요." },
    { id: "clear-quartz", role: "보조 기운", reason: "다른 관점에서도 금(金) 기운이 도움이 되는 기운으로 보여 보조로 담았어요." },
  ],
};

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { ...buildWebPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH }), "@context": undefined },
    {
      ...buildBreadcrumbJsonLd([
        { name: "홈", path: "/" },
        { name: "사주 서비스", path: "/saju" },
        { name: "사주 원석 추천", path: PATH },
      ]),
      "@context": undefined,
    },
  ],
});

export default function SajuCrystalsLandingPage() {
  const stoneImages = new Set(availableStoneIds());
  const cuts = sajuCrystalWebtoonCuts();
  const byId = Object.fromEntries(CRYSTAL_ELEMENTS.flatMap((el) => crystalsForElement(el)).map((c) => [c.id, c]));
  const previewStones = PREVIEW.stones.map((s) => ({ ...s, crystal: byId[s.id] })).filter((s) => s.crystal);

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <header className={styles.hero}>
        <p className={styles.eyebrow}>사주 원석 추천 · 연이의 원석 큐레이션</p>
        <h1>{H1}</h1>
        <p className={styles.lead}>{DESCRIPTION}.</p>
        <div className={styles.core}>
          <strong>사주에 없는 오행이 반드시 필요한 오행은 아니에요</strong>
          <p>
            꿀꿀운세는 사주 전체의 흐름과 실제로 좋았던 시기, 힘들었던 시기를 함께 살펴 나에게 도움이 되는 기운과 어울리는 원석을 제안해요.
          </p>
        </div>
        <div className={styles.ctaRow}>
          <CrystalCta from="landing_hero" />
          <span className={styles.hint}>무료 · 저장한 프로필로 바로 시작</span>
        </div>
        <CrystalCta from="landing_hero" variant="portrait">
          <picture>
            <source
              type="image/avif"
              srcSet="/images/saju-crystals/entry-portrait-496.avif 496w, /images/saju-crystals/entry-portrait-992.avif 992w"
              sizes="(max-width: 452px) calc(100vw - 32px), 420px"
            />
            <img
              src="/images/saju-crystals/entry-portrait-496.webp"
              srcSet="/images/saju-crystals/entry-portrait-496.webp 496w, /images/saju-crystals/entry-portrait-992.webp 992w"
              sizes="(max-width: 452px) calc(100vw - 32px), 420px"
              width="992"
              height="1586"
              alt={ENTRY_PORTRAIT_ALT}
              decoding="async"
            />
          </picture>
        </CrystalCta>
      </header>

      <section className={styles.section} aria-labelledby="crystal-steps">
        <h2 id="crystal-steps">세 단계로 살펴봐요</h2>
        <ol className={styles.steps}>
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <b>STEP {i + 1}</b>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="crystal-webtoon">
        <h2 id="crystal-webtoon">연이와 영냥이의 원석 이야기</h2>
        <p className={styles.lead}>사주 원석 추천이 어떻게 이뤄지는지 10컷으로 먼저 살펴보세요.</p>
        <div className={styles.ctaRow}>
          <CrystalCta from="landing_webtoon" variant="ghost" />
        </div>
        <div className={styles.webtoon}>
          <CutReader cuts={cuts} eager={1} />
        </div>
        <div className={styles.ctaRow}>
          <CrystalCta from="landing_webtoon_end" />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="crystal-elements">
        <h2 id="crystal-elements">오행 원석, 기운별로 살펴보기</h2>
        <p className={styles.lead}>
          페리도트의 초록빛부터 청금석의 군청빛까지, 천연석을 오행별로 비교해 보세요. 색을 오행에 잇는 전통적 관점에 따라 분류하고, 각 색에서 떠올릴 수 있는 상징을 함께 적었어요. 나에게 맞는 원석은 도움이 되는 기운을 먼저 살핀 뒤에 골라요.
        </p>
        {CRYSTAL_ELEMENTS.map((el) => (
          <div key={el} className={styles.elementGroup}>
            <h3>
              <ElementChip element={el} label={`${CRYSTAL_ELEMENT_KO[el]} 기운의 원석`} size="lg" />
            </h3>
            <div className={styles.stoneGrid}>
              {crystalsForElement(el).map((c) => (
                <StoneCard key={c.id} crystal={c} elementKo={CRYSTAL_ELEMENT_KO[c.element]} hasImage={stoneImages.has(c.id)} headingLevel={4} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="crystal-preview">
        <h2 id="crystal-preview">
          결과는 이렇게 보여드려요<span className={styles.badge}>설명용 예시</span>
        </h2>
        <div className={styles.preview}>
          <p>
            <strong>함께 살펴볼 기운</strong>
          </p>
          <div className={styles.chipRow}>
            <ElementChip element={PREVIEW.primary} label={`우선 · ${CRYSTAL_ELEMENT_KO[PREVIEW.primary]}`} size="lg" />
            <ElementChip element={PREVIEW.support} label={`보조 · ${CRYSTAL_ELEMENT_KO[PREVIEW.support]}`} size="lg" />
          </div>
          <div className={styles.stoneGrid}>
            {previewStones.map((s) => (
              <StoneCard
                key={s.id}
                crystal={s.crystal}
                elementKo={CRYSTAL_ELEMENT_KO[s.crystal.element]}
                hasImage={stoneImages.has(s.id)}
                roleLabel={s.role}
                reason={s.reason}
                example
              />
            ))}
          </div>
          <p className={styles.hint}>
            실제 결과에는 사주 전체에서 본 이유와 알려주신 시기를 참고한 이유를 나눠 적고, 상세 근거는 펼쳐서 볼 수 있어요. 위 내용은 화면 구성을 보여 드리기 위한 예시예요.
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="crystal-faq">
        <h2 id="crystal-faq">자주 묻는 질문</h2>
        <div className={styles.faq}>
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.final}>
        <h2>좋았던 해부터 이야기해 볼까요?</h2>
        <p>기억나는 해가 없어도 괜찮아요. 사주 전체의 흐름으로 먼저 살펴봐요.</p>
        <div className={styles.ctaRow} style={{ justifyContent: "center" }}>
          <CrystalCta from="landing_final" />
        </div>
      </section>

      <p className={styles.disclaimer}>
        {DISCLAIMER} 사주가 처음이라면 <Link href="/saju/five-elements/">오행과 균형 가이드</Link>와{" "}
        <Link href="/saju/guide/">사주 명리학 기본 가이드</Link>도 함께 읽어 보세요. 맛으로 오행을 만나고 싶다면 <Link href="/recipes/">연이와 영냥이의 오행 요리법</Link>을 살펴보세요.
      </p>
    </main>
  );
}
