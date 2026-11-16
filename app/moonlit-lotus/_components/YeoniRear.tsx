"use client";
import {rearBase,rearLabel,companionRearPoseAt,type RearCharacterId} from '../_lib/companion-rear';
import AtlasSprite from './AtlasSprite';
import styles from '../space.module.css';
export default function YeoniRear({id='yeoni',elapsed,bowing,reduced,onFailure}:{id?:RearCharacterId;elapsed:number;bowing:boolean;reduced:boolean;onFailure:()=>void}){
 const base=rearBase(id),pose=bowing?companionRearPoseAt(id,elapsed):{sheet:'down',frame:0};
 return <AtlasSprite className={styles.rearSprite} identity={id+'-rear'} label={rearLabel(id)+' · 불상을 향해 '+(bowing?'참배 중':'합장')} drawing={{url:base+'/'+pose.sheet+'.webp',frame:pose.frame}} fallback={base+'/still.webp'} preload={['down','lower','up'].map(name=>base+'/'+name+'.webp')} frozen={reduced} onFailure={onFailure}/>;
}
