import resultSamples from '@/lib/marketing/result-samples.json';

const tabs = [
  ['tarot', '타로', '마음과 선택'],
  ['saju', '사주', '오행과 성향'],
  ['ziwei', '자미두수', '별과 직업'],
  ['astrology', '점성술', '행성과 감정'],
  ['vedic', '베다점', '시기와 방향'],
  ['sukuyo', '숙요점', '관계와 거리'],
] as const;

export type ExampleReading = {
  key: typeof tabs[number][0]; label: string; theme: string; question: string;
  visual: string; visualAlt: string; href: string; receives: string;
} & ({kind:'result'; excerpts: readonly string[]} |
     {kind:'structure'; outline: readonly {title:string;text:string}[]; example:{title:string;text:string}});

export const readingSamples: ExampleReading[] = tabs.map(([key,label,theme])=>{
  const s=resultSamples.find(entry=>entry.id==='yn-'+key);
  if(!s?.visual||!s.visualAlt||!s.question)throw new Error(`Missing Yeongnyangi example media or question: ${key}`);
  const common={key,label,theme,question:s.question,visual:s.visual,visualAlt:s.visualAlt,href:s.href,receives:s.receives};
  if(s.kind==='result'&&s.excerpts&&s.excerpts.length>=(key==='tarot'?4:2))return {...common,kind:'result',excerpts:s.excerpts};
  const example=s.guide?.examples?.find(item=>item.kind==='editorial');
  if(s.kind==='structure'&&s.guide?.outline?.length&&example)return {...common,kind:'structure',outline:s.guide.outline,example};
  throw new Error(`Missing published Yeongnyangi example content: ${key}`);
});
