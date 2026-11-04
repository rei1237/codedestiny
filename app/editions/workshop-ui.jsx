import styles from './workshop.module.css';
export const enabled = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_EDITION_WORKSHOP === '1';
export const characters = {yeoni:'꽃돼지 연이',cat:'영냥이'};
export const images = {yeoni:'/assets/mascot/yeoni-reading-guide-v1.webp',cat:'/assets/yeongnyangi/original/hero-800.webp'};
export function Ticket({item,serial,preview=false}){
  return <article className={styles.ticket}>
    <img src={item.image || images[item.character]} alt={characters[item.character]+' 작품'} width="220" height="180"/>
    <div><small>{characters[item.character]} · {preview?'미리보기':'한정판 발행증'}</small>
    <h2>{item.title || '상품명을 입력해 주세요'}</h2>
    <strong>{item.cap}개 한정 · {String(serial).padStart(3,'0')}번</strong></div>
  </article>;
}
