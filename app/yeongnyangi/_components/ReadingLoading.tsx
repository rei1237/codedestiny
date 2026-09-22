import styles from '../yeongnyangi.module.css';
export default function ReadingLoading({stage='fetching',saved=0,total=0}:{stage?:'fetching'|'generating'|'verifying';saved?:number;total?:number}){
 const title=stage==='fetching'?'네 상담 두루마리, 영냥이가 가져올게.':stage==='verifying'?'마지막 장까지 잘 담겼는지 확인 중이야.':'네 이야기를 한 장씩 정성껏 쓰고 있어.';
 return <div className={styles.readingLoading} role="status" aria-live="polite">
  <img src="/assets/yeongnyangi/original/signup.webp" alt="별빛 문을 열고 상담을 가져오는 영냥이" width={440} height={445} fetchPriority="high"/>
  <div><p className={styles.loadingTitle}>{title}</p><p>{stage==='fetching'?'저장된 상담을 불러오고 있어. 잠깐만 기다려줘.':`${saved} / ${total}개 챕터 저장됨 · 창을 닫아도 서버에서 계속 준비해.`}</p></div>
 </div>;
}
