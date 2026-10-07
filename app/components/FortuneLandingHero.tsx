import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import styles from "./fortune-landing.module.css";

const stories: Record<string, { name: string; title: string; description: string; points: string[]; action: string }> = {
  "/saju": { name: "사주", title: "같은 나라도,\n계절마다 다른 이야기가 있어요.", description: "타고난 기질부터 지금 마주한 선택까지. 일주와 태어난 계절을 함께 읽으며, 나에게 맞는 속도를 찾아보세요.", points: ["일주에 담긴 나의 기질", "태어난 계절에 따라 달라지는 모습", "오행과 십성으로 읽는 생활의 패턴"], action: "cdOneStepFreeSajuEntry" },
  "/ziwei/chart": { name: "자미두수", title: "삶의 여러 자리에서,\n나를 다시 발견해요.", description: "일과 관계, 마음이 머무는 자리. 열두 궁에 놓인 별을 따라 삶의 서로 다른 장면을 살펴보세요.", points: ["열두 궁으로 펼치는 명반", "별의 배치로 읽는 역할과 성향", "지금 고민하는 삶의 영역"], action: "cdHomeZiweiEntry" },
  "/sukuyo": { name: "숙요점", title: "가까워지는 방식에도,\n저마다의 리듬이 있어요.", description: "스물일곱 숙에 담긴 나의 성향을 읽어요. 관계를 정답으로 나누기보다, 서로 편안해질 거리를 알아보세요.", points: ["태어난 날에 따른 본명숙", "마음과 관계의 반복 패턴", "서로 다른 속도를 이해하는 단서"], action: "cdHomeSukuyoEntry" },
  "/vedic": { name: "베다점", title: "내 안의 가능성을,\n다른 별의 언어로 읽어요.", description: "인도 점성술의 출생차트로 기질과 삶의 주제를 살펴보세요. 낯선 용어도 일상의 질문으로 풀어갑니다.", points: ["라그나와 라시의 의미", "행성과 나크샤트라의 배치", "삶에서 힘을 쓰는 방향"], action: "cdHomeVedicEntry" },
  "/astrology": { name: "점성술", title: "태어난 순간의 하늘에,\n나를 이해할 단서가 있어요.", description: "태양별자리 하나로 다 담기지 않는 나. 달과 행성, 하우스의 배치를 함께 읽으며 감정과 선택의 패턴을 살펴보세요.", points: ["나만의 출생차트", "감정과 관계를 읽는 행성 배치", "일상에서 활용할 자기 이해"], action: "cdHomeAstroEntry" },
  "/tarot": { name: "타로", title: "마음에 걸린 질문 하나,\n카드 앞에 내려놓아요.", description: "복잡한 마음을 한 장면씩 펼쳐보세요. 카드가 건네는 상징을 통해 지금의 감정과 내가 선택할 수 있는 행동을 정리해요.", points: ["지금의 마음을 담은 질문", "카드가 보여주는 상황과 감정", "오늘 선택할 수 있는 작은 행동"], action: "cdHomeTarotEntry" },
};

function routeKey(path: string) { const key=path.replace(/\/$/, ""); return key==="/ziwei" ? "/ziwei/chart" : key; }
export function hasFortuneLanding(path: string) { return !!stories[routeKey(path)]; }

export default function FortuneLandingHero({ path }: { path: string }) {
  const story = stories[routeKey(path)];
  if (!story) return null;
  return <header className={styles.hero}>
    <div className={styles.copy}>
      <p className={styles.label}>꽃돼지 연이와 함께 · {story.name}</p>
      <h1>{story.title.split("\n").map((line, i) => <span key={line}>{i > 0 && <br />}{line}</span>)}</h1>
      <p className={styles.description}>{story.description}</p>
      <Link className={styles.start} href={"/ggulggul/?action=" + story.action}>{story.name} 보러 가기 <ArrowRight size={18} aria-hidden="true" /></Link>
      <p className={styles.note}>{path === "/tarot" ? "생년월일 없이, 지금의 질문으로 시작해요." : "프로필이 있으면 바로 이어져요. 없다면 먼저 설정해 주세요."}<br />결과 열람 시 기존 로그인·이용 조건이 적용됩니다.</p>
      <a className={styles.more} href="#seoLandingResults">어떤 이야기를 볼 수 있나요? <ArrowDown size={16} aria-hidden="true" /></a>
    </div>
    <figure className={styles.art}>
      {/* Existing responsive WebP: no animation runtime or third-party image request. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/yeoni/garden/yeoni-garden-hero-v1-640.webp" srcSet="/images/yeoni/garden/yeoni-garden-hero-v1-480.webp 480w, /images/yeoni/garden/yeoni-garden-hero-v1-640.webp 640w, /images/yeoni/garden/yeoni-garden-hero-v1-960.webp 960w" sizes="(max-width: 767px) calc(100vw - 32px), 460px" width={640} height={427} alt="초승달이 뜬 연꽃 정원에서 기다리는 꽃돼지 연이" decoding="async" fetchPriority="high" />
      <figcaption>서두르지 않아도 괜찮아요.<br />내 이야기를 이해하는 시간부터.</figcaption>
    </figure>
    <ul className={styles.points}>{story.points.map((point, i) => <li key={point}><span aria-hidden="true">0{i + 1}</span>{point}</li>)}</ul>
  </header>;
}
