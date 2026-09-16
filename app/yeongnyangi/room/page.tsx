import type {Metadata} from 'next';
import Experience from '../_components/Experience';
export const metadata:Metadata={title:'영냥이 상담 | CODE DESTINY',robots:{index:false,follow:false}};
export default function Page(){return <Experience view='fortune'/>;}
