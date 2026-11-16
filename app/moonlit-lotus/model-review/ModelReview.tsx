"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { advance, CYCLE_MS, newSession, poseAt, restoreSession, serializeSession, type Session } from "./bow-session";
import manifest from "@/public/assets/moonlit-lotus/yeoni/2d-v2/manifest.json";
import Sprite, { spriteStyle } from "./Sprite";
import { ASSET_BASE, PREVIEW_CLIPS, POSES, type Sheet } from "./sprite-clips";
import styles from "./review.module.css";

const BASE = ASSET_BASE;
const STORAGE = "cd:moonlit-lotus:yeoni-bow:v1";
const MODES = { idle: "표정과 포즈", greeting: "인사", meditation: "명상", bow: "온라인 108배" };
type Mode = keyof typeof MODES;
const SEQUENCES = PREVIEW_CLIPS;
const COPY = { idle: ["오늘도 만나서 반가워요", "다정한 미소부터 작은 놀람까지, 연이의 표정을 골라보세요."], greeting: ["반가운 마음을 건네요", "짧고 통통한 손으로 천천히 인사해요."], meditation: ["잠시, 마음을 내려놓아요", "연이와 함께 편안하게 쉬어가세요. 호흡을 억지로 맞추지 않아도 괜찮아요."], bow: ["한 번에 하나씩, 천천히", "캐릭터와 함께하는 온라인 108배예요. 사용자의 신체 움직임을 측정하지 않습니다."] };

export default function ModelReview() {
  const [mode, setMode] = useState<Mode>('idle');
  const [rearView,setRearView]=useState(false);
  const [expression, setExpression] = useState(0);
  const [previewStep, setPreviewStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [session, setSession] = useState<Session>(() => newSession(''));
  const [hydrated, setHydrated] = useState(false);
  const [storageMessage, setStorageMessage] = useState('');
  const [assetStatus, setAssetStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const persistKey = useRef('');

  useEffect(() => {
    try {
      const restored = restoreSession(localStorage.getItem(STORAGE));
      if (restored) { setSession(restored); setMode('bow'); }
    } catch { setStorageMessage('이 브라우저에서는 진행 기록을 저장할 수 없어요. 페이지를 열어 둔 동안 이용할 수 있어요.'); }
    setHydrated(true);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(media.matches);
    const visibility = () => { setHidden(document.hidden); if (document.hidden) setSession(current => current.status === 'running' ? { ...current, status: 'paused' } : current); };
    motion(); visibility(); media.addEventListener('change', motion); document.addEventListener('visibilitychange', visibility);
    return () => { media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  useEffect(() => {
    if (!hydrated || !session.sessionId) return;
    const serialized = serializeSession(session);
    if (serialized === persistKey.current) return;
    try { localStorage.setItem(STORAGE, serialized); persistKey.current = serialized; }
    catch { setStorageMessage('진행 기록을 저장하지 못했어요. 새로고침하면 마지막 기록이 복원되지 않을 수 있어요.'); }
  }, [hydrated, session]);

  useEffect(() => {
    let cancelled = false;
    setAssetStatus('loading');
    const sheets: Sheet[] = mode === 'bow' ? ['bow-down', 'bow-lower', 'bow-up'] : mode === 'meditation' ? ['rest'] : mode === 'idle' ? ['expressions', 'rest'] : ['expressions'];
    Promise.all(sheets.map(async name => {
      const img = new window.Image(); img.src = `${BASE}/${name}.webp`;
      await img.decode();
    })).then(() => { if (!cancelled) setAssetStatus('ready'); }).catch(() => { if (!cancelled) setAssetStatus('error'); });
    return () => { cancelled = true; };
  }, [attempt, mode]);

  useEffect(() => {
    if (mode === 'bow' || !playing || reduced || hidden || assetStatus !== 'ready' || (mode === 'idle' && expression !== 0)) return;
    const sequence = SEQUENCES[mode];
    const timer = setTimeout(() => setPreviewStep(step => (step + 1) % sequence.length), sequence[previewStep % sequence.length].ms);
    return () => clearTimeout(timer);
  }, [mode, playing, reduced, hidden, previewStep, expression, assetStatus]);

  useEffect(() => {
    if (session.status !== 'running' || hidden) return;
    let timer: ReturnType<typeof setTimeout>; let previous = performance.now();
    const tick = () => {
      if (document.hidden) return;
      const now = performance.now();
      const delta = now - previous;
      previous = now; setSession(current => advance(current, delta));
      timer = setTimeout(tick, 50);
    };
    timer = setTimeout(tick, 50);
    return () => clearTimeout(timer);
  }, [session.status, hidden]);

  const chooseMode = (next: Mode) => {
    setMode(next); setPreviewStep(0); setPlaying(true);
    setSession(current => current.status === 'running' ? { ...current, status: 'paused' } : current);
  };
  const resetSession = (target = session.target) => setSession(newSession(crypto.randomUUID(), target));
  const start = () => setSession(current => ({ ...(current.sessionId ? current : newSession(crypto.randomUUID(), current.target)), status: 'running' }));
  const bow = poseAt(session.elapsed);
  const drawing = mode === 'bow' ? (reduced ? { sheet: 'bow-down' as const, frame: 0 } : bow) : mode === 'idle' && expression !== 0 ? POSES[expression] : SEQUENCES[mode][(reduced ? 0 : previewStep) % SEQUENCES[mode].length];
  const frameLabel = mode === 'bow' ? bow.phase : mode === 'meditation' ? '편안히 앉아 명상하는 연이' : mode === 'greeting' ? '손을 흔들며 인사하는 연이' : POSES[expression].label;
  const ended = session.status === 'complete' || session.status === 'stopped';
  const active = session.status === 'running' || session.status === 'paused';

  return <main className={styles.page}>
    <header className={styles.header}><div><h1>연이와 쉬어가는 시간</h1><p>동글동글한 연이와 인사하고, 잠시 마음을 쉬어요.</p></div><Link href="/ggulggul/">꿀꿀 운세로 돌아가기</Link></header>
    <nav className={styles.modes} aria-label="연이의 활동">{(Object.entries(MODES) as [Mode, string][]).map(([id, label]) => <button key={id} type="button" aria-pressed={mode === id} onClick={() => chooseMode(id)}>{label}</button>)}</nav>
    <div className={styles.workbench}>
      <section className={styles.stage} aria-label="연이 2D 애니메이션">
        <div className={styles.stageArt}>
          {assetStatus === 'ready' ? <Sprite sheet={drawing.sheet} frame={drawing.frame} label={frameLabel} reduced={reduced} rear={mode==='bow'&&rearView} bowing={mode==='bow'} elapsed={session.elapsed}/> : <div className={styles.fallback}><Image src={`${BASE}/still.webp`} alt="연이의 정지 미리보기" width={384} height={384} priority /><p role="status">{assetStatus === 'loading' ? '연이를 불러오고 있어요.' : '동작 이미지를 불러오지 못했어요.'}</p>{assetStatus === 'error' && <button onClick={() => setAttempt(value => value + 1)}>이미지 다시 불러오기</button>}</div>}
        </div>
        <p className={styles.stageCaption}>{mode === 'bow' ? bow.phase : mode === 'meditation' ? '서두르지 않아도 괜찮아요.' : mode === 'greeting' ? '오늘도 와 주어서 반가워요.' : '당신의 이야기를 듣고 있어요.'}</p>
        {mode==='bow'&&<button className={styles.playButton} aria-pressed={rearView} onClick={()=>setRearView(v=>!v)}>{rearView?'앞모습 보기':'불상 바라보기 · 새 후면'}</button>}
        {mode !== 'bow' && <button className={styles.playButton} disabled={reduced || assetStatus !== 'ready'} onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={17} /> : <Play size={17} />}{playing ? '동작 멈추기' : '동작 이어 보기'}</button>}
        {reduced && <p className={styles.motionNote}>모션 감소 설정에 따라 정지 이미지로 보여드려요.</p>}
      </section>
      <section className={styles.controls} aria-label="활동 설정">
        <h2>{COPY[mode][0]}</h2><p className={styles.intro}>{COPY[mode][1]}</p>
        {mode === 'idle' && <div className={styles.expressions} aria-label="표정과 포즈 선택">{POSES.map((item, index) => <button key={item.id} aria-pressed={expression === index} onClick={() => { setExpression(index); setPreviewStep(0); }}><span className={styles.thumbnail} aria-hidden="true" style={spriteStyle(item.sheet, item.frame)} /><span>{item.label}</span></button>)}</div>}
        {mode === 'greeting' && <p className={styles.note}>손을 살짝 들어 올리고, 좌우로 흔들며 반가움을 전해요. 동작을 멈추고 한 장씩 살펴볼 수도 있어요.</p>}
        {mode === 'meditation' && <p className={styles.note}>눈을 감고 앉아 작은 숨결에 따라 편안히 쉬어요. 음악 연결은 다음 단계에서 준비해요.</p>}
        {mode !== 'bow' && <div className={styles.previewTools}><button onClick={() => { setPlaying(false); setExpression(0); setPreviewStep(step => step + 1); }}>다음 동작 보기</button><button aria-label="동작 처음부터 보기" onClick={() => { setPreviewStep(0); setExpression(0); setPlaying(true); }}><RotateCcw size={16} /></button></div>}
        {mode === 'bow' && <>
          <fieldset className={styles.targets} disabled={active}><legend>오늘은 얼마나 쉬어갈까요?</legend>{[9, 27, 108].map(target => <button key={target} aria-pressed={session.target === target} onClick={() => resetSession(target)}>{target}배</button>)}</fieldset>
          <div className={styles.progressLabel}><strong>{session.completed}<span> / {session.target}배</span></strong><span>{session.status === 'paused' ? '잠시 쉬는 중' : session.status === 'complete' ? '마무리했어요' : session.status === 'stopped' ? '오늘은 여기까지' : session.status === 'running' ? '함께하는 중' : '준비되면 시작해요'}</span></div>
          <progress className={styles.progress} value={session.completed} max={session.target} aria-label="완료한 큰절 횟수" />
          <div className={styles.cycle}><span>{session.status === 'complete' ? '편안한 마음으로 마무리해요.' : bow.phase}</span><progress value={session.elapsed} max={CYCLE_MS} aria-label="현재 큰절 동작 진행" /></div>
          <p className={styles.countNote}>한 동작을 마치고 서서 합장한 뒤에만 1회를 기록해요.</p>
          <div className={styles.actions}>{ended ? <button className={styles.primary} onClick={() => resetSession()}>새로 시작하기</button> : session.status === 'running' ? <button className={styles.primary} onClick={() => setSession(current => ({ ...current, status: 'paused' }))}><Pause size={17} />일시정지</button> : <button className={styles.primary} disabled={!hydrated} onClick={start}><Play size={17} />{session.status === 'paused' ? '이어서 하기' : '연이와 시작하기'}</button>}{active && <button onClick={() => setSession(current => ({ ...current, status: 'stopped', elapsed: 0 }))}>오늘은 여기까지</button>}</div>
          <label className={styles.speed}>동작 속도<select value={session.pendingSpeed} onChange={event => { const speed = Number(event.target.value); setSession(current => ({ ...current, pendingSpeed: speed, speed: current.elapsed === 0 ? speed : current.speed })); }}><option value={.75}>천천히</option><option value={1}>편안하게</option><option value={1.25}>조금 빠르게</option></select></label>
          {session.pendingSpeed !== session.speed && <p className={styles.countNote}>다음 큰절부터 속도가 바뀌어요.</p>}
          <p className={styles.countNote}>화면을 떠나면 자동으로 멈춰요. 새로고침 후에는 완료 횟수를 불러오고, 미완료 동작은 처음부터 시작해요.</p>
          <p role="status" aria-live="polite" className={styles.sessionMessage}>{session.status === 'complete' ? `${session.target}배를 마쳤어요. 오늘의 마음에 고요한 쉼이 남기를 바라요.` : session.status === 'stopped' ? `${session.completed}배를 함께했어요. 다음에 다시 만나요.` : session.status === 'paused' ? '잠시 멈췄어요. 준비되면 이어서 할 수 있어요.' : ''}</p>
          {storageMessage && <p role="alert" className={styles.note}>{storageMessage}</p>}
        </>}
      </section>
    </div>
    <details className={styles.reference}><summary>원본과 스프라이트 시트 살펴보기</summary><div><a href={`${BASE}/reference.webp`} target="_blank" rel="noreferrer"><Image src={`${BASE}/reference.webp`} alt="연이 최종 참조 프로필 시트" width={1122} height={1402} sizes="(max-width: 800px) 90vw, 320px" />원본 크게 보기</a><section><h2>원본의 귀여움을 그대로</h2><p>연분홍 볼과 통통한 배, 분홍 연꽃과 보라색 스카프를 담은 2D 그림입니다. 표정과 인사 16장, 명상과 휴식 16장, 큰절 자세 48장으로 총 80컷을 준비했어요.</p><p>연이부터 준비하고 있으며, 영냥이는 다음 단계입니다.</p>{Object.entries(manifest.sheets).map(([name, sheet]) => <a key={name} href={sheet.url} download>{({ expressions: '표정과 인사', rest: '명상과 휴식', 'bow-down': '큰절 준비', 'bow-lower': '큰절 낮추기', 'bow-up': '큰절 일어나기' } as Record<string, string>)[name]} 시트 저장</a>)}<a href={`${BASE}/manifest.json`} download>프레임 명세 저장</a></section></div></details>
  </main>;
}
