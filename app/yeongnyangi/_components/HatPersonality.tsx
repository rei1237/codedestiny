"use client";
import {useState} from 'react';
import Image from 'next/image';
import {hatHouses,type HatResult} from '@/lib/yeongnyangi/hat-houses';
import {hatPersonality} from '@/lib/yeongnyangi/hat-personality';
import styles from './sorting-hat.module.css';

export default function HatPersonality({result}:{result:HatResult}){
 const [choice,setChoice]=useState<number|null>(null);
 const story=hatPersonality[result.houseId],house=hatHouses.find(h=>h.id===result.houseId)!;
 const secondary=hatHouses.find(h=>h.id!==house.id&&result.reasons.some(reason=>reason.houseId===h.id));
 return <div className={styles.personality}>
  <section className={styles.arrival}><div className={styles.hatSignature}><Image src="/assets/yeongnyangi/hat/spirit-hat-v2.png" width={1254} height={1254} sizes="96px" alt="너의 이야기를 읽어주는 영적인 모자"/><span>모자가 남긴 너의 첫인상</span></div><h4>{story.nickname}</h4><p>{story.arrival}</p><p className={styles.note}>모자가 들려주는 기숙사 세계관 이야기예요.</p></section>
  <section><h4>모자가 읽은, 타고난 마음의 결</h4><p>{story.temperament}</p>{secondary&&<p>그렇다고 {house.trait}의 색만 있는 것은 아니란다. 이번 출생 해석에는 {secondary.trait}의 단서도 함께 담겼지. 한 기숙사에 왔다고 네 모든 모습이 한 가지가 되는 것은 아니니.</p>}</section>
  <section><h4>가까운 사람 앞에서는</h4><p>{story.relationship}</p></section>
  <section><h4>일하고, 고르고, 돈을 쓸 때는</h4><p>{story.work}</p></section>
  <details className={styles.secret}><summary>모자의 비밀 쪽지 펼치기</summary><p>{story.secret}</p></details>
  <section className={styles.firstNight}><h4>기숙사에서의 첫 저녁, 너는?</h4><p>이야기 속 작은 선택을 해봐. 배정 결과는 그대로야.</p><div className={styles.choices}>{story.choices.map((option,index)=><button type="button" key={option.label} aria-pressed={choice===index} onClick={()=>setChoice(index)}>{option.label}</button>)}</div><p className={styles.reply} role="status" aria-live="polite">{choice!==null?<>모자: “<span>{story.choices[choice].reply}</span>”</>:'마음이 가는 쪽을 골라봐. 모자가 할 말이 더 있대.'}</p></section>
  <p className={styles.keepsake}><strong>모자가 이야기 속에서 건네는 입학 선물</strong>{story.keepsake}</p>
 </div>;
}
