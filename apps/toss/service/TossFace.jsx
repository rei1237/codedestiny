import {useEffect,useRef,useState} from 'react';
import {gunzipSync,strFromU8} from 'fflate';
import runtime from 'virtual:toss-face-reading';

export default function TossFace(){
 const frame=useRef(null),[source,setSource]=useState(''),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const past=location.pathname.startsWith('/past-life-face');
 useEffect(()=>{
  let live=true;
  async function load(){
   setSource('');setError('');
   try{
    const response=await fetch(runtime);if(!response.ok)throw Error('FACE_RUNTIME');
    const source=strFromU8(gunzipSync(new Uint8Array(await response.arrayBuffer())));
    if(!live)return;
    setSource(source);
   }catch{if(live)setError('관상 화면을 불러올 수 없어요. 다시 열어 주세요.');}
  }
  void load();
  const close=e=>{if(e.source===frame.current?.contentWindow&&e.data==='toss-face-close')location.replace('/?world=ggulggul');};
  const back=e=>{if(frame.current){e.preventDefault();frame.current.contentWindow?.postMessage('toss-face-back','*');}};
  window.addEventListener('message',close);window.addEventListener('code-destiny:toss-back',back);
  return()=>{live=false;window.removeEventListener('message',close);window.removeEventListener('code-destiny:toss-back',back);};
 },[attempt]);
 if(!source)return <main><h1>{past?'전생 관상':'전문가 동물 관상'}</h1>{error?<><p role="alert">{error}</p><button onClick={()=>setAttempt(n=>n+1)}>다시 열기</button></>:<p role="status">사진 분석 화면을 열고 있어요.</p>}</main>;
 const doc='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#171428}</style></head><body><script>window.__tossFaceMode="'+(past?'past':'animal')+'";'+source.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
 return <iframe ref={frame} title={past?'전생 관상':'전문가 동물 관상'} sandbox="allow-scripts allow-downloads" referrerPolicy="no-referrer" srcDoc={doc} style={{width:'100%',height:'100dvh',border:0,display:'block'}}/>;
}
