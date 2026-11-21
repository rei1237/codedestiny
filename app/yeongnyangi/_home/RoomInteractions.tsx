"use client";

import {useState} from 'react';
import {ArrowRight, Coffee, Fish, Moon, PawPrint, ScrollText, WandSparkles} from 'lucide-react';
import Image from 'next/image';

const moments = {
 tea: {label:'찻잔 건네기',icon:Coffee,portrait:'coffee-sigh',lines:[
  ['차는 좀 식혀. 고양이 혀라고 안 데는 건 아니거든.','영냥이가 자기 찻잔 옆에 네 잔을 놓는다.'],
  ['한 모금 마시고 얘기해. 급한 거 아니면 천천히 들어줄게.','꼬리가 방석 가장자리에서 느긋하게 흔들린다.'],
 ]},
 fish: {label:'고등어 보여주기',icon:Fish,portrait:'fish',lines:[
  ['고등어? 잠깐 줘 봐. 냄새만 맡는 거야.','영냥이의 앞발은 이미 고등어를 둘 다 잡고 있다.'],
  ['이건 점술용이야. …뭘 점치냐고? 얼마나 맛있는지.','영냥이가 슬쩍 고등어를 자기 쪽으로 끌어당긴다.'],
 ]},
 moon: {label:'창밖 같이 보기',icon:Moon,portrait:'ponder',lines:[
  ['오늘 달 예쁘네. 그렇다고 뭐 꼭 빌어야 하는 건 아니야. 그냥 봐도 돼.','영냥이가 창가 한쪽 자리를 비워준다.'],
  ['가끔 사람일 때 꿈을 꿔. 깨고 나면 좀 이상한데… 오늘은 옆에 네가 있네.','둘 사이에 달빛이 가만히 내려앉는다.'],
 ]},
 pet: {label:'쓰다듬기',icon:PawPrint,portrait:'shy',lines:[
  ['머리는 안 된다고 했… 잠깐. 손을 그렇게 빨리 뗄 건 없잖아.','꼬리는 싫다는 말보다 조금 늦게 멈춘다.'],
  ['턱 밑은 괜찮아. 딱 한 번만 더. …방금 건 안 셌어.','영냥이가 모자 끝을 눈 위로 꾹 당긴다.'],
 ]},
 hat: {label:'모자에 말 걸기',icon:WandSparkles,portrait:'ponder',lines:[
  ['이 모자? 별 얘기를 다 들어. 나는 못 들은 척하고.','모자의 초승달 장식이 살짝 흔들린다.'],
  ['내가 기숙사를 고르는 건 아니야. 모자가 널 보고, 나는 통역하는 쪽이지.','영냥이가 모자 챙을 바로잡는다.'],
 ]},
} as const;
const momentKeys=Object.keys(moments) as Array<keyof typeof moments>;
const notes = [
 {label:'마음이 복잡해',title:'멈추는 것도 오늘의 선택',text:'문제가 한꺼번에 오면 전부 오늘 풀어야 할 것 같지. 종이에 적고, 오늘 할 수 있는 것 하나에만 동그라미 쳐. 나머지는 내일의 너와 나눠 맡아.',action:'지금 할 수 있는 일 한 줄 적기'},
 {label:'관계가 궁금해',title:'답장을 예언하는 대신',text:'상대의 침묵을 네 잘못으로 번역하지 마. 확인한 사실과 상상한 이유를 따로 적어 봐. 연락한다면 답을 재촉하는 말 대신 네 마음 한 문장이면 돼.',action:'사실과 추측을 하나씩 나누기'},
 {label:'한 발 내딛고 싶어',title:'운이 들어올 자리 하나',text:'크게 바꾸겠다고 책상부터 뒤집지는 말고. 미뤄둔 연락 하나, 서류 한 장, 연습 십 분. 다음 기회가 왔을 때 바로 움직일 자리를 만들어 둬.',action:'십 분 안에 끝낼 준비 하나 고르기'},
];
export default function RoomInteractions(){
 const [scene,setScene]=useState<{key:keyof typeof moments;turn:number}|null>(null);
 const [seen,setSeen]=useState<Partial<Record<keyof typeof moments,number>>>({});
 const [note,setNote]=useState<number|null>(null);
 const [done,setDone]=useState(false);
 function talk(key:keyof typeof moments){const turn=seen[key]??0;setScene({key,turn});setSeen({...seen,[key]:turn+1});}
 const current=scene?moments[scene.key]:null;
 const [line,aside]=current&&scene?current.lines[scene.turn%current.lines.length]:['어서 와. 방석은 거기. …금방 갈 건 아니지?','영냥이가 모자를 바로 쓰고 네 자리를 살핀다.'];
 const portrait=!current?'/assets/yeongnyangi/moods/shy.webp':current.portrait==='fish'?'/assets/yeongnyangi/original/neo-fish-curse.webp':`/assets/yeongnyangi/moods/${current.portrait}.webp`;
 return <section id="room-chat" tabIndex={-1} className="room-companion" aria-labelledby="companion-title">
  <h2 id="companion-title">영냥이와 잠깐 잡담</h2>
  <p className="room-companion-intro">차 한 잔 할래? 굳이 운세 보러 온 게 아니어도 돼.</p>
  <div className="room-objects" role="group" aria-label="영냥이에게 말 걸기">
   {momentKeys.map(key=>{const {label,icon:Icon}=moments[key];return <button key={key} type="button" aria-pressed={scene?.key===key} onClick={()=>talk(key)}><Icon size={18} aria-hidden="true"/>{label}</button>;})}
  </div>
  <div className="room-moment" aria-live="polite" aria-atomic="true">
   <div className="room-moment-portrait"><Image src={portrait} width={180} height={150} alt=""/></div>
   <div><p>{line}</p><small>{aside}</small></div>
  </div>
  <p className="room-play-note">잡담에는 멸치를 쓰지 않아. 마음껏 말 걸어도 돼.</p>
  <details className="room-note-drawer">
   <summary><ScrollText size={18} aria-hidden="true"/>네오의 운세 쪽지</summary>
   <p>지금 마음에 맞는 쪽지를 골라 봐. 오늘 실천할 작은 힌트야.</p>
   <div className="room-note-options">{notes.map((item,index)=><button key={item.label} type="button" aria-pressed={note===index} onClick={()=>{setNote(index);setDone(false);}}>{item.label}</button>)}</div>
   {note!==null&&<div className="room-note-result" aria-live="polite"><h4>{notes[note].title}</h4><p>{notes[note].text}</p><button type="button" aria-pressed={done} onClick={()=>setDone(value=>!value)}>{done?'오늘의 작은 실천, 해냈어':notes[note].action}<PawPrint size={16} aria-hidden="true"/></button>{done&&<p className="room-note-praise">“좋아. 오늘은 그만큼 움직인 네 편을 들어줘.”</p>}</div>}
   <small>쪽지는 마음을 정리하는 이야기야. 개인 운세 해석은 아래에서 확인해.</small>
   <a href="#daily">오늘의 운세 보기<ArrowRight size={16} aria-hidden="true"/></a>
  </details>
 </section>;
}
