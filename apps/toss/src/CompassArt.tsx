import {useDestinyCompassCopy} from '../../../app/destiny-compass/_lib/copy';
export const compassAssets={neo:{main:'/assets/neo.webp'}};
export const compassPaintings={
  premiumIslandDesktop:'/images/destiny-compass/premium-destiny-island-desktop.webp',
  premiumIslandMobile:'/images/destiny-compass/premium-destiny-island-mobile.webp',
  premiumCompassOrnament:'/images/destiny-compass/premium-compass-ornament.webp',
};
const pigs={neutral:'/images/fortune-tea-house/flower-pig-reading.webp',happy:'/images/fortune-tea-house/flower-pig-honey.webp',talk:'/images/fortune-tea-house/flower-pig-welcome.webp',think:'/images/fortune-tea-house/flower-pig-curious.webp',surprise:'/images/fortune-tea-house/flower-pig-cheer.webp'};
export function PigFace({expression='talk',height=96,className}:{expression?:keyof typeof pigs;height?:number;className?:string}){
  const copy=useDestinyCompassCopy();
  return <img src={pigs[expression]} alt={copy.pigFaceAlt} height={height} className={className} style={{height,width:'auto',objectFit:'contain'}}/>;
}
