import { generatePageMetadata } from "@/lib/generate-page-metadata";
import SajuCompatPremiumClient from "./SajuCompatPremiumClient";
import styles from "./premium.module.css";

// 두 사람의 생년월일을 받아 결제로 이어지는 화면이라 색인하지 않는다. 공개 설명은 /saju/compatibility/.
export function generateMetadata() {
  return generatePageMetadata({
    path: "/saju/compatibility/premium/",
    title: "사주 고급 궁합 - 두 사람의 원국으로 읽는 관계 풀이 | 꿀꿀운세",
    description: "두 사람의 사주 원국과 합충, 오행 보완, 이성 기질 지표를 바탕으로 연이가 관계의 흐름과 실천 방법을 풀어 드려요.",
    noindex: true,
  });
}

export default function SajuCompatPremiumPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>사주 고급 궁합 · 10,000원</p>
        <h1 className={styles.title}>두 사람의 원국으로 읽는 고급 궁합</h1>
        <p className={styles.lead}>
          합과 충, 서로 채워 주는 오행, 이성 기질 지표와 전생 인연을 먼저 계산하고, 연이가 네 장의 풀이로 관계의 흐름과
          실천 방법을 정리해 드려요. 완성된 풀이는 보관함에 저장돼 언제든 다시 볼 수 있어요.
        </p>
      </header>
      <SajuCompatPremiumClient />
    </main>
  );
}
