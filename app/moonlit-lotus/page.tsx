import type {Metadata} from 'next';
import Link from 'next/link';
import MoonlitEntry from './_ritual/MoonlitEntry';
import {MOONLIT_LOTUS_ENABLED} from './_lib/config';
import {MOONLIT_ENTRY_COPY} from './_lib/entry-copy';
export const metadata:Metadata={title:'달빛 연화당 | 나 혼자만의 온라인 절',description:MOONLIT_ENTRY_COPY.ko.description,robots:{index:false,follow:false}};
// 기본은 참배 흐름. ?scene·activity·view 딥링크와 ?stay=1(둘러보기)는 기존 공간(Space)을 그린다 — _ritual/mode.ts.
export default function MoonlitLotusPage(){
 return MOONLIT_LOTUS_ENABLED?<MoonlitEntry/>:<main><h1>달빛 연화당을 정돈하고 있어요</h1><p>잠시 후 다시 찾아와 주세요. 저장한 기록은 보존됩니다.</p><Link href="/">꿀꿀 운세로 돌아가기</Link></main>;
}
