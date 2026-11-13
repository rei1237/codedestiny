import CareerStyleClient from '@/app/saju/career-style/CareerStyleClient';
import styles from '@/app/saju/career-style/career.module.css';

export default function TossCareerStyle(){
  return <main className={styles.page}><div className={styles.wrap}>
    <h1>나의 일 스타일</h1>
    <p>내가 힘을 쓰기 좋은 환경과 업무 조건을 사주로 살펴보세요.</p>
    <CareerStyleClient/>
  </div></main>;
}
