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
      <Image src="/images/yeoni/welcome/yeoni-mark-v1-96.webp" width={36} height={36} alt="" />
      <span>처음 오셨나요? <strong>연이의 이용 안내 웹툰</strong></span><span aria-hidden="true">›</span>
    </button>
    <dialog ref={dialog} className={styles.reader} aria-labelledby="moonlight-reader-title"
      onClose={finish}>
      {open && <>
        <header className={styles.bar}><span>연이의 달빛 길잡이</span><button type="button" autoFocus onClick={() => dismiss()}>닫기</button></header>
        <article className={styles.story}>
          <h2 id="moonlight-reader-title">연이야, 먼저 연락해도 될까?</h2>
          {moonlightPanels.map(panel => <section key={panel.art} className={styles.panel} aria-label={panel.title}>
            <Image src={'/images/moonlight-guide/' + panel.art + '.webp'} width={508} height={508}
              alt={panel.alt} loading={panel.art === '1' ? 'eager' : 'lazy'} />
            {panel.label && <strong className={styles.tag}>{panel.label}</strong>}
            {panel.guest && <p className={styles.guest}><b>손님</b>{panel.guest}</p>}
            <p className={styles.bubble}><b>꽃돼지 연이</b>{panel.yeoni}</p>
            {panel.link && <a href={panel.link.href} target="_blank" rel="noreferrer">{panel.link.text} <small>(새 창)</small></a>}
          </section>)}
          <button className={styles.write} onClick={() => dismiss(true)}>내 질문 써보기</button>
        </article>
      </>}
    </dialog>
  </>;
}
