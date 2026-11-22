"use client";
import {useContext,useEffect,useRef,useState,type PointerEvent} from 'react';
import {SpacePlatformContext} from '../_lib/space-platform';
import {Camera,Download,Share2,Pencil,Undo2,X} from 'lucide-react';
import {constrainTransform,transformGesture,hitTransform,type PhotoTransform,type PhotoPoint} from '../_lib/photo-transform';
import styles from '../space.module.css';
import {PHOTO_ART_POSES,PHOTO_POSES,type PhotoPose} from '../_lib/photo-poses';
const STICKERS=[['lotus','연꽃'],['moon','초승달'],['lantern','등불'],['cloud','구름'],['heart','하트'],['star','별']] as const;
const CAPTIONS=[['recharge','마음 충전 중'],['well-done','오늘도 잘했어'],['offline','잠시 로그아웃'],['happy-sip','행복 한 모금']] as const;
type Caption=typeof CAPTIONS[number][0];
type Sticker=typeof STICKERS[number][0];
const STICKER_BASE='/assets/moonlit-lotus/stickers-v1/';
type Point={x:number;y:number};
type Mark=({type:'pen';points:Point[];color:string;width:number}|{type:Sticker;x:number;y:number;color:string;size:number}|{type:'caption';text:string;x:number;y:number;color:string;size:number}) & {rotation?:number};
export default function PhotoStudio({target,onPrepare,poseDrawing,disabled=false}:{poseDrawing:(pose:PhotoPose)=>{url:string;frame:number;standalone?:boolean};disabled?:boolean;target:()=>HTMLElement|null;onPrepare:()=>void}){
 const[base,setBase]=useState<HTMLCanvasElement|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[marks,setMarks]=useState<Mark[]>([]),[tool,setTool]=useState<'move'|'pen'|Sticker|Caption>('move'),[color,setColor]=useState('#d65d86');
 const platform=useContext(SpacePlatformContext);
 const [pose,setPose]=useState<PhotoPose>('cheek'),[size,setSize]=useState(.06),[stickerReady,setStickerReady]=useState(false),[stickerError,setStickerError]=useState(false);
 const [character,setCharacter]=useState<PhotoTransform>({x:.5,y:.4,size:.25,rotation:0}),[selected,setSelected]=useState(-1),[history,setHistory]=useState<{marks:Mark[];character:PhotoTransform}[]>([]);
 const characterImage=useRef<{image:HTMLImageElement;frame:number;standalone?:boolean}|null>(null),initialCharacter=useRef(character);
 const current=useRef({marks,character,selected});current.current={marks,character,selected};
 const pointers=useRef(new Map<number,PhotoPoint>()),gesture=useRef<{start:PhotoPoint[];transform:PhotoTransform;index:number}|null>(null);
 const remember=()=>setHistory(h=>[...h.slice(-29),{marks:current.current.marks,character:current.current.character}]);
 const transformAt=(index:number):PhotoTransform|null=>{const state=current.current;if(index===-1)return state.character;const m=state.marks[index];return m&&m.type!=='pen'?{x:m.x,y:m.y*(base?base.height/base.width:1),size:m.size*2,rotation:m.rotation||0}:null;};
 const updateTransform=(index:number,t:PhotoTransform)=>{if(index===-1){current.current.character=t;setCharacter(t);}else{const next=current.current.marks.map((m,i)=>i===index&&m.type!=='pen'?{...m,x:t.x,y:t.y/(base?base.height/base.width:1),size:t.size/2,rotation:t.rotation}:m);current.current.marks=next;setMarks(next);}};
 const bounds=(index:number,t:PhotoTransform)=>{const m=current.current.marks[index];if(m?.type==='caption'){const ctx=canvas.current?.getContext('2d');if(ctx&&canvas.current){const font=t.size*.18;ctx.font=`600 ${font*canvas.current.width}px ${getComputedStyle(canvas.current).fontFamily}`;return {width:ctx.measureText(m.text).width/canvas.current.width+font*1.3,height:font*2.125};}}return {width:t.size,height:t.size};};
 const stopGesture=()=>{pointers.current.clear();gesture.current=null;drawing.current=false;};
 const stickers=useRef<Record<string,HTMLImageElement>>({});
 useEffect(()=>{let live=true;Promise.all(STICKERS.map(async([id])=>{const img=new Image();img.crossOrigin='anonymous';img.src=STICKER_BASE+id+'.svg';await img.decode();return [id,img] as const;})).then(items=>{if(live){stickers.current=Object.fromEntries(items);setStickerReady(true);}}).catch(()=>{if(live){setStickerError(true);setTool('pen');}});return()=>{live=false;};},[]);
 const dialog=useRef<HTMLDialogElement>(null),canvas=useRef<HTMLCanvasElement>(null),drawing=useRef(false),alive=useRef(true),button=useRef<HTMLButtonElement>(null),working=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(base&&!dialog.current?.open)dialog.current?.showModal();},[base]);
 useEffect(()=>{const c=canvas.current;if(!c||!base)return;const ctx=c.getContext('2d');if(!ctx)return;c.width=base.width;c.height=base.height;ctx.drawImage(base,0,0);
  const art=characterImage.current;if(art){ctx.save();ctx.translate(character.x*c.width,character.y*c.width);ctx.rotate(character.rotation*Math.PI/180);const side=character.size*c.width;if(art.standalone){const ratio=art.image.width/art.image.height,w=ratio>=1?side:side*ratio,h=ratio>=1?side/ratio:side;ctx.drawImage(art.image,-w/2,-h/2,w,h);}else{const w=art.image.width/4,h=art.image.height/4;ctx.drawImage(art.image,art.frame%4*w,Math.floor(art.frame/4)*h,w,h,-side/2,-side/2,side,side);}ctx.restore();}ctx.lineCap='round';ctx.lineJoin='round';
  for(const mark of marks){ctx.strokeStyle=mark.color;ctx.fillStyle=mark.color;if(mark.type==='pen'){ctx.lineWidth=mark.width*c.width;ctx.beginPath();mark.points.forEach((p,i)=>i?ctx.lineTo(p.x*c.width,p.y*c.height):ctx.moveTo(p.x*c.width,p.y*c.height));ctx.stroke();}else if(mark.type==='caption'){
   const theme=getComputedStyle(c),fontSize=c.width*mark.size*.36,padding=fontSize*.65;
   ctx.save();ctx.font=`600 ${fontSize}px ${theme.fontFamily}`;ctx.textAlign='center';ctx.textBaseline='middle';
   const w=ctx.measureText(mark.text).width+padding*2,h=fontSize+padding*1.5,x=0,y=0;ctx.translate(mark.x*c.width,mark.y*c.height);ctx.rotate((mark.rotation||0)*Math.PI/180);
   ctx.fillStyle=theme.getPropertyValue('--ml-ink').trim();ctx.strokeStyle=theme.getPropertyValue('--ml-gold').trim();ctx.lineWidth=Math.max(1,c.width*.0015);
   ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,h*.42);ctx.fill();ctx.stroke();ctx.fillStyle=theme.getPropertyValue('--ml-on-accent').trim();ctx.fillText(mark.text,x,y+fontSize*.04);ctx.restore();
  }else{const img=stickers.current[mark.type];if(img){const side=mark.size*c.width*2;ctx.save();ctx.translate(mark.x*c.width,mark.y*c.height);ctx.rotate((mark.rotation||0)*Math.PI/180);ctx.drawImage(img,-side/2,-side/2,side,side);ctx.restore();}}}
 },[base,marks,stickerReady,character,pose]);
 const capture=async(nextPose:PhotoPose=pose)=>{if(working.current)return;const node=target();if(!node){setNotice('풍경을 준비한 뒤 다시 눌러 주세요.');return;}working.current=true;setBusy(true);setNotice('');stopGesture();
  try{onPrepare();const drawing=poseDrawing(nextPose);const decoded=new Image();decoded.crossOrigin='anonymous';decoded.src=drawing.url;await decoded.decode();if(base){characterImage.current={image:decoded,...drawing};setPose(nextPose);return;}await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));const{default:html2canvas}=await import('html2canvas');const shot=await html2canvas(node,{scale:Math.min(2,1536/node.clientWidth),backgroundColor:'#fffaf7',useCORS:true,logging:false,ignoreElements:el=>el.hasAttribute('data-photo-hide'),onclone:doc=>{const figure=doc.querySelector<HTMLElement>('[data-photo-character]');if(figure)figure.style.visibility='hidden';const world=doc.querySelector<HTMLElement>('[data-scene]');if(world){world.style.left='0';world.style.transform='none';if(world.parentElement)world.parentElement.style.overflow='visible';}}});if(alive.current){const figure=node.querySelector<HTMLElement>('[data-photo-character]'),r=node.getBoundingClientRect(),f=figure?.getBoundingClientRect();const t={x:f?(f.left-r.left+f.width/2)/r.width:.5,y:f?(f.top-r.top+f.height/2)/r.width:.4,size:f?f.width/r.width:.25,rotation:0};initialCharacter.current=t;setCharacter(t);characterImage.current={image:decoded,...drawing};setSelected(-1);setTool('move');setHistory([]);setPose(nextPose);setBase(shot);}}
  catch{if(alive.current)setNotice('사진을 만들지 못했어요. 풍경과 캐릭터가 보이는지 확인하고 다시 시도해 주세요.');}finally{working.current=false;if(alive.current)setBusy(false);}
 };
 const close=()=>{if(working.current)return;dialog.current?.close();setBase(null);setMarks([]);setHistory([]);setNotice('');stopGesture();characterImage.current=null;button.current?.focus();};
 const point=(e:PointerEvent<HTMLCanvasElement>)=>{const r=e.currentTarget.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};};
 const caption=CAPTIONS.find(([id])=>id===tool),canPlace=tool!=='move'&&tool!=='pen'&&(!!caption||stickerReady);
 const add=(p:Point)=>{if(working.current||tool!=='pen'&&!canPlace)return;const mark:Mark=tool==='pen'?{type:'pen',points:[p,{x:p.x+.0001,y:p.y+.0001}],color,width:.004}:caption?{type:'caption',text:caption[1],...p,color,size}:{type:tool as Sticker,...p,color,size};if(current.current.marks.length>=100)return;remember();setSelected(tool==='pen'?-1:current.current.marks.length);const next=[...current.current.marks,mark];current.current.marks=next;setMarks(next);if(tool!=='pen')setTool('move');};
 const gesturePoint=(e:PointerEvent<HTMLCanvasElement>)=>{const r=e.currentTarget.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.width};};
 const rebase=()=>{const t=transformAt(current.current.selected);gesture.current=t?{start:[...pointers.current.values()],transform:t,index:current.current.selected}:null;};
 const pointerDown=(e:PointerEvent<HTMLCanvasElement>)=>{
  if(busy||pointers.current.size>=2)return;e.currentTarget.setPointerCapture(e.pointerId);
  if(tool!=='move'){if(pointers.current.size)return;pointers.current.set(e.pointerId,gesturePoint(e));drawing.current=tool==='pen';add(point(e));return;}
  const p=gesturePoint(e);if(!pointers.current.size){let index=-2;for(let i=current.current.marks.length-1;i>=-1;i--){const t=transformAt(i);if(t){const b=bounds(i,t);if(hitTransform(p,t,b.width,b.height,.012)){index=i;break;}}}if(index===-2)return;current.current.selected=index;setSelected(index);remember();}
  pointers.current.set(e.pointerId,p);rebase();
 };
 const pointerMove=(e:PointerEvent<HTMLCanvasElement>)=>{
  if(busy||!pointers.current.has(e.pointerId))return;
  if(drawing.current){const p=point(e);setMarks(old=>{const last=old.at(-1);return last?.type==='pen'&&last.points.length<3000?[...old.slice(0,-1),{...last,points:[...last.points,p]}]:old;});return;}
  pointers.current.set(e.pointerId,gesturePoint(e));const g=gesture.current;if(g&&base)updateTransform(g.index,transformGesture(g.transform,g.start,[...pointers.current.values()],base.height/base.width));
 };
 const pointerEnd=(e:PointerEvent<HTMLCanvasElement>)=>{pointers.current.delete(e.pointerId);drawing.current=false;if(pointers.current.size)rebase();else gesture.current=null;};
 useEffect(()=>{const stop=()=>stopGesture();window.addEventListener('blur',stop);document.addEventListener('visibilitychange',stop);return()=>{window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',stop);};},[]);
 const chosen=transformAt(selected),chosenBounds=chosen?bounds(selected,chosen):null;
 const adjust=(patch:Partial<PhotoTransform>)=>{if(!chosen||!base||busy)return;stopGesture();remember();updateTransform(selected,constrainTransform({...chosen,...patch},base.height/base.width));};
 const undo=()=>{stopGesture();const previous=history.at(-1);if(!previous)return;setMarks(previous.marks);setCharacter(previous.character);setHistory(h=>h.slice(0,-1));setSelected(-1);};
 const selectionLabel=selected===-1?'캐릭터':marks[selected]?.type==='caption'?'말풍선':STICKERS.find(([id])=>id===marks[selected]?.type)?.[1]||'꾸밈';
 const download=(blob:Blob,filename:string)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
 const save=async(share=false)=>{
  if(working.current||!canvas.current)return;working.current=true;setBusy(true);setNotice('');stopGesture();
  try{
   const blob=await new Promise<Blob|null>(resolve=>canvas.current!.toBlob(resolve,'image/png'));if(!blob||!alive.current)throw Error('empty');
   const filename='달빛-연화당-'+new Date().toISOString().slice(0,10)+'.png',file=new File([blob],filename,{type:'image/png'});
   let supported=false;if(share&&typeof navigator.share==='function'&&typeof navigator.canShare==='function'){try{supported=navigator.canShare({files:[file]});}catch{/* PNG fallback. */}}
   if(supported){
    try{await navigator.share({files:[file]});if(alive.current)setNotice('기기의 공유 메뉴로 사진을 전달했어요.');}
    catch(error){if(alive.current)setNotice(error instanceof Error&&error.name==='AbortError'?'공유를 취소했어요. 사진은 그대로 남아 있어요.':'공유하지 못했어요. PNG로 저장한 뒤 다시 공유해 주세요.');}
   }else{if(platform)await platform.savePhoto(blob,filename);else download(blob,filename);if(alive.current)setNotice(share?'이 기기에서는 파일 공유를 지원하지 않아 PNG 저장을 요청했어요. 다운로드를 확인해 주세요.':'인증샷 파일 저장을 요청했어요. 기기의 다운로드를 확인해 주세요.');}
  }catch{if(alive.current)setNotice('저장하지 못했어요. 다시 시도해 주세요.');}finally{working.current=false;if(alive.current)setBusy(false);}
 };
 return <><button ref={button} onClick={()=>void capture()} disabled={busy||disabled}><Camera size={17}/>{busy?'사진 준비 중':'인증샷 꾸미기'}</button>{notice&&!base&&<p role="status">{notice}</p>}<dialog ref={dialog} className={styles.photoDialog} onCancel={e=>{e.preventDefault();close();}} aria-labelledby="photo-title" aria-busy={busy}>
 <header><h2 id="photo-title">오늘의 나, 귀엽게 한 컷</h2><button onClick={close} disabled={busy} aria-label="사진 꾸미기 닫기"><X size={20}/></button></header><p>포즈를 고르고 마음에 드는 말을 붙여요. 자동으로 공개하거나 업로드하지 않아요.</p>
 {stickerError&&<p role="status">스티커를 불러오지 못했어요. 말풍선과 낙서, 사진 저장은 사용할 수 있어요.</p>}
 <section className={styles.photoWorkspace} aria-label="사진 편집">
 <div className={styles.photoStage}>
 <canvas ref={canvas} className={styles.photoCanvas} tabIndex={0} role="img" aria-label="인증샷 편집. 캐릭터와 스티커를 끌어서 이동하고 두 손가락으로 크기와 회전을 조절하세요." onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd} onKeyDown={e=>{const delta=e.shiftKey?.04:.01;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&chosen){e.preventDefault();adjust({x:chosen.x+(e.key==='ArrowLeft'?-delta:e.key==='ArrowRight'?delta:0),y:chosen.y+(e.key==='ArrowUp'?-delta:e.key==='ArrowDown'?delta:0)});}}}/>
 {base&&chosen&&chosenBounds&&tool==='move'&&<div className={styles.photoSelection} aria-hidden="true" style={{left:`${chosen.x*100}%`,top:`${chosen.y/base.height*base.width*100}%`,width:`${chosenBounds.width*100}%`,height:`${chosenBounds.height/base.height*base.width*100}%`,transform:`translate(-50%,-50%) rotate(${chosen.rotation}deg)`}}/>}
 </div><p className={styles.small}>한 손가락으로 이동 · 두 손가락으로 크기와 회전</p>
 <div className={styles.photoTools}><button aria-pressed={tool==='move'} onClick={()=>{stopGesture();setTool('move');}}>선택·이동</button><button disabled={!history.length||busy} onClick={undo}><Undo2 size={17}/>되돌리기</button></div>
 <label className={styles.photoObjectPicker}>편집할 대상 <select disabled={busy} value={selected} onChange={e=>{stopGesture();setSelected(Number(e.target.value));setTool('move');}}><option value={-1}>캐릭터</option>{marks.map((m,i)=>m.type!=='pen'&&<option key={i} value={i}>{i+1}. {m.type==='caption'?m.text:STICKERS.find(([id])=>id===m.type)?.[1]}</option>)}</select></label>
 {chosen&&<fieldset className={styles.photoTransformTools} disabled={busy}><legend>{selectionLabel} 조절</legend>
 <label>크기 <input aria-label="선택한 대상 크기" type="range" min={.04} max={.8} step={.01} value={chosen.size} onChange={e=>adjust({size:Number(e.target.value)})}/><output>{Math.round(chosen.size*100)}%</output></label>
 <label>회전 <input aria-label="선택한 대상 회전" type="range" min={-180} max={180} step={1} value={chosen.rotation} onChange={e=>adjust({rotation:Number(e.target.value)})}/><output>{Math.round(chosen.rotation)}°</output></label>
 <div className={styles.photoTools}>{(['왼쪽','오른쪽','위','아래'] as const).map((label,i)=><button key={label} aria-label={'선택한 대상 '+label+' 이동'} onClick={()=>adjust({x:chosen.x+(i===0?-.03:i===1?.03:0),y:chosen.y+(i===2?-.03:i===3?.03:0)})}>{label}</button>)}<button onClick={()=>adjust(selected===-1?initialCharacter.current:{rotation:0,size:.12})}>선택 초기화</button>{selected!==-1&&<button onClick={()=>{remember();setMarks(v=>v.filter((_,i)=>i!==selected));setSelected(-1);}}>선택 삭제</button>}</div>
 </fieldset>}
 </section>
 <details className={styles.photoLegacyPoses}><summary>캐릭터 포즈 바꾸기</summary>
 <fieldset className={styles.photoArtPoses} disabled={busy}><legend>어떤 모습으로 남길까요?</legend>{PHOTO_ART_POSES.map(([id,label])=><button key={id} aria-pressed={pose===id} onClick={()=>void capture(id)}><img src={poseDrawing(id).url} width={112} height={112} alt="" loading="lazy" decoding="async"/><span>{label}</span></button>)}</fieldset>
 <details className={styles.photoLegacyPoses}><summary>차분한 기본 포즈도 보기</summary><fieldset className={styles.photoPoses} disabled={busy}><legend>사진 속 나의 포즈</legend>{PHOTO_POSES.map(([id,label])=><button key={id} aria-pressed={pose===id} onClick={()=>void capture(id)}>{label}</button>)}</fieldset></details>
 <p className={styles.small}>포즈를 바꿔도 위치와 꾸밈은 그대로 남아요.</p></details>

 <fieldset className={styles.photoEditTools} disabled={busy}><legend>마음대로 꾸미기</legend>
 <div className={styles.photoTools} aria-label="사진 도구"><button aria-pressed={tool==='pen'} onClick={()=>setTool('pen')}><Pencil size={17}/>낙서</button>{STICKERS.map(([id,label])=><button key={id} disabled={!stickerReady} aria-pressed={tool===id} onClick={()=>setTool(id)}><img src={STICKER_BASE+id+'.svg'} width={32} height={32} alt=""/>{label}</button>)}<label>낙서 색 <input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label><label>스티커 크기 <select value={size} onChange={e=>setSize(Number(e.target.value))}><option value={.035}>작게</option><option value={.06}>보통</option><option value={.09}>크게</option></select></label><button disabled={!marks.length} onClick={()=>{remember();setMarks([]);setSelected(-1);}}>꾸밈 지우기</button></div>
 <div className={styles.photoCaptions} aria-label="말풍선 스티커">{CAPTIONS.map(([id,label])=><button key={id} aria-pressed={tool===id} onClick={()=>setTool(id)}>{label}</button>)}</div>
 <p className={styles.small}>스티커를 고르고 사진을 눌러 놓아요. 놓은 뒤에는 끌어서 옮겨요. 편집할 대상을 고르면 크기와 각도도 바꿀 수 있어요.</p>
 <div className={styles.photoTools}><button disabled={!canPlace||marks.length>=100} onClick={()=>add({x:.5,y:.5})}>스티커 가운데 놓기</button></div>
 </fieldset>
 {notice&&<p role="status">{notice}</p>}<div className={styles.photoSaveActions}><button className={styles.primary} onClick={()=>void save()} disabled={busy}><Download size={18}/>PNG로 저장하기</button><button onClick={()=>void save(true)} disabled={busy}><Share2 size={18}/>사진 공유하기</button></div><p className={styles.small}>편집은 이 창에만 남아요. 닫기 전에 저장해 주세요. 최대 100개의 낙서·스티커를 놓을 수 있어요. 공유는 기기의 공유 메뉴에서 직접 선택해요.</p>
 </dialog></>;
}
