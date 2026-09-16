import type {Metadata} from 'next';
import Experience from '../_components/Experience';
export const metadata:Metadata={title:'영냥이 상담 결과 | CODE DESTINY',description:'결제가 확인된 영냥이 상담을 이어서 생성하고, 저장된 분석과 조언을 다시 확인하는 개인 결과 화면입니다.',robots:{index:false,follow:false}};
export default function Page(){return <Experience view='result'/>;}
