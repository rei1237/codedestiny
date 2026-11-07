'use client';

import { trackEvent } from '@/lib/analytics';
import { HOME_CONCERNS, freeEntryHref } from '@/lib/marketing/home-concerns.mjs';

const STORAGE_KEY = 'cd:home-concern';
const CHIP = 'inline-flex min-h-11 items-center rounded-full border border-[#b31955]/35 bg-[#b31955]/[0.06] px-4 text-sm font-bold text-[#b31955] hover:bg-[#b31955]/10 dark:text-[rgba(255,196,222,0.96)]';

/**
 * 띠운세 끝의 고민 다리. 칩은 JS 없이도 열리는 평범한 링크이고, 누르면 고민을 sessionStorage에 남긴다.
 * 저장은 실패해도 된다(사파리 사생활 보호 등). 이동은 막지 않는다.
 */
export default function ConcernBridge({ from }: { from: string }) {
  const remember = (id: string) => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, id);
    } catch {
      // 저장소를 못 써도 주소에 concern이 실려 있으니 그대로 이동한다.
    }
    try {
      trackEvent('home_concern_select', { concern: id, surface: 'fortune_bridge' });
    } catch {
      // 계측 실패는 이동에 영향을 주지 않는다.
    }
  };
  return <section aria-labelledby="concern-bridge-heading" className="mt-12">
    <h2 id="concern-bridge-heading" className="break-keep text-lg font-extrabold">띠 흐름을 봤다면, 마음에 걸린 고민도</h2>
    <p className="mt-2 break-keep text-sm leading-7 text-[#70445c] dark:text-[rgba(255,214,232,0.86)]">궁금한 고민을 하나 고르면 무료 만세력으로 이어서 풀어 드려요.</p>
    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="궁금한 고민 고르기">
      {HOME_CONCERNS.map(concern => <a key={concern.id} href={freeEntryHref(concern.id, from)} data-concern={concern.id}
        className={CHIP} onClick={() => remember(concern.id)}>{concern.label}</a>)}
    </div>
  </section>;
}
