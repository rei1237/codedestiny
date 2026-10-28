/* eslint-disable @next/next/no-img-element -- 16:10 WebP 썸네일(320/480)을 크기 명시로 직접 내보낸다. */
import { buildFortuneJsonLd, generatePageMetadata } from "../../lib/generate-page-metadata";
import { founder } from "../../lib/brand/founder";
import styles from "./page.module.css";
import { PSYCHOTESTS } from "../../lib/psychotest-catalog";

/*
 * 미니 운세 게임 모음 (2026-10-17 "직관성").
 * 홈·전체 운세 시트 곳곳에 흩어져 있던 체험형 게임을 이 페이지 한 곳에 모은다.
 * - 정적 셸(*.html) 게임은 확장자 없는 정본 주소로 건다. `.html` 은 Cloudflare 가 308 로 돌린다.
 * - 썸네일은 public/images/mini-games/{slug}-{320,480}.webp (16:10 가운데 크롭).
 */

type MiniGame = {
  slug: string;
  name: string;
  href: string;
  desc: string;
  badge: string;
};

const GAMES: ReadonlyArray<MiniGame> = [
  { slug: "destiny-poker", name: "데스티니 포커", href: "/destiny-poker", desc: "네 마스터와 포커 · 왕 카드로 읽는 운세", badge: "무료" },
  { slug: "fortune-fish", name: "포춘 피쉬", href: "/fortune-teller-fish", desc: "금붕어의 몸짓으로 읽는 오늘의 흐름", badge: "무료" },
  { slug: "omikuji", name: "이모이 오미쿠지", href: "/emoi_omikuji_v2", desc: "제비통에서 뽑아 펼치는 오늘의 운세", badge: "무료" },
  { slug: "blood-type", name: "혈액형 테스트", href: "/blood-type-app", desc: "혈액형별 성향·궁합·코칭", badge: "무료" },
  { slug: "destiny-island", name: "운명의 섬", href: "/destiny-island", desc: "자미두수 명반이 섬이 되는 인터랙티브 맵", badge: "무료" },
  { slug: "secret-house", name: "시크릿 하우스", href: "/secret-house_real", desc: "내 일간으로 시작하는 선택형 연애 스토리", badge: "무료" },
  { slug: "hwatu-life", name: "화투 인생 패", href: "/oracle/hwatu-life/", desc: "7문항으로 찾는 나의 인생 패", badge: "무료" },
  { slug: "saju-fpti", name: "사주 FPTI", href: "/saju-fpti/", desc: "오행·십성 4축으로 보는 성향", badge: "무료" },
  { slug: "psychotest", name: "심리테스트", href: "/psychotest/", desc: `성격·연애·직장 테마 ${PSYCHOTESTS.length}종`, badge: "무료" },
];

const SITE = "https://code-destiny.com";

const META = {
  path: "/mini-games",
  title: "미니 운세 게임 9종 | 데스티니 포커·오미쿠지·사주 FPTI 모음",
  description:
    "데스티니 포커, 이모이 오미쿠지, 화투 인생 패, 사주 FPTI 등 짧게 해 보는 운세 게임 9종을 한곳에 모았습니다. 대부분 무료로 바로 시작합니다.",
  keywords: ["미니 운세 게임", "운세 게임", "무료 운세 게임", "데스티니 포커", "오미쿠지", "사주 FPTI", "화투 운세"],
  featureList: GAMES.map((game) => game.name),
  applicationCategory: "GameApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const BASE_GRAPH = JSON.parse(buildFortuneJsonLd(META));
const ITEM_LIST = {
  "@type": "ItemList",
  "@id": `${SITE}/mini-games#itemlist`,
  name: "미니 운세 게임 모음",
  itemListElement: GAMES.map((game, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${SITE}${game.href}`,
    name: game.name,
    description: game.desc,
  })),
};
const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [...(Array.isArray(BASE_GRAPH?.["@graph"]) ? BASE_GRAPH["@graph"] : []), ITEM_LIST],
});

export default function MiniGamesPage() {
  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />

      <header className={styles.hero}>
        <p className={styles.eyebrow}>꿀꿀 운세</p>
        <h1 className={styles.title}>미니 운세 게임</h1>
        <p className={styles.lead}>
          카드 한 장, 질문 몇 개로 짧게 해 보는 운세 게임 9종입니다. 카드를 누르면 바로 시작합니다.
        </p>
      </header>

      <ul className={styles.grid} aria-label="미니 운세 게임 목록">
        {GAMES.map((game) => (
          <li key={game.slug} className={styles.item}>
            <a className={styles.card} href={game.href}>
              <span className={styles.thumb}>
                <img
                  src={`/images/mini-games/${game.slug}-320.webp?v=20261019`}
                  srcSet={`/images/mini-games/${game.slug}-320.webp?v=20261019 320w, /images/mini-games/${game.slug}-480.webp?v=20261019 480w`}
                  sizes="(min-width: 960px) 240px, (min-width: 640px) 30vw, 46vw"
                  width={480}
                  height={300}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <span className={styles.body}>
                <h2 className={styles.name}>{game.name}</h2>
                <span className={styles.desc}>{game.desc}</span>
                <span className={styles.badge}>{game.badge}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <aside className={styles.signature} aria-labelledby="miniGamesSignatureTitle">
        <p className={styles.signatureKicker}>{founder.byline}</p>
        <h2 id="miniGamesSignatureTitle" className={styles.signatureTitle}>
          내 사주를 깊게 보고 싶다면, 대표 상담
        </h2>
        <p className={styles.signatureText}>
          미니 게임은 한 가지 상징으로 짧게 보는 운세입니다. 생년월일시 전체로 진로·연애·한 해의 흐름을 묻고 싶다면 대표
          상담에서 시작하세요.
        </p>
        <a className={styles.signatureCta} href="/ggulggul/#cdSignatureConsult">
          대표 상담 보기
        </a>
      </aside>

      <section className={styles.prose} aria-labelledby="miniGamesGuideTitle">
        <h2 id="miniGamesGuideTitle">미니 운세 게임은 이렇게 다릅니다</h2>
        <h3>한 가지 상징으로 보는 짧은 운세</h3>
        <p>
          여기 모은 게임은 저마다 하나의 상징 체계를 씁니다. 데스티니 포커와 포춘 피쉬는 카드와 물고기의 움직임을,
          이모이 오미쿠지는 일본 신사의 제비뽑기를 씁니다. 화투 인생 패는 일곱 개의 질문으로 화투 그림 속 나의 패를
          찾아 주고, 운명의 섬은 자미두수 명반을 지도처럼 펼쳐 보여 줍니다. 사주 FPTI는 오행과 십성을 네 개의 축으로 나눠 성향을 읽고, 혈액형 테스트와
          심리테스트는 몇 가지 질문에 대한 답으로 결과를 만듭니다. 한 판이 몇 분이면 끝나도록 만들어 처음 방문해도 바로
          해 볼 수 있습니다.
        </p>
        <h3>결과를 읽는 방법</h3>
        <p>
          게임 결과는 한 가지 각도에서 본 힌트입니다. 카드나 제비를 뽑는 게임은 할 때마다 결과가 달라질 수 있으니, 결과
          화면의 키워드 한두 개와 오늘 해 볼 행동 하나만 가져가는 편이 좋습니다. 같은 고민으로 여러 번 반복하기보다,
          마음에 남은 문장을 메모해 두고 며칠 뒤 다시 읽어 보면 지금의 내 마음이 어디에 걸려 있는지 더 잘 보입니다.
          결과는 미래를 정해 주지 않으며, 건강·법률·투자처럼 중요한 결정은 해당 분야 전문가와 함께 판단하시기 바랍니다.
        </p>
        <h3>대표 상담과 무엇이 다른가요</h3>
        <p>
          대표 상담은 태어난 연월일시로 사주 원국을 세우고, 그 위에서 진로·연애·재물·한 해의 흐름을 함께 읽습니다. 미니
          게임이 상징 하나로 오늘의 분위기를 짚는다면, 대표 상담은 내 사주 전체의 구조에서 왜 지금 그런 흐름이 오는지를
          설명합니다. {founder.method} 구체적인 질문이 있다면 대표 상담을, 가볍게 오늘의 기분을 점검하고 싶다면 미니
          게임을 고르시면 됩니다.
        </p>
      </section>
    </main>
  );
}
