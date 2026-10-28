"use client";
import { recordReaderCopy } from '@/lib/records/reader-copy';

import { useId } from 'react';
import AiResultProse from '@/components/fortune/AiResultProse';
import { sanitizePublicInsightHtml } from '@/app/insights/_lib/sanitizePublicHtml';
import { readingSections } from '@/lib/records/reading-content';
import { useLocale } from '@/lib/i18n/useT';
import { recordsCopy } from '@/lib/records/copy';
import styles from './saved-reading.module.css';

export function SavedText({ text }: { text: string }) {
  if (/<(?:p|h[1-6]|table|article|section|div|ul|br)\b/i.test(text)) return <div className={styles.html} dangerouslySetInnerHTML={{ __html: sanitizePublicInsightHtml(text, { tables: true }) }} />;
  return <AiResultProse value={text} />;
}
export function SavedChapters({ value, omit = [], fields = [], chapterClass = '', showEmpty = true, labels = {} }: { value:unknown; labels?:Record<string,string>; omit?:string[]; fields?:string[]; chapterClass?:string; showEmpty?:boolean }) {
  const locale = useLocale(), c = recordsCopy(locale), id = useId().replace(/:/g,'');
  const reader = recordReaderCopy(locale);
  const chapters = readingSections(value,{locale,omit,fields,labels});
  if (!chapters.length) return showEmpty ? <p className={styles.notice}>{c.noBody}</p> : null;
  return <div className={styles.chapters}>
    {chapters.length > 2 && <details className={styles.outline}><summary>{reader.contents}</summary><nav aria-label={reader.contentsLabel}>{chapters.map((chapter,index) => <a key={index} href={'#'+id+'-'+index}>{chapter.title}</a>)}</nav></details>}
    {chapters.map((chapter,index) => <section key={index} id={id+'-'+index} className={styles.chapter+' '+chapterClass}><h2>{chapter.title}</h2><SavedText text={chapter.body} /></section>)}
  </div>;
}

