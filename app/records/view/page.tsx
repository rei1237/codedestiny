import { Suspense } from 'react';
import SavedRecordClient from './SavedRecordClient';
export const metadata = { title: '저장된 결과 | 꿀꿀 운세', robots: { index: false, follow: false } };
export default function Page() { return <Suspense><SavedRecordClient /></Suspense>; }
