"use client";
import {useState} from 'react';
import {SPIRIT_IMAGE,SPIRIT_TITLE,SPIRIT_NOTICE,buildSpiritShare} from '@/worker/yeongnyangi/fortune/spirit-contract';
import type {FortuneRecord} from '../_lib/api';
import styles from '../yeongnyangi.module.css';
export default function SpiritResult({row}:{row:FortuneRecord}){
  const [message,setMessage]=useState('');
  const spirit=row.consultation?.spirit;
  async function share(){
    // Only an allowlisted reflection key enters the anonymous summary:
    // no question, name, birth information, result id, or private URL can escape.
    const spiritShare=buildSpiritShare(spirit?.shareKey);
    try{if(navigator.share)await navigator.share(spiritShare);else {await navigator.clipboard.writeText(`${spiritShare.title}\n${spiritShare.text}`);setMessage('익명 소개를 복사했어요.');}}catch{setMessage('공유를 마치지 못했어요. 다시 시도할 수 있어요.');}
  }
  if(!spirit)return null;
  return <div className={styles.spirit}>
    <header className={styles.spiritIntro}><img src={SPIRIT_IMAGE} width={303} height={320} alt="작은 북을 든 영냥이"/><div><h1>{SPIRIT_TITLE}</h1><p>{row.chapters[0]?.summary||'질문의 결을 살피는 중'}</p></div></header>
    <p>상담 기준: {new Date(spirit.askedAt).toLocaleString('ko-KR',{timeZone:row.consultation?.timezone||'Asia/Seoul'})} · {row.consultation?.timezone}</p>
    <p>{row.consultation?.topicLabel} · {spirit.relationship}</p>
    {row.state!=='REFUNDED'&&<>
      <p role="status">{row.state==='COMPLETED'?'모든 이야기의 저장을 확인했어.':row.chapters.length===row.manifest.length?'저장된 이야기를 최종 확인하는 중':row.chapters.length<2?'질문의 결을 살피는 중':'인연의 흐름을 정리하는 중'} · {row.chapters.length}/{row.manifest.length} 저장됨</p>
      <progress value={row.chapters.length+(row.state==='COMPLETED'?1:0)} max={row.manifest.length+1} aria-label="이야기 저장과 최종 확인 진행률"/>
      {row.chapters.map((chapter,index)=><article className={styles.chapter} key={row.manifest[index].id}>
        <h2>{row.manifest[index].title}</h2>
        {index===1&&<p className={styles.summary}>{spirit.space}</p>}
        {index===3&&<p className={styles.summary}>{row.consultation?.asOf} 기준. {spirit.timing}</p>}
        {index!==0&&<p>{chapter.summary}</p>}
        {chapter.questionAnswers?.map(answer=><section key={answer.questionId}><h3>{row.consultation?.questions?.find(q=>q.id===answer.questionId)?.text||'질문에 대한 답변'}</h3><p>{answer.answer}</p><p>{answer.reason}</p><p>{answer.timing}</p><p>{answer.action}</p></section>)}
        {chapter.blocks?.map((block,i)=><section key={i}><h3>{block.title}</h3>{block.paragraphs.map((p,j)=><p key={j}>{p}</p>)}</section>)}
        <p>{chapter.example}</p><p>{chapter.advice}</p>
      </article>)}
      {row.state==='COMPLETED'&&<section className={styles.chapter}><h2>영냥이의 마무리</h2><p>{row.chapters.at(-1)?.persona}</p><button onClick={()=>void share()}>익명 요약 공유하기</button>{message&&<p role="status">{message}</p>}</section>}
    </>}
    <p>{SPIRIT_NOTICE}</p><nav className={styles.spiritLinks} aria-label="다음 상담"><a href="/yeongnyangi/library/">내 상담 기록</a><a href="/yeongnyangi/fortune/?mode=spirit">새 상담 시작하기</a></nav>
  </div>;
}
