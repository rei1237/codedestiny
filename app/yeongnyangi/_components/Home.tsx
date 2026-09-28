import FortuneHome from '../_original/FortuneHome';
import ServiceNavigation from '../_original/ServiceNavigation';
import '../_original/original.css';
import {productOffers} from '../_lib/product-offers';
export default function Home(){return <div className="ynOriginal"><FortuneHome offers={productOffers}/><ServiceNavigation/></div>;}
