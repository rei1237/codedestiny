import DailyCompanionEntry from "@/app/components/DailyCompanionEntry";
import type {ReactNode} from 'react';
import FortuneHome from '../_original/FortuneHome';
import ServiceNavigation from '../_original/ServiceNavigation';
import '../_original/original.css';
import {productOffers} from '../_lib/product-offers';
export default function Home({guide}:{guide?:ReactNode}){return <div className="ynOriginal"><DailyCompanionEntry/><FortuneHome offers={productOffers}/>{guide}<ServiceNavigation/></div>;}
