'use client';
import { useState } from 'react';
import { yeongnyangiCardArt } from '@/lib/tarot/yeongnyangi-deck';

export default function TarotCardArt({ cardCode, locale, className }: { cardCode?: string; locale?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const art = yeongnyangiCardArt(cardCode, locale, failed);
  return <picture>
    {art.avifSrc && <source type="image/avif" srcSet={art.avifSrc}/>}
    <img src={art.src} alt={art.alt} width={600} height={900} loading="lazy" className={className}
      onError={art.fallback ? undefined : () => setFailed(true)}/>
  </picture>;
}
