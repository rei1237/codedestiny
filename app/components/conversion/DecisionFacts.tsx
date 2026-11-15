import { I18N_POLICY_ROUTE_MAP } from '@/lib/i18n/routes';
import { TEA_DECISION_FACTS } from '@/lib/marketing/decision-facts.mjs';
import TrustRecordLine from './TrustRecordLine';
import styles from './decision-facts.module.css';

// 유료 CTA 바로 위의 결정 정보. 한국어 화면 전용(문장은 decision-facts.mjs). 결제·권한 판정과 무관한 표시 전용이다.
// 390px 에서 주 버튼을 밀어내지 않도록 보관·환불만 펼쳐 두고 결제·작성 방식은 접는다.
// 환불 링크는 새 탭으로 연다 — 같은 탭에서 떠나면 고른 카드·질문 확인 단계가 끊긴다(checkout-entry.js 정책 링크와 같은 이유).
export default function DecisionFacts({ facts = TEA_DECISION_FACTS }: { facts?: typeof TEA_DECISION_FACTS }) {
  return <aside className={styles.facts} lang="ko" aria-label="결제 전 확인" data-cd-decision-facts>
    <p className={styles.row}><b>{facts.keepLabel}</b> {facts.keep}</p>
    <details className={styles.more}>
      <summary>{facts.moreLabel}</summary>
      <p className={styles.row}>{facts.billing}</p>
      <p className={styles.row}>{facts.method}</p>
    </details>
    <p className={styles.row}><a className={styles.link} href={I18N_POLICY_ROUTE_MAP.refundPolicy.ko} target="_blank" rel="noopener noreferrer">{facts.refundLink} <span aria-hidden="true">›</span></a></p>
    <TrustRecordLine variant="short" className={styles.trust} />
  </aside>;
}
