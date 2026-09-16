import type {Metadata} from 'next';
import Experience from '../_components/Experience';
export const metadata:Metadata={title:'영냥이 나의 상담 | CODE DESTINY',description:'내 CODE DESTINY 계정에 저장된 영냥이 상담과 생성 상태를 확인하고 이전 결과를 다시 펼쳐보세요.',robots:{index:false,follow:false}};
export default function Page(){return <Experience view='library'/>;}
