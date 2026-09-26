import type {ChapterBody,ChapterSpec} from '@/worker/yeongnyangi/fortune/book-contracts';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {visualCopy,chartTerm} from '../_lib/reading-chart-copy';
import {artSrc,expressionSrc,type Art,type Expression,type TimingRow,type ElementRow} from '../_lib/reading-visuals';
import {Divider,ElementIcon,Paw,ThemeIcon,elementColor} from './ReadingIcons';
import styles from './reading-visuals.module.css';

// Static presentation for long readings, drawn only from the saved chapters and calculation snapshot.
export function AtAGlance({manifest,chapters,title,locale}:{manifest:ChapterSpec[];chapters:ChapterBody[];title:(i:number)=>string;locale?:ReadingLocale}){
 const copy=visualCopy(locale);
 return <section className={styles.panel} aria-labelledby="reading-glance">
  <h2 id="reading-glance" className={styles.panelTitle}><Paw size={18}/>{copy.glance}</h2><p className={styles.caption}>{copy.glanceCaption}</p>
  <div className={styles.tableWrap}><table className={styles.table}>
   <thead><tr><th scope="col">{copy.chapterCol}</th><th scope="col">{copy.themeCol}</th><th scope="col">{copy.pointCol}</th></tr></thead>
   <tbody>{chapters.map((chapter,i)=><tr key={manifest[i].id}>
    <td className={styles.num}>{i+1}</td>
    <td><span className={styles.theme}><ThemeIcon theme={manifest[i].theme}/>{copy.themes[manifest[i].theme] || manifest[i].theme}</span></td>
    <td><a href={`#chapter-${manifest[i].id}`}>{title(i)}</a><span className={styles.point}>{chapter.highlights?.[0] || chapter.summary}</span></td>
   </tr>)}</tbody>
  </table></div>
 </section>;
}

export function TimingTimeline({rows,locale}:{rows:TimingRow[];locale?:ReadingLocale}){
 const copy=visualCopy(locale);
 const drawn=rows.filter(r=>r.from!==undefined&&r.to!==undefined);
 const min=Math.floor(Math.min(...drawn.map(r=>r.from!))),max=Math.ceil(Math.max(...drawn.map(r=>r.to!)));
 const span=Math.max(1,max-min),now=new Date(),current=now.getFullYear()+now.getMonth()/12;
 const pos=(v:number)=>`${((v-min)/span*100).toFixed(2)}%`;
 return <section className={styles.panel} aria-labelledby="reading-timeline">
  <div className={styles.panelHead}><div><h3 id="reading-timeline" className={styles.panelTitle}><ThemeIcon theme="timing" size={18}/>{copy.timeline}</h3><p className={styles.caption}>{copy.timelineCaption}</p></div>
   <img className={styles.headArt} src={artSrc('timeline')} alt="" width={180} height={120} loading="lazy" decoding="async"/></div>
  {drawn.length>0&&<div className={styles.timeline} aria-hidden="true">
   <div className={styles.axis}><span>{min}</span><span>{max}</span></div>
   {drawn.map(r=><div key={r.id} className={styles.track}><span className={styles.trackLabel}>{chartTerm(r.label,locale)}</span>
    <span className={styles.bar} data-now={r.now || undefined} style={{left:pos(r.from!),width:`calc(${pos(r.to!)} - ${pos(r.from!)})`}}/></div>)}
   {current>=min&&current<=max&&<span className={styles.nowLine} style={{left:pos(current)}}><span>{copy.now}</span></span>}
  </div>}
  <div className={styles.tableWrap}><table className={styles.table}>
   <thead><tr><th scope="col">{copy.periodCol}</th><th scope="col">{copy.rangeCol}</th></tr></thead>
   <tbody>{rows.map(r=><tr key={r.id} data-now={r.now || undefined}><td>{chartTerm(r.label,locale)}{r.now&&<strong className={styles.nowBadge}>{copy.now}</strong>}</td>
    <td>{r.from!==undefined?`${r.start} – ${r.end}`:copy.noRange}</td></tr>)}</tbody>
  </table></div>
 </section>;
}

export function SajuBoard({pillars,elements,locale}:{pillars:{label:string;ganji:string;tenGod:string}[];elements:ElementRow[];locale?:ReadingLocale}){
 const copy=visualCopy(locale);
 const total=Math.max(1,elements.reduce((n,e)=>n+e.value,0)),top=Math.max(1,...elements.map(e=>e.value));
 return <section className={styles.panel} aria-labelledby="reading-saju-board">
  <div className={styles.panelHead}><h3 id="reading-saju-board" className={styles.panelTitle}><ElementIcon element="토" size={20}/>{copy.pillars}</h3>
   <img className={styles.headArt} src={artSrc('balance')} alt="" width={180} height={120} loading="lazy" decoding="async"/></div>
  {pillars.some(p=>p.ganji)&&<div className={styles.tableWrap}><table className={`${styles.table} ${styles.pillars}`}>
   <thead><tr><td/>{pillars.map(p=><th scope="col" key={p.label}>{copy.pillarNames[p.label] || p.label}</th>)}</tr></thead>
   <tbody><tr><th scope="row">{copy.pillarRow}</th>{pillars.map(p=><td key={p.label} className={styles.ganji} lang="zh-Hant">{p.ganji}</td>)}</tr>
    <tr><th scope="row">{copy.tenGodRow}</th>{pillars.map(p=><td key={p.label}>{chartTerm(p.tenGod,locale)}</td>)}</tr></tbody>
  </table></div>}
  {elements.length>0&&<><h4 className={styles.subTitle}>{copy.elements}</h4><p className={styles.caption}>{copy.elementsCaption}</p>
   <ul className={styles.elements}>{elements.map(e=><li key={e.label}>
    <span className={styles.elementName}><ElementIcon element={e.label}/>{chartTerm(e.label,locale)}</span>
    <span className={styles.elementTrack} role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={e.value} aria-label={copy.elementCount(chartTerm(e.label,locale),e.value)}>
     <span style={{width:`${e.value/top*100}%`,background:elementColor[e.label] || 'var(--gold)'}}/></span>
    <span className={styles.elementValue}>{e.value}</span></li>)}</ul></>}
 </section>;
}

export function KeyPoints({items,locale}:{items:string[];locale?:ReadingLocale}){
 return <aside className={styles.keyPoints} aria-label={visualCopy(locale).keyPoints}><h3 className={styles.keyTitle}><Paw size={16}/>{visualCopy(locale).keyPoints}</h3>
  <ul>{items.map((t,i)=><li key={i}><Paw size={12} className={styles.bullet}/>{t}</li>)}</ul></aside>;
}

export function AnswerTable({rows,label}:{rows:[string,string][];label:string}){
 return <div className={styles.tableWrap}><table className={`${styles.table} ${styles.answer}`} aria-label={label}>
  <tbody>{rows.map(([head,text])=><tr key={head}><th scope="row">{head}</th><td>{text}</td></tr>)}</tbody>
 </table></div>;
}

export function MascotBubble({expression,text,locale}:{expression:Expression;text:string;locale?:ReadingLocale}){
 return <figure className={styles.bubble}><img className={styles.badge} src={expressionSrc(expression)} alt="" width={64} height={64} loading="lazy" decoding="async"/>
  <blockquote><span className={styles.says}>{visualCopy(locale).says}</span>{text}</blockquote></figure>;
}

export function Interlude({art}:{art:Art}){
 return <figure className={styles.interlude} aria-hidden="true"><img src={artSrc(art)} alt="" width={720} height={480} loading="lazy" decoding="async"/><Divider className={styles.divider}/></figure>;
}
