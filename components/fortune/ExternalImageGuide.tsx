'use client';
import {useMemo, useState} from 'react';
import {buildExternalImagePrompt, chatgptUrl, reportGuideAssets, reportGuideCopy} from '@/js/core/fortune-report-content.mjs';
import styles from './external-image-guide.module.css';

export type ReportEvidence = {label:string; items:{label:string; value:string}[]};
type Props = {brand:'yeongnyangi'|'ggulggul'; domain:string; locale?:string; groups?:ReportEvidence[]; passages:string[]; notes?:string[]; children?:React.ReactNode};

export default function ExternalImageGuide({brand,domain,locale='ko',groups=[],passages,notes=[],children}:Props) {
  const text = reportGuideCopy(locale,domain);
  const sourcePrompt = useMemo(() => buildExternalImagePrompt({brand,domain,locale,groups,passages,notes}), [brand,domain,locale,groups,passages,notes]);
  const art = reportGuideAssets[brand];
  return <section className={styles.guide} data-brand={brand} data-external-image-guide lang={text.locale}>
    <header className={styles.heading}>
      <div className={styles.headingCopy}><h2>{text.title}</h2><p className={styles.intro}>{text.guide}</p></div>
      <img src={art.image} width={240} height={240} alt="" loading="lazy"/>
    </header>
    <p className={styles.source}>{text.source}</p>
    <div className={styles.ornament} aria-hidden="true"/>
    <section className={styles.evidence}>
      <h3>{text.evidence}</h3>
      {groups.length ? groups.map((group,index) => <div className={styles.group} key={index}>
        <h4>{group.label}</h4><dl>{group.items.map((item,i) => <div key={i}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
      </div>) : <p>{text.missing}</p>}
    </section>
    {notes.map((note,index) => <p className={styles.source} key={index}>{note}</p>)}
    <section className={styles.reading}><h3>{text.reading}</h3>{passages.slice(0,4).map((passage,index) => <p key={index}>{passage}</p>)}</section>
    {/* A new source remounts the editor, keeping private text tied to its own result. */}
    <PromptEditor key={sourcePrompt} source={sourcePrompt} text={text} download={art.download} brand={brand}/>
    {children}
  </section>;
}
function PromptEditor({source,text,download,brand}:{source:string;text:ReturnType<typeof reportGuideCopy>;download:string;brand:string}) {
  const [prompt,setPrompt] = useState(source);
  const [status,setStatus] = useState('');
  async function copy(done = text.copied) {
    try { await navigator.clipboard.writeText(prompt); setStatus(done); }
    catch { setStatus(text.error); }
  }
  return <section className={styles.prompt}>
    <h3>{text.prompt}</h3><p>{text.privacy}</p>
    <div className={styles.recommend} data-chatgpt-recommend>
      <p className={styles.recommendHead}><span className={styles.chip}>{text.chip}</span><strong>{text.recommend}</strong></p>
      <p className={styles.why}>{text.why}</p>
      <ol className={styles.steps}>{text.steps.map((step,index) => <li key={index}>{step}</li>)}</ol>
      {/* Copy inside the same click so the clipboard keeps the gesture; the link itself opens ChatGPT without putting private text in a URL. */}
      <a className={styles.openChatgpt} href={chatgptUrl} target="_blank" rel="noopener noreferrer" onClick={()=>void copy(text.copiedOpen)}>
        <span>{text.open}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M8 4h8v8M16 4 5 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </a>
    </div>
    <details><summary>{text.edit}</summary><textarea aria-label={text.prompt} value={prompt} onChange={event=>setPrompt(event.target.value)} spellCheck={false}/></details>
    <div className={styles.actions}>
      <button type="button" onClick={()=>void copy()}>{text.copy}</button>
      <a href={download} download={`${brand}-character.png`}>{text.asset}</a>
    </div>
    <p className={styles.status} role="status" aria-live="polite">{status}</p>
  </section>;
}
