"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Eye, Pause, Play, X } from "lucide-react";
import { teaHouseEntryScenes, type TeaHouseEntryStage } from "../data/entryStory";
import { fortuneTeaHouseAssets } from "../data/assets";
import { readEntryBookmark, saveEntryBookmark } from "../lib/entryBookmark";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";
import styles from "../styles/tea-novel.module.css";

type Props = { stage: TeaHouseEntryStage; onStageChange: (stage: TeaHouseEntryStage) => void; onComplete: () => void; onSkip: () => void };
const SKIP_KEYS = ["stage", "actor", "background", "speaker", "mood"];
const KO = {
 title: "달빛 아래, 연이의 이야기", narrator: "달빛의 기록", pig: "꽃돼지 연이", yeoni: "연이",
 previous: "이전 대사", next: "다음 대사", reveal: "문장 전체 보기", cups: "찻잔 고르기",
 auto: "자동 넘김", pause: "자동 멈춤", log: "대화 기록", close: "닫기", art: "예화 감상", return: "이야기로 돌아가기",
 humanAlt: "달빛 찻집에서 차를 건네는 인간형 연이", pigAlt: "손님을 맞이하는 꽃돼지 연이",
 choices: ["조금 지쳤어요", "묻고 싶은 사람이 있어요", "아직 잘 모르겠어요"],
 replies: ["오늘은 잘해 내려고 애쓰지 않아도 괜찮아요. 차가 우러나는 동안, 마음도 잠깐 쉬어 가요.", "그 사람에 관한 이야기군요. 어떤 마음일 거라고 미리 정하지 않고, 당신이 겪은 장면부터 함께 살펴볼게요.", "아직 이름 붙이지 않아도 괜찮아요. 찻잔을 둘러보다 마음에 걸리는 것이 생기면, 그때 말해 주세요."],
};

export default function TeaHouseEntryScene({ stage, onStageChange, onComplete, onSkip }: Props) {
 const copy = useTeaHouseCopy("entryNovel", KO);
 const scenes = useTeaHouseCopy("entryScenes", teaHouseEntryScenes, { skipKeys: SKIP_KEYS });
 const reducedMotion = usePrefersReducedMotion();
 const [position, setPosition] = useState({ stage, line: 0 });
 const [ready, setReady] = useState(false);
 const [auto, setAuto] = useState(false);
 const [artOnly, setArtOnly] = useState(false);
 const [logOpen, setLogOpen] = useState(false);
 const [reply, setReply] = useState<number | null>(null);
 const [chosenReply, setChosenReply] = useState<number | null>(null);
 const [visible, setVisible] = useState(0);
 const logRef = useRef<HTMLDialogElement>(null);
 const initialStage = useRef(stage);
 const sceneIndex = Math.max(0, scenes.findIndex(scene => scene.stage === stage));
 const scene = scenes[sceneIndex];
 const lineIndex = position.stage === stage ? position.line : 0;
 const line = scene.lines[lineIndex] || scene.lines[0];
 const choiceMoment = stage === "pigDialogue" && lineIndex === scene.lines.length - 1;
 const text = choiceMoment && reply !== null ? copy.replies[reply] : line.text;
 const speaker = choiceMoment && reply !== null ? "꽃돼지?" : line.speaker;
 const characters = Array.from(text);
 const complete = reducedMotion || visible >= characters.length;
 const humanScene = sceneIndex > 3 || (stage === "transformPreview" && lineIndex >= 2);
 const illustration = humanScene ? "/images/fortune-tea-house/yeoni-moonlight-novel.webp" : fortuneTeaHouseAssets.premium.landingDesktop;

 useEffect(() => {
  const saved = readEntryBookmark();
  if (saved?.stage === initialStage.current) setPosition(saved);
  setReady(true);
 }, []);
 useEffect(() => { if (ready && position.stage === stage) saveEntryBookmark({ stage, line: lineIndex }); }, [ready, stage, lineIndex, position.stage]);
 useEffect(() => {
  setVisible(0);
  if (reducedMotion) return;
  const length = Array.from(text).length;
  let count = 0;
  const timer = window.setInterval(() => {
   count = Math.min(count + 2, length);
   setVisible(current => Math.max(current, count));
   if (count === length) window.clearInterval(timer);
  }, 34);
  return () => window.clearInterval(timer);
 }, [text, reducedMotion]);

 const go = useCallback((nextStage: TeaHouseEntryStage, nextLine: number) => {
  saveEntryBookmark({ stage: nextStage, line: nextLine });
  setReply(null); setVisible(0); setPosition({ stage: nextStage, line: nextLine }); onStageChange(nextStage);
 }, [onStageChange]);
 const advance = useCallback(() => {
  if (!complete) { setVisible(Array.from(text).length); return; }
  if (choiceMoment && reply === null) return;
  if (lineIndex < scene.lines.length - 1) go(stage, lineIndex + 1);
  else if (sceneIndex < scenes.length - 1) go(scenes[sceneIndex + 1].stage, 0);
  else { saveEntryBookmark(null); onComplete(); }
 }, [complete, text, choiceMoment, reply, lineIndex, scene.lines.length, go, stage, sceneIndex, scenes, onComplete]);
 useEffect(() => {
  if (!auto || !complete || artOnly || logOpen || (choiceMoment && reply === null)) return;
  const timer = window.setTimeout(() => {
   if (document.visibilityState === "visible") advance(); else setAuto(false);
  }, Math.max(2600, Array.from(text).length * 65));
  return () => window.clearTimeout(timer);
 }, [auto, complete, artOnly, logOpen, choiceMoment, reply, advance, text]);

 function previous() {
  setAuto(false);
  if (reply !== null) { setReply(null); return; }
  if (lineIndex > 0) go(stage, lineIndex - 1);
  else if (sceneIndex > 0) { const prev = scenes[sceneIndex - 1]; go(prev.stage, prev.lines.length - 1); }
 }
 function openLog() { setAuto(false); setLogOpen(true); logRef.current?.showModal(); }
 const speakerLabel = speaker === "narration" ? copy.narrator : speaker === "연이" ? copy.yeoni : copy.pig;

 return <section className={styles.world + " " + styles.reader} data-entry-stage={stage} data-human={humanScene} aria-labelledby="teaHouseEntryTitle">
  <div className={styles.illustration}>
   <Image src={illustration} alt={humanScene ? copy.humanAlt : ""} fill priority sizes="100vw" className={styles.sceneImage} />
   {!humanScene && sceneIndex > 0 && <Image src={fortuneTeaHouseAssets.landingPig.welcome} alt={copy.pigAlt} width={320} height={380} className={styles.pigActor} />}
   {stage === "transformPreview" && humanScene && <span key={stage} className={styles.transformation} aria-hidden />}
  </div>
  <header className={styles.chapter}><h2 id="teaHouseEntryTitle">{scene.title}</h2><span>{sceneIndex + 1} / {scenes.length} · {lineIndex + 1} / {scene.lines.length}</span></header>
  {artOnly ? <button className={styles.returnButton} onClick={() => setArtOnly(false)}><BookOpen size={18} aria-hidden />{copy.return}</button> : <div className={styles.readingPanel}>
   <div className={styles.readerToolbar}>
    <button onClick={openLog}><BookOpen size={16} aria-hidden />{copy.log}</button>
    <button aria-pressed={auto} onClick={() => setAuto(value => !value)}>{auto ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}{auto ? copy.pause : copy.auto}</button>
    <button onClick={() => { setArtOnly(true); setAuto(false); }}><Eye size={16} aria-hidden />{copy.art}</button>
   </div>
   <button className={styles.dialogue} onClick={advance} aria-label={speakerLabel + ": " + text}>
    <strong className={styles.speaker}>{speakerLabel}</strong>
    <span className={styles.dialogueText} aria-hidden>{reducedMotion ? text : characters.slice(0, visible).join("")}</span>
    <span className={styles.nextHint} aria-hidden>{complete ? copy.next : copy.reveal}<ArrowRight size={15} /></span>
   </button>
   {choiceMoment && reply === null && complete && <div className={styles.responses}>{copy.choices.map((choice, index) => <button key={choice} onClick={() => { setReply(index); setChosenReply(index); setAuto(false); setVisible(0); }}>{choice}</button>)}</div>}
   <div className={styles.readerControls}>
    <button onClick={previous} disabled={sceneIndex === 0 && lineIndex === 0}><ArrowLeft size={16} aria-hidden />{copy.previous}</button>
    <button onClick={() => { setAuto(false); onSkip(); }}>{copy.cups}</button>
    <button className={styles.primary} onClick={advance} disabled={complete && choiceMoment && reply === null}>{!complete ? copy.reveal : sceneIndex === scenes.length - 1 && lineIndex === scene.lines.length - 1 ? copy.cups : copy.next}<ArrowRight size={16} aria-hidden /></button>
   </div>
  </div>}
  <dialog ref={logRef} className={styles.log} aria-labelledby="teaNovelLogTitle" onClose={() => setLogOpen(false)}>
   <header><h2 id="teaNovelLogTitle">{copy.log}</h2><button onClick={() => logRef.current?.close()} aria-label={copy.close}><X size={20} /></button></header>
   {scenes.slice(0, sceneIndex + 1).map((chapter, index) => <section key={chapter.stage}><h3>{chapter.title}</h3>{chapter.lines.slice(0, index === sceneIndex ? lineIndex + 1 : undefined).map((entry, i) => <p key={i}><strong>{entry.speaker === "narration" ? copy.narrator : entry.speaker === "연이" ? copy.yeoni : copy.pig}</strong>{entry.text}</p>)}</section>)}
   {chosenReply !== null && <p><strong>{copy.choices[chosenReply]}</strong>{copy.replies[chosenReply]}</p>}
  </dialog>
 </section>;
}
