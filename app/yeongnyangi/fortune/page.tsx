import type {Metadata} from 'next';
import Experience from '../_components/Experience';
export const metadata:Metadata={title:'영냥이 운세 선택 | CODE DESTINY',description:'사주, 자미두수, 숙요, 베다, 점성술, 타로 중 궁금한 운세와 생선 상품을 선택하고 CODE DESTINY 프로필로 상담을 준비하세요.',robots:{index:false,follow:false}};
export default function Page(){return <Experience view='fortune'/>;}
