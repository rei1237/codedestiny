import App from './App';
import './style.css';
import './yehwa-motifs.generated.css';
import './moonlight.css';
import './characters.css';
import ReviewHome from './ReviewHome';
import {reviewRoute,reviewYeongnyangiHref} from './review-scope.mjs';

export default function AppEntry({reviewOnly,verifiedReceipt}:{reviewOnly:boolean;verifiedReceipt:boolean}){
  return <App verifiedReceipt={verifiedReceipt} reviewHome={reviewOnly?(open)=><ReviewHome onInternalOpen={open}/>:undefined} reviewRoute={reviewOnly?reviewRoute:undefined} consultationHref={reviewYeongnyangiHref}/>;
}
