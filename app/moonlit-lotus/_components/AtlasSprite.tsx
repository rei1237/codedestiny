"use client";
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createSpriteCompositor} from '../_lib/sprite-compositor';
import {decodedSpriteImage,loadSpriteImage,type SpriteDrawing} from '../_lib/sprite-images';

/** A stable surface across character, activity, view and quality changes. */
export default function AtlasSprite({drawing,identity,label,className,fallback,preload=[],frozen=false,holding=false,attempt=0,onFailure}:{drawing:SpriteDrawing;identity:string;label:string;className:string;fallback?:string;preload?:string[];frozen?:boolean;holding?:boolean;attempt?:number;onFailure?:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),renderer=useRef<ReturnType<typeof createSpriteCompositor>|null>(null);
 const displayed=useRef(''),[painted,setPainted]=useState(false),failure=useRef(onFailure);
 failure.current=onFailure;
 useLayoutEffect(()=>{
  if(renderer.current)return;
  displayed.current='';
  try{renderer.current=createSpriteCompositor(canvas.current!);}catch{failure.current?.();}
 },[attempt]);
 useLayoutEffect(()=>()=>{renderer.current?.dispose();renderer.current=null;},[]);
 const {url,frame,columns=4,rows=4}=drawing;
 useLayoutEffect(()=>{
  if(holding&&displayed.current||frozen&&displayed.current===identity)return;
  let cancelled=false;
  const show=(image:HTMLImageElement)=>{
   if(cancelled||!renderer.current)return;
   renderer.current.show(image,frame,true,columns,rows);
   // Remove the initial fallback in the same task as the first canvas paint.
   canvas.current!.parentElement!.style.backgroundImage='none';
   displayed.current=identity;setPainted(true);
   const node=canvas.current!;node.dataset.paintedUrl=url;node.dataset.paintedFrame=String(frame);node.dataset.paintedIdentity=identity;
  };
  const ready=decodedSpriteImage(url);
  if(ready)show(ready);else void loadSpriteImage(url).then(show,()=>{if(!cancelled)failure.current?.();});
  return()=>{cancelled=true;};
 },[url,frame,columns,rows,identity,frozen,holding,attempt]);
 const preloadKey=preload.join('|');
 useEffect(()=>{if(!frozen)for(const source of preloadKey.split('|').filter(Boolean))void loadSpriteImage(source).catch(()=>{});},[preloadKey,frozen,attempt]);
 return <div className={className} role="img" aria-label={label} style={{position:'relative',backgroundImage:!painted&&fallback?'url('+fallback+')':undefined,backgroundSize:'100% 100%'}}>
  <canvas ref={canvas} width={384} height={384} style={{display:'block',width:'100%',height:'100%'}} aria-hidden="true"/>
 </div>;
}
