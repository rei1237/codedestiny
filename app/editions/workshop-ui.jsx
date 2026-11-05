import {useEffect,useState} from 'react';
import {STAGING_ORIGIN} from '../../lib/editions/staging.mjs';
import {TEST_ORIGIN} from '../../lib/editions/production-test.mjs';
import styles from './workshop.module.css';
const local = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_EDITION_WORKSHOP === '1';
export function useWorkshopMode() {
  const [mode,setMode] = useState(local?'local':'closed');
  useEffect(()=>{
    if(process.env.NEXT_PUBLIC_EDITION_WORKSHOP==='staging' && window.location.origin===STAGING_ORIGIN) setMode('staging');
    if(process.env.NEXT_PUBLIC_EDITION_WORKSHOP==='production-test' && window.location.origin===TEST_ORIGIN) setMode('production-test');
  },[]);
  return mode;
}
export const characters = {yeoni:'꽃돼지 연이',cat:'영냥이'};
export {editionPortraits as images} from '../../lib/editions/artwork.mjs';
import {editionPortraits} from '../../lib/editions/artwork.mjs';
export function Ticket({item,serial,preview=false}){
  return <article className={styles.ticket}>
    <img src={item.imageUrl || editionPortraits[item.character]} alt={item.imageUrl ? item.title+' 상품 사진' : characters[item.character]+' 캐릭터'} width="220" height="180"/>
    <div><small>{characters[item.character]} · {preview?'미리보기':'한정판 발행증'}</small>
    <h2>{item.title || '상품명을 입력해 주세요'}</h2>
    <strong>{item.cap}개 한정 · {String(serial).padStart(3,'0')}번</strong></div>
  </article>;
}
