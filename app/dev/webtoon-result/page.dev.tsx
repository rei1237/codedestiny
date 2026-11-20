import type { Metadata } from 'next';
import WebtoonResultDemo, { type DemoCard } from './WebtoonResultDemo';
import { TAROT_CARDS, buildImageCandidates } from '@/lib/tarot/tarot-cards.mjs';
import { buildCaretaroCardImageUrl } from '@/lib/tarot/caretaro-card-images.mjs';
import { getTarotCardImageUrl } from '@/src/features/fortune-tea-house/lib/tarotCardImageMap';

// 개발 전용: 4단계 캐릭터 웹툰 결과 확인 화면(?narrator=yeongnyangi 로 영냥이). 기존 기능에 연결하지 않는다.
// 프로덕션 빌드에서는 404 이고, 색인·사이트맵 대상이 아니다(사이트맵은 명시 목록만 싣는다).

export const metadata: Metadata = {
  title: '웹툰 결과 데모',
  robots: { index: false, follow: false },
};

// 정방향·역방향·주의 카드(M16 탑)를 한 번에 본다.
const SAMPLE: { code: string; reversed: boolean }[] = [
  { code: 'M01', reversed: false },
  { code: 'M18', reversed: true },
  { code: 'M16', reversed: false },
];

export default function WebtoonResultDemoPage() {
  const majors = TAROT_CARDS.filter((card: { arcana: string }) => card.arcana === 'major');
  const cards: DemoCard[] = SAMPLE.map(({ code, reversed }) => {
    const id = majors.findIndex((card: { code: string }) => card.code === code);
    const card = majors[id];
    return {
      id, code, reversed, name: card.nameKo,
      sources: [buildCaretaroCardImageUrl(code, { width: 480 }), getTarotCardImageUrl({ arcana: card.arcana, number: card.number }), buildImageCandidates(code)[0]].filter(Boolean),
    };
  });
  return (
    <main>
      <WebtoonResultDemo cards={cards} />
    </main>
  );
}
