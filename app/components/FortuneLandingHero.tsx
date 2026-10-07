import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./fortune-landing.module.css";

const stories: Record<string, { name: string; title: string; description: string; action: string }> = {
  "/saju": { name: "사주", title: "같은 나라도,\n계절마다 다른 이야기가 있어요.", description: "타고난 기질부터 지금 마주한 선택까지. 일주와 태어난 계절을 함께 읽으며, 나에게 맞는 속도를 찾아보세요.", action: "cdOneStepFreeSajuEntry" },
  "/ziwei/chart": { name: "자미두수", title: "삶의 여러 자리에서,\n나를 다시 발견해요.", description: "일과 관계, 마음이 머무는 자리. 열두 궁에 놓인 별을 따라 삶의 서로 다른 장면을 살펴보세요.", action: "cdHomeZiweiEntry" },
  "/sukuyo": { name: "숙요점", title: "가까워지는 방식에도,\n저마다의 리듬이 있어요.", description: "스물일곱 숙에 담긴 나의 성향을 읽어요. 관계를 정답으로 나누기보다, 서로 편안해질 거리를 알아보세요.", action: "cdHomeSukuyoEntry" },
  "/vedic": { name: "베다점", title: "내 안의 가능성을,\n다른 별의 언어로 읽어요.", description: "인도 점성술의 출생차트로 기질과 삶의 주제를 살펴보세요. 낯선 용어도 일상의 질문으로 풀어갑니다.", action: "cdHomeVedicEntry" },
  "/astrology": { name: "점성술", title: "태어난 순간의 하늘에,\n나를 이해할 단서가 있어요.", description: "태양별자리 하나로 다 담기지 않는 나. 달과 행성, 하우스의 배치를 함께 읽으며 감정과 선택의 패턴을 살펴보세요.", action: "cdHomeAstroEntry" },
  "/tarot": { name: "타로", title: "마음에 걸린 질문 하나,\n카드 앞에 내려놓아요.", description: "복잡한 마음을 한 장면씩 펼쳐보세요. 카드가 건네는 상징을 통해 지금의 감정과 내가 선택할 수 있는 행동을 정리해요.", action: "cdHomeTarotEntry" },
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
    </div>
    <figure className={styles.art}>
      {/* Existing responsive WebP: no animation runtime or third-party image request. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/yeoni/garden/yeoni-garden-hero-v1-640.webp" srcSet="/images/yeoni/garden/yeoni-garden-hero-v1-480.webp 480w, /images/yeoni/garden/yeoni-garden-hero-v1-640.webp 640w, /images/yeoni/garden/yeoni-garden-hero-v1-960.webp 960w" sizes="(max-width: 767px) calc(100vw - 32px), 460px" width={640} height={427} alt="초승달이 뜬 연꽃 정원에서 기다리는 꽃돼지 연이" decoding="async" fetchPriority="high" />
      <figcaption>서두르지 않아도 괜찮아요.<br />내 이야기를 이해하는 시간부터.</figcaption>
    </figure>
  </header>;
}
