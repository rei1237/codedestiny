import StonehengeRune from '../../../StonehengeRune';
import {shareService} from './platform';

export default function RuneReading(){
  return <StonehengeRune onHome={()=>location.assign('/?world=ggulggul')} onShare={shareService} shareLabel="토스에서 공유하기"/>;
}
