import { generatePageMetadata } from "../../../../lib/generate-page-metadata";
import { availableStoneIds } from "../crystal-assets";
import CrystalFlowClient from "./CrystalFlowClient";
import styles from "../crystals.module.css";

// 개인 답변·결과만 보여 주는 화면이라 색인하지 않는다(공유 버튼은 유지). 공개 설명은 /saju/crystals/.
export function generateMetadata() {
  return generatePageMetadata({
    path: "/saju/crystals/start",
    title: "나에게 맞는 원석 찾기 - 사주 원석 추천 | 꿀꿀운세",
    description: "좋았던 해와 힘들었던 해를 알려주시면 사주 흐름과 함께 살펴 도움이 되는 기운과 어울리는 원석을 안내해요.",
    noindex: true,
  });
}

export default function SajuCrystalsStartPage() {
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>사주 원석 추천 · 연이의 원석 큐레이션</p>
      <h1>나에게 맞는 원석 찾기</h1>
      <CrystalFlowClient stoneImageIds={availableStoneIds()} />
    </main>
  );
}
