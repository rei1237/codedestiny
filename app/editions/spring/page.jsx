import SpringCertificate from './certificate';
export const metadata = {
  title:'연이 봄 부적 발행 기록',
  description:'연이 봄 부적의 한정판 번호와 발행 수량을 확인하고 Base Sepolia에 기록된 발행 거래와 대조하세요.',
  alternates:{canonical:'/editions/spring/'},
  robots:{index:false,follow:false},
};
export default function Page(){ return <SpringCertificate/>; }
