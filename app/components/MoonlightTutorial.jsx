'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { moonlightPanels } from '../../lib/brand/moonlight-guide.mjs';
import styles from './moonlight-tutorial.module.css';

export default function MoonlightTutorial({ onWrite }) {
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
    const write = returnToQuestion.current;
    returnToQuestion.current = false;
    if (write) onWrite();
    else trigger.current?.focus();
  }

  return <>
    <button type="button" ref={trigger} className={styles.trigger} onClick={() => setOpen(true)} aria-haspopup="dialog">
      <picture>
        <img src="/images/moonlight-guide/question.webp" srcSet="/images/moonlight-guide/question-320.webp 320w, /images/moonlight-guide/question.webp 627w" sizes="(max-width:699px) min(44vw, 195px), 165px" width="627" height="627" decoding="async" alt=""/>
      </picture>
      <span><small>처음 오셨나요?</small><strong>이용 안내 웹툰 보기<span className={styles.guideArrow} aria-hidden="true">→</span></strong></span>
    </button>
    <dialog ref={dialog} className={styles.reader} aria-labelledby="moonlight-reader-title"
      onClose={finish}>
      {open && <>
        <header className={styles.bar}><span>꿀꿀 운세 이용 안내</span><button type="button" autoFocus onClick={() => dismiss()}>닫기</button></header>
        <article className={styles.story}>
          <h2 id="moonlight-reader-title">달빛 아래, 어디서 시작할까요?</h2>
          {moonlightPanels.map((panel, index) => <section key={panel.art} className={styles.panel} aria-label={panel.title}>
            {panel.img
              ? <picture>
                <source type="image/avif" srcSet={panel.img.widths.map(w => panel.img.avif + '-' + w + '.avif ' + w + 'w').join(', ')} sizes="(max-width:560px) calc(100vw - 32px), 508px" />
                <img src={panel.img.src} width={panel.img.w || 508} height={panel.img.h || 508} alt={panel.alt} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
              </picture>
              : <Image src={'/images/moonlight-guide/' + panel.art + '.webp'} width={508} height={508}
                alt={panel.alt} loading={index === 0 ? 'eager' : 'lazy'} />}
            <h3>{panel.title}</h3>
            {panel.lines.map(([speaker, text]) => <p key={text} className={styles.bubble} data-cat={speaker === '영냥이' ? '' : undefined}><b>{speaker}</b>{text}</p>)}
            {panel.link && <a href={panel.link.href} target="_blank" rel="noreferrer">{panel.link.text} <small>(새 창)</small></a>}
          </section>)}
          <button className={styles.write} onClick={() => dismiss(true)}>내 질문 써보기</button>
        </article>
      </>}
    </dialog>
  </>;
}
