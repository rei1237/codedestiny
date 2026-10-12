import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {concernPages,concernIds,isConcernId,concernRecommended,concernTiers,concernStartHref} from '../../_lib/concern-pages';
import ConcernGuide from '../../_components/ConcernGuide';
import LocalizedGuideScreen from '../../_components/LocalizedGuideScreen';
import styles from '../../readings/[domain]/page.module.css';
export const dynamicParams=false;
export function generateStaticParams(){return concernIds.map(concern=>({concern}));}
type Props={params:Promise<{concern:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {concern}=await params;if(!isConcernId(concern))notFound();
 const title=`${concernPages[concern].title} | 영냥이`;
 const description=concernPages[concern].lead;
 const url=`https://code-destiny.com/yeongnyangi/consult/${concern}/`;
 // Purchasing guide reached from the home; the indexed editorial hubs stay canonical for search.
 return {title:{absolute:title},description,alternates:{canonical:url},robots:{index:false,follow:true},openGraph:{title,description,url,type:'website',locale:'ko_KR'}};
}
export default async function ConcernPage({params}:Props){
 const {concern}=await params;if(!isConcernId(concern))notFound();
 const copy=concernPages[concern];
 return <LocalizedGuideScreen domain="saju"><article className={styles.page}>
  <h1>{copy.hook}</h1>
  <p>{copy.title} · 사주보는 고양이 영냥이</p>
  <ConcernGuide id={concern} copy={copy} tiers={concernTiers()} recommended={concernRecommended(concern)} startHref={concernStartHref(concern)}/>
 </article></LocalizedGuideScreen>;
}
