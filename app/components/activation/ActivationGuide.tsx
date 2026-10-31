'use client';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';
import Link from 'next/link';
import { useUserAccess } from '@/app/_lib/user-session-cache';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { activationApi, ActivationApiError, type ActivationState } from './activation-api';
import { RewardWallet, NextConsultations } from './RewardWallet';
import styles from './activation.module.css';

export default function ActivationGuide() {
  const { userKey } = useUserAccess();
  const revision = useRef(0);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const [data, setData] = useState<ActivationState | null>(null), [guest, setGuest] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const turn = ++revision.current;
    try { const result = await activationApi<ActivationState>('status'); if(turn !== revision.current)return; setData(result); setGuest(false); setMessage(''); }
    catch (error) { if(turn !== revision.current)return; if (error instanceof ActivationApiError && error.status === 401) setGuest(true); else setMessage(error instanceof Error ? error.message : '선물을 다시 확인해 주세요.'); }
  }, []);
  useEffect(() => { setData(null); setGuest(false); setBusy(false); setMessage(''); trackEvent('activation_guide_view'); void load(); return invalidate; }, [load, userKey, invalidate]);
  const claim = async () => {
    if (busy || !data?.tutorial.profileId) return;
    setBusy(true); setMessage(''); const turn=revision.current;
    try { const result = await activationApi<ActivationState>('tutorial/complete', { profileId: data.tutorial.profileId }); if(turn !== revision.current)return; setData(result); if(result.granted && !result.replayed) trackEvent('activation_reward_received', {reward_kind:'tutorial'}); setMessage('무료 사주 첫걸음 선물을 받았어요. 어떤 상담에 쓸 수 있는지 함께 볼까요?'); }
    catch (error) { if(turn !== revision.current)return; setMessage(error instanceof Error ? error.message : '선물을 확인 중이에요. 잠시 후 다시 눌러 주세요.'); }
    finally { if(turn === revision.current)setBusy(false); }
  };
  const earned = data?.tutorial.receipt?.status === 'granted';
  return <main className={styles.page}>
    <header className={styles.hero}><Image src="/assets/service-intro/yeoni-gift.webp" width={176} height={198} priority alt="선물을 안고 반겨 주는 꽃돼지 연이"/>
      <div><h1>연이랑, 내 사주부터<br/>가볍게 알아볼까요?</h1><p>처음이라 낯설어도 괜찮아요.<br/>사주를 보고, 월정석을 받고, 내게 필요한 이야기를 골라 봐요.</p></div></header>
    <ol className={styles.steps} aria-label="첫걸음 안내">
      <li><span>1</span><strong>무료 사주 펼치기</strong><p>내 생년월일로 명식과 오행을 확인해요.</p></li>
      <li><span>2</span><strong>월정석 선물 받기</strong><p>확인한 뒤 이곳에서 선물을 받아요.</p></li>
      <li><span>3</span><strong>필요한 상담 고르기</strong><p>남은 질문이 있을 때만 더 살펴봐요.</p></li>
    </ol>
    <Image className={styles.tutorialArt} src="/assets/yeoni/onboarding/first-steps-v1.webp" width={1800} height={600} alt="연이가 사주 지도를 펼치고, 월정석 선물을 건넨 뒤 다음 상담을 골라 주는 세 장면"/>
    {guest ? <section className={styles.actionPanel}><h2>선물은 내 계정에 담아드려요</h2><p>로그인한 뒤 무료 사주를 확인해 주세요.</p><Link className={styles.primary} href="/login/?next=%2Fonboarding%2F">로그인하고 시작하기 <ArrowRight size={18}/></Link></section>
      : data ? <>
        <section className={styles.actionPanel}>
          <h2>{earned ? '첫걸음 선물을 받았어요' : data.tutorial.legacySignupReceived ? '이미 받은 월정석부터 확인해 볼까요?' : `무료 사주를 보고 월정석 ${data.policy.tutorial.amount.toLocaleString('ko-KR')}개를 받아요`}</h2>
          {earned ? <p><Check size={18} aria-hidden="true"/> 아래에서 잔액과 사용할 수 있는 상담을 확인해 주세요.</p>
            : data.tutorial.legacySignupReceived ? <p>예전에 받은 가입 선물과 같은 혜택이라 다시 지급되지는 않아요. 기존 잔액과 만료일은 그대로예요.</p>
            : data.tutorial.receipt?.status === 'started' ? <><p>내 프로필로 무료 사주를 확인했어요. 이제 선물을 받아 볼까요?</p><button type="button" disabled={busy} className={styles.primary} onClick={() => void claim()}>{busy ? '선물을 확인하고 있어요' : '월정석 선물 받기'}</button></>
            : <><p>프로필을 저장하고 무료 사주를 펼치면, 선물 받기로 이어드릴게요.</p><a className={styles.primary} href="/ggulggul/?action=cdOneStepFreeSajuEntry&tutorial=moonstone">무료 사주 보러 가기 <ArrowRight size={18}/></a></>}
          <p className={styles.note}>계정당 한 번, 지급일부터 {data.policy.tutorial.days}일 동안 사용해요. 가입만으로는 지급되지 않아요.</p>
        </section>
        <RewardWallet data={data}/><NextConsultations data={data}/>
        <aside className={styles.smallGuide}><h2>처음 유료 상담을 이용했다면</h2><p>첫 유료 구매의 상담 결과까지 받으면 월정석 {data.policy.firstPaid.amount.toLocaleString('ko-KR')}개를 한 번 더 드려요. 선물·무료 체험과 이용권·월정석만으로 이용한 상담은 대상이 아니에요. 단건 결제로 받은 첫 상담이 대상이에요.</p><p>후기는 솔직하게 남겨 주세요. 공개 승인 후 월정석 {data.policy.review.amount.toLocaleString('ko-KR')}개를 받을 수 있어요.</p></aside>
      </> : !message && <p role="status">연이가 선물을 확인하고 있어요.</p>}
    {message && <div role="status" className={styles.message}><p>{message}</p>{!data && !guest && <button onClick={() => void load()}>다시 확인하기</button>}</div>}
    <Link className={styles.back} href="/ggulggul/">지금은 운세부터 둘러볼게요</Link>
  </main>;
}
