import SnuWelcome from '@/app/components/activation/SnuWelcome';
import '@/styles/fonts-yeongnyangi.css';
export const metadata = { title: '사주 콘텐츠 등록 | 꿀꿀 운세', description: '안내받은 코드로 사주 콘텐츠를 등록하고 선택한 본인 프로필에서 확인하세요. AI 유료 상담은 제외됩니다.', referrer: 'no-referrer', robots: { index: false, follow: true }, alternates: { canonical: '/snu/' } };
export default function Page() { return <SnuWelcome/>; }
