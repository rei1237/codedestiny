import {useEffect,useState} from 'react';
import DiaryStoreProvider,{useDiaryToday} from '../../../app/diary/_components/DiaryStoreProvider';
import DiaryJournalCard from '../../../app/diary/_components/DiaryJournalCard';
import DiaryPlanCard from '../../../app/diary/_components/DiaryPlanCard';
import DiaryEntryFields from '../../../app/diary/_components/DiaryEntryFields';
import {formatKoreanDate} from '../../../app/diary/_lib/kst-date';
import {readStoredEntry} from '../../../app/diary/_lib/today-snapshot';
import styles from '../../../app/diary/_styles/diary.module.css';
import {api,hasTossSession} from './platform';
import {Button} from './Button';

// The original store enumerates monthly shards. Only enumerate this reader's keys.
function scopedDiary(scope:string):Storage {
  const prefix='cd:toss:diary:'+encodeURIComponent(scope)+':';
  const keys=()=>Object.keys(localStorage).filter(key=>key.startsWith(prefix));
  return {
    get length(){return keys().length;},
    key(index:number){return keys()[index]?.slice(prefix.length)??null;},
    getItem(key:string){return localStorage.getItem(prefix+key);},
    setItem(key:string,value:string){localStorage.setItem(prefix+key,value);},
    removeItem(key:string){localStorage.removeItem(prefix+key);},
    clear(){for(const key of keys())localStorage.removeItem(key);},
  };
}

function Entries(){
  const {store,ext,ymd,hydrated}=useDiaryToday();
  const [selected,setSelected]=useState('');
  const dates=[...new Set([...Object.keys(store),...Object.keys(ext)])].sort().reverse();
  return <>
    <DiaryJournalCard/><DiaryPlanCard/>
    <section className={styles.card}>
      <h2>날짜별 기록</h2>
      {hydrated&&<label>기록 날짜<input type="date" value={selected||ymd} onChange={event=>setSelected(event.target.value)}/></label>}
      {dates.map(date=><Button key={date} variant="weak" onClick={()=>setSelected(date)}>{formatKoreanDate(date)}</Button>)}
      {selected&&<section key={selected}><h3>{formatKoreanDate(selected)}</h3><DiaryEntryFields ymd={selected} entry={readStoredEntry(store,selected)} showTags/></section>}
    </section>
  </>;
}

export default function FortuneDiary(){
  const [storage,setStorage]=useState<Storage|null>(null);
  const [error,setError]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let active=true;
    async function open(){
      const scope=hasTossSession()?(await api<{storageScope:string}>('/session')).storageScope:'guest';
      if(!scope)throw Error('missing diary scope');
      if(active)setStorage(scopedDiary(scope));
    }
    setError(false);
    void open().catch(()=>{if(active)setError(true);});
    return ()=>{active=false;};
  },[attempt]);
  return <section className={styles.shell}><h1>운기 다이어리</h1>
    {storage?<DiaryStoreProvider storage={storage}><Entries/></DiaryStoreProvider>:error?<p role="alert">기록을 열 수 없어요. <Button onClick={()=>setAttempt(n=>n+1)}>다시 시도하기</Button></p>:<p role="status">기록을 펼치고 있어요.</p>}
  </section>;
}
