import type { Metadata } from 'next';
import GuidedFlowDemo from './GuidedFlowDemo';

// 개발 전용: 공통 스텝 플로우(3단계 더미) 확인 화면. 기존 기능에 연결하지 않는다.
// 프로덕션 빌드에서는 빈 화면이고, 색인·사이트맵 대상이 아니다(사이트맵은 명시 목록만 싣는다).
// notFound() 를 쓰면 정적 내보내기에 Next 의 noindex 와 not-found 의 noindex, follow 가 겹쳐 verify-dist robots-meta-count 가 깨진다.
export const metadata: Metadata = {
  title: '스텝 플로우 데모',
  description: '개발 전용 공통 스텝 플로우 확인 화면입니다.',
  robots: { index: false, follow: false },
};

export default function GuidedFlowDemoPage() {
  if (process.env.NODE_ENV === 'production') return <main />;
  return (
    <main>
      <GuidedFlowDemo />
    </main>
  );
}
