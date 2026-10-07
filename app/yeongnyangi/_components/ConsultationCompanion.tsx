import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import styles from './consultation-companion.module.css';
// Existing report character sheet is the artwork source; systems retain their own calculations.
const companions={
 saju:{name:'영냥이',file:'/assets/yeongnyangi/original/hero-480.webp',line:'질문 하나부터, 차근차근 함께 읽어볼게.'},
 sukuyo:{name:'달토끼',file:'/assets/yeongnyangi/report/v1/sukuyo-rabbit.webp',line:'본명숙과 관계의 리듬을 함께 살펴봐요.'},
 astrology:{name:'별빛 부엉이',file:'/assets/yeongnyangi/report/v1/astrology-owl.webp',line:'출생 차트 속 행성과 삶의 패턴을 이어봐요.'},
 vedic:{name:'달의 코끼리',file:'/assets/yeongnyangi/report/v1/vedic-elephant.webp',line:'라시와 나크샤트라의 흐름을 차근차근 살펴봐요.'},
 ziwei:{name:'흰사자 네오',file:'/assets/yeongnyangi/report/v1/ziwei-neo-clean.webp',line:'열두 궁과 별의 배치에서 삶의 연결을 찾아봐요.'},
 tarot:{name:'카드 여우',file:'/assets/yeongnyangi/report/v1/tarot-fox.webp',line:'카드의 상징을 지금의 질문에 연결해봐요.'},
} as const;
export default function ConsultationCompanion({domain}:{domain:DomainId}){
 const guide=companions[domain];
 return <aside className={styles.companion} aria-label="상담 안내 캐릭터"><img src={guide.file} alt="" width={80} height={80}/><div><strong>{guide.name}</strong><p>{guide.line}</p></div></aside>;
}
