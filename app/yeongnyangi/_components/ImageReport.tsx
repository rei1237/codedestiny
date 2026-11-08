"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {Download,Images,Share2} from 'lucide-react';
import {trackEvent} from '@/lib/analytics';
import type {FortuneRecord} from '../_lib/api';
import {buildReportModel,renderImageReport,reportCopy} from '../_lib/image-report';
import styles from './image-report.module.css';

const UI={
 ko:{title:'이미지 리포트',lead:(n:number)=>`이 상담의 ${n}개 장을 표지·핵심 키워드·장별 하이라이트·처방·마지막 한마디로 정리한 이미지 묶음이에요. 내 기기에서만 만들고 서버로 보내지 않아요.`,
  make:'이미지 리포트 만들기',making:'영냥이가 리포트를 엮고 있어요.',ready:(n:number)=>`${n}장의 이미지가 준비됐어요.`,saveAll:'모두 저장',share:'이미지로 공유',save:(n:number)=>`${n}번 저장`,
  failed:'이미지를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.',saved:'저장을 요청했어요. 기기의 사진이나 다운로드 폴더를 확인해 주세요.',shared:'공유 창에서 선택한 동작을 마쳤어요.',alt:(i:number,n:number)=>`영냥이 이미지 리포트 ${i} / ${n}`},
 en:{title:'Image report',lead:(n:number)=>`A set of images that gathers this reading's ${n} chapters into a cover, key words, chapter highlights, prescriptions and a last word. It is made on your device and never uploaded.`,
  make:'Make image report',making:'Yeongnyangi is putting your report together.',ready:(n:number)=>`${n} images are ready.`,saveAll:'Save all',share:'Share images',save:(n:number)=>`Save ${n}`,
  failed:'Could not make the images. Please try again shortly.',saved:'Save requested. Check your photos or downloads.',shared:'The share sheet action is complete.',alt:(i:number,n:number)=>`Yeongnyangi image report ${i} / ${n}`},
};

export default function ImageReport({row}:{row:FortuneRecord}){
 const model=useMemo(()=>buildReportModel(row),[row]);
 const locale=row.locale||'ko',copy=locale==='ko'?UI.ko:UI.en;
 const [pages,setPages]=useState<{url:string;blob:Blob}[]>([]),[status,setStatus]=useState<'idle'|'busy'|'ready'|'failed'>('idle'),[notice,setNotice]=useState('');
 const section=useRef<HTMLElement>(null);
 useEffect(()=>{if(model&&location.hash==='#image-report')section.current?.scrollIntoView({block:'start'});},[model]);
 useEffect(()=>()=>pages.forEach(p=>URL.revokeObjectURL(p.url)),[pages]);
 if(!model)return null;
 const ext=(blob:Blob)=>blob.type==='image/webp'?'webp':'jpg';
 const name=(i:number,blob:Blob)=>`yeongnyangi-report-${String(i+1).padStart(2,'0')}.${ext(blob)}`;
 async function make(){
  if(!model||status==='busy')return;
  setStatus('busy');setNotice('');
  try{const blobs=await renderImageReport(model);setPages(blobs.map(blob=>({blob,url:URL.createObjectURL(blob)})));setStatus('ready');trackEvent('fortune_image_report',{content_type:'yeongnyangi',tier:model.tier,pages:blobs.length,outcome:'rendered'});}
  catch{setStatus('failed');trackEvent('fortune_image_report',{content_type:'yeongnyangi',tier:model.tier,outcome:'failed'});}
 }
 function save(indexes:number[]){
  indexes.forEach((i,order)=>setTimeout(()=>{const a=document.createElement('a');a.href=pages[i].url;a.download=name(i,pages[i].blob);a.click();},order*300));
  setNotice(copy.saved);trackEvent('fortune_image_report',{content_type:'yeongnyangi',tier:model?.tier,outcome:'save_requested'});
 }
 async function share(){
  const files=pages.map((p,i)=>new File([p.blob],name(i,p.blob),{type:p.blob.type}));
  try{
   if(navigator.canShare?.({files})&&navigator.share){await navigator.share({files,title:reportCopy(locale).badge});setNotice(copy.shared);}
   else save(pages.map((_,i)=>i));
  }catch(e){if(!(e instanceof Error&&e.name==='AbortError'))save(pages.map((_,i)=>i));}
 }
 return <section ref={section} id="image-report" className={styles.report} lang={locale} aria-labelledby="image-report-title">
  <h2 id="image-report-title"><Images size={20} aria-hidden="true"/> {copy.title}</h2>
  <p>{copy.lead(model.chapters.length)}</p>
  {status!=='ready'&&<button className={styles.make} type="button" disabled={status==='busy'} onClick={()=>void make()}>{status==='busy'?copy.making:copy.make}</button>}
  {status==='failed'&&<p role="alert">{copy.failed}</p>}
  {status==='ready'&&<>
   <div className={styles.actions}>
    <button type="button" onClick={()=>void share()}><Share2 size={18} aria-hidden="true"/>{copy.share}</button>
    <button type="button" onClick={()=>save(pages.map((_,i)=>i))}><Download size={18} aria-hidden="true"/>{copy.saveAll}</button>
   </div>
   <ol className={styles.pages}>{pages.map((page,i)=><li key={page.url}>
    <img src={page.url} alt={copy.alt(i+1,pages.length)} loading={i?'lazy':'eager'}/>
    <button type="button" onClick={()=>save([i])}><Download size={16} aria-hidden="true"/>{copy.save(i+1)}</button>
   </li>)}</ol>
  </>}
  <p role="status" aria-live="polite" className={styles.notice}>{status==='busy'?copy.making:status==='ready'?notice||copy.ready(pages.length):notice}</p>
 </section>;
}
