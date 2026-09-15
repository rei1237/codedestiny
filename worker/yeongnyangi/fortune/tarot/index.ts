import {domain,context} from '../shared/domain';
import {drawTarotCardsForSpread,interpretTarotReading} from '../../../../lib/tarot/tarot-interpretation-engine.mjs';
export const tarot=domain('tarot','카드와 질문 당시의 상징만 해석한다. 출생 차트, 실제 상대 속마음, 확정된 사건이나 연도를 만들지 않는다. 정역방향과 자리의 의미를 구분한다.',['질문의 중심','카드의 흐름','마음의 패턴','선택의 갈림길','실행 조언','마지막 메시지'],async(input,options={})=>{
 const spreadId=options.tarotFusion===true?'fusion_six_expert':input.spreadId||'three_card_cause_process_outcome';
 const cards=drawTarotCardsForSpread(spreadId);
 const reading=interpretTarotReading({spreadId,drawnCards:cards,question:input.question,questionType:input.topicId==='love'?'love':'general'});
 return context('tarot',{spreadId,cards,reading},['질문 당시의 카드 상징을 읽습니다. 천문 계산이나 미래의 확정 증거가 아닙니다.']);
});
