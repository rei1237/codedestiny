import { Suspense } from 'react';
import SavedRecordClient from './SavedRecordClient';
export const metadata = { title: '저장된 결과 | 꿀꿀 운세', description: '내 계정에 저장된 운세와 상담 결과를 전체 내용으로 다시 확인합니다.', robots: { index: false, follow: false } };
export default function Page() { return <Suspense><SavedRecordClient /></Suspense>; }
