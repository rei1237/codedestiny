import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { HOME_CONCERNS, REFUND_LINE, REFUND_POLICY_HREF, REFUND_POLICY_LABEL } from '@/lib/marketing/home-concerns.mjs';
import type { OfferPrices } from './EntryWebtoon';
import styles from './entry-webtoon.module.css';

// 꽃돼지 연이가 안내하는 "받는 것" 장(01 무료 만세력 · 02 무료 고민 답 · 03 더 깊게 · 안심 박스).
// 가격은 EntryWebtoon.buildOfferPrices()가 레지스트리에서 읽어 넘긴다. null이면 가격 줄만 뺀다.

const won = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;

// 01 예시 원국. 실제 사용자 값이 아니라 화면 모양을 보여 주는 예시다("예시" 라벨).
const SAMPLE_PILLARS = [
  { label: '시', stem: ['丙', 'fire'], branch: ['午', 'fire'] },
  { label: '일', stem: ['壬', 'water'], branch: ['子', 'water'] },
  { label: '월', stem: ['庚', 'metal'], branch: ['辰', 'earth'] },
  { label: '년', stem: ['甲', 'wood'], branch: ['戌', 'earth'] },
] as const;

function Sample({ children }: { children: ReactNode }) {
  return <div className={styles.sample}><span className={styles.sampleTag}>예시</span>{children}</div>;
}

function Manseryeok() {
  return <Sample>
    <div className={styles.pillars} role="img" aria-label="예시 만세력: 丙午 시주, 壬子 일주, 庚辰 월주, 甲戌 년주">
      {SAMPLE_PILLARS.map(pillar => <div key={pillar.label} className={styles.pillar} aria-hidden="true">
        <span className={styles.pillarLabel}>{pillar.label}</span>
        <span className={styles.glyph} data-element={pillar.stem[1]}>{pillar.stem[0]}</span>
        <span className={styles.glyph} data-element={pillar.branch[1]}>{pillar.branch[0]}</span>
      </div>)}
    </div>
    <p className={styles.sampleLine}><b>한 줄 성향</b> 물처럼 흐름을 읽고 때를 기다리는 편</p>
  </Sample>;
}

function Answer() {
  return <Sample>
    <p className={styles.sampleChip}>{HOME_CONCERNS[0].label}</p>
    <p className={styles.sampleAnswer}>지금은 서두르기보다 상대의 속도를 살필 때예요. 먼저 건네는 말은 짧고 가볍게.</p>
  </Sample>;
}

function PriceLine({ amount, suffix = '' }: { amount: number | null; suffix?: string }) {
  return amount === null ? null : <span className={styles.price}>{won(amount)}{suffix}</span>;
}

function Deeper({ prices }: { prices: OfferPrices }) {
  const known = Object.values(prices.concern).filter((amount): amount is number => amount !== null);
  const concernFrom = known.length ? Math.min(...known) : null;
  const varied = new Set(known).size > 1;
  return <div className={styles.tiers}>
    <article className={styles.tier}>
      <h3 className={styles.tierTitle}>고민별 상담</h3>
      <p className={styles.tierText}>{HOME_CONCERNS.map(concern => concern.label).join(' · ')}</p>
      <PriceLine amount={concernFrom} suffix={varied ? '부터' : ''} />
    </article>
    <article className={`${styles.tier} ${styles.tierFeatured}`}>
      <h3 className={styles.tierTitle}>사주 평생 소장 묶음</h3>
      <p className={styles.tierText}>사주 전체 풀이 평생 소장</p>
      <PriceLine amount={prices.bundle} />
    </article>
    <article className={styles.tier}>
      <h3 className={styles.tierTitle}>대표 상담 3종</h3>
      <ul className={styles.signature}>
        {prices.signature.map(item => <li key={item.featureKey}>
          <a href={item.href}>{item.label}</a>
          <PriceLine amount={item.amountKRW} />
        </li>)}
      </ul>
    </article>
    <div className={styles.locked} aria-label="잠금 미리보기">
      <span className={styles.lockedBars} aria-hidden="true"><i /><i /><i /></span>
      <p><Lock size={16} strokeWidth={1.75} aria-hidden="true" /> 지금은 일부만 보여요</p>
    </div>
  </div>;
}

function Safety() {
  return <ul className={styles.safety} aria-label="결제 안심 안내">
    <li>결제 전 예시 확인</li>
    <li>{REFUND_LINE}</li>
    <li><a href={REFUND_POLICY_HREF}>{REFUND_POLICY_LABEL} <span aria-hidden="true">→</span></a></li>
  </ul>;
}

export default function OfferCard({ cutId, prices }: { cutId: string; prices: OfferPrices }) {
  switch (cutId) {
    case 'offer-manseryeok': return <Manseryeok />;
    case 'offer-answer': return <Answer />;
    case 'offer-deeper': return <Deeper prices={prices} />;
    case 'offer-safety': return <Safety />;
    default: return null;
  }
}
