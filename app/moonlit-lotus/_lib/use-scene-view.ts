"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {nextSceneView,viewImage,type Scene,type SceneView} from './scene-views';

/** Only the selected scene and its neighbours are warmed; no atlas-sized image pool. */
export function useSceneView(scene:Scene,view:SceneView,onChange:(view:SceneView)=>void,light:boolean){
 const [portrait,setPortrait]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const generation=useRef(0),alive=useRef(true),images=useRef(new Map<string,HTMLImageElement>());
 const change=useRef(onChange);change.current=onChange;
 const load=useCallback(async(url:string)=>{
  let image=images.current.get(url);
  if(!image){image=new Image();image.decoding='async';image.src=url;images.current.set(url,image);}
  else{images.current.delete(url);images.current.set(url,image);}
  while(images.current.size>3){const key=images.current.keys().next().value as string;images.current.delete(key);}
  try{await image.decode();if(!image.naturalWidth)throw Error('empty image');}
  catch(error){if(images.current.get(url)===image)images.current.delete(url);throw error;}
 },[]);
 useEffect(()=>{
  const media=matchMedia('(max-width:700px) and (orientation:portrait)'),sync=()=>setPortrait(media.matches);sync();media.addEventListener('change',sync);
  alive.current=true;return()=>{alive.current=false;generation.current++;images.current.clear();media.removeEventListener('change',sync);};
 },[]);
 useEffect(()=>{generation.current++;setLoading(false);setError('');images.current.clear();},[scene,portrait]);
 useEffect(()=>{
  if(light||document.hidden)return;
  // Loading is deferred until after the currently visible picture's first paint.
  const timer=setTimeout(()=>{for(const direction of [-1,1]){const next=nextSceneView(view,direction);if(next!==view)void load(viewImage(scene,next,portrait)).catch(()=>{});}},400);
  return()=>clearTimeout(timer);
 },[scene,view,portrait,light,load]);
 const request=useCallback(async(next:SceneView)=>{
  if(next===view)return;
  const token=++generation.current;setLoading(true);setError('');
  try{await load(viewImage(scene,next,portrait));if(alive.current&&generation.current===token)change.current(next);}
  catch{if(alive.current&&generation.current===token)setError('다른 시점을 불러오지 못했어요. 현재 풍경에서 다시 시도해 주세요.');}
  finally{if(alive.current&&generation.current===token)setLoading(false);}
 },[scene,view,portrait,load]);
 return{portrait,loading,error,request};
}
