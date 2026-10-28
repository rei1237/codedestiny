import {YEONI_GUIDE_ART} from '@/lib/brand/yeoni-guide-art';
import styles from './yeoni-illustrated-guide.module.css';

export default function YeoniIllustratedGuide({kind}:{kind:'question'|'steps'}){
 const art=kind==='question'?YEONI_GUIDE_ART.reading:YEONI_GUIDE_ART.welcome;
 return <section className={styles.guide} aria-label="연이의 상담 안내">
  <img src={art.src} alt={art.alt} width={art.width} height={art.height} loading="lazy" decoding="async"/>
  <div className={styles.copy}>
   <h3>{kind==='question'?'마음을 다 정리한 뒤 오지 않아도 괜찮아요':'연이와 함께, 한 단계씩'}</h3>
   {kind==='question'?<><p>“지금 이런 상황이고, 이 두 가지 사이에서 고민돼요.” 이 정도면 이야기를 시작할 수 있어요.</p><p>궁금한 것 하나를 먼저 고르고, 무엇이 가장 마음에 걸리는지 덧붙여 주세요. 아래 예시는 눌렀을 때만 질문에 들어가요.</p></>:<ol>
    <li><strong>마음에 남은 질문 하나</strong><span>현재 상황과 고민하는 선택을 들려주세요.</span></li>
    <li><strong>바라보고 싶은 관점</strong><span>해석 방식을 고르고, 필요한 경우 상담할 프로필을 선택해요.</span></li>
    <li><strong>내용 확인 후 상담 준비</strong><span>다음 화면에서 제공 내용과 사용 가능한 이용 방법을 확인해요.</span></li>
   </ol>}
   <p className={styles.note}>AI가 작성하는 상담이며, 예화 속 인물이 직접 상담하거나 검수한다는 뜻은 아니에요.</p>
  </div>
 </section>;
}
