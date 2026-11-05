import {renderPassBenefits} from '@/lib/marketing/pass-benefits.mjs';
import '@/styles/pass-benefits.css';

export default function PassBenefits({kind,id}:{kind:'honey';id:string}) {
  return <div dangerouslySetInnerHTML={{__html:renderPassBenefits(kind,id)}}/>;
}
