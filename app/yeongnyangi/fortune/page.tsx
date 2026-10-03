import type {Metadata} from 'next';
import {yeongnyangiShareMetadata} from '../_lib/share-image';
import Experience from '../_components/Experience';
const TITLE='영냥이 운세 선택 | CODE DESTINY';
const DESCRIPTION='사주, 자미두수, 숙요, 베다, 점성술, 타로 중 궁금한 운세와 생선 상품을 선택하고 CODE DESTINY 프로필로 상담을 준비하세요.';
export const metadata:Metadata={title:TITLE,description:DESCRIPTION,robots:{index:false,follow:false},...yeongnyangiShareMetadata(TITLE,DESCRIPTION)};
export default function Page(){return <Experience view='fortune'/>;}
