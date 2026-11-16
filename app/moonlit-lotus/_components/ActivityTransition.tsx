"use client";
import type {ReactNode} from 'react';
import styles from '../space.module.css';
/** AtlasSprite commits the next decoded drawing without remounting or overlapping children. */
export default function ActivityTransition({children}:{children:ReactNode}){
 return <div className={styles.poseBlend}>{children}</div>;
}
