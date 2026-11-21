import type {Metadata} from 'next';
import {yeongnyangiShareMetadata} from '../_lib/share-image';
import Room from '../_home/Room';
import YeongnyangiBottomDock from '../_home/YeongnyangiBottomDock';
import dockStyles from '../_home/yeongnyangi-bottom-dock.module.css';
const TITLE='영냥이의 방 | 꿀꿀 운세';
const DESCRIPTION='달빛이 머무는 영냥이의 방에서 고민을 정리하고 나에게 맞는 운세 상담을 만나보세요.';
export const metadata:Metadata={title:TITLE,description:DESCRIPTION,robots:{index:false,follow:false},...yeongnyangiShareMetadata(TITLE,DESCRIPTION)};
export default function Page(){return <div data-yn-night className={dockStyles.roomDockReserve}><Room/><YeongnyangiBottomDock active="room"/></div>;}
