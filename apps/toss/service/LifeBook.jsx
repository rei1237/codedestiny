import React from 'react';
import {SERVICE_AVAILABLE} from '../src/release';
import LifeBookAiClient from '@/app/life-book-ai/LifeBookAiClient';
import ServiceIntroSection from '@/app/components/ServiceIntroSection';
import ResultSamples from '@/app/components/ResultSamples';
export default function LifeBook(){return <><LifeBookAiClient paymentNotice={SERVICE_AVAILABLE?"토스 단건 결제로 상담을 시작해요. 기존 웹 이용권과 월정석은 이 결제에 적용되지 않아요.":"상품 등록과 검수가 완료되면 토스 단건 결제로 상담을 시작할 수 있어요."}/><ResultSamples ids={['life-book']}/>
      <ServiceIntroSection label="인생의 책 전문가 상담 안내">
        <h1><span>인생 총운 — 사주로 보는 평생 운세 리포트</span>내 인생의 황금기는 언제일까?</h1>
        <p>
          인생의 책은 한 사람의 명식에 오래 흐르는 계절과 기질을 따라 삶의 큰 장면을 천천히 펼쳐 봅니다.
          어린 시절부터 지금까지 반복된 선택의 결, 관계 안에서 마음이 움직이는 방식, 일과 재물의 흐름이 머무는 자리,
          앞으로 더 밝게 열어야 할 방향을 긴 호흡의 상담 문장으로 엮습니다.
        </p>
        <p>
          사주는 삶을 단정하기 위한 도구가 아니라 지금의 나를 더 깊게 이해하기 위한 거울입니다.
          이 상담은 사용자가 입력한 생년월일과 시간의 흐름을 바탕으로, 강하게 타고난 힘과 조심스럽게 다루어야 할 습관을 함께 비춥니다.
          당신의 시간이 충분히 정리되면, 삶의 큰 장면은 한 장씩 조용히 펼쳐지고 오래 묻어 둔 질문에도 새로운 문장이 머물기 시작합니다.
        </p>
      </ServiceIntroSection>
</>;}
