"use client";
// 구석의 44px 연꽃 오브. 누르면 시트가 열리고, 곡을 누르면 바로 바뀐다(곡 변경 = 탭 두 번).
// 자동재생이 막혔을 때는 오브가 "소리 켜기" 한 가지로만 바뀐다. 경고·오류 배너는 띄우지 않는다.
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Pause,Play,SkipBack,SkipForward,X} from 'lucide-react';
import type {RitualT} from '../_ritual/use-ritual-t';
import type {AmbientAudio} from './use-ambient-audio';
import styles from './mini-player.module.css';
function LotusGlyph(){
 return <svg className={styles.glyph} viewBox="-50 -50 100 100" aria-hidden="true">
  {[0,60,120,180,240,300].map(angle=><path key={angle} transform={`rotate(${angle})`} d="M0 -6 C 10 -16 10 -34 0 -44 C -10 -34 -10 -16 0 -6 Z"/>)}
  <circle r="8"/>
 </svg>;
}
export default function MiniPlayer({audio,t}:{audio:AmbientAudio;t:RitualT}){
 const [open,setOpen]=useState(false),[host,setHost]=useState<HTMLElement|null>(null);
 const sheetId=useId(),root=useRef<HTMLDivElement>(null),sheet=useRef<HTMLElement>(null),closeButton=useRef<HTMLButtonElement>(null),list=useRef<HTMLUListElement>(null);
 // 시트는 단계 패널 위에 떠야 해서 장면(stage) 밖, 같은 main 아래로 띄운다(--ml-* 변수가 main 에 있다).
 useEffect(()=>{setHost(root.current?.closest('main')||null);},[]);
 const playing=audio.playback==='playing',pending=audio.playback==='loading',blocked=audio.playback==='blocked';
 const track=audio.tracks.find(item=>item.id===audio.selected)||audio.tracks[0];
 useEffect(()=>{
  if(!open)return;
  closeButton.current?.focus();
  // 지금 곡은 목록 자체의 스크롤 안에서만 보이게 한다. scrollIntoView 는 낮은 화면에서 시트 전체를 내려 버린다.
  const box=list.current,item=box?.querySelector<HTMLElement>('[aria-current=true]');
  if(box&&item&&box.scrollHeight>box.clientHeight)box.scrollTop=Math.max(0,item.offsetTop-box.offsetTop-(box.clientHeight-item.offsetHeight)/2);
  if(sheet.current)sheet.current.scrollTop=0;
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
  const outside=(event:PointerEvent)=>{const target=event.target as Node;if(!root.current?.contains(target)&&!sheet.current?.contains(target))setOpen(false);};
  document.addEventListener('keydown',key);document.addEventListener('pointerdown',outside);
  return()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside);};
 },[open]);
 const status=playing?t('audio.status.playing'):pending?t('audio.status.loading'):audio.playback==='error'?t('audio.status.error'):t('audio.status.paused');
 return <div ref={root} className={styles.root} data-playback={audio.playback}>
  {blocked&&!open
   ?<button type="button" className={styles.soundOn} onClick={audio.toggle}><LotusGlyph/>{t('audio.soundOn')}</button>
   :<button type="button" className={styles.orb} data-playing={playing} aria-expanded={open} aria-controls={sheetId} aria-label={t('audio.open')} title={t('audio.open')} onClick={()=>setOpen(value=>!value)}><LotusGlyph/></button>}
  {open&&host&&createPortal(<section ref={sheet} id={sheetId} className={styles.sheet} role="dialog" aria-modal="false" aria-label={t('audio.title')}>
   <header className={styles.head}>
    <h2 className={styles.title}>{t('audio.title')}</h2>
    <button ref={closeButton} type="button" className={styles.icon} aria-label={t('audio.close')} title={t('audio.close')} onClick={()=>setOpen(false)}><X size={18} aria-hidden="true"/></button>
   </header>
   <div className={styles.now} aria-live="polite"><small>{status}</small><strong>{track.title}</strong></div>
   <div className={styles.controls}>
    <button type="button" className={styles.icon} aria-label={t('audio.prev')} title={t('audio.prev')} onClick={audio.prev}><SkipBack size={18} aria-hidden="true"/></button>
    <button type="button" className={styles.play} aria-label={playing||pending?t('audio.pause'):t('audio.play')} title={playing||pending?t('audio.pause'):t('audio.play')} onClick={audio.toggle}>{playing||pending?<Pause size={20} aria-hidden="true"/>:<Play size={20} aria-hidden="true"/>}</button>
    <button type="button" className={styles.icon} aria-label={t('audio.next')} title={t('audio.next')} onClick={audio.next}><SkipForward size={18} aria-hidden="true"/></button>
   </div>
   <label className={styles.volume}><span>{t('audio.volume')}</span>
    <input type="range" min="0" max="1" step=".05" value={audio.volume} disabled={audio.volumeFixed&&!audio.gain} aria-valuetext={Math.round(audio.volume*100)+'%'} onChange={event=>audio.setVolume(Number(event.target.value))}/>
   </label>
   {audio.volumeFixed&&!audio.gain&&<p className={styles.note}>{t('audio.volumeFixed')}</p>}
   <button type="button" className={styles.toggle} aria-pressed={audio.sfxOn} onClick={()=>audio.setSfx(!audio.sfxOn)}>{t('audio.sfx')}<span>{audio.sfxOn?t('audio.on'):t('audio.off')}</span></button>
   <ul ref={list} className={styles.list} aria-label={t('audio.list')}>
    {audio.tracks.map(item=><li key={item.id}><button type="button" aria-current={item.id===audio.selected} onClick={()=>audio.select(item.id)}>
     <span className={styles.trackTitle}>{item.title}</span><span className={styles.mood}>{t('audio.mood.'+item.mood)}</span>
    </button></li>)}
   </ul>
  </section>,host)}
 </div>;
}
