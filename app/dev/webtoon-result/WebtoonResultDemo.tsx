'use client';

// 개발 전용 데모: 실제 풀이 엔진(master-reading)으로 결과를 만들고 연이·영냥이 화자로 웹툰 컷을 그린다.
// 화자 전환 링크 문구는 개발 화면이라 번역하지 않는다.
import { useEffect, useMemo, useState } from 'react';
import NarratorWebtoon from '@/app/components/webtoon/NarratorWebtoon';
import type { WebtoonCut } from '@/app/components/webtoon/CutReader';
import { useGuidedT } from '@/app/components/guided-flow/useGuidedT';
import { buildTarotWebtoon } from '@/lib/webtoon-result/narrator.mjs';
import { buildMasterReading } from '@/js/core/tarot/master-reading.mjs';
import { DAILY_MEANINGS, DAILY_POSITIONS } from '@/lib/tarot/daily-three.mjs';

export type DemoCard = { id: number; code: string; name: string; reversed: boolean; sources: string[] };
type Narrator = 'yeoni' | 'yeongnyangi';
type Master = { verdict: string; positions: { text: string }[]; synthesis: { flow: string; caution: string; action: string }; close: string; arc?: string };

export default function WebtoonResultDemo({ cards }: { cards: DemoCard[] }) {
  const t = useGuidedT();
  const [narrator, setNarrator] = useState<Narrator>('yeoni');
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('narrator');
    if (value === 'yeongnyangi') setNarrator(value);
  }, []);
  const webtoon = useMemo(() => {
    const build = buildMasterReading as unknown as (input: unknown) => Master;
    const master = build({
      cards: cards.map((card) => ({ code: card.code, reversed: card.reversed })),
      category: 'daily', surface: 'today', positions: DAILY_POSITIONS,
      positionTexts: cards.map((card, index) => DAILY_MEANINGS[card.id][index]),
    });
    return buildTarotWebtoon({
      narrator, t, seedKey: `demo:${cards.map((card) => card.code).join(',')}`,
      cards: cards.map((card, index) => ({
        position: DAILY_POSITIONS[index], name: card.name, code: card.code, reversed: card.reversed,
        text: master.positions[index]?.text ?? '', image: { src: card.sources[0] ?? '', fallbacks: card.sources.slice(1), w: 480, h: 720 },
      })),
      verdict: master.verdict, synthesis: master.synthesis, close: master.close, arc: master.arc,
    });
  }, [cards, narrator, t]);
  return <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px' }}>
    <nav style={{ display: 'flex', gap: 8, marginBottom: 12 }} aria-label="화자">
      {(['yeoni', 'yeongnyangi'] as const).map((id) => <a key={id} href={`?narrator=${id}`} className="cd-btn cd-btn--secondary"
        aria-current={id === narrator ? 'page' : undefined}>{id}</a>)}
    </nav>
    <NarratorWebtoon key={narrator} cuts={webtoon.cuts as WebtoonCut[]} narrator={narrator} flowId="dev-webtoon-result" labels={{
      toolbar: t('webtoon.toolbarLabel'), textOnly: t('webtoon.textOnly'), fontSize: t('webtoon.fontSize'),
      fontBase: t('webtoon.fontBase'), fontLarge: t('webtoon.fontLarge'), progress: t('webtoon.progressLabel'),
      reader: t('webtoon.readerLabel', { name: t(`webtoon.${narrator}.name`) }),
    }} />
  </div>;
}
