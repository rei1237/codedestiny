import SnuWelcome from '@/app/components/activation/SnuWelcome';
export const metadata = { title: 'SNU 학교 계정 사주 선물 | 꿀꿀 운세', description: '학교 이메일을 확인하고 연이가 준비한 사주 콘텐츠를 만나보세요. LLM 상담은 별도로 안내합니다.', referrer: 'no-referrer', robots: { index: false, follow: true }, alternates: { canonical: '/snu/' } };
export default function Page() { return <SnuWelcome/>; }
