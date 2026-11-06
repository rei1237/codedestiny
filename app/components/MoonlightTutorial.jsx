'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { moonlightPanels } from '../../lib/brand/moonlight-guide.mjs';
import styles from './moonlight-tutorial.module.css';

export default function MoonlightTutorial({ questionInput }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  const trigger = useRef(null);
  const returnToQuestion = useRef(false);

  // NavigationProvider already handles browser and native back for open HTML dialogs.

  useEffect(() => {
    if (!open) return;
    const reader = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    reader.showModal();
    reader.scrollTop = 0;
    return () => {
      reader.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function dismiss(toQuestion = false) {
    returnToQuestion.current = toQuestion;
    dialog.current.close();
  }

  function finish() {
    if (dialog.current?.open) return;
    setOpen(false);
    const target = returnToQuestion.current ? questionInput.current : trigger.current;
    returnToQuestion.current = false;
    target?.focus();
  }

  return <>
    <button type="button" ref={trigger} className={styles.trigger} onClick={() => setOpen(true)} aria-haspopup="dialog">
      <picture>
        <source media="(max-width:699px)" srcSet="/images/home/mv/ornament-lotus-crest-160.webp"/>
        <img src="/images/moonlight-guide/question.webp" width="627" height="627" loading="lazy" decoding="async" alt=""/>
      </picture>
      <span><small>연이와 영냥이의 달빛 길잡이</small><strong>이용 안내 웹툰 읽기 <span aria-hidden="true">→</span></strong></span>
    </button>
    <dialog ref={dialog} className={styles.reader} aria-labelledby="moonlight-reader-title"
      onClose={finish}>
      {open && <>
        <header className={styles.bar}><span>꿀꿀 운세 이용 안내</span><button type="button" autoFocus onClick={() => dismiss()}>닫기</button></header>
        <article className={styles.story}>
          <h2 id="moonlight-reader-title">달빛 아래, 어디서 시작할까요?</h2>
          {moonlightPanels.map(panel => <section key={panel.art} className={styles.panel} aria-label={panel.title}>
            <Image src={'/images/moonlight-guide/' + panel.art + '.webp'} width={508} height={508}
              alt={panel.alt} loading={panel.art === 'question' ? 'eager' : 'lazy'} />
            <h3>{panel.title}</h3>
            <p className={styles.bubble}><b>{panel.speaker}</b>{panel.line}</p>
            {panel.link && <a href={panel.link.href} target="_blank" rel="noreferrer">{panel.link.text} <small>(새 창)</small></a>}
          </section>)}
          <button className={styles.write} onClick={() => dismiss(true)}>내 질문 써보기</button>
        </article>
      </>}
    </dialog>
  </>;
}
