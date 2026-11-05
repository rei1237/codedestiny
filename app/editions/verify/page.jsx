import Verify from './verify';
export const metadata={title:'한정판 발행기록 확인',description:'연이와 영냥이 굿즈의 QR을 스캔하거나 확인 코드를 입력해 한정판 번호와 발행 기록을 확인하세요.',alternates:{canonical:'/editions/verify/'},robots:{index:false,follow:false}};
export default function Page(){return <Verify/>;}
