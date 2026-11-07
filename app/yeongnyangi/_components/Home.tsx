import type {ReactNode} from 'react';
import FortuneHome from '../_home/FortuneHome';
import ServiceNavigation from '../_home/ServiceNavigation';
import '../_home/original.css';
import {productOffers} from '../_lib/product-offers';
import PassBenefits from '@/app/components/PassBenefits';
export default function Home({guide}:{guide?:ReactNode}){return <div className="ynOriginal"><FortuneHome offers={productOffers} guide={guide} passBenefits={<PassBenefits kind="honey" id="home-fish-pass"/>}/><ServiceNavigation/></div>;}
