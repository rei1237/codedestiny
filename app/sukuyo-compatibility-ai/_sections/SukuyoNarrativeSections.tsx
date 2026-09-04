// 숙요 궁합 페이지 전용 본문 섹션 — 🔴 서버 컴포넌트다("use client" 없음).
//
// 이 라우트의 인터랙티브 셸은 dynamic(..., { ssr: false }) 이라 클라이언트로 옮긴 글자는
// 정적 산출물에서 사라진다. verify:indexable-prose-depth 가 dist 의 40단위 이상 조각 합을
// 900 이상으로 요구하므로 본문은 전부 여기(서버)에 남고, FAQ 도 hidden 이 아니라
// <details> 로 DOM 에 상주한다.
//
// 공용 app/components/ServiceIntroSection.tsx 는 나머지 7개 AI 라우트가 계속 쓴다 — 삭제 금지.
// 이 페이지만 자체 디자인으로 빠진다(사용자 확정).
//
// 문안은 기존 page.tsx 의 것을 한 글자도 지우지 않고 그대로 옮겼고,
// 클라이언트 히어로에서 걷어낸 상담 카드 3장과 로딩 셸 문단 3개를 여기로 승격했다.
// 장식은 달빛 예화 모티프(인장 · 가지 띠)다 — 경로는 _art/yehwaScene.generated.ts 가 소유하고,
// 색인 대상 HTML 이 무거워지지 않게 <symbol> 하나를 심고 <use> 로만 부른다.
// 🔴 SVG 안에 title 요소를 만들지 않는다(__tests__/ui/svg-title-not-document-title.static.test.js).
import { YehwaMotifSprite, YehwaMotifUse } from "../_art/YehwaArt";
import { SUKUYO_SEAL, SUKUYO_VINE } from "../_art/yehwaScene.generated";
import styles from "./SukuyoNarrativeSections.module.css";

const SPRITE = [
  { id: "skVine", motif: SUKUYO_VINE },
  { id: "skSeal", motif: SUKUYO_SEAL },
];

type FaqItem = { question: string; answer: string };

const STORY_CARDS = [
  {
    tone: "gold",
    title: "본명숙",
    text: "태어난 달의 자리로 보는 마음의 기본 결",
  },
  {
    tone: "violet",
    title: "관계 거리",
    text: "가까움과 멀어짐의 리듬을 읽는 숙요점 핵심",
  },
  {
    tone: "ivory",
    title: "궁합 해석",
    text: "끌림, 갈등, 오래가는 방식까지 전문가 상담으로 정리",
  },
];

// 같은 인장을 잉크로만 구분한다 — 세 개의 다른 그림보다 한 계열로 읽힌다.
const STORY_INK: Record<string, string> = {
  gold: styles.storySealGold,
  violet: styles.storySealViolet,
  ivory: styles.storySealIvory,
};

// 제목은 브리핑이 요구한 감정형 질문, 본문은 기존 <li> 문장 그대로다.
// 🔴 본문 문장을 쪼개지 않는다 — 40단위 미만으로 잘리면 prose-depth 에서 세어지지 않는다.
const MOMENT_CARDS = [
  {
    question: "왜 우리는 같은 이유로 반복해서 다툴까요?",
    body: "연인이나 배우자와 자주 같은 이유로 다투는 것 같아 원인을 짚고 싶을 때",
  },
  {
    question: "이 사람과는 왜 자꾸 말이 어긋날까요?",
    body: "오래된 친구나 동료와의 관계에서 서로의 대화 방식 차이가 궁금할 때",
  },
  {
    question: "이 인연, 시작해도 괜찮을까요?",
    body: "새로운 만남을 앞두고 상대와의 궁합을 미리 가볍게 참고하고 싶을 때",
  },
  {
    question: "사주로 본 것과 다른 이야기가 나올까요?",
    body: "사주 궁합과는 다른 방식으로 같은 관계를 한 번 더 확인해 보고 싶을 때",
  },
];

const TIMELINE_STEPS = [
  "본인과 상대의 생년월일을 각각 입력합니다.",
  "두 사람의 27숙을 계산하고, 숙요점 관계 유형표에서 서로의 궁합 자리를 확인합니다.",
  "끌림과 갈등의 리듬, 대화에서 조심할 지점을 상담 문장으로 정리해 드립니다.",
  "결과는 본인 계정에서 다시 열람하며 관계가 달라질 때 다시 확인할 수 있습니다.",
];

function SukuyoStorySection() {
  return (
    <section className={styles.story} aria-label="숙요점 궁합 전문가 상담 안내">
      {/* 🔴 이 페이지의 H1 은 서버 본문이 소유한다(십수 개 페이지의 관례).
          클라이언트 히어로와 로딩 셸은 h2 로 남는다. */}
      <h1 className={styles.pageTitle}>숙요 궁합 상담 — 27숙 관계 유형으로 읽는 두 사람</h1>
      <p className={styles.lead}>
        숙요점 궁합 전문가 상담은 태어난 날의 달이 머문 자리인 27숙을 기준으로 두 사람 사이의 끌림과
        갈등, 대화 방식의 궁합을 읽습니다. 연인, 부부, 오래된 친구처럼 이미 관계가 깊어진 사이일수록
        반복되는 패턴이 뚜렷하게 드러나, 왜 자주 같은 지점에서 부딪히는지 확인하는 데 도움이 됩니다.
      </p>
      <p className={styles.lead}>
        숙요점은 사주보다 계산이 단순해 결과를 빠르게 확인할 수 있으면서도, 관계 유형표를 통해
        두 사람이 서로에게 어떤 방식으로 끌리고 부딪히는지를 구체적으로 보여줍니다. 좋고 나쁨을
        단정하기보다, 서로 다른 리듬을 이해하는 데 초점을 둡니다.
      </p>

      <YehwaMotifUse id="skVine" className={styles.sectionMark} width={200} height={20} />

      <h2 className={styles.sectionTitle}>두 사람의 관계를 이렇게 읽습니다</h2>
      <div className={styles.storyCards}>
        {STORY_CARDS.map((card) => (
          <article key={card.title} className={styles.storyCard}>
            <YehwaMotifUse id="skSeal" className={`${styles.storySeal} ${STORY_INK[card.tone]}`} width={30} height={30} />
            <strong>{card.title}</strong>
            <span className={styles.storyCardText}>{card.text}</span>
          </article>
        ))}
      </div>

      {/* 로딩 셸 첫 화면에 있던 감성 문단 3개 — 지우지 않고 색인 대상 본문으로 옮겼다. */}
      <div className={styles.storyProse}>
        <p>
          숙요의 별은 처음 끌리는 순간만 보지 않습니다. 가까워질수록 드러나는 말투의 온도, 마음이
          닿는 속도, 서로를 지치게 하는 반복까지 함께 비춥니다.
        </p>
        <p>
          두 사람의 관계에는 편안히 흐르는 자리와 조심스럽게 다루어야 할 자리가 함께 놓입니다. 어느
          쪽으로 마음을 기울여야 오래 상하지 않는지가 차분히 떠오릅니다.
        </p>
        <p>
          이미 이어진 인연은 더 선명하게, 아직 망설이는 인연은 더 부드럽게 바라볼 수 있도록 사랑의
          리듬과 관계의 방향을 한 겹씩 열어 둡니다.
        </p>
      </div>
    </section>
  );
}

function SukuyoMomentsSection() {
  return (
    <section className={styles.moments} aria-label="숙요점 궁합 상담이 도움이 되는 순간">
      <YehwaMotifUse id="skVine" className={styles.sectionMark} width={200} height={20} />
      <h2 className={styles.sectionTitle}>이런 순간에 궁금해집니다</h2>
      <p className={styles.momentsNote}>이런 순간에 특히 도움이 됩니다</p>
      <ul className={styles.momentList}>
        {MOMENT_CARDS.map((item) => (
          <li key={item.question}>
            <strong>{item.question}</strong>
            <span>{item.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SukuyoTimelineSection() {
  return (
    <section className={styles.timeline} aria-label="숙요점 궁합 상담 진행 방식">
      <YehwaMotifUse id="skVine" className={styles.sectionMark} width={200} height={20} />
      <h2 className={styles.sectionTitle}>상담은 이렇게 진행됩니다</h2>
      <ol className={styles.timelineList}>
        {TIMELINE_STEPS.map((step) => (
          <li key={step}>
            <span className={styles.timelineText}>{step}</span>
          </li>
        ))}
      </ol>
      <div className={styles.timelineProse}>
        <p>
          숙요점 궁합은 관계의 좋고 나쁨을 판정하는 성적표가 아닙니다. 서로 다른 리듬을 가진 두
          사람이 어디에서 자연스럽게 맞고 어디에서 조율이 필요한지 미리 알아두면, 갈등이 생겼을 때도
          조금 더 여유 있게 대화를 이어갈 수 있습니다.
        </p>
        <p>
          27숙은 태어난 날의 달의 위치로 정해지므로 계산 자체는 간단하지만, 실제 해석은 두 사람의
          조합에 따라 매우 다양하게 갈립니다. 같은 상대라도 관계의 성격(연인인지, 가족인지, 동료인지)에
          따라 눈여겨봐야 할 지점이 달라지니 지금 궁금한 관계를 구체적으로 밝히고 질문하시길 권합니다.
        </p>
      </div>
    </section>
  );
}

function SukuyoFaqSection({ items }: { items: FaqItem[] }) {
  return (
    <section className={styles.faq} aria-label="숙요점 궁합 전문가 상담 자주 묻는 질문">
      <YehwaMotifUse id="skVine" className={styles.sectionMark} width={200} height={20} />
      <h2 className={styles.sectionTitle}>자주 묻는 질문</h2>
      {/* 🔴 <details> 여야 답변 본문이 DOM 에 남아 색인·prose-depth 에 세어진다.
          닫혀 있어도 서버 HTML 에는 전문이 들어간다. */}
      <div className={styles.faqList}>
        {items.map((item) => (
          <details key={item.question} className={styles.faqItem}>
            <summary className={styles.faqSummary}>
              <h3>{item.question}</h3>
              <i aria-hidden="true">＋</i>
            </summary>
            <p className={styles.faqAnswer}>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function SukuyoNarrativeSections({ faqItems }: { faqItems: FaqItem[] }) {
  return (
    <div className={styles.narrative}>
      <YehwaMotifSprite motifs={SPRITE} />
      <div className={styles.inner}>
        <SukuyoStorySection />
        <SukuyoMomentsSection />
        <SukuyoTimelineSection />
        <SukuyoFaqSection items={faqItems} />
      </div>
    </div>
  );
}
