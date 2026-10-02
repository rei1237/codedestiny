import styles from './LaunchPlannedPrice.module.css';

// 영냥이 체험가 옆에 붙는 '정식 오픈 예정가' 취소선. 색은 부모 글자색을 받아 흐리게만 한다(새 색 없음).
// 예정가가 없으면(이벤트 종료·대상 아님) 아무것도 그리지 않는다. 한국어 화면에서만 쓴다.
export default function LaunchPlannedPrice({amount,className}:{amount:number|null;className?:string}){
 if(amount===null)return null;
 return <s className={className?`${styles.planned} ${className}`:styles.planned} data-launch-planned-price>정식 오픈 예정가 {amount.toLocaleString('ko-KR')}원</s>;
}
