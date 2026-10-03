import type {Metadata} from 'next';
import {yeongnyangiShareMetadata} from '../_lib/share-image';
import Experience from '../_components/Experience';
const TITLE='영냥이 나의 상담 | CODE DESTINY';
const DESCRIPTION='내 CODE DESTINY 계정에 저장된 영냥이 상담과 생성 상태를 확인하고 이전 결과를 다시 펼쳐보세요.';
export const metadata:Metadata={title:TITLE,description:DESCRIPTION,robots:{index:false,follow:false},...yeongnyangiShareMetadata(TITLE,DESCRIPTION)};
export default function Page(){return <Experience view='library'/>;}
