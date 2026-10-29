// Development-only entry. No account, purchase or production API simulation.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {CharacterWelcome} from '../Brand';
import '../style.css';
import '../yehwa-motifs.generated.css';
import '../moonlight.css';
import '../characters.css';

function Playground(){
 return <main className="page-settings adviser-ggulggul"><p className="preview-note">이 컴퓨터에서 보는 개발 미리보기 · 실제 결제 없음</p><p className="eyebrow">직접 테스트하기</p><h1>꽃빛을 따라,<br/>하나씩 살펴보세요.</h1><CharacterWelcome/>
 <h2>직접 선택해 결과까지</h2><p>아래 타로 3종은 기존 사이트와 같은 로컬 해석 엔진으로 선택한 카드의 정·역방향을 풀이해요. 새로고침하면 선택과 결과가 초기화돼요.</p>
 <nav className="test-links" aria-label="실제로 작동하는 로컬 기능"><a href="/tarot-library"><strong>오늘의 타로 · 태양 회복 · 자기 기준 회복</strong><small>리딩 선택 → 질문 입력 → 카드 선택 → 카드별 해석과 실천 항목 확인</small></a><a href="/catalog"><strong>상담 선택과 입력 살펴보기</strong><small>상담가 변경 → 분석 체계 선택 → 상담 범위 → 질문·출생정보 입력. 실제 로그인·생성은 아직 닫혀 있어요.</small></a><a href="/settings"><strong>보관함·구매 복구·고객지원 둘러보기</strong><small>안내와 이동을 확인할 수 있어요. 실제 계정의 구매 기록은 표시하지 않아요.</small></a></nav>
 <h2>화면 확인용 예시</h2><p>아래 화면은 가상 데이터예요. 입력한 생일을 계산한 결과가 아니며, 출석·차감·저장이 실제로 일어나지 않아요.</p>
 <nav className="test-links" aria-label="모의 화면"><a href="/test/daily-preview.html"><strong>오늘의 운세 · 모의 출석과 입력</strong><small>상단 버튼으로 출석·입력·저장 결과 화면을 바꿔 보세요.</small></a><a href="/test/manse-preview.html"><strong>만세력 · 모의 결과</strong><small>입력 배치와 명식·오행·대운의 표시를 확인해 보세요.</small></a><a href="/test/evidence-preview.html"><strong>상담의 계산 근거 · 모의 결과</strong><small>체계별 근거가 읽기 쉽게 표시되는지 확인해 보세요.</small></a></nav>
 <section className="paper"><h2>아직 같다고 말할 수 없는 기능</h2><p>전문가 상담, 초융합 심층 리딩, 인생의 책, 연애 비책은 기존 사이트의 전용 화면과 전체 이용 흐름 이식이 남아 있어요. 공통 상담 화면이나 만세력이 이 기능들을 대신하지 않아요.</p><p>토스 앱 로그인·실제 구매·계정별 결과 재열람·실기기 성능은 별도 검증이 필요해요. 출시 완료 화면이 아닙니다.</p></section><a className="test-entry" href="/">서비스 홈으로 돌아가기</a></main>;
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')!).render(<Playground/>);
