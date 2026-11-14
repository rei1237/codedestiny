import {getAssetUrlFromPublicPath as webAsset} from '../../../lib/r2-public-url';
// Same characters and rooms as the web art, packaged for a WebView without the asset CDN.
const localArt: Record<string,string>={
 '/DestinyCafe/nobackground/yeoni-bust-cutout.webp':'/images/master-profiles/yeoni-teahouse-portrait.webp',
 '/DestinyCafe/연이 반신상.webp':'/images/master-profiles/yeoni-teahouse-portrait.webp',
 '/DestinyCafe/운명의 찻집 모바일.webp':'/images/fortune-tea-house/premium-tea-house-mobile.webp',
 '/DestinyCafe/운명의 찻집 데스크탑.webp':'/images/fortune-tea-house/premium-tea-house-desktop.webp',
 '/DestinyWar/전략실 네오 메인-Photoroom.webp':'/neo-operation-room/briefing/neo-explain-v1.webp',
 '/DestinyWar/작전실 에셋1-Photoroom.webp':'/assets/toss-art/neo-war-room-seal.webp',
 '/DestinyWar/작전실 에셋2-Photoroom.webp':'/neo-operation-room/lion-seal-loading.webp',
 '/DestinyWar/네오 전략실 모바일1.webp':'/neo-operation-room/strategy-room-v1-960.webp',
 '/DestinyWar/네오 전략실 데스크탑1.webp':'/neo-operation-room/strategy-room-v1-960.webp',
 '/DestinyWar/전략 상담실 모바일.webp':'/neo-operation-room/strategy-room-v1-960.webp',
 '/DestinyWar/전략 상담실 데스크탑.webp':'/neo-operation-room/strategy-room-v1-960.webp',
};
export function getAssetUrlFromPublicPath(path:string,options?:Parameters<typeof webAsset>[1]){
 return localArt[path]??webAsset(path,options);
}
