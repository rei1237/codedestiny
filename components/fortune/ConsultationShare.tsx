"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { Copy, Download, MessageCircle, Share2 } from 'lucide-react';
import { prepareKakao, shareThrough } from '@/js/share-service.mjs';
import { trackEvent } from '@/lib/analytics';
import { consultationShareBrands, consultationInvitationUrl, renderConsultationShareCard, trimShareText, type ConsultationShareBrand, type ConsultationShareChoice } from '@/lib/consultation-sharing';
import styles from './ConsultationShare.module.css';

type Props = { brand: ConsultationShareBrand; choices: ConsultationShareChoice[] };

export default function ConsultationShare({ brand, choices }: Props) {
  const design = consultationShareBrands[brand];
  const id = useId();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(choices[0]?.id || '');
  const [text, setText] = useState(() => trimShareText(choices[0]?.text || ''));
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [card, setCard] = useState<{ url: string; blob: Blob } | null>(null);
  const [imageError, setImageError] = useState(false);
  const manual = useRef<HTMLTextAreaElement>(null);
  const locked = useRef(false);
  const record = (channel: string, outcome: string) => trackEvent('fortune_share_action', { content_type: brand, channel, outcome });
  const message = `${design.invitation}\n\n${text.trim()}\n\n${design.title}\n운세는 선택을 돕는 참고 이야기입니다.`;
  const copyText = `${message}\n\n${consultationInvitationUrl(brand, 'copy')}`;

  useEffect(() => { if (open) void prepareKakao(process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY); }, [open]);
  useEffect(() => {
    if (!open || !text.trim()) { setCard(null); return; }
    let cancelled = false, url = '';
    setCard(null); setImageError(false);
    const timer = setTimeout(() => {
      void renderConsultationShareCard(brand, text.trim()).then(blob => {
        if (cancelled) return;
        url = URL.createObjectURL(blob); setCard({ url, blob });
      }).catch(() => { if (!cancelled) setImageError(true); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); if (url) URL.revokeObjectURL(url); };
  }, [brand, open, text]);

  if (!choices.length) return null;

  async function copy() {
    try { await navigator.clipboard.writeText(copyText); record('copy', 'copied'); setNotice('문구와 상담 링크를 복사했어요. 원하는 대화방에 붙여 넣어 주세요.'); }
    catch {
      record('copy', 'manual'); setNotice('자동 복사가 되지 않았어요. 아래 문구를 선택해 직접 복사해 주세요.');
      const details = manual.current?.closest('details'); if (details) details.open = true;
      manual.current?.focus(); manual.current?.select();
    }
  }

  function download() {
    if (!card) return;
    const link = document.createElement('a'); link.href = card.url; link.download = `${design.title}-상담한장.png`; link.click();
    record('image', 'download_requested'); setNotice('이미지 저장을 요청했어요. 문구의 링크도 함께 보내면 친구가 자기 상담을 시작할 수 있어요.');
  }

  async function share(channel: 'kakao' | 'native' | 'image') {
    if (locked.current) return;
    locked.current = true; setBusy(true); setNotice('');
    try {
      if (channel === 'image') {
        if (!card) return;
        const file = new File([card.blob], '상담한장.png', { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] }) && typeof navigator.share === 'function') {
          await navigator.share({ files: [file], title: design.title, text: design.invitation, url: consultationInvitationUrl(brand, channel) });
          record(channel, 'shared'); setNotice('공유 창에서 선택한 동작을 마쳤어요.');
        } else download();
        return;
      }
      const outcome = await shareThrough(channel, {
        title: design.title, text: channel === 'kakao' ? trimShareText(text.replace(/\s+/g, ' '), 95) : message,
        url: consultationInvitationUrl(brand, channel), image: `https://code-destiny.com${design.image}`,
      });
      record(channel, outcome.status);
      if (outcome.status === 'opened') setNotice('카카오톡에서 보낼 친구나 단톡방을 선택해 주세요.');
      else if (outcome.status === 'shared') setNotice('공유 창에서 선택한 동작을 마쳤어요.');
      else if (outcome.status === 'cancelled') setNotice('공유를 취소했어요. 상담은 그대로 남아 있어요.');
      else { await copy(); }
    } catch (error) {
      const cancelled = error instanceof Error && error.name === 'AbortError';
      record(channel, cancelled ? 'cancelled' : 'failed');
      setNotice(cancelled ? '공유를 취소했어요. 상담은 그대로 남아 있어요.' : '공유 창을 열지 못했어요. 문구 복사나 이미지 저장으로 다시 시도해 주세요.');
    } finally { locked.current = false; setBusy(false); }
  }

  return <details className={styles.root} data-consultation-share={brand} onToggle={event => {
    setOpen(event.currentTarget.open); if (event.currentTarget.open) record('editor', 'opened');
  }}>
    <summary><Share2 size={20} aria-hidden="true" /> 마음에 남은 상담 공유하기</summary>
    {open && <div className={styles.editor}>
      <div className={styles.form}>
        <h3>{design.invitation}</h3>
        <p>나누고 싶은 이야기만 골라 주세요. 링크는 친구의 새 상담으로 이어지며, 내 결과 전체는 공개되지 않아요.</p>
        <label htmlFor={`${id}-story`}>공유할 이야기</label>
        <select id={`${id}-story`} value={choice} onChange={event => {
          setChoice(event.target.value); setText(trimShareText(choices.find(item => item.id === event.target.value)?.text || '')); setNotice('');
        }}>{choices.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <label htmlFor={`${id}-text`}>보낼 문구</label>
        <textarea id={`${id}-text`} rows={5} maxLength={360} value={text} onChange={event => setText(event.target.value)} />
        <small>{Array.from(text).length} / 360자 · 질문과 출생정보는 자동 첨부하지 않아요. 문구 속 개인적인 내용도 보내기 전에 확인해 주세요.</small>
        <button type="button" className={styles.shorten} disabled={busy || Array.from(text).length <= 180} onClick={() => setText(trimShareText(text, 180))}>단톡방용 180자로 줄이기</button>
        <p className={styles.excerpt}>카카오톡 카드 미리보기: {trimShareText(text.replace(/\s+/g, ' '), 95) || '보낼 문구를 입력해 주세요.'}</p>
        <div className={styles.actions}>
          <button type="button" disabled={busy || !text.trim()} onClick={() => void share('kakao')}><MessageCircle size={18} aria-hidden="true" />카카오톡 요약 보내기</button>
          <button type="button" disabled={busy || !text.trim()} onClick={() => void share('native')}><Share2 size={18} aria-hidden="true" />문구 공유</button>
          <button type="button" disabled={busy || !text.trim()} onClick={() => void copy()}><Copy size={18} aria-hidden="true" />문구 복사</button>
          <button type="button" disabled={busy || !card || !text.trim()} onClick={() => void share('image')}><Share2 size={18} aria-hidden="true" />이미지로 공유</button>
          <button type="button" disabled={busy || !card || !text.trim()} onClick={download}><Download size={18} aria-hidden="true" />이미지 저장</button>
        </div>
        <p role="status" aria-live="polite">{notice}</p>
        <details className={styles.manual}><summary>복사용 전체 문구</summary><textarea ref={manual} aria-label="복사용 전체 공유 문구" readOnly rows={8} value={copyText} onFocus={event => event.target.select()} /></details>
      </div>
      <figure className={styles.preview}>
        {card ? <img src={card.url} alt="보내기 전 확인하는 상담 이미지" width={1080} height={1080} /> : <p role="status">{imageError ? '이미지를 준비하지 못했어요. 문구로 공유할 수 있어요.' : text.trim() ? '상담 한 장을 준비하고 있어요.' : '보낼 문구를 입력해 주세요.'}</p>}
        <figcaption>위에서 고른 문구와 서비스 소개만 담겨요.</figcaption>
      </figure>
    </div>}
  </details>;
}
