import React, {lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {LazyMotion,domAnimation} from 'framer-motion';
import {PaymentProcessingProvider} from '@/app/components/PaymentProcessingContext';
import {ToastProvider} from '@/app/components/Toast';
import '@/styles/globals.css';
import '@/styles/theme-tokens.css';
import '@/styles/moonlit-birth-form.css';
import '@/styles/feature-marketing-detail.css';
import '@/app/yeongnyangi/night-tokens.css';
import './preview.css';

const screens={
  yeongnyangi:lazy(()=>import('@/app/yeongnyangi/_components/Consultation')),
  result:lazy(()=>import('@/app/yeongnyangi/_components/Result')),
  library:lazy(()=>import('@/app/yeongnyangi/_components/Library')),
  tea:lazy(()=>import('@/app/fortune-tea-house/FortuneTeaHouseClient')),
  savedTea:lazy(()=>import('@/app/fortune-tea-house/SavedTeaReading')),
  neo:lazy(()=>import('@/src/features/neo-war-room/NeoOperationRoomPage')),
  neoResult:lazy(()=>import('@/src/features/neo-war-room/NeoOperationRoomResultPage')),
  neoBooks:lazy(()=>import('@/src/features/neo-war-room/NeoStrategyBooksPage')),
  records:lazy(()=>import('@/app/records/RecordsClient')),
};
const query=new URLSearchParams(location.search);
const selected=location.pathname.startsWith('/records/view')?(query.get('source')==='tea'?'savedTea':'neoResult'):location.pathname.startsWith('/records')?'records':location.pathname.startsWith('/neo-operation-room/strategy-books')?'neoBooks':location.pathname.startsWith('/neo-operation-room/result')?'neoResult':location.pathname.includes('/result/')?'result':location.pathname.includes('/library/')?'library':location.pathname.startsWith('/fortune-tea-house')?'tea':location.pathname.startsWith('/neo-operation-room')?'neo':query.get('service')||'yeongnyangi';
const Screen=screens[selected]||screens.yeongnyangi;
class PreviewBoundary extends React.Component {
  state={error:false};
  static getDerivedStateFromError(){return {error:true};}
  render(){return this.state.error?<p role="alert">화면을 불러오지 못했어요. <a href="/test/consultations.html">처음부터 다시 열기</a></p>:this.props.children;}
}
createRoot(document.getElementById('root')).render(<PreviewBoundary><LazyMotion features={domAnimation}><PaymentProcessingProvider><ToastProvider/>
  <aside className="canonical-preview-bar"><strong>원본 화면 테스트</strong><span>가상 계정 · 샘플 결과 · 실제 결제/AI 생성 없음</span><nav aria-label="상담 테스트"><a href="/yeongnyangi/fortune/">영냥이 상담</a><a href="/fortune-tea-house/">운명의 찻집</a><a href="/neo-operation-room/">네오 전략실</a><a href="/yeongnyangi/library/">샘플 보관함</a><a href="/">앱 홈</a></nav></aside>
  <Suspense fallback={<p role="status">상담실을 불러오고 있어요.</p>}><Screen resultId={query.get('id')||query.get('resultId')}/></Suspense>
</PaymentProcessingProvider></LazyMotion></PreviewBoundary>);
