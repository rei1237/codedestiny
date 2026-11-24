import {useEffect,useMemo,useRef,useState} from 'react';
import {File as TossFile} from '@apps-in-toss/web-framework';
import {api,getTossSessionRevision,hasTossSession,isToss} from './platform';
import {Button} from './Button';
import {buildBrainModel} from './brain-reading';
import {readBrainLayers} from './brain-layers.mjs';

const emptyLayers={hdChart:null,vedicBasis:null};
export default function BrainReading({scope,birth,onLogin}){
 const [layers,setLayers]=useState(emptyLayers),[gender,setGender]=useState(''),[status,setStatus]=useState('idle'),[view,setView]=useState('chakra');
 const [format,setFormat]=useState('feed'),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
 const host=useRef(null),epoch=useRef(0),pending=useRef(false),exporting=useRef(false);
 const signedIn=hasTossSession(),revision=getTossSessionRevision();
 const model=useMemo(()=>buildBrainModel(scope,layers.hdChart,layers.vedicBasis),[scope,layers]);
 useEffect(()=>()=>{epoch.current++;},[]);
 useEffect(()=>{
   if(host.current)window.DestinyAnatomyRender.renderSajuSections(host.current,model,{view,layer:!birth?'timeUnknown':signedIn?status:'login'});
 },[model,view,birth,signedIn,status]);
 async function authenticate(){
   try{await onLogin();}catch{setNotice('로그인을 마치지 못했어요. 다시 시도해 주세요.');}
 }
 async function read(){
   if(!birth||!signedIn||!gender||pending.current)return;
   const requestEpoch=++epoch.current;pending.current=true;setStatus('loading');setNotice('');
   try{
     const result=await readBrainLayers(api,birth,gender);
     if(requestEpoch!==epoch.current||revision!==getTossSessionRevision())return;
     setLayers(result);setView(result.hdChart?'hd':'chakra');
     setStatus(result.hdChart&&result.vedicBasis?'ready':'failed');
     if(!result.hdChart||!result.vedicBasis)setNotice('일부 차트를 불러오지 못했어요. 같은 정보로 다시 확인해 주세요.');
   }finally{if(requestEpoch===epoch.current)pending.current=false;}
 }
 async function exportImage(share){
   if(exporting.current)return;
   exporting.current=true;setSaving(true);setNotice('');
   const current=()=>revision===getTossSessionRevision()&&host.current;
   try{
     const blob=await window.DestinyAnatomyShareCard.createBlob(model,{format});if(!current())return;
     const name='destiny-anatomy-'+format+'.png',file=new File([blob],name,{type:'image/png'});
     if(share&&navigator.canShare?.({files:[file]})&&typeof navigator.share==='function'){
       await navigator.share({files:[file],title:model.text.ui.title});
       if(current())setNotice('공유 화면을 닫았어요.');
     }else{
       if(!isToss()||!TossFile.saveBase64.isSupported())throw Error('SAVE_UNAVAILABLE');
       const bytes=new Uint8Array(await blob.arrayBuffer());if(!current())return;
       let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
       await TossFile.saveBase64({data:btoa(binary),fileName:name,mimeType:'image/png'});
       if(current())setNotice(share?'이 기기의 파일 공유를 대신해 뇌구조 이미지를 저장했어요.':'뇌구조 이미지를 저장했어요.');
     }
   }catch(error){if(current())setNotice(error?.name==='AbortError'?'공유를 취소했어요.':'이미지를 내보내지 못했어요. 토스 앱에서 다시 시도해 주세요.');}
   finally{exporting.current=false;if(current())setSaving(false);}
 }
 return <section aria-label="나의 뇌구조 결과">
   <div id="destinyAnatomyCard" ref={host} onClick={e=>{
     const button=e.target.closest?.('button[data-da-act]');if(!button)return;
     if(button.dataset.daAct==='login')void authenticate();
     if(button.dataset.daAct==='view')setView(button.dataset.daView);
   }}/>
   {birth&&signedIn&&<div className="form"><label>베다 차트의 출생 성별<select value={gender} disabled={status==='loading'} onChange={e=>{setGender(e.target.value);setLayers(emptyLayers);setStatus('idle');setNotice('');}}><option value="">선택해 주세요</option><option value="female">여성</option><option value="male">남성</option></select></label>
    <Button disabled={!gender||status==='loading'} onClick={read}>{status==='failed'?'차트 다시 불러오기':'휴먼 디자인·베다 함께 보기'}</Button></div>}
   <label>결과 이미지 형식<select value={format} onChange={e=>setFormat(e.target.value)}><option value="feed">피드용</option><option value="story">스토리용</option></select></label>
   <Button disabled={saving} onClick={()=>exportImage(false)}>뇌구조 이미지 저장</Button>
   <Button variant="weak" disabled={saving} onClick={()=>exportImage(true)}>이미지 공유</Button>
   {notice&&<p role="status">{notice}</p>}
 </section>;
}
