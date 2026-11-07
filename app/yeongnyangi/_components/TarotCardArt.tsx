'use client';
import { useState } from 'react';
import { yeongnyangiCardArt } from '@/lib/tarot/yeongnyangi-deck';
import { IS_APP_BUILD } from '@/lib/app-build-target';

export default function TarotCardArt({ cardCode, locale, className }: { cardCode?: string; locale?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const art = yeongnyangiCardArt(cardCode, locale, failed);
  return <picture>
    {/* 앱 번들은 webp만 싣는다(build-mobile-app.mjs removeUnusedTarotSizes). <picture>는 고른 소스가 404여도 img로 내려가지 않는다. */}
    {!IS_APP_BUILD && art.avifSrc && <source type="image/avif" srcSet={art.avifSrc}/>}
    <img src={art.src} alt={art.alt} width={600} height={900} loading="lazy" className={className}
      onError={art.fallback ? undefined : () => setFailed(true)}/>
  </picture>;
}
