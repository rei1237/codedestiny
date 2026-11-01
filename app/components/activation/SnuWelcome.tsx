'use client';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';
import Link from 'next/link';
import { useUserAccess } from '@/app/_lib/user-session-cache';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Gift, ArrowRight, Home, ChevronDown, LoaderCircle } from 'lucide-react';
import { SNU_SAJU_FEATURES } from '@/js/core/snu-campus-policy.mjs';
import { useProfiles, profileKey } from '@/app/yeongnyangi/_lib/use-profiles';
import ProfileForm from '@/app/yeongnyangi/_components/ProfileForm';
import { activationApi, ActivationApiError, type CampusState } from './activation-api';
import styles from './SnuWelcome.module.css';

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
  const features = data?.features || SNU_SAJU_FEATURES;
  const complete = Boolean(data && data.features.length > 0 && data.unlockedFeatureKeys.length === data.features.length);
  const currentStep = guest || !data ? 0 : !data.verified ? 1 : 2;
  const reviewEnd = data?.campaign?.mode === 'review' ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'long', timeStyle: 'short' }).format(new Date(data.campaign.endsAt)) : null;
  return <main className={styles.page}>
    <div className={styles.frame}>
      <nav className={styles.topNav} aria-label="혜택 페이지 이동">
        <Link className={styles.brand} href="/">꿀꿀 운세</Link>
        <Link className={styles.homeLink} href="/ggulggul/"><Home size={16} aria-hidden="true"/>홈으로</Link>
      </nav>

      <header className={styles.hero}>
        <h1>연이가 준비한<br/>사주 선물</h1>
        <p>SNULIFE 회원님을 위한 사주 콘텐츠 {features.length}종.<br/>나의 기질과 앞으로의 흐름을 함께 읽어보세요.</p>
        <Image className={styles.heroArt} src="/assets/service-intro/yeoni-gift.webp" width={176} height={198} priority alt="사주 선물을 준비한 꽃돼지 연이"/>
      </header>

      <ol className={styles.progress} aria-label="선물 받는 순서">
        {['가입·로그인', '코드 등록', '선물 열기'].map((label, index) => {
          const finished = complete || index < currentStep;
          return <li key={label} data-finished={finished || undefined} aria-current={!complete && index === currentStep ? 'step' : undefined}>
            <span className={styles.stepMark} aria-hidden="true">{finished ? <Check size={14}/> : index + 1}</span><span>{label}</span>
          </li>;
        })}
      </ol>

      <section className={styles.actionPanel} aria-label="내 사주 선물">
        {guest ? <>
          <h2><Gift size={24} aria-hidden="true"/>로그인하고 선물을 받아 주세요</h2>
          <p>가입·로그인 후 제휴 코드를 등록하면 돼요. 학교 이메일이나 학생증 인증은 필요하지 않아요.</p>
          <Link className={styles.primary} href="/login/?next=%2Fsnu%2F"><span>가입·로그인하기</span><ArrowRight size={18} aria-hidden="true"/></Link>
        </> : data ? <>
          {!data.verified ? <>
            <h2>제휴 코드를 등록해 주세요</h2>
            <p>SNULIFE 게시물에서 안내받은 코드를 입력하면, 본인 프로필에 사주 선물을 담을 수 있어요.</p>
            <form onSubmit={event => { event.preventDefault(); void redeem(); }}>
              <label className={styles.profileLabel}>제휴 코드<input value={code} maxLength={128} autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder="게시물의 제휴 코드 입력" aria-describedby="snu-code-hint" onChange={event => setCode(event.target.value)} required/></label>
              <button className={styles.primary} disabled={busy || !code.trim()} aria-busy={busy} type="submit">{busy ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true"/> : <Gift size={18} aria-hidden="true"/>}<span>{busy ? '코드 확인 중' : '제휴 코드 등록하기'}</span></button>
            </form>
            <p className={styles.hint} id="snu-code-hint">별도 구매나 후기 작성 없이 받을 수 있어요.</p>
          </> : complete ? <>
            <h2><Check size={24} aria-hidden="true"/>사주 선물을 열었어요</h2>
            <p>선택한 본인 프로필에 콘텐츠 {features.length}종이 열렸어요. 같은 프로필에서 언제든 다시 살펴보세요.</p>
            <a className={styles.primary} href="/ggulggul/?action=cdOneStepFreeSajuEntry"><span>내 사주와 열린 콘텐츠 보기</span><ArrowRight size={18} aria-hidden="true"/></a>
            <Link className={styles.quietLink} href="/records/">기존 기록 보관함으로<ArrowRight size={15} aria-hidden="true"/></Link>
          </> : <>
            <h2>{!profiles.loading && !profiles.profiles.length ? '먼저 본인 프로필을 저장해 주세요' : '선물을 담을 본인 프로필을 골라 주세요'}</h2>
            <p>{!profiles.loading && !profiles.profiles.length ? '선물을 담을 본인의 출생정보가 필요해요. 프로필을 저장한 뒤 사주 선물을 열어 주세요.' : '처음 선택한 출생정보 하나에 혜택이 적용돼요. 선택 후에는 다른 사람의 프로필로 바꿀 수 없어요.'}</p>
            {profiles.loading ? <p role="status">저장한 프로필을 확인하고 있어요.</p> : <>
              {!!profiles.profiles.length && <label className={styles.profileLabel}>본인 프로필<select value={profiles.profileId} onChange={event => profiles.select(event.target.value)}>{profiles.profiles.map(profile => <option key={profileKey(profile)} value={profileKey(profile)}>{profile.name || '내 프로필'}</option>)}</select></label>}
              <button className={!profiles.profiles.length && !showForm ? styles.primary : styles.textButton} onClick={() => setShowForm(!showForm)} aria-expanded={showForm}>{showForm ? '프로필 입력 닫기' : !profiles.profiles.length ? '내 프로필 저장하기' : '내 프로필 새로 저장하기'}</button>
              {showForm && <ProfileForm locale="ko" surface="paper" onSaved={profile => { profiles.saved(profile); setShowForm(false); }}/>}</>}
            {profiles.error && <p role="alert" className={styles.feedback}>{profiles.error}</p>}
            {(profiles.loading || profiles.profiles.length > 0) && <button className={styles.primary} disabled={busy || profiles.loading || !profiles.profileId} aria-busy={busy} onClick={() => void unlock()}><span>{busy ? '선물을 열고 있어요' : '이 프로필로 사주 선물 열기'}</span>{busy ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true"/> : <ArrowRight size={18} aria-hidden="true"/>}</button>}
          </>}
          {reviewEnd && data.campaign && <aside className={styles.reviewNote} aria-label="검수용 코드 안내"><strong>검수용 코드로 등록했어요.</strong><p>정식 모집 1,000계정과 별도로 최대 {data.campaign.limit}계정에서 확인할 수 있어요.<br/>코드 등록은 {reviewEnd}까지예요.</p></aside>}
        </> : !message ? <p role="status" className={styles.loading}><LoaderCircle className={styles.spinner} size={20} aria-hidden="true"/>연이가 제휴 선물을 확인하고 있어요.</p> : null}
        {message && <div role="status" className={`${styles.feedback}${!data && !guest ? ` ${styles.loadFailure}` : ''}`}>{!data && !guest && <h2>선물을 불러오지 못했어요</h2>}<p>{message}</p>{!data && !guest && <button className={styles.primary} onClick={() => void load()}>제휴 선물 다시 확인하기</button>}</div>}
      </section>

      <section className={styles.included} aria-labelledby="snu-included-title">
        <h2 id="snu-included-title">선물로 열리는 이야기</h2>
        <p>라이트 사주와 대운부터, 나를 알아가는 콘텐츠까지.</p>
        <ul>{features.map(item => <li key={item.featureKey}><Check size={16} aria-hidden="true"/><span>{item.title}</span></li>)}</ul>
        <p className={styles.hint}>AI가 답변을 만드는 유료 상담과 목록에 없는 기능은 포함되지 않아요.</p>
      </section>

      <div className={styles.detailsGroup}>
        <details className={styles.details}>
          <summary>이용 조건과 유의사항<ChevronDown size={18} aria-hidden="true"/></summary>
          <div className={styles.detailsBody}>
            <dl className={styles.terms}><div><dt>등록 기간</dt><dd>게시일부터 3개월</dd></div><div><dt>제공 수량</dt><dd>선착순 총 1,000계정</dd></div><div><dt>이용 기준</dt><dd>계정당 1회 · 본인 출생정보 하나</dd></div></dl>
            <p>가입·로그인과 유효한 제휴 코드가 필요해요. 수량이 소진되면 조기 마감돼요. 등록이 끝나도 이미 받은 콘텐츠와 기존 구매·결과 기록은 보존해요.</p>
            <p>사주 기반 자기이해를 돕는 참고 콘텐츠예요. 진로·취업 결과를 보장하거나 서울대학교의 추천·공인을 의미하지 않아요.</p>
          </div>
        </details>
        <details className={styles.details}>
          <summary>제휴 혜택 이미지 보기<ChevronDown size={18} aria-hidden="true"/></summary>
          <div className={styles.detailsBody}><Image className={styles.campaignArt} src="/assets/marketing/snulife/yeoni-saju-code-v2.webp" width={1500} height={1200} alt="SNULIFE 회원을 위한 연이의 사주 콘텐츠 10종 선물. 학생 인증 없이 제휴 코드로 받기."/></div>
        </details>
      </div>

      <aside className={styles.more}>
        <h2>조금 더 알아보고 싶다면</h2>
        <p>사주 풀이 뒤에 남는 질문은 유료 상담에서 이어갈 수 있어요. 추가 상담은 직접 선택할 때만 진행돼요.</p>
        <Link href="/yeongnyangi/fortune/">영냥이 상담 둘러보기<ArrowRight size={16} aria-hidden="true"/></Link>
        <Link href="/first-steps/">월정석과 첫 이용 혜택 알아보기<ArrowRight size={16} aria-hidden="true"/></Link>
      </aside>

      <footer className={styles.footer}>
        <nav aria-label="서비스 안내"><Link href="/terms/">이용약관</Link><Link href="/privacy-policy/">개인정보 처리방침</Link><button type="button" data-cd-cookie-settings>쿠키 설정</button><Link href="/about/#author">서비스·운영자 정보</Link></nav>
        <p>CODE DESTINY · 꿀꿀 운세</p>
      </footer>
      <div id="snu-consent-slot" />
    </div>
  </main>;
}
