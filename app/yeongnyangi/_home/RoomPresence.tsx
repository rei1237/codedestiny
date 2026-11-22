'use client';
import {useState} from 'react';
import {Moon} from 'lucide-react';
import PetMascot from '../_components/PetMascot';

const asset=(name:string)=>`/assets/yeongnyangi/original/${name}.webp`;
const petLines=[
 ['뭘 그렇게 봐.','…모자 비뚤어졌어?'],
 ['손 흔든 거 아니야.','…아무튼, 반가워.'],
 ['고등어? 잠깐 줘 봐.','냄새만 맡는다니까.'],
 ['봤어?','아니, 바닥이 나를 밀었어.'],
];
export default function RoomPresence({atlasSize=1024}:{atlasSize?:number}){
 const [reaction,setReaction]=useState<number|null>(null);
 const speech=reaction===null?['어서 와.','네 방석은 비워뒀어.']:petLines[reaction]??petLines[0];
 return <section className="room-presence" aria-label="달빛 아래 영냥이의 점술방">
    <img className="room-scenery" src={asset('room-1440')} srcSet={`${asset('room-780')} 780w, ${asset('room-1440')} 1440w`} sizes="(min-width: 900px) 58vw, 100vw" width={1440} height={810} alt="" fetchPriority="high"/>
    <div className="room-welcome"><Moon size={14}/>잠깐, 여기서 쉬어가.</div>
    <div className="room-cat-speech" aria-live="polite" aria-atomic="true">{speech[0]}<br/>{speech[1]}</div>
    <PetMascot atlasSize={atlasSize} className="room-resident" alt="방석 위에서 이야기를 기다리는 영냥이" onReact={setReaction}/>
    <p className="room-presence-caption">남의 운명을 읽던 눈이, 오늘은 너를 기다린다.</p>
   </section>;
}
