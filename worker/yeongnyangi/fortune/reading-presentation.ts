import { getTarotCardImageUrl } from '../../../src/features/fortune-tea-house/lib/tarotCardImageMap';
import type { ChapterSpec, MasterAnalysis } from './book-contracts';
import type { ChartView } from './charts';
import type { DomainContext, DomainId } from './shared/contracts';
import { selectChapterFacts } from './chapter-facts';

export interface ReadingChart extends ChartView {
  groups: (ChartView['groups'][number] & {id:string;chapterIds:string[];longitude?:number;kind?:'timing'})[];
  cusps?: number[];
}
const names:Record<string,string>={Sun:'태양',Moon:'달',Mercury:'수성',Venus:'금성',Mars:'화성',Jupiter:'목성',Saturn:'토성',Uranus:'천왕성',Neptune:'해왕성',Pluto:'명왕성',Rahu:'라후',Ketu:'케투',Aries:'양자리',Taurus:'황소자리',Gemini:'쌍둥이자리',Cancer:'게자리',Leo:'사자자리',Virgo:'처녀자리',Libra:'천칭자리',Scorpio:'전갈자리',Sagittarius:'사수자리',Capricorn:'염소자리',Aquarius:'물병자리',Pisces:'물고기자리',conjunction:'합',opposition:'충',trine:'삼분각',square:'사각',sextile:'육분각',wood:'목',fire:'화',earth:'토',metal:'금',water:'수'};
function text(value:unknown):string {
  if(value===null||value===undefined)return '자료 없음';
  if(Array.isArray(value))return value.map(text).join(' · ')||'없음';
  if(typeof value==='object'){
    const v=value as Record<string,unknown>;
    return text(v.nameKo ?? v.nameKr ?? v.name ?? v.sign ?? v.ganji ?? null);
  }
  return names[String(value)] || String(value);
}
const titles:Record<DomainId,string>={saju:'나의 사주와 오행',ziwei:'열두 궁에 담긴 삶',sukuyo:'별 사이의 관계',vedic:'라시 차트와 별의 주기',astrology:'나의 출생 차트',tarot:'질문 위에 펼친 카드'};

// Presentation is derived only from an owned saved snapshot, never a fresh calculation.
// Explicitly project display fields; raw birth data and internal prompt objects stay private.
export function readingCharts(analysis:MasterAnalysis,manifest:ChapterSpec[]):ReadingChart[]{
  return Object.values(analysis.contexts || {}).map((context:DomainContext)=>{
    const d=context.domain;
    const f=Object.fromEntries(context.facts.map(f=>[f.label,f.value])) as Record<string,any>;
    const selected=manifest.map(chapter=>({chapter,facts:(!chapter.systems||chapter.systems.includes(d))?selectChapterFacts(context,chapter,analysis.topicId):[]}));
    const groups:ReadingChart['groups']=[];
    function add(key:string,label:string,items:{label:string;value:string}[],extra:Partial<ReadingChart['groups'][number]>={},palace?:string){
      const related=selected.filter(s=>s.facts.some(f=>f.label===key && (!palace || (f.value as any)?.palaces?.some((p:any)=>p.name===palace))));
      groups.push({id:`${d}-${groups.length}`,label,items,chapterIds:related.map(s=>s.chapter.id),...extra});
    }
    if(d==='saju'){
      for(const [key,label] of Object.entries({year:'년주',month:'월주',day:'일주',hour:'시주'}))add('pillars',label,[{label:'천간·지지',value:text(f.pillars?.[key])},{label:'천간 십성',value:text(f.tenGodsByPillar?.[key]?.stemTenGod)}]);
      add('fiveElements','오행 분포 · 월령 가중치 포함',Object.entries(f.fiveElements?.counts || f.fiveElements || {}).filter(([,v])=>typeof v==='number').map(([k,v])=>({label:text(k),value:text(v)})));
    }else if(d==='ziwei'){
      for(const p of f.palaces || [])add('palaces',`${p.name}${p.name===f.bodyPalace?' · 신궁':''}`,[{label:'주성',value:text(p.mainStars)},{label:'보조성',value:text(p.assistantStars)},{label:'긴장 요소',value:text(p.maleficStars)}],{},p.name);
    }else if(d==='sukuyo'){
      for(const [key,label] of [['personA','나의 본명숙'],['personB','상대의 본명숙']])if(f[key])add(key,label,[{label:'숙',value:text(f[key].nameKo || f[key].name || f[key].mansion?.name)},{label:'27숙 위치',value:Number.isInteger(f[key].index)?String(f[key].index+1):'자료 없음'}]);
      if(f.relation)add('relation','두 사람의 흐름',[{label:'관계',value:text(f.relation.relationType)},{label:'나의 역할',value:text(f.relation.aRole)},{label:'상대의 역할',value:text(f.relation.bRole)},{label:'정방향 / 역방향 거리',value:`${text(f.forwardDistance)} / ${text(f.reverseDistance)}`},{label:'거리의 결',value:text(f.distanceLabel)}]);
    }else if(d==='vedic'){
      const signs=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
      for(const sign of signs)add('planets',text(sign)+(f.lagna?.sign===sign?' · 라그나':''),(f.planets || []).filter((p:any)=>p.sign===sign).map((p:any)=>({label:text(p.nameKo || p.name),value:`${text(p.house)}하우스`})));
      add('moon','달의 자리',[{label:'나크샤트라',value:text(f.moon?.nakshatra)},{label:'파다',value:text(f.moon?.pada)}]);
    }else if(d==='astrology'){
      for(const [key,p] of Object.entries(f.planets || {}) as [string,any][])add('planets',text(key),[{label:'별자리',value:text(p.signKo ?? p.sign)},{label:'하우스',value:text(p.house)},{label:'황경',value:typeof p.longitude==='number'?`${p.longitude}°`:'자료 없음'}],{longitude:typeof p.longitude==='number'?p.longitude:undefined});
      add('ascendant','상승점',[{label:'별자리',value:text(f.ascendant?.signKo ?? f.ascendant?.sign)}]);
      for(const a of f.aspects || [])add('aspects',`${text(a.planet1 || a.p1)} · ${text(a.planet2 || a.p2)}`,[{label:'각',value:text(a.type || a.aspect)},{label:'오브',value:text(a.orb)}]);
    }else{
      for(const card of f.cards || [])add('cards',card.positionLabel || ({cause:'원인',process:'과정',outcome:'결과',current:'현재',inner:'내면',obstacle:'장애물',external:'주변 영향',choice:'선택',action:'행동',self_view_of_other:'내가 바라보는 상대',other_view_of_relationship:'관계에 대한 상대의 시선',other_feeling_toward_me:'상대 감정의 가능성',other_romantic_will:'다가올 의지의 가능성',core_block:'관계의 핵심 장애물',short_term_outcome:'가까운 선택의 방향'} as Record<string,string>)[card.positionKey] || '카드의 자리',[{label:'카드',value:text(card.nameKr || card.nameKo || card.name)},{label:'방향',value:card.orientation==='reversed'?'역방향':'정방향'}],{image:getTarotCardImageUrl(card) || undefined,reversed:card.orientation==='reversed'});
    }
    // Only expose timing already selected under this purchase's tier policy.
    const timing=new Map(selected.flatMap(s=>s.facts).filter(f=>['majorLuck','yearlyLuck','vimshottariDasha'].includes(f.label)).map(f=>[JSON.stringify(f),f]));
    const periods=new Set<string>();
    for(const fact of timing.values()){
      const key=fact.label;
      const value=fact.value as any;
      const rows=key==='vimshottariDasha'?[value.currentMahadasha,value.currentAntardasha,...(value.periods || [])]:key==='majorLuck'?[value.currentCycle,...(value.cycles || [])]:Array.isArray(value)?value:[value];
      for(const r of rows.filter(Boolean)){
       const periodKey=JSON.stringify(r);if(periods.has(periodKey))continue;periods.add(periodKey);
       add(key,'계산된 시기 · '+text(r.lord || r.planet || r.ganji || r.pillar || r.year),[{label:'주기',value:text(r.lord || r.planet || r.ganji || r.pillar || r.year)},{label:'시작',value:text(r.startDate || r.startYear || r.startAge)},{label:'끝',value:text(r.endDate || r.endYear || r.endAge)}],{kind:'timing'});
      }
    }
    return {domain:d,title:titles[d],groups,limitations:context.limitations,source:d==='tarot'?'서버에 저장된 카드 배열':'구매 당시 저장된 계산 근거',...(d==='astrology'?{cusps:Array.isArray(f.houseCusps)?f.houseCusps.filter((n:unknown)=>typeof n==='number'):[]}: {})};
  });
}
