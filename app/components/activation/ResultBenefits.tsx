'use client';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';
import Link from 'next/link';
import { useUserAccess } from '@/app/_lib/user-session-cache';
import { useEffect, useRef, useState } from 'react';
import { Gift, X } from 'lucide-react';
import { activationApi, type ActivationState } from './activation-api';
import { RewardWallet, NextConsultations } from './RewardWallet';
import styles from './activation.module.css';

export default function ResultBenefits({ requestId, locale = 'ko' }: { requestId: string; locale?: string }) {
  const { userKey } = useUserAccess();
  const [data, setData] = useState<ActivationState | null>(null), [open, setOpen] = useState(false);
  const [earned, setEarned] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), host = useRef<HTMLElement>(null), launcher = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setData(null); setEarned(false); setOpen(false);
    if (locale !== 'ko') return;
    let current = true;
    void activationApi<ActivationState>('status').then(async initial => {
      if (!current) return;
      setData(initial);
      if (initial.firstPaid.receipt?.status !== 'granted') {
        const result = await activationApi<ActivationState>('first-paid/claim', {});
        if (current) { setData(result); setEarned(result.granted === true && result.replayed !== true); if(result.granted && !result.replayed) trackEvent('activation_reward_received',{reward_kind:'first_paid'}); }
      }
    }).catch(() => { /* Reading a saved result never depends on reward availability. */ });
    return () => { current = false; };
  }, [requestId, locale, userKey]);
  const accountId = data?.accountId;
  useEffect(() => {
    if (!accountId || !host.current || typeof IntersectionObserver === 'undefined') return;
    const key = `cd:result-benefits:${accountId}:${requestId}`;
    try { if (sessionStorage.getItem(key)) return; } catch { return; }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || document.hidden) return;
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
      try { sessionStorage.setItem(key, '1'); } catch { return; }
      setOpen(true); trackEvent('result_benefits_view'); observer.disconnect();
    }, { threshold: .5 });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [accountId, requestId]);
  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current, opener = launcher.current;
    if (!element.open) element.showModal();
    return () => { if (element.open) element.close(); opener?.focus({ preventScroll: true }); };
  }, [open]);
  if (!data || locale !== 'ko') return null;
  return <aside ref={host} className={styles.benefits} aria-label="연이의 다음 상담과 월정석 안내">
    <div className={styles.benefitsTop}><Image src="/assets/service-intro/yeoni-gift.webp" width={84} height={94} alt="다음 이야기를 안내하는 연이"/><div><h2>읽고 난 마음, 조금 정리됐나요?</h2><p>남은 질문과 월정석 선물, 연이가 한곳에 모아뒀어요.</p><button ref={launcher} className={styles.primary} onClick={() => setOpen(true)}><Gift size={17}/>다음 상담과 선물 확인하기</button></div></div>
    {earned && <p role="status" className={styles.earned}>첫 유료 상담 선물로 월정석 {data.policy.firstPaid.amount.toLocaleString('ko-KR')}개를 받았어요.</p>}
    <dialog ref={dialog} className={styles.dialog} onClose={() => setOpen(false)} onCancel={() => setOpen(false)} aria-labelledby={`benefits-title-${requestId}`}>
      <header><h2 id={`benefits-title-${requestId}`}>다음 이야기도, 천천히 골라요.</h2><button type="button" onClick={() => setOpen(false)} aria-label="닫고 상담 계속 읽기"><X size={20}/></button></header>
      <Image src="/assets/service-intro/yeoni-gift.webp" width={112} height={126} alt=""/>
      {earned && <p className={styles.earned}>첫 상담을 마친 손님께 월정석 {data.policy.firstPaid.amount.toLocaleString('ko-KR')}개를 담아드렸어요.</p>}
      <RewardWallet data={data}/><NextConsultations data={data}/>
      <section className={styles.review}><h2>연이에게 후기를 들려주세요</h2><p>도움이 된 점도, 아쉬웠던 점도 괜찮아요. 후기 공개 승인 후 월정석 {data.policy.review.amount.toLocaleString('ko-KR')}개를 드려요.</p><p className={styles.note}>솔직한 후기라면 별점과 관계없어요. 작성 즉시 지급되는 혜택은 아니에요.</p><Link href="/reviews/?write=1" onClick={() => trackEvent('result_review_click')}>솔직한 후기 남기기</Link></section>
      <button className={styles.textButton} onClick={() => setOpen(false)}>지금은 상담을 더 읽을게요</button>
    </dialog>
  </aside>;
}
