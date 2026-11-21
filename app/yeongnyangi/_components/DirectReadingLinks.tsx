import {ArrowRight,BookOpen,Moon} from 'lucide-react';
import {domainEntries,type DomainId} from '../_home/domain-registry';
import styles from './direct-reading-links.module.css';

export default function DirectReadingLinks({locale='ko',title='운세 종류 바로 고르기',localizedLabel}:{
 locale?:string;title?:string;localizedLabel?:(id:DomainId)=>string;
}){
 return <nav className={styles.menu} aria-labelledby="yn-direct-readings-title">
  <h2 id="yn-direct-readings-title"><Moon size={18} aria-hidden="true"/>{title}</h2>
  <ul>{domainEntries.map(({domain,label,paidEntry})=><li key={domain}>
   <a href={locale==='ko'?paidEntry.href:paidEntry.href+'&lang='+encodeURIComponent(locale)}>
    <span>{localizedLabel?.(domain)||label}</span><ArrowRight size={15} aria-hidden="true"/>
   </a>
  </li>)}</ul>
  {locale==='ko'&&<a className={styles.samples} href="#yn-example"><BookOpen size={17} aria-hidden="true"/>상담 예시 먼저 보기</a>}
 </nav>;
}
