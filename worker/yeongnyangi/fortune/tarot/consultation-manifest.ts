import type {Product} from '../../payments/catalog';
import type {ChapterSpec} from '../book-contracts';
import {readingManifestV6} from '../reading-v6';
import {withReadingSections} from '../reading-sections';
import {tarotConsultations,tarotConsultationSpread,tarotInterpretationRules,TAROT_CONSULTATION_VERSION,type TarotConsultationId} from './consultation-contract';

// Interpretation version is independent of the durable v6 section/storage format.
// Saved manifests remain authoritative when reopening or resuming a purchase.
const nuances:Record<TarotConsultationId,string[]>={
 choice:['같은 선택을 반복하는 이유','바라는 결과와 실제 행동의 차이','선택을 지지하는 현실 신호','서로 다른 카드가 제시하는 조건','유지와 변화의 비용','내가 바꿀 수 있는 조건','반대 해석이 맞을 가능성','환경이 바뀌면 달라지는 선택','실행의 순서','선택을 다시 살필 기준'],
 love:['관계에서 반복하는 기대','감정과 관계 의지의 차이','대화로 확인할 신호','끌림과 부담이 함께 있는 이유','다가감과 기다림의 조건','함께 조율할 표현','다른 해석이 가능한 태도','주변 환경이 관계에 미치는 조건','대화를 시작할 순서','관계를 다시 점검할 기준'],
 feelings:['상대 반응을 읽는 나의 습관','보이는 태도와 감정 추정의 차이','말과 행동으로 확인할 신호','엇갈리는 상징을 읽는 조건','묻기와 기다리기의 차이','내 기대를 조율하는 방법','감정 외에 가능한 설명','상황에 따라 달라지는 반응','부담 없는 대화의 순서','추측을 멈추고 확인할 기준'],
 contact:['연락을 기다리는 반복 패턴','연락 욕구와 실제 소통의 차이','답장을 해석할 현실 신호','접근과 거리의 상충 신호','연락과 기다림의 조건','내가 조절할 소통 방식','무응답에 가능한 다른 설명','환경에 따른 소통의 차이','정중하게 뜻을 전하는 순서','연락을 멈추거나 수정할 기준'],
 reunion:['되풀이될 수 있는 관계 패턴','미련과 관계 회복 의지의 차이','변화를 확인할 현실 신호','끌림과 단절의 상충 신호','재접근과 마무리의 조건','내가 바꿀 관계 습관','재회 외에 가능한 회복','환경에 따른 재접근의 부담','동의를 확인하는 대화 순서','회복을 다시 점검할 기준'],
 compatibility:['서로에게 반복하는 기대','애정과 생활 행동의 차이','편안함을 확인할 현실 신호','끌림과 갈등이 함께 있는 이유','이어감과 거리 두기의 조건','두 사람이 조율할 영역','다른 해석이 가능한 반응','생활 환경이 바뀌는 경우','합의를 만들어 가는 순서','오래 함께할 점검 기준'],
 career:['일에서 반복되는 선택','바람과 실제 업무의 차이','현장에서 확인할 적합성','성장과 소진의 상충 신호','잔류와 변화의 조건','내가 준비할 역량과 자원','이직 외에 가능한 변화','조직과 생활 조건의 영향','준비와 실행의 순서','진로를 다시 살필 기준'],
 money:['지출을 반복하는 계기','경제적 기대와 생활 행동의 차이','기록으로 확인할 현실 신호','안정과 확장의 상충 신호','유지와 조정의 부담','내가 조절할 생활 비용','불안을 설명하는 다른 가능성','생활 환경이 바뀌는 경우','자원을 정리하는 순서','돈 습관을 점검할 기준'],
 healing:['나를 지치게 하는 반복','느끼는 감정과 보이는 행동','회복을 확인할 작은 신호','버팀과 휴식의 상충 신호','혼자 쉬기와 도움 요청의 조건','내가 바꿀 수 있는 경계','마음을 설명하는 다른 가능성','환경에 따라 달라지는 소진','부담을 줄이는 순서','도움과 휴식을 다시 살필 기준'],
};
export function tarotConsultationManifest(p:Product,id:TarotConsultationId):ChapterSpec[]{
 const spec=tarotConsultations[id],spread=tarotConsultationSpread(id);
 const base=readingManifestV6(p,spec.topic,'personal');
 const positions=spread.positions.map((position:any)=>`${position.key}: ${position.label} — ${position.role}`);
 const extra=nuances[id].slice(0,base.length-5);
 const titles=[`${spec.label} · 질문에 대한 답`,'자리마다 드러나는 카드의 의미','카드들이 함께 만드는 흐름',...extra,'조심할 점과 해석의 한계','지금 선택할 첫 행동'];
 return base.map((row,i)=>{
  const title=titles[i];
  const responsibility=i===0?'전체 카드를 한 줄로 종합해 사용자의 질문에 직접 답한다. 상세 자리 해석은 다음 장에 남긴다.':
   i===1?`모든 자리를 빠짐없이 읽는다: ${positions.join(' / ')}. 각 자리에 선택된 카드만 배정한다.`:
   i===2?'실제 카드들의 지지·긴장·전환을 연결한다. 개별 카드 뜻을 다시 나열하지 않는다.':
   i===base.length-2?'확인되지 않은 추측, 경계, 해석이 달라질 조건을 구분한다. 불안이나 공포를 부추기지 않는다.':
   i===base.length-1?'질문에 맞는 첫 행동과 중단·수정 기준을 제시한다. 앞 장의 해석을 재서술하지 않는다.':
   `'${title}'만 담당한다. 실제 배열에서 해당 논점의 근거가 약하면 그 한계를 밝히고 확인할 질문으로 이어간다.`;
  const chapter=withReadingSections({...row,key:`tarot-v2-${i+1}`,title,part:spec.label,
   factSelectors:{tarot:['spreadId','cards','reading','tarotConsultation']},
   focus:`${TAROT_CONSULTATION_VERSION}. ${responsibility} ${tarotInterpretationRules}`,
   excludes:titles.filter((_,j)=>j!==i),periodScope:'질문 당시의 상징적 흐름이다. 날짜·사건·확률을 확정하지 않는다.',
  });
  if(i===1){
   const sections=chapter.sections!,interpret=sections.filter(s=>s.role==='interpretation');
   const min=interpret.reduce((n,s)=>n+s.minimumChars,0),low=interpret.reduce((n,s)=>n+s.targetChars[0],0),high=interpret.reduce((n,s)=>n+s.targetChars[1],0);
   chapter.sections=[...spread.positions.map((position:any,j:number)=>({id:j===0?'evidence':`position-${position.key}`,title:position.label,role:'interpretation' as const,
    instruction:`${position.key}: ${position.role}. 이 자리에 저장된 카드의 정역방향과 질문별 의미를 연결한다.`,
    minimumChars:Math.ceil(min/positions.length),targetChars:[Math.ceil(low/positions.length),Math.ceil(high/positions.length)] as [number,number]})),...sections.filter(s=>s.role!=='interpretation')];
  }
  return chapter;
 });
}
