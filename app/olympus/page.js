'use client';

import dynamic from 'next/dynamic';

const OlympusVIPLounge = dynamic(() => import('../../OlympusVIPLounge'), {
  ssr: false,
  loading: function OlympusLoadingFallback() {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: 'radial-gradient(circle at 20% 10%, #1f1a44 0%, #0b0a18 55%, #050509 100%)', color: '#f4f0ff' }}>
        <section style={{ maxWidth: '560px', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', lineHeight: 1.2 }}>Olympus Oracle</h1>
          <p style={{ margin: 0, opacity: 0.88, lineHeight: 1.6 }}>신탁 라운지를 준비하고 있습니다. 잠시만 기다려 주세요.</p>
        </section>
      </main>
    );
  },
});

export default function OlympusPage() {
  return <OlympusVIPLounge />;
}
