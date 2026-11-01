'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUserAccess } from '@/app/_lib/user-session-cache';
import { activationApi, type CampusState, type ActivationState } from './activation-api';
import { hasCompleteSnuGift } from '@/js/core/snu-reading-flow.mjs';
import styles from './activation.module.css';

export default function ActivationEntry() {
  const { userKey } = useUserAccess(), path = usePathname();
  const excluded = /^\/(checkout|login|signup|onboarding|snu|admin|gift)(\/|$)/.test(path || '');
  const [data, setData] = useState<ActivationState | null>(null), [campus, setCampus] = useState<CampusState | null>(null), [closed, setClosed] = useState(false);
  useEffect(() => {
    setData(null); setCampus(null); setClosed(false);
    if (excluded || !userKey || userKey === 'guest') return;
    let current = true, version = 0;
    const refresh = () => { const turn = ++version; void Promise.all([activationApi<ActivationState>('status'), activationApi<CampusState>('snu/status')]).then(([reward, school]) => {
      if (current && turn === version) { setData(reward); setCampus(school); }
    }).catch(() => {}); };
    refresh(); window.addEventListener('cd:activation-reward-updated', refresh);
    return () => { current = false; window.removeEventListener('cd:activation-reward-updated', refresh); };
  }, [userKey, excluded]);
  if (!data || closed || excluded) return null;
  const schoolGift = campus?.verified && !hasCompleteSnuGift(campus);
  return <aside className={styles.entry} aria-label="연이의 선물 안내">
    <Image src="/assets/service-intro/yeoni-gift.webp" width={54} height={61} alt=""/>
    <div><p>{schoolGift ? '등록한 SNULIFE 사주 선물을 이어서 열어보세요.' : data.tutorial.eligible ? '무료 사주를 보고 첫걸음 선물을 받아볼까요?' : `내 월정석 ${data.wallet.balance.toLocaleString('ko-KR')}개, 어디에 쓸 수 있을까요?`}</p><Link href={schoolGift ? '/snu/' : '/first-steps/'}>{schoolGift ? '등록한 사주 선물 확인하기' : '월정석과 첫걸음 안내 보기'}</Link></div>
    <button aria-label="연이 안내 접기" onClick={() => setClosed(true)}>닫기</button>
  </aside>;
}
