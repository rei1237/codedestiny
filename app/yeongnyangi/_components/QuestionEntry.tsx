'use client';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import FirstVisitProgress from './FirstVisitProgress';
import YeongnyangiRoomScene from './YeongnyangiRoomScene';
import styles from './question-checkout.module.css';

/** The same first question, without importing the consultation catalogue or checkout. */
// Each consultation greets the question with its own Yeongnyangi room film; the quick entry has no consultation yet, so it plays the fusion room (2026-11-25).
export default function QuestionEntry({question,onQuestion,onOpen,busy=false,domain='fusion'}:{question:string;onQuestion:(question:string)=>void;onOpen:()=>void;busy?:boolean;domain?:DomainId|'fusion'}){
 return <form className={styles.entry} onSubmit={event=>{event.preventDefault();if(!question.trim()||busy)return;onOpen();}}>
  <FirstVisitProgress ready={false}/>
  <div className={styles.entryFilm}><YeongnyangiRoomScene domain={domain} shot="intro"/></div>
  <h1>지금, 어떤 마음이 궁금하세요?</h1><p>고민을 들려주세요. 선택한 풀이 자료를 바탕으로 AI가 해설해요. 다음 화면에서 상담 범위와 이용권·가격을 확인해요.</p>
  <label htmlFor="yn-question">상담 질문</label><textarea id="yn-question" maxLength={1000} rows={4} value={question} onChange={event=>onQuestion(event.target.value)} placeholder="지금 겪고 있는 상황과 가장 알고 싶은 것을 편하게 적어주세요."/>
  <button disabled={busy||!question.trim()} type="submit">상담과 결제 확인하기</button>
 </form>;
}
