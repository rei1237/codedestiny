"use client";

import Script from "next/script";

const ADSENSE_SRC =
  "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9863227498729828";

export default function DeferredAdsense() {
  return (
    <Script
      id="cd-adsense"
      src={ADSENSE_SRC}
      strategy="lazyOnload"
      async
      crossOrigin="anonymous"
      data-cd-adsense="1"
    />
  );
}
