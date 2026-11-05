import Image from 'next/image';
import styles from './story-leaf.module.css';
export default function StoryLeaf({label,title,lines,portraits}:{label:string;title:string;lines:string[];portraits?:{name:string;avatar:string}[]}){return <header className={styles.leaf}><span>{label}</span>{portraits?.length ? <div className={styles.cast}>{portraits.map(master=><figure key={master.name}><Image unoptimized src={master.avatar} width={52} height={52} alt=""/><figcaption>{master.name}</figcaption></figure>)}</div> : null}<h2>{title}</h2>{lines.map(line=><p key={line}>{line}</p>)}</header>}
