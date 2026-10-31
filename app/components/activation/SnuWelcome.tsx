'use client';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';
import Link from 'next/link';
import { useUserAccess } from '@/app/_lib/user-session-cache';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Gift, ArrowRight } from 'lucide-react';
import { SNU_SAJU_FEATURES } from '@/js/core/snu-campus-policy.mjs';
import { useProfiles, profileKey } from '@/app/yeongnyangi/_lib/use-profiles';
import ProfileForm from '@/app/yeongnyangi/_components/ProfileForm';
import { activationApi, ActivationApiError, type CampusState } from './activation-api';
import styles from './activation.module.css';

export default function SnuWelcome() {
  const { userKey } = useUserAccess();
  const revision = useRef(0);
  const invalidate = useCallback(() => { revision.current++; }, []);
  const profiles = useProfiles({ forceFreshOnMount: true });
  const [data, setData] = useState<CampusState | null>(null), [guest, setGuest] = useState(false), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''), [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState('');
  const load = useCallback(async () => {
    const turn = ++revision.current;
    try { const result = await activationApi<CampusState>('snu/status'); if(turn !== revision.current)return; setData(result); setGuest(false); setMessage(''); }
    catch (error) { if(turn !== revision.current)return; if (error instanceof ActivationApiError && error.status === 401) setGuest(true); else setMessage(error instanceof Error ? error.message : '제휴 선물을 다시 확인해 주세요.'); }
  }, []);
  useEffect(() => { setData(null); setGuest(false); setBusy(false); setMessage(''); setCode(''); void load(); return invalidate; }, [load, userKey, invalidate]);
  const redeem = async () => {
    if (busy || !code.trim()) return; setBusy(true); setMessage(''); const turn=revision.current;
    try { const result = await activationApi<CampusState>('snu/code', { code: code.trim() }); if(turn !== revision.current)return; setData(result); setCode(''); trackEvent('snulife_code_registered'); setMessage('제휴 코드를 확인했어요. 선물을 담을 본인 프로필을 골라 주세요.'); }
    catch (error) { if(turn !== revision.current)return; setMessage(error instanceof Error ? error.message : '게시물의 제휴 코드를 다시 확인해 주세요.'); }
    finally { if(turn === revision.current)setBusy(false); }
  };
  const unlock = async () => {
    if (busy || !profiles.profileId) return; setBusy(true); setMessage(''); const turn=revision.current;
    try { const result = await activationApi<CampusState>('snu/unlock', { profileId: profiles.profileId }); if(turn !== revision.current)return; setData(result); if(result.complete) trackEvent('snu_saju_unlocked', {campaign:'snulife'});
      setMessage(result.complete ? '선물을 열었어요. 사주 화면에서 무료로 열린 콘텐츠를 살펴보세요.' : '이미 열려 있던 기록은 보존했어요. 일부 항목은 기존 내역 확인이 필요해요.'); }
    catch (error) { if(turn !== revision.current)return; setMessage(error instanceof Error ? error.message : '선물을 확인 중이에요. 잠시 후 다시 눌러 주세요.'); }
    finally { if(turn === revision.current)setBusy(false); }
  };
  const complete = data && data.features.length > 0 && data.unlockedFeatureKeys.length === data.features.length;
  return <main className={styles.page}>
    <header className={styles.hero}><Image src="/assets/service-intro/yeoni-gift.webp" width={176} height={198} priority alt="사주 선물을 준비한 꽃돼지 연이"/><div><h1>SNULIFE 회원님께,<br/>연이가 준비한 사주 선물</h1><p>제휴 코드를 등록하면 라이트 사주와 대운 풀이,<br/>재미있는 사주 콘텐츠를 함께 열어드려요.</p></div></header>

    {guest ? <section className={styles.actionPanel}><h2>로그인하고 선물을 받아 주세요</h2><p>학교 이메일이나 학생 인증 없이, SNULIFE 게시물의 제휴 코드로 참여할 수 있어요.</p><Link className={styles.primary} href="/login/?next=%2Fsnu%2F">가입·로그인하기 <ArrowRight size={18}/></Link></section>
      : data ? <section className={styles.actionPanel}>
        {!data.verified ? <><h2>SNULIFE 제휴 코드를 입력해 주세요</h2><p>게시일부터 3개월 동안, 총 1,000계정에 계정당 한 번 선물을 준비했어요. 수량이 소진되면 조기 마감돼요.</p><form onSubmit={event => { event.preventDefault(); void redeem(); }}><label className={styles.profileLabel}>제휴 코드<input value={code} maxLength={128} autoComplete="off" autoCapitalize="off" spellCheck={false} onChange={event => setCode(event.target.value)} required/></label><button className={styles.primary} disabled={busy || !code.trim()} type="submit"><Gift size={18}/>{busy ? '코드 확인 중' : '제휴 코드 등록하기'}</button></form><p className={styles.note}>학교 이메일·학생증 인증이나 별도 구매, 후기 작성은 필요하지 않아요.</p></>
          : complete ? <><h2><Check size={22}/> 사주 선물을 열었어요</h2><p>무료로 열린 콘텐츠는 선택한 본인 프로필에서 다시 볼 수 있어요.</p><a className={styles.primary} href="/ggulggul/?action=cdOneStepFreeSajuEntry">내 사주와 열린 콘텐츠 보기 <ArrowRight size={18}/></a></>
          : <><h2>선물을 담을 본인 프로필을 골라 주세요</h2><p>한 번 선택한 생년월일 기준으로 혜택이 적용돼요. 다른 사람의 프로필로 바꿀 수는 없어요.</p>
            {profiles.loading ? <p role="status">저장한 프로필을 확인하고 있어요.</p> : <>
              {!!profiles.profiles.length && <label className={styles.profileLabel}>본인 프로필<select value={profiles.profileId} onChange={event => profiles.select(event.target.value)}>{profiles.profiles.map(profile => <option key={profileKey(profile)} value={profileKey(profile)}>{profile.name || '내 프로필'}</option>)}</select></label>}
              <button className={styles.textButton} onClick={() => setShowForm(!showForm)}>{showForm ? '프로필 입력 닫기' : '내 프로필 새로 저장하기'}</button>
              {showForm && <ProfileForm locale="ko" onSaved={profile => { profiles.saved(profile); setShowForm(false); }}/>}</>}
            {profiles.error && <p role="alert">{profiles.error}</p>}
            <button className={styles.primary} disabled={busy || profiles.loading || !profiles.profileId} onClick={() => void unlock()}>{busy ? '선물을 열고 있어요' : '이 프로필로 사주 선물 열기'}</button></>}
      </section> : !message && <p role="status">연이가 제휴 선물을 확인하고 있어요.</p>}
    {message && <div role="status" className={styles.message}><p>{message}</p>{!data && !guest && <button onClick={() => void load()}>제휴 선물 다시 확인하기</button>}</div>}
    <section className={styles.included}><h2>제휴 선물로 열리는 콘텐츠</h2><ul>{(data?.features || SNU_SAJU_FEATURES).map(item => <li key={item.featureKey}><Check size={16} aria-hidden="true"/>{item.title}</li>)}</ul><p>이 목록의 사주 풀이와 재미 콘텐츠를 열어드려요. AI가 답변을 만드는 유료 상담과 목록에 없는 기능은 별도예요.</p></section>
    <aside className={styles.smallGuide}><h2>내 이야기를 더 듣고 싶을 땐</h2><p>사주 풀이를 읽은 뒤에도 남는 질문은 유료 상담에서 이어갈 수 있어요. 추가 상담은 직접 선택할 때만 진행돼요.</p><Link href="/yeongnyangi/fortune/">영냥이 상담 둘러보기 <ArrowRight size={16}/></Link><Link href="/onboarding/">월정석과 첫 이용 혜택 알아보기 <ArrowRight size={16}/></Link></aside>
    <Image className={styles.campaignArt} src="/assets/marketing/snulife/yeoni-saju-code-v2.webp" width={1500} height={1200} alt="SNULIFE와 꿀꿀 운세가 준비한 연이의 라이트 사주·대운 풀이 선물"/>
    <p className={styles.note}>서울대학교의 추천·공인을 의미하지 않습니다. 가입·로그인과 유효한 제휴 코드가 필요합니다. 등록은 게시일부터 3개월 또는 수량 소진까지이며, 이미 받은 콘텐츠와 기존 구매·결과 기록은 보존합니다.</p>
  </main>;
}
