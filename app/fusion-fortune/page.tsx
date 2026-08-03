import { buildSeoMetadata } from "../../lib/seo";
import { FusionFortuneClient } from "./FusionFortuneClient";

export const metadata = buildSeoMetadata({
  path: "/fusion-fortune",
  title: "초융합 운세 | Code Destiny",
  description: "사주·자미두수·베다점·숙요점·점성술·타로를 하나의 상담으로 엮어 성향, 관계, 일과 돈, 마음의 흐름, 가까운 시기의 선택과 현실적인 행동 조언까지 깊이 있게 정리하는 초융합 운세입니다.",
  keywords: ["초융합 운세", "사주", "자미두수", "베다점", "숙요점", "타로"],
  ogImage: "/images/fusion-fortune/fusion-guardian-celestial-hero.webp",
});

export default function FusionFortunePage() {
  return <FusionFortuneClient />;
}
