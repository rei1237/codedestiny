'use client';
import ZiweiPalaceGrid from '@/app/components/ziwei/ZiweiPalaceGrid';
import type {ReadingChart,ReadingZiweiPalace,ReadingZiweiStar} from '@/worker/yeongnyangi/fortune/reading-presentation';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {chartCopy} from '../_lib/reading-chart-copy';
import {GRADE_LEGEND,HUA_GLYPH,gradeGlyph,gradeText,huaText,ziweiChartCopy} from '../_lib/ziwei-chart-copy';
import styles from './ziwei-reading-chart.module.css';

/**
 * 자미 명반 — 영냥이 책(ReadingCharts)과 연이/네오 상담 결과(ConsultationResult)가 같이 쓴다.
 * 등급·사화는 글자(廟…陷·祿權科忌)로 구분한다. 색으로 좋고 나쁨을 나타내지 않는다.
 * 칸 안에 span 을 두지 않는다 — .book .chart button span 규칙이 칸 글자를 덮는다(reading-v5.module.css).
 */
type ZiweiGroup=ReadingChart['groups'][number]&{ziwei:ReadingZiweiPalace};
type Copy=ReturnType<typeof ziweiChartCopy>;

/** 열두 궁이 모두 서로 다른 지지로 표시될 때만 명반을 그린다. 아니면 null — 쓰는 쪽은 기존 목록을 그대로 쓴다. */
export function ziweiGroups(chart?:ReadingChart|null):ZiweiGroup[]|null{
 if(!chart||chart.domain!=='ziwei')return null;
 const cells=chart.groups.filter(g=>g.kind!=='timing');
 if(!cells.every((g):g is ZiweiGroup=>!!g.ziwei))return null;
 return new Set(cells.map(g=>g.ziwei.branch)).size===12&&cells.length===12?cells:null;
}

const cellLabel=(z:ReadingZiweiPalace,copy:Copy)=>{
 const main=z.stars.filter(s=>s.kind==='main').map(s=>[s.name,s.grade,s.hua].filter(Boolean).join(' '));
 return `${z.name}${z.body?`, ${copy.body}`:''}: ${main.join(', ')||copy.noMainShort}`;
};

function Star({s,copy,lang}:{s:ReadingZiweiStar;copy:Copy;lang?:string}){
 const grade=gradeText(copy,s.grade),hua=huaText(copy,s.hua);
 return <li><div className={styles.star}><b lang={lang}>{s.name}</b>{s.hanja&&<small>{s.hanja}</small>}{s.gradeHanja&&<strong className={styles.grade}>{s.gradeHanja}{lang?'':` · ${s.grade}`}</strong>}{hua&&<em className={styles.tag}>{hua}</em>}{s.basis&&s.basis!=='classical'&&<em className={styles.tag}>{copy.modern}</em>}</div>
  {grade&&<p>{grade}</p>}</li>;
}

export default function ZiweiReadingChart({groups,selected,onSelect,available,titles,locale}:{groups:ZiweiGroup[];selected?:string;onSelect:(id:string)=>void;available:Set<string>;titles:Record<string,string>;locale?:ReadingLocale}){
 const copy=ziweiChartCopy(locale),base=chartCopy(locale),lang=!locale||locale==='ko'?undefined:'ko';
 const group=groups.find(g=>g.id===selected)||groups[0],p=group.ziwei;
 const related=group.chapterIds.filter(id=>available.has(id));
 return <div className={styles.root}>
  <ZiweiPalaceGrid className={styles.grid} role="group" aria-label={copy.select} cells={groups} branchOf={g=>g.ziwei.branch}
   renderCell={(g,area)=><button type="button" key={g.id} style={area} className={styles.cell} aria-pressed={g.id===group.id} aria-label={cellLabel(g.ziwei,copy)} onClick={()=>onSelect(g.id)}>
    <b lang={lang}>{g.ziwei.name}{g.ziwei.body&&<i>身</i>}</b>
    {g.ziwei.stars.some(s=>s.kind==='main')?g.ziwei.stars.filter(s=>s.kind==='main').map(s=><small key={s.name} lang={lang}>{s.name}{gradeGlyph(s.gradeHanja)&&<em>{gradeGlyph(s.gradeHanja)}</em>}{s.hua&&HUA_GLYPH[s.hua]&&<em>{HUA_GLYPH[s.hua]}</em>}</small>):<small aria-hidden="true">—</small>}
   </button>}
   center={area=><div style={area} className={styles.center}><b>{copy.chart}</b><p className={styles.glyphs}>{GRADE_LEGEND}</p><p>{copy.legend}</p></div>}/>
  <div className={styles.detail} aria-live="polite">
   <h4><b lang={lang}>{p.name}</b>{p.hanja&&<small>{p.hanja}</small>}{p.body&&<em className={styles.tag}>{copy.body}</em>}</h4>
   {(['main','assistant','malefic'] as const).map(kind=>{
    const stars=p.stars.filter(s=>s.kind===kind);
    if(kind!=='main'&&!stars.length)return null;
    return <section key={kind}><h5>{copy.kinds[kind]}</h5>{stars.length?<ul>{stars.map(s=><Star key={s.name} s={s} copy={copy} lang={lang}/>)}</ul>:<p>{copy.noMain}</p>}</section>;
   })}
   {related.length?<div className={styles.related}><p>{base.related}</p>{related.slice(0,2).map(id=><a key={id} href={`#chapter-${id}`}>{titles[id]}</a>)}{related.length>2&&<details><summary>{base.more(related.length-2)}</summary>{related.slice(2).map(id=><a key={id} href={`#chapter-${id}`}>{titles[id]}</a>)}</details>}</div>:<p>{base.empty}</p>}
   <details className={styles.how}><summary>{copy.howTitle}</summary>{copy.how.map((text,i)=><p key={i}>{text}</p>)}
    {!lang&&p.notes.length>0&&<><h5>{copy.notes}</h5><ul>{p.notes.map((note,i)=><li key={i}>{note}</li>)}</ul></>}
   </details>
  </div>
 </div>;
}

/** 소절 옆 궁 강조. 명반이 있으면 작은 위치 격자를, 없으면 글자 설명만 둔다. 궁 이름은 늘 글자로 함께 적는다. */
export function ZiweiBlockHint({palaces,chart,locale}:{palaces?:string[];chart?:ReadingChart|null;locale?:ReadingLocale}){
 if(!palaces?.length)return null;
 const copy=ziweiChartCopy(locale),groups=ziweiGroups(chart),on=new Set(palaces);
 return <figure className={styles.hint}>
  {groups&&<ZiweiPalaceGrid className={styles.mini} aria-hidden="true" cells={groups} branchOf={g=>g.ziwei.branch} renderCell={(g,area)=><i key={g.id} style={area} data-on={on.has(g.ziwei.name)||undefined}/>}/>}
  <figcaption>{copy.hint}: <b lang={!locale||locale==='ko'?undefined:'ko'}>{palaces.join(' · ')}</b></figcaption>
 </figure>;
}
