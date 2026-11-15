"use client";
import {useCallback,useEffect,useState} from 'react';
import {BookOpen,Flower2} from 'lucide-react';
import {listRecords,writeRecord,type PrivateRecord} from '../_lib/private-store';
import styles from '../space.module.css';
export default function PrivateRecords({scope}:{scope:string}){
 const [rows,setRows]=useState<PrivateRecord[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[editing,setEditing]=useState(''),[text,setText]=useState(''),[deleting,setDeleting]=useState('');
 const refresh=useCallback(async()=>{setLoading(true);try{setRows(await listRecords(scope));setMessage('');}catch{setMessage('기록을 읽지 못했어요. 다시 확인해 주세요.');}finally{setLoading(false);}},[scope]);
 useEffect(()=>{void refresh();},[refresh]);
 const save=async(row:PrivateRecord,deleted=false)=>{
  try{const ok=await writeRecord({...row,text:deleted?'':text,deleted},row.updatedAt);if(!ok){setMessage('다른 탭에서 바뀐 기록이 있어요. 최신 기록을 다시 불러와 주세요.');return;}setEditing('');setDeleting('');await refresh();}
  catch{setMessage('저장하지 못했어요. 입력한 글을 확인하고 다시 시도해 주세요.');}
 };
 return <><p className={styles.panelNote}>이 브라우저에 남긴 나의 기록이에요. 다른 기기와 동기화하거나 다른 이용자에게 공개하지 않아요.</p>
  {loading?<p role="status">기록을 불러오는 중이에요.</p>:rows.length===0?<div className={styles.emptyRecord}><BookOpen size={36} strokeWidth={1.2} aria-hidden="true"/><h3>마음을 담을 빈 페이지</h3><p>아직 남긴 기록이 없어요.<br/>기도나 확언, 108배를 마친 뒤 다시 만나요.</p></div>:<ul className={styles.records}>{rows.map(row=><li key={row.id}>
   <div className={styles.recordMeta}><Flower2 size={16} aria-hidden="true"/><span>{row.kind==='bow'?'온라인 '+row.completed+'배':row.kind==='prayer'?'나의 기도':'긍정 확언'}</span><time dateTime={row.day}>{row.day}</time></div>
   {editing===row.id?<label className={styles.field}>기록 수정<textarea maxLength={2000} value={text} onChange={event=>setText(event.target.value)}/></label>:<p>{row.text||'조용히 마음을 쉬어간 시간'}</p>}
   <div className={styles.row}>{editing===row.id?<><button className={styles.primary} onClick={()=>save(row)}>수정 저장</button><button onClick={()=>setEditing('')}>수정 취소</button></>:<button onClick={()=>{setEditing(row.id);setText(row.text);}}>기록 수정</button>}
   {deleting!==row.id&&<button onClick={()=>setDeleting(row.id)}>기록 삭제</button>}</div>
   {deleting===row.id&&<div className={styles.deletePrompt}><p>이 기록을 지울까요?</p><div className={styles.row}><button onClick={()=>setDeleting('')}>취소</button><button className={styles.primary} onClick={()=>save(row,true)}>삭제 확인</button></div></div>}
  </li>)}</ul>}
  {message&&<p role="alert">{message}<button onClick={refresh}>기록 다시 불러오기</button></p>}
 </>;
}
