'use client';
import { trackEvent } from '@/lib/analytics';
import Link from 'next/link';
import { Gem, ArrowUpRight } from 'lucide-react';
import type { ActivationState } from './activation-api';
import styles from './activation.module.css';

export function RewardWallet({ data }: { data: ActivationState }) {
  return <section className={styles.wallet} aria-label="내 월정석">
    <div><Gem size={23} aria-hidden="true"/><h2>내 월정석 <strong>{data.wallet.balance.toLocaleString('ko-KR')}개</strong></h2></div>
    <p>모아 둔 월정석은 {data.wallet.minimumProductKRW.toLocaleString('ko-KR')}원 이상 대상 서비스의 할인에 쓸 수 있어요.</p>
    <p className={styles.note}>지급일부터 30일 동안 사용할 수 있어요. 이용권 구매에는 적용되지 않으며, 상품별 제외 조건이 있어요.
      {data.wallet.nextExpiry && <> 가장 가까운 만료일은 {new Date(data.wallet.nextExpiry).toLocaleDateString('ko-KR')}이에요.</>}</p>
    <Link href="/points/">내 월정석과 사용 내역 보기 <ArrowUpRight size={16} aria-hidden="true"/></Link>
  </section>;
}

export function NextConsultations({ data }: { data: ActivationState }) {
  return <section className={styles.recommendations} aria-label="다음 상담 추천">
    <h2>마음에 남은 질문이 있나요?</h2><p>필요한 이야기가 있다면, 다음 상담에서 조금 더 깊이 살펴볼 수 있어요.</p>
    {data.recommendations.map(item => <Link href={item.href} key={item.featureKey} onClick={() => trackEvent('next_consultation_click',{feature_key:item.featureKey})} className={styles.recommendation}>
      <span><strong>{item.title}</strong><small>{item.description}</small>
        {item.moonstonesAllowed && <small className={styles.discount}>보유 월정석으로 할인받을 수 있어요</small>}</span>
      <span><b>{item.amountKRW.toLocaleString('ko-KR')}원</b><ArrowUpRight size={18} aria-hidden="true"/></span>
    </Link>)}
    <p className={styles.note}>추가 상담은 선택이에요. 상품과 결제 조건을 확인한 뒤 직접 결정해 주세요.</p>
  </section>;
}
