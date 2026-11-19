import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GuidedFlowDemo from './GuidedFlowDemo';

// 개발 전용: 공통 스텝 플로우(3단계 더미) 확인 화면. 기존 기능에 연결하지 않는다.
// 프로덕션 빌드에서는 404 이고, 색인·사이트맵 대상이 아니다(사이트맵은 명시 목록만 싣는다).
export const metadata: Metadata = {
  title: '스텝 플로우 데모',
  robots: { index: false, follow: false },
};

export default function GuidedFlowDemoPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main>
      <GuidedFlowDemo />
    </main>
  );
}
