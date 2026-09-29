import type {Metadata} from 'next';
import Image from 'next/image';
import {notFound} from 'next/navigation';
import {systemNames} from '@/worker/yeongnyangi/payments/catalog';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import {productOffers,productArtwork} from '../../_lib/product-offers';
import {productCuriosity} from '../../_lib/product-curiosity';
import ProductGuide from '../../_components/ProductGuide';
import LocalizedGuideScreen from '../../_components/LocalizedGuideScreen';
import styles from './page.module.css';
export const dynamicParams=false;
export function generateStaticParams(){return Object.keys(productCuriosity).map(domain=>({domain}));}
function validDomain(value:string):value is DomainId{return Object.prototype.hasOwnProperty.call(productCuriosity,value);}
type Props={params:Promise<{domain:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {domain}=await params;if(!validDomain(domain))notFound();
 const title=`${productCuriosity[domain].hook} | 영냥이 ${systemNames[domain]}`;
 const description=productCuriosity[domain].method;
 const url=`https://code-destiny.com/yeongnyangi/readings/${domain}/`;
 const images=[{url:`https://code-destiny.com${productArtwork(domain)}`,alt:`영냥이 ${systemNames[domain]} 상담 안내`}];
 // Purchasing guide duplicates the indexed editorial hubs; public shareable URL, not a paid result.
 return {title:{absolute:title},description,alternates:{canonical:url},robots:{index:false,follow:true},openGraph:{title,description,url,images,type:'website',locale:'ko_KR'},twitter:{card:'summary_large_image',title,description,images:images.map(i=>i.url)}};
}
export default async function ReadingGuide({params}:Props){
 const {domain}=await params;if(!validDomain(domain))notFound();
 return <LocalizedGuideScreen domain={domain}><article className={styles.page}>
  <h1>{productCuriosity[domain].hook}</h1>
  <p>{systemNames[domain]} · 사주보는 고양이 영냥이</p>
  <Image className={styles.art} src={productArtwork(domain)} width={960} height={640} alt={domain==='saju'?'달빛 아래 펼친 네 기둥의 한지 그림':`${systemNames[domain]} 상담을 안내하는 영냥이`} priority/>
  <ProductGuide domain={domain} offers={productOffers[domain]} surface="product_page"/>
 </article></LocalizedGuideScreen>;
}
