"use client";
import {useRef,type CSSProperties,type ReactNode,type PointerEvent,type RefObject} from 'react';
import {Flower2} from 'lucide-react';
import {SCENES,VIEW_LABELS,nextSceneView,swipeDirection,viewImage,viewPlacement,type Scene,type SceneView} from '../_lib/scene-views';
import styles from '../space.module.css';

export default function SceneViewport({scene,view,portrait,quiet,reduced,loading,error,retry,onError,onRetry,onView,children,viewportRef}:{scene:Scene;view:SceneView;portrait:boolean;quiet:boolean;reduced:boolean;loading:boolean;error:boolean;retry:number;onError:()=>void;onRetry:()=>void;onView:(view:SceneView)=>void;children:ReactNode;viewportRef:RefObject<HTMLDivElement>}){
 const start=useRef<{id:number;x:number;y:number;localX:number;width:number}|null>(null);
 const placement=viewPlacement(scene,view,portrait);
 const pointerDown=(event:PointerEvent<HTMLDivElement>)=>{
  if(!event.isPrimary||event.button!==0||(event.target as HTMLElement).closest('button,a,input,select,textarea')){start.current=null;return;}
  const rect=event.currentTarget.getBoundingClientRect();start.current={id:event.pointerId,x:event.clientX,y:event.clientY,localX:event.clientX-rect.left,width:rect.width};
 };
 const pointerUp=(event:PointerEvent<HTMLDivElement>)=>{
  const from=start.current;start.current=null;if(!from||event.pointerId!==from.id)return;
  const direction=swipeDirection(event.clientX-from.x,event.clientY-from.y,from.localX,from.width);
  if(direction)onView(nextSceneView(view,direction));
 };
 return <div className={styles.worldViewport} ref={viewportRef} tabIndex={0} aria-label={`${SCENES[scene]} · ${VIEW_LABELS[view]}. 좌우 방향키로 둘러보기`} aria-busy={loading} data-quiet={quiet} onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={()=>{start.current=null;}} onLostPointerCapture={()=>{start.current=null;}} onKeyDown={event=>{
  if(event.target!==event.currentTarget)return;
  if(['ArrowLeft','ArrowRight','Home'].includes(event.key)){event.preventDefault();onView(event.key==='Home'?'front':nextSceneView(view,event.key==='ArrowRight'?1:-1));}
 }}>
  <div className={styles.world} data-scene={scene} data-view={view} data-reduced={reduced} style={{'--ml-character-width':placement.width+'%'} as CSSProperties}>
   {!error?<picture key={scene+'-'+view+'-'+retry} className={styles.sceneryPicture}>
    <source media="(max-width:700px) and (orientation:portrait)" srcSet={viewImage(scene,view,true)} width={768} height={1152}/>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className={styles.scenery} src={viewImage(scene,view,false)} width={1536} height={1024} alt={`${SCENES[scene]}의 ${VIEW_LABELS[view]} 풍경. 달빛과 연꽃, 꽃돼지 불상과 조용한 참배 자리`} onError={onError} loading="eager" decoding="async" draggable={false}/>
   </picture>:<div className={styles.artFallback}><Flower2 size={48}/><p>풍경을 불러오지 못했어요.<br/>명상과 108배는 계속 이용할 수 있어요.</p><button onClick={onRetry}>풍경 다시 불러오기</button></div>}
   {children}
  </div>
 </div>;
}
