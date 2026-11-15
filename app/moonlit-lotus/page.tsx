import type {Metadata} from 'next';
import Link from 'next/link';
import Space from './Space';
import {MOONLIT_LOTUS_ENABLED} from './_lib/config';
export const metadata:Metadata={title:'달빛 연화당 | 나 혼자 머무는 작은 절',description:'연이와 영냥이, 나만의 캐릭터와 함께 명상하고 기도하는 개인 휴식 공간입니다.',robots:{index:false,follow:false}};
export default function MoonlitLotusPage(){
 return MOONLIT_LOTUS_ENABLED?<Space/>:<main><h1>달빛 연화당을 정돈하고 있어요</h1><p>잠시 후 다시 찾아와 주세요. 저장한 기록은 보존됩니다.</p><Link href="/">꿀꿀 운세로 돌아가기</Link></main>;
}
