import type { Metadata } from 'next';
import GuidedBirthDemo from './GuidedBirthDemo';

// 개발 전용: W1 공용 출생 입력 묶음(이름·성별·생년월일·달력·시각·장소·확인) 확인 화면. 기존 기능에 연결하지 않는다.
// 프로덕션 빌드에서는 404 이고, 색인·사이트맵 대상이 아니다(사이트맵은 명시 목록만 싣는다).

export const metadata: Metadata = {
  title: '출생 입력 데모',
  robots: { index: false, follow: false },
};

export default function GuidedBirthDemoPage() {
  return (
    <main>
      <GuidedBirthDemo />
    </main>
  );
}
