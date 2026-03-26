'use client';

import dynamic from 'next/dynamic';

const OlympusVIPLounge = dynamic(() => import('../../OlympusVIPLounge'), {
  ssr: false,
});

export default function OlympusPage() {
  return <OlympusVIPLounge />;
}
