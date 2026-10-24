'use client';
import {useEffect} from 'react';
import {useFirstVisit} from '../_lib/use-first-visit';
import {firstVisitEvent,writeFirstVisit} from '@/js/first-visit-state.mjs';
import styles from './first-visit.module.css';
export default function FirstVisitProgress({ready}:{ready:boolean}){
 const {state}=useFirstVisit();
 useEffect(()=>{
  if(ready&&state?.status==='active'){writeFirstVisit('yeongnyangi','complete',3);firstVisitEvent('yeongnyangi','complete',3);}
 },[ready,state]);
 if(!state||!['active','complete'].includes(state.status))return null;
 return <aside className={styles.progress} aria-label="첫 상담 안내">
  <strong>{state.status==='complete'?'좋아, 이제 상담 구성을 살펴보자.':'지금 마음에 남은 고민부터 들려줘.'}</strong>
  <p>{state.status==='complete'?'무엇을 살펴볼지, 어떤 결과를 받을지, 가격은 얼마인지 아래에서 확인해 줘. 네 고민에 맞을 때 시작하면 돼. 결제는 네가 직접 선택한 뒤에 진행돼.':'지금의 상황과 알고 싶은 점을 하나씩 적어봐. 필요한 프로필과 정보를 확인한 뒤 상담 범위와 가격을 보여줄게. 아직 정리가 안 됐다면 나중에 돌아와도 괜찮아.'}</p>
 </aside>;
}

