"use client";
// next/dynamic 으로만 불린다. canvas(반딧불·탭 물결) + CSS 달무리·등불·향 연기.
import {useEffect,useRef} from 'react';
import {createSceneFx,detectTier,type SceneFx as Fx} from './scene-fx';
import styles from './scene-fx.module.css';
export default function SceneFx({smoke,reduced}:{smoke:boolean;reduced:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),fx=useRef<Fx|null>(null);
 useEffect(()=>{
  const node=canvas.current,stage=node?.parentElement;
  if(!node||!stage)return;
  // 색은 장면 토큰을 한 번만 읽는다(루프 안에서 스타일을 읽지 않는다).
  const color=getComputedStyle(node).getPropertyValue('--ml-gold').trim()||'currentColor';
  const scene=createSceneFx(node,{tier:detectTier(navigator as Navigator&{deviceMemory?:number}),color});
  fx.current=scene;node.dataset.tier=detectTier(navigator as Navigator&{deviceMemory?:number});
  scene.setHidden(document.hidden);
  const resize=new ResizeObserver(([entry])=>{const box=entry.contentRect;scene.resize(box.width,box.height,devicePixelRatio);});
  resize.observe(node);
  const seen=new IntersectionObserver(([entry])=>scene.setVisible(entry.isIntersecting));
  seen.observe(node);
  const visibility=()=>scene.setHidden(document.hidden);
  document.addEventListener('visibilitychange',visibility);
  // 탭 물결: 이벤트 시점에 한 번 읽고, 그리기는 다음 프레임에서.
  const tap=(event:PointerEvent)=>{const box=node.getBoundingClientRect();scene.ripple(event.clientX-box.left,event.clientY-box.top);};
  stage.addEventListener('pointerdown',tap);
  return()=>{resize.disconnect();seen.disconnect();document.removeEventListener('visibilitychange',visibility);stage.removeEventListener('pointerdown',tap);scene.dispose();fx.current=null;};
 },[]);
 useEffect(()=>{fx.current?.setReduced(reduced);},[reduced]);
 return <>
  <canvas ref={canvas} className={styles.canvas} aria-hidden="true" data-scene-fx/>
  <span className={styles.moon} aria-hidden="true"/>
  <span className={styles.lamp} data-side="left" aria-hidden="true"/>
  <span className={styles.lamp} data-side="right" aria-hidden="true"/>
  {smoke&&<span className={styles.smoke} aria-hidden="true"><i/><i/><i/></span>}
 </>;
}
