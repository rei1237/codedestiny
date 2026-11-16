"use client";
import {memo,type CSSProperties} from 'react';
import {ASSET_BASE,type Sheet} from './sprite-clips';
import {rearBase,companionRearPoseAt} from '../_lib/companion-rear';
import AtlasSprite from '../_components/AtlasSprite';
import styles from './review.module.css';
export function spriteStyle(sheet: Sheet,frame:number):CSSProperties {
 return {backgroundImage:'url('+ASSET_BASE+'/'+sheet+'.webp)',backgroundPosition:frame%4/3*100+'% '+Math.floor(frame/4)/3*100+'%'};
}
export default memo(function Sprite({sheet,frame,label,rear=false,elapsed=0}:{sheet:Sheet;frame:number;label:string;reduced?:boolean;rear?:boolean;elapsed?:number}) {
 const base=rear?rearBase('yeoni'):ASSET_BASE,pose=rear?companionRearPoseAt('yeoni',elapsed):{sheet,frame};
 return <AtlasSprite className={styles.sprite} identity={rear?'yeoni-preview-rear':'yeoni-preview-front'} drawing={{url:base+'/'+pose.sheet+'.webp',frame:pose.frame}} label={label} fallback={ASSET_BASE+'/still.webp'}/>;
});
