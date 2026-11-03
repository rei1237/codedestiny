'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { trackDiscovery, type DiscoveryIntent } from '@/lib/analytics';
import styles from './ProductJourneyLinks.module.css';

/** Mount on the product client, not a conditional CTA, to survive form/loading changes. */
export function useProductView(itemId: string, intentId: DiscoveryIntent) {
  const viewed = useRef(new Set<string>());
  useEffect(() => {
    if (!itemId || viewed.current.has(itemId)) return;
    viewed.current.add(itemId);
    trackDiscovery('view_item', { itemId, intentId, itemListId: 'landing' });
  }, [itemId, intentId]);
}

/** Display-only shortcuts: samples stay on this page; saved results keep their owner route. */
export default function ProductJourneyLinks({ sampleId }: { sampleId: string }) {
  return (
    <nav className={styles.links} aria-label="상담 미리보기와 구매 결과">
      <a href={`#service-samples-${sampleId}`}>결과 예시 먼저 보기</a>
      <Link href="/records/">구매한 결과 다시 보기</Link>
    </nav>
  );
}
