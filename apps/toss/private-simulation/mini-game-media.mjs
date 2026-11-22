export {Share} from './sdk.mjs';
export const Clipboard={async setText(text){
 if(typeof text!=='string'||!/^🩸 (A|B|O|AB)형 오늘의 운세/.test(text)||text.length>1600)throw Error('PRIVATE_SIMULATION_UNAVAILABLE');
 localStorage.setItem('private-mini-game-copy','opened');
}};
