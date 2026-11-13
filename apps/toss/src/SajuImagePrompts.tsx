import {Button} from './Button';
import {useState} from 'react';
export type ImagePrompt={id:string;title:string;prompt:string};
export default function ImagePrompts({items}:{items:ImagePrompt[]}){
  const [id,setId]=useState('treasure'),[status,setStatus]=useState('');
  const item=items.find(row=>row.id===id)||items[0];
  if(!item)return null;
  return <section className="paper"><h2>사주 그림 프롬프트</h2><p>태어난 날의 천간과 오행을 그림으로 표현하는 문장이에요.</p>
    <label>그림 주제<select value={item.id} onChange={event=>{setId(event.target.value);setStatus('');}}>{items.map(row=><option key={row.id} value={row.id}>{row.title}</option>)}</select></label>
    <p lang="en" data-saju-image-prompt={item.id}>{item.prompt}</p><Button variant="weak" onClick={async()=>{try{await navigator.clipboard.writeText(item.prompt);setStatus('프롬프트를 복사했어요.');}catch{setStatus('위 문장을 길게 눌러 복사해 주세요.');}}}>그림 프롬프트 복사</Button>{status&&<p role="status">{status}</p>}</section>;
}
