import RecordsClient from './RecordsClient';
export const metadata = { title: '나의 기록 보관함 | 꿀꿀 운세', description: '받았던 운세와 상담을 서비스별로 찾아 다시 읽는 나의 기록 보관함입니다.', robots: { index: false, follow: false } };
export default function Page() { return <RecordsClient />; }
