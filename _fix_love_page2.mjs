import { writeFileSync } from 'fs';

const content = [
  "import LoveSimulationClient from './LoveSimulationClient';",
  "",
  "export const metadata = {",
  "  title: 'LOVE CODE - \u515B\u4E3B \uc5f0\uc560 \uc2dc\ubbac\ub808\uc774\uc158 | Code Destiny',",
  "  description: '\uc0c1\ub300\ubc29\uc758 \uc0dd\ub144\uc6d4\uc77c\ub85c \uc0ac\uc8fc\ub97c \ubd84\uc11d\ud574 \ud398\ub974\uc18c\ub098 \uce90\ub9ad\ud130\ub97c \ub9cc\ub4e4\uace0, \ub2e4\uc591\ud55c \ub370\uc774\ud2b8 \ucf54\uc2a4\uc640 \uc120\ud0dd\uc9c0\ub97c \ud1b5\ud574 \uc0c1\ub300\ubc29\uc758 \ucde8\ud5a5\uc131\uaca9\uc744 \ubbf8\ub9ac \uacbd\ud5d8\ud574\ubcf4\ub294 \uc5f0\uc560 \uc2dc\ubbac\ub808\uc774\uc158.',",
  "  alternates: { canonical: 'https://code-destiny.com/saju/love-simulation' },",
  "  openGraph: {",
  "    type: 'website',",
  "    url: 'https://code-destiny.com/saju/love-simulation',",
  "    title: 'LOVE CODE - \uc0ac\uc8fc \uc5f0\uc560 \uc2dc\ubbac\ub808\uc774\uc158',",
  "    description: '\uc0c1\ub300\ubc29\uc758 \uc0dd\ub144\uc6d4\uc77c\ub85c \uc0ac\uc8fc \ubd84\uc11d \ud6c4 \uc5f0\uc560 \uc2dc\ubbac\ub808\uc774\uc158\uc744 \uccb4\ud5d8\ud558\uc138\uc694.',",
  "    images: [{ url: 'https://code-destiny.com/fuctionassets/lovesimulation.webp', width: 1200, height: 630, alt: 'LOVE CODE \uc0ac\uc8fc \uc5f0\uc560 \uc2dc\ubbac\ub808\uc774\uc158' }],",
  "  },",
  "};",
  "",
  "export default function LoveSimulationPage() {",
  "  return <LoveSimulationClient />;",
  "}",
].join('\n');

writeFileSync('app/saju/love-simulation/page.tsx', content, 'utf8');
console.log('written');
