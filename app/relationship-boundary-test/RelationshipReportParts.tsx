import Image from 'next/image';
import { chapterScene, gradeScene, type Grade } from './scenes';
import './relationship-boundary.css';
export function RelationshipReportHero({ grade, score, priority=false }: {grade:Grade;score:number;priority?:boolean}) {
 const hero=gradeScene(grade);
 const label=grade==='high'?'경계를 선명하게 할 때':grade==='medium'?'거리 조절을 살펴볼 때':'약속을 이어 가는 힘';
 return <figure className="rt-hero-scene"><Image src={hero.src} alt={hero.alt} width={hero.width} height={hero.height} sizes="(max-width: 760px) 100vw, 760px" priority={priority}/><figcaption className="rt-hero-overlay"><div className="rt-score-row"><div><p className="rt-score-label">관계 경계 지수</p><h2 className="rt-score-level">{label}</h2></div><div className="rt-score-number">{score}<small> / 100</small></div></div><div className="rt-gauge" role="meter" aria-label="관계 경계 지수" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}><span style={{width:score+'%'}}/></div></figcaption></figure>;
}
export function RelationshipReportChapters({sections,embedded=false}: {sections:{title:string;body:string}[];embedded?:boolean}) {
 return <div className="rt-reading">{sections.map((section,index)=>{const scene=embedded?null:chapterScene(index);return <section className="rt-reading-chapter" id={'relationship-chapter-'+index} style={{scrollMarginTop:'7rem'}} key={index}>{scene&&<figure className="rt-scene"><Image src={scene.src} alt={scene.alt} width={scene.width} height={scene.height} sizes="(max-width: 760px) 100vw, 760px" loading="lazy" decoding="async"/></figure>}<span className="rt-chapter-number">{String(index+1).padStart(2,'0')}</span><h2>{section.title}</h2>{!section.body&&<p>이 장면을 작성하고 있어요.</p>}{section.body.split(/\n\s*\n/).filter(Boolean).map((paragraph,i)=><p key={i}>{paragraph}</p>)}</section>;})}</div>;
}
