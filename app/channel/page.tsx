import type { Metadata } from 'next';
import styles from './page.module.css';
import KakaoChannelInvite from '../components/KakaoChannelInvite';
import { SIGN_PROFILES } from '@/lib/fortune/sign-profiles';
import { products } from '@/worker/yeongnyangi/payments/catalog';
import { policyForReading } from '@/worker/yeongnyangi/fortune/reading-policy';
export const metadata: Metadata = { title: '연이의 이번 주 운세와 채널 소식', description: '꽃돼지 연이와 무료 별자리·띠 주간 운세를 살펴보고, 카카오톡 채널 소식과 광고성 정보 수신 설정을 확인하세요.', robots: { index: false, follow: true } };
const product = products.find(p => p.id === 'saju_mackerel')!;
const policy = policyForReading(product.fishId, product.manifestVersion);
export default function ChannelPage() {
  return <main className={styles.page}>
    <h1>연이의 이번 주 운세</h1><p>어서 와요, 꽃돼지 연이예요. 따뜻한 차 한 잔처럼 오늘과 이번 주의 이야기를 건네드릴게요. 별자리와 띠는 서로 다른 해석 체계예요. 마음에 남는 조언 하나를 가볍게 챙겨가요.</p>
    <img src="/assets/kakao-crm/yeoni-weekly.png" alt="따뜻한 차 한 잔을 건네는 꽃돼지 연이" width={800} height={600} style={{ width: '100%', height: 'auto', borderRadius: 16 }} />
    <a className={styles.primary} href="/today/">연이와 일일·주간 운세 보기</a>
    {(['zodiac', 'animal'] as const).map(kind => <section key={kind}><h2>{kind === 'zodiac' ? '별자리로 보는 이번 주' : '띠로 보는 이번 주'}</h2><nav aria-label={kind === 'zodiac' ? '별자리 운세 선택' : '띠 운세 선택'} style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem' }}>{SIGN_PROFILES.filter(p => p.kind === kind).map(p => <a key={p.id} href={`/fortune/weekly/${p.id}/`} style={{ padding: '.5rem .8rem', border: '1px solid currentColor', borderRadius: 8, minHeight: 44 }}>{p.nameKo}</a>)}</nav></section>)}
    <section style={{ marginTop: '2rem' }}><h2>내 질문을 더 깊이 살펴보고 싶다면</h2><p>영냥이에게 궁금한 질문 하나를 남겨보세요. 사주 고등어 상담은 {product.priceKRW.toLocaleString('ko-KR')}원이며 {product.chapterCount}개 챕터로 구성됩니다. 본문 목표 분량은 {policy.target[0].toLocaleString('ko-KR')}~{policy.target[1].toLocaleString('ko-KR')}자입니다. 실제 결과 분량은 달라질 수 있어요.</p><p>Family 이용권 한도 또는 단건 결제를 사용하며, 다른 이용권과 월정석은 적용되지 않아요.</p><a href="/yeongnyangi/1000-won-fortune/">가격·제공 내용 확인하기</a></section>
    <KakaoChannelInvite source="preferences" settings />
  </main>;
}
