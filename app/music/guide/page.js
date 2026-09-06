import Link from "next/link";
import GuideCta from "../../components/GuideCta";
import { GUIDE_CTA_TARGETS } from "../../components/guide-cta-targets";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import ContentIntegrityNote from "../../components/ContentIntegrityNote";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../../lib/structured-data";

const MUSIC_GUIDE_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    "musicGuide.001": "운세·명상 음악 콘텐츠 소개 | Code Destiny",
    "musicGuide.002": "운세를 보기 전",
    "musicGuide.003": "리딩을 읽은 뒤",
    "musicGuide.004": "하루를 마무리할 때",
    "musicGuide.005": "음악 콘텐츠가 살피는 것",
    "musicGuide.006": "필요한 입력값",
    "musicGuide.007": "어떤 때 참고하면 좋은가",
    "musicGuide.008": "무료와 유료 범위",
    "musicGuide.009": "감상 흐름",
    "musicGuide.010": "페이지에서 확인할 수 있는 항목",
    "musicGuide.011": "Code Destiny의 감상 기준",
    "musicGuide.012": "짧은 감상 예시",
    "musicGuide.013": "감상 시 주의할 점",
  },
};

function musicGuidePageText(key) {
  return MUSIC_GUIDE_PAGE_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
export function generateMetadata() {
  return generatePageMetadata({
    path: "/music/guide",
    title: musicGuidePageText("musicGuide.001"),
    description:
      "Code Destiny 음악 콘텐츠의 감상 방식, 사용 상황, 무료 범위, 샘플 감상 흐름, 주의사항을 안내합니다.",
    keywords: ["명상 음악", "운세 음악", "달빛 플레이리스트", "Code Destiny 음악", "DEST1NOVA"],
  });
}

const flowItems = [
  "앨범과 곡의 분위기를 확인하고 현재 필요한 감정의 속도를 고릅니다.",
  "운세나 리딩 전후에는 긴장을 낮추는 곡을, 집중이 필요할 때는 리듬이 분명한 곡을 선택합니다.",
  "감상은 치료나 상담을 대신하지 않고, 하루의 정서를 정리하는 작은 의식처럼 사용합니다.",
  "재생 환경, 볼륨, 휴식 시간을 스스로 조절해 부담 없는 방식으로 듣습니다.",
];

const resultItems = [
  "달빛 플레이리스트와 캐릭터 앨범 소개",
  "운세 리딩 전후에 어울리는 감상 상황",
  "명상과 휴식을 위한 사용 팁",
  "무료 감상 범위와 연결되는 서비스",
  "음악이 대체하지 않는 의료·심리 상담의 경계",
];

const listeningStandards = [
  "운세 리딩 전에는 판단을 서두르지 않도록 박자가 과하게 몰아치지 않는 곡을 우선합니다.",
  "관계운이나 타로처럼 감정이 흔들리기 쉬운 리딩 뒤에는 결론을 밀어붙이는 분위기보다 여운을 정리하는 곡이 잘 맞습니다.",
  "집중이 필요한 글쓰기, 기록, 운세 다이어리 작성 전에는 반복되는 리듬이 안정적인 곡을 고르면 생각이 흩어지는 것을 줄이는 데 도움이 됩니다.",
  "밤 시간에는 볼륨을 낮추고 재생 시간을 짧게 정해, 감상이 수면이나 생활 리듬을 방해하지 않도록 합니다.",
];

const useCases = [
  {
    title: musicGuidePageText("musicGuide.002"),
    body:
      "조용한 곡으로 호흡을 고르면 결과를 확인하기 전의 불안이 조금 누그러집니다. 이때 음악은 정답을 예고하는 신호가 아니라, 마음을 한 걸음 뒤로 물러서게 하는 배경으로 두는 편이 좋습니다.",
  },
  {
    title: musicGuidePageText("musicGuide.003"),
    body:
      "좋은 문장만 붙잡거나 불편한 문장에 오래 머무르지 않도록, 곡을 들으며 오늘 현실에서 할 수 있는 작은 행동을 하나만 떠올립니다. 운세는 참고의 언어이고 선택은 사용자의 현재 안에서 완성됩니다.",
  },
  {
    title: musicGuidePageText("musicGuide.004"),
    body:
      "운세 다이어리나 짧은 메모를 남기기 전 음악을 틀면 감정의 온도를 낮추기 쉽습니다. 다만 깊은 불안, 반복되는 수면 문제, 강한 무기력은 감상만으로 다루지 말고 전문가의 도움을 함께 살피는 것이 안전합니다.",
  },
];

const faqItems = [
  {
    question: "음악이 운세 결과를 바꾸나요?",
    answer:
      "바꾸지 않습니다. 음악은 운세를 조작하거나 결과를 보장하는 장치가 아니라, 리딩 전후의 마음을 정리하고 감상 경험을 부드럽게 만드는 콘텐츠입니다.",
  },
  {
    question: "명상 음악은 치료 효과가 있나요?",
    answer:
      "치료나 회복을 보장하지 않습니다. 불안, 우울, 수면 문제, 통증처럼 지속적인 어려움이 있다면 음악 감상만으로 해결하려 하지 말고 의료·심리 전문가와 상담해야 합니다.",
  },
  {
    question: "어떤 순서로 들으면 좋나요?",
    answer:
      "처음에는 조용한 곡으로 호흡을 고르고, 이후 오늘의 운세나 타로 리딩을 본 뒤 다시 편안한 곡으로 마무리하면 흐름을 정리하기 좋습니다. 꼭 정해진 순서는 없습니다.",
  },
];

// 발행일은 이 파일의 첫 커밋일(git log --diff-filter=A), 수정일은 검수 노트·Article 을 붙인 날.
// 짝 구현: app/guides/[slug]/page.js 의 @graph(BreadcrumbList·Article·FAQPage) + ContentIntegrityNote.
const GUIDE_ARTICLE = {
  path: "/music/guide",
  title: "운세·명상 음악 콘텐츠 소개",
  description:
    "Code Destiny 음악 콘텐츠의 감상 방식, 사용 상황, 무료 범위, 샘플 감상 흐름, 주의사항을 안내합니다.",
  datePublished: "2026-06-21",
  dateModified: "2026-09-06",
};

const guideJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: "음악 플레이어", path: "/music" },
      { name: GUIDE_ARTICLE.title, path: GUIDE_ARTICLE.path },
    ]),
    buildArticleJsonLd({
      ...GUIDE_ARTICLE,
      category: "음악 플레이어",
      keywords: ["명상 음악", "운세 음악", "달빛 플레이리스트", "Code Destiny 음악", "DEST1NOVA"],
    }),
    // 화면의 FAQ 카드와 같은 배열을 넘긴다 — 스키마와 본문이 다른 문답이면 리치결과 정책 위반.
    buildFaqPageJsonLd(faqItems),
  ],
});

export default function MusicGuidePage() {
  return (
    <main className="cd-main-shell cd-guide">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: guideJsonLd }} />
      <header className="cd-main-header">
        <h1 className="cd-main-title">운세·명상 음악 콘텐츠 소개</h1>
        <p className="cd-main-intro">
          Code Destiny의 음악 콘텐츠는 운세를 보기 전 마음의 속도를 낮추고, 리딩이 끝난 뒤 감정을 부드럽게 정리하기 위한 감상형 콘텐츠입니다. 달빛 플레이리스트와 캐릭터 앨범은 예언이나 치료가 아니라, 하루를 차분히 바라보는 분위기를 열어 줍니다.
        </p>
      </header>

      <ContentIntegrityNote
        contentSource="authored"
        datePublished={GUIDE_ARTICLE.datePublished}
        dateModified={GUIDE_ARTICLE.dateModified}
        tone="dark"
      />

      <section className="cd-card-grid">
        <article className="cd-card">
          <h2>{musicGuidePageText("musicGuide.005")}</h2>
          <p>
            음악은 사용자의 운명을 판단하지 않습니다. 대신 운세 리딩을 보기 전 긴장을 낮추고, 결과를 읽은 뒤 마음을 정리할 수 있는 감상 흐름을 제공합니다. 곡의 분위기와 앨범 이미지는 Code Destiny의 세계관을 느끼는 입구가 됩니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{musicGuidePageText("musicGuide.006")}</h2>
          <p>
            음악 감상에는 생년월일이나 출생시간이 필요하지 않습니다. 사용자는 현재 기분, 필요한 분위기, 듣고 싶은 앨범을 기준으로 선택하면 됩니다. 개인 운세 입력값과 음악 감상은 분리해서 다룹니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{musicGuidePageText("musicGuide.007")}</h2>
          <p>
            오늘의 운세를 보기 전 마음을 가라앉히고 싶을 때, 타로 리딩 뒤 감정이 복잡할 때, 잠깐 쉬어 가며 하루의 속도를 낮추고 싶을 때 어울립니다. 음악은 결정을 대신하지 않고 감정의 공간을 조금 넓혀 줍니다.
          </p>
        </article>

        <article className="cd-card">
          <h2>{musicGuidePageText("musicGuide.008")}</h2>
          <p>
            공개 음악 페이지에서는 주요 곡과 앨범 흐름을 감상할 수 있습니다. 이후 확장되는 앨범, 캐릭터 콘텐츠, 리포트 연결 경험은 별도의 안내에 따라 제공될 수 있습니다. 음악 감상이 운세 결과나 건강 효과를 보장하지는 않습니다.
          </p>
        </article>
      </section>

      <section className="cd-card">
        <h2>{musicGuidePageText("musicGuide.009")}</h2>
        <ul>
          {flowItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{musicGuidePageText("musicGuide.010")}</h2>
        <ul>
          {resultItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card">
        <h2>{musicGuidePageText("musicGuide.011")}</h2>
        <p>
          Code Destiny의 음악은 운세를 더 극적으로 보이게 만들기보다, 리딩을 읽는 사람의 호흡과 속도를 부드럽게 조율하는 방향을 따릅니다. 곡을 고를 때는 신비로운 분위기만 보지 않고, 사용자가 리딩을 지나치게 단정하거나 불안하게 받아들이지 않도록 여백이 있는 흐름을 우선합니다.
        </p>
        <ul>
          {listeningStandards.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="cd-card-grid" aria-labelledby="music-guide-use-cases">
        <h2 id="music-guide-use-cases" className="sr-only">상황별 감상 예시</h2>
        {useCases.map((item) => (
          <article key={item.title} className="cd-card">
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <section className="cd-card">
        <h2>{musicGuidePageText("musicGuide.012")}</h2>
        <p>
          오늘의 운세를 읽기 전에는 잔잔한 곡으로 호흡을 늦추고, 리딩을 본 뒤에는 조금 더 밝은 곡으로 감정을 현실 쪽으로 돌려놓을 수 있습니다. 마음이 무겁게 느껴지는 날에는 결과를 오래 붙잡기보다 음악을 들으며 몸의 긴장을 먼저 풀어 주는 편이 좋습니다.
        </p>
      </section>

      <section className="cd-card">
        <h2>{musicGuidePageText("musicGuide.013")}</h2>
        <p>
          음악 콘텐츠는 엔터테인먼트와 휴식을 위한 감상 자료입니다. 의료, 심리 치료, 수면 장애, 불안 증상, 법률, 투자, 진로 결정의 대체 수단이 아니며, 지속적인 어려움이 있다면 자격 있는 전문가와 상담해야 합니다.
        </p>
      </section>

      <section className="cd-card-grid" aria-labelledby="music-guide-faq">
        <h2 id="music-guide-faq" className="sr-only">FAQ</h2>
        {faqItems.map((item) => (
          <article key={item.question} className="cd-card">
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </article>
        ))}
      </section>

      <GuideCta target={GUIDE_CTA_TARGETS["/music/guide"]} />

      <nav className="cd-chip-wrap" aria-label="음악 가이드 관련 링크">
        <Link href="/music" className="cd-chip">음악 플레이어</Link>
        <Link href="/today" className="cd-chip">오늘의 운세</Link>
        <Link href="/tarot/guide" className="cd-chip">타로 가이드</Link>
        <Link href="/disclaimer" className="cd-chip">면책 고지</Link>
        <Link href="/editorial-policy" className="cd-chip">콘텐츠 제작 원칙</Link>
      </nav>
    </main>
  );
}
