"use client";

import Image from 'next/image';
import {Fragment,useEffect,useRef,useState,type ReactNode} from 'react';
import scenes from './prologue-scenes.json';
import {rememberPrologue} from './prologue-visit';
import {RoomSoundControls,useRoomSoundtrack} from './RoomSoundtrack';
import styles from './prologue.module.css';

const main=scenes.filter(scene=>/^\d/.test(scene.id));
const mirror=main.findIndex(scene=>scene.id==='11');
const chapterTitles:Record<string,string>={'07':'하늘이 거둔 것','12':'판결문의 마지막 줄','18':'네 내일을 맞히기 전에'};
type Mood=Parameters<typeof useRoomSoundtrack>[0];

function StoryMusic({mood}:{mood:Mood}){
  const sound=useRoomSoundtrack(mood);
  return <RoomSoundControls sound={sound}/>;
}

function Frame({scene,index}:{scene:typeof scenes[number];index:number}){
  return <Fragment>
    {chapterTitles[scene.id]&&<h2 className={styles.chapter}>{chapterTitles[scene.id]}</h2>}
    <figure data-panel={scene.id} data-position={index+1} className={styles.frame}>
      <Image unoptimized src={'/assets/yeongnyangi/prologue/'+scene.id+'.webp'} alt={scene.alt}
        width={scene.width} height={scene.height} loading={index===0?'eager':'lazy'} sizes="(max-width:480px) 100vw, 480px"/>
      {scene.id==='05'&&<figcaption className={styles.sources}>
        <a href="https://blog.naver.com/neosaju/223444062729" target="_blank" rel="noopener noreferrer">2024년 5월 12일 분석 원문 ↗</a>
        <a href="https://www.ccourt.go.kr/site/kor/ex/bbs/View.do?bcIdx=4253958&cbIdx=1106" target="_blank" rel="noopener noreferrer">2025년 4월 4일 헌법재판소 결정 ↗</a>
        <p>네오와 연이의 대화는 공개 분석을 바탕으로 재구성했습니다.</p>
      </figcaption>}
    </figure>
  </Fragment>;
}

export default function StoryPanel({onClose,onDaily,inRoom=false,soundControls,onMood}:{
  onClose:()=>void;onDaily?:()=>void;inRoom?:boolean;soundControls?:ReactNode;onMood?:(mood:Mood)=>void;
}){
  const dialog=useRef<HTMLDialogElement>(null),response=useRef<HTMLDivElement>(null);
  const [choice,setChoice]=useState<'a'|'b'|null>(null),[position,setPosition]=useState(1);
  const id=main[position-1].id;
  const mood:Mood=Number(id)>=12?'warm':Number(id)>=7&&Number(id)<=10?'storm':'quiet';
  useEffect(()=>{onMood?.(mood);},[mood,onMood]);
  useEffect(()=>{
    const el=dialog.current!;
    el.showModal();
    const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return ()=>{el.close();document.body.style.overflow=overflow;};
  },[]);
  useEffect(()=>{
    if(!choice)return;
    response.current?.focus({preventScroll:true});
    response.current?.scrollIntoView({block:'start'});
  },[choice]);
  function close(){
    rememberPrologue();
    dialog.current?.close();
    onClose();
  }
  function trackPosition(){
    const el=dialog.current;
    if(!el)return;
    const mid=el.getBoundingClientRect().top+el.clientHeight*.58;
    let current=1;
    for(const panel of el.querySelectorAll<HTMLElement>('[data-position]')){
      if(panel.getBoundingClientRect().top>mid)break;
      current=Number(panel.dataset.position);
    }
    setPosition(current);
    if(current===main.length)rememberPrologue();
  }
  const reaction=scenes.find(scene=>scene.id===choice);
  return <dialog ref={dialog} className={styles.reader} aria-label="영냥이의 프롤로그" onScroll={trackPosition}
    onCancel={e=>{e.preventDefault();close();}}>
    <div className={styles.rail}>
      <header className={styles.toolbar}>
        <button onClick={close}>닫기</button><span>{String(position).padStart(2,'0')} / {main.length}</span>
        <a href="/yeongnyangi/library/" onClick={rememberPrologue}>보관함</a>
        <button autoFocus onClick={close}>건너뛰기</button>
        <details className={styles.music}><summary>음향</summary>{soundControls??<StoryMusic mood={mood}/>}</details>
      </header>
      <div className={styles.cover}><small>영냥이의 프롤로그</small><h1>내 이름이<br/>네오였던 밤</h1></div>
      {main.slice(0,mirror+1).map((s,i)=><Frame key={s.id} scene={s} index={i}/>)}
      <section className={styles.choice}><h2>거울 앞의 네오에게</h2>
        <button aria-pressed={choice==='a'} onClick={()=>setChoice('a')}>말없이 곁에 앉는다</button>
        <button aria-pressed={choice==='b'} onClick={()=>setChoice('b')}>네오라고 불러준다</button>
      </section>
      {reaction&&<>
        <div ref={response} tabIndex={-1} className={styles.reaction}><Frame scene={reaction} index={mirror}/></div>
        {main.slice(mirror+1).map((s,i)=><Frame key={s.id} scene={s} index={mirror+i+1}/>)}
        <footer className={styles.ending}><h2>이번엔 네 이야기야.</h2>
          <a href="/yeongnyangi/fortune/?flow=question" onClick={rememberPrologue}>내 고민 건네기</a>
          <a href="/yeongnyangi/library/" onClick={rememberPrologue}>내 상담 이어보기</a>
          {onDaily?<button onClick={()=>{close();onDaily();}}>멸치로 오늘의 운세 보기</button>:<a href="/yeongnyangi/room/#daily" onClick={rememberPrologue}>멸치로 오늘의 운세 보기</a>}
          {inRoom?<button onClick={close}>영냥이 곁에 머물기</button>:<a href="/yeongnyangi/room/" onClick={rememberPrologue}>영냥이 곁에 머물기</a>}
        </footer>
      </>}
    </div>
  </dialog>;
}
