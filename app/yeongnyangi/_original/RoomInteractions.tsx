"use client";

import {useState} from 'react';
import {ArrowRight, BookOpen, Coffee, Fish, Moon, PawPrint, ScrollText} from 'lucide-react';
import Image from 'next/image';

const moments = {
 fish: {title:'생선 보여주기',line:'그 크기로는 어림없… 앉아. 내가 방금 앉으라고 했나?',aside:'거절하는 입과 달리, 앞발은 이미 복채를 받을 준비를 끝냈다.'},
 pet: {title:'쓰다듬기',line:'머리는 안 된다고 했… 잠깐만. 손은 왜 벌써 떼는데.',aside:'꼬리는 싫다는 말보다 조금 늦게 멈췄다.'},
 tea: {title:'찻잔 내밀기',line:'사람일 땐 늘 차를 식혀 마셨는데. 지금은 뜨거우면 혀가 먼저 항의하네. 같이 식히자.',aside:'영냥이는 빈 방석 하나를 네 쪽으로 끌어왔다.'},
 moon: {title:'창밖 함께 보기',line:'가끔은 아직 사람인 꿈을 꿔. 깨면 좀… 그렇지. 그래도 오늘은 옆에 누가 있네.',aside:'달빛이 둘 사이에 조용히 내려앉았다.'},
};
const notes = [
 {label:'마음이 복잡해',title:'멈추는 것도 오늘의 선택',text:'문제가 한꺼번에 오면 전부 오늘 풀어야 할 것 같지. 종이에 적고, 오늘 할 수 있는 것 하나에만 동그라미 쳐. 나머지는 내일의 너와 나눠 맡아.',action:'지금 할 수 있는 일 한 줄 적기'},
 {label:'관계가 궁금해',title:'답장을 예언하는 대신',text:'상대의 침묵을 네 잘못으로 번역하지 마. 확인한 사실과 상상한 이유를 따로 적어 봐. 연락한다면 답을 재촉하는 말 대신 네 마음 한 문장이면 돼.',action:'사실과 추측을 하나씩 나누기'},
 {label:'한 발 내딛고 싶어',title:'운이 들어올 자리 하나',text:'크게 바꾸겠다고 책상부터 뒤집지는 말고. 미뤄둔 연락 하나, 서류 한 장, 연습 십 분. 다음 기회가 왔을 때 바로 움직일 자리를 만들어 둬.',action:'십 분 안에 끝낼 준비 하나 고르기'},
];
export default function RoomInteractions({onStory}:{onStory:()=>void}){
 const [moment,setMoment] = useState<keyof typeof moments>('pet');
 const [fishAttempt,setFishAttempt] = useState(0);
 const [touched,setTouched] = useState(false);
 const [note,setNote] = useState<number|null>(null);
 const [done,setDone] = useState(false);
 function touch(next:keyof typeof moments){setMoment(next);setTouched(true);if(next==='fish')setFishAttempt(value=>value+1);}
 return <section className="room-companion" aria-labelledby="companion-title">
  <h2 id="companion-title">오늘은 조금 더 머물러.</h2>
  <p className="room-companion-intro">찻잔을 내밀고, 창밖을 보고.<br/>말을 걸지 않아도 함께 있을 수 있는 방.</p>
  <div className="room-objects" role="group" aria-label="영냥이와 함께하기">
   <button type="button" aria-pressed={touched&&moment==='pet'} onClick={()=>touch('pet')}><PawPrint size={18}/>쓰다듬기</button>
   <button type="button" aria-pressed={touched&&moment==='tea'} onClick={()=>touch('tea')}><Coffee size={18}/>찻잔 내밀기</button>
   <button type="button" aria-pressed={touched&&moment==='moon'} onClick={()=>touch('moon')}><Moon size={18}/>창밖 보기</button>
   <button type="button" aria-pressed={touched&&moment==='fish'} onClick={()=>touch('fish')}><Fish size={18}/>생선 보여주기</button>
   <button type="button" onClick={onStory}><BookOpen size={18}/>네오의 이야기</button>
  </div>
  <div className="room-moment" aria-live="polite" aria-atomic="true">
   <div className="room-moment-portrait"><Image src={moment==='fish'?'/assets/yeongnyangi/original/neo-fish-curse.webp':`/assets/yeongnyangi/moods/${moment==='tea'?'coffee-sigh':moment==='moon'?'ponder':'shy'}.webp`} width={180} height={150} alt=""/></div>
   <div><p>{touched?(moment==='fish'&&fishAttempt>1?(fishAttempt%2===0?'이번엔 거절할 거야. …그건 고등어야? 아니, 그냥 확인한 거야.':'입은 거절했는데 앞발이 받았어. 계약 당사자는 앞발이야. 나는 억울해.'):moments[moment].line):'어서 와. 방석은 거기. …금방 갈 건 아니지?'}</p><small>{touched?moments[moment].aside:'영냥이가 모자를 바로 쓰고 네 자리를 살핀다.'}</small></div>
  </div>
  <p className="room-play-note">방 안 놀이는 멸치를 쓰지 않아. 마음껏 말 걸어도 돼.</p>
  <div className="room-note-drawer">
   <h3><ScrollText size={18}/>네오의 운세 쪽지</h3>
   <p>지금 마음에 맞는 쪽지를 골라 봐. 오늘 실천할 작은 힌트야.</p>
   <div className="room-note-options">{notes.map((item,index)=><button key={item.label} type="button" aria-pressed={note===index} onClick={()=>{setNote(index);setDone(false);}}>{item.label}</button>)}</div>
   {note!==null&&<div className="room-note-result" aria-live="polite"><h4>{notes[note].title}</h4><p>{notes[note].text}</p><button type="button" aria-pressed={done} onClick={()=>setDone(value=>!value)}>{done?'오늘의 작은 실천, 해냈어':notes[note].action}<PawPrint size={16}/></button>{done&&<p className="room-note-praise">“좋아. 오늘은 그만큼 움직인 네 편을 들어줘.”</p>}</div>}
   <small>쪽지는 마음을 정리하는 이야기야. 개인 운세 해석은 아래에서 확인해.</small>
   <a href="#daily">멸치로 오늘의 운세 보기<ArrowRight size={16}/></a>
  </div>
 </section>;
}
