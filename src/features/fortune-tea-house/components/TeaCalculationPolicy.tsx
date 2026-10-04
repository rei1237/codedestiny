"use client";
import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import type { FortuneTeaHouseConsultMode } from "../data/consult";
const KO={title:"계산 기준과 해석 범위",sajuCalendar:"양력·음력·윤달은 공통 한국 달력 엔진으로 변환해요. 입력한 시간대의 서머타임 이력을 반영합니다.",sajuTime:"출생지 경도로 지역 평균시를 보정하고 분 단위로 반올림해요. 보정 시각 23시부터 다음 날의 일주를 사용하며, 월주는 실제 절입 시각을 기준으로 나눠요.",sajuUnknown:"시간 미상은 시주를 제외해요. 대운 방향은 성별과 연간의 음양을, 시작 시점은 절기 간격을 사용해요. 필요한 정보가 없으면 판단을 보류합니다.",sajuLimit:"오행 분포만으로 길흉을 정하지 않아요. 신강·신약과 용신은 계절 등 확인된 근거와 해석의 한계를 함께 읽습니다.",sukuyo:"현재 서비스는 달의 항성 황경을 기준으로 27숙을 산출해요. 음력 월·일 조견표 방식과 결과가 다를 수 있습니다. 서로 다른 산출 규칙을 섞어 보정하지 않아요.",sukuyoTime:"시간 입력은 필수가 아니에요. 미상일 때는 한국 시간 정오를 기준으로 읽으며, 숙 경계에 가까운 날은 실제 시각에 따라 달라질 수 있어요.",sukuyoRelation:"관계는 27숙의 순행·역행 거리와 삼구 관계 분류로 읽어요. 거리는 친밀도나 성공 확률이 아니며, 두 사람의 역할은 방향에 따라 달라집니다."};
export default function TeaCalculationPolicy({mode}:{mode:FortuneTeaHouseConsultMode}){
 const copy=useTeaHouseCopy("calculationPolicy",KO);
 if(mode==="tarot")return null;
 return <details><summary>{copy.title}</summary>{(mode==="sukuyo"?[copy.sukuyo,copy.sukuyoTime,copy.sukuyoRelation]:[copy.sajuCalendar,copy.sajuTime,copy.sajuUnknown,copy.sajuLimit]).map(text=><p key={text}>{text}</p>)}</details>;
}
