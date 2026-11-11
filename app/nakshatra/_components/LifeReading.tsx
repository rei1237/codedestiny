import Link from "next/link";
import { CHAKRA_REFLECTIONS } from "../../../worker/lib/nakshatra-life-reading.js";
import { NAKSHATRA_COMPAT_PRICE_LABEL } from "../_lib/pricing";
import styles from "../library.module.css";

export interface LifeTopic {
  id: string; title: string; sukuyo: string; vedic: string; action: string;
  evidence: { sukuyo: string; vedic: string };
}
export default function LifeReading({ topics }: { topics: LifeTopic[] }) {
  return <section aria-label="주제별 나의 별 읽기">
    <nav className={styles.toc} aria-label="결과 목차">
      {topics.map(topic => <a key={topic.id} href={"#life-" + topic.id}>{topic.title}</a>)}
      <a href="#life-compat">두 사람의 궁합</a>
    </nav>
    {topics.map(topic => <article className={styles.chapter} id={"life-" + topic.id} key={topic.id}>
      <h2>{topic.title}</h2>
      <div className={styles.spread}>
        <div><h3>일본 숙요의 시선</h3><p>{topic.sukuyo}</p></div>
        <div><h3>인도 베다의 시선</h3><p>{topic.vedic}</p></div>
      </div>
      {topic.id === "wellbeing" && <div className={styles.chakras}>
        {CHAKRA_REFLECTIONS.map(chakra => <details key={chakra.name}>
          <summary>{chakra.name} — {chakra.theme}</summary><p>{chakra.question}</p><p>{chakra.action}</p>
        </details>)}
      </div>}
      <p className={styles.practice}>{topic.action}</p>
      <details className={styles.evidence}><summary>이 해석의 근거 보기</summary>
        <p>숙요: {topic.evidence.sukuyo}</p><p>베다: {topic.evidence.vedic}</p>
      </details>
    </article>)}
    <section className={styles.section} id="life-compat">
      <h2>두 사람 사이에 흐르는 것</h2>
      <p>나의 성향을 이해했다면, 상대의 별과 나란히 놓아 보세요. 관계의 역할과 친밀감, 생활 리듬을 살펴보고 함께 조율할 질문을 전합니다.</p>
      <div className={styles.actions}>
        <Link data-cd-reading-action="primary" className={styles.button} href="/nakshatra/compat/">궁합 보기 · {NAKSHATRA_COMPAT_PRICE_LABEL}</Link>
        <Link className={styles.secondary} href="/nakshatra/ai/">개인 심화 상담 보기</Link>
      </div>
      <p className={styles.price}>계산형 궁합은 무료예요. AI 개인 상담은 별도 유료이며 직접 선택할 때만 결제가 진행돼요.</p>
    </section>
  </section>;
}
