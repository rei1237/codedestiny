import {SPIRIT_NOTICE} from './spirit-contract';
export const skyModes = {'prashna-v1':'영냥 신점','horary-v1':'영냥 호라리'} as const;
export type SkyMode = keyof typeof skyModes;
export const SKY_IMAGE='/assets/yeongnyangi/spirit/eastern-oracle.webp';
export const SKY_TIMING='질문 순간의 흐름은 읽을 수 있지만 사건이 일어날 날짜나 기간으로 바꿀 근거는 부족해. 기다림의 기한은 예언 대신 네가 감당할 수 있는 기준으로 정해 보자.';
export const skyTopics={relationship:'관계의 흐름',space:'공간의 기운',contact:'연락',reunion:'재회',work:'일과 진로',money:'재물',home:'주거와 이사',study:'시험과 공부',travel:'이동과 여행',general:'그 밖의 질문'} as const;
// City centres are the only supported location granularity. Never a target's location.
export const questionCities=[
  {id:'seoul',name:'서울',latitude:37.5665,longitude:126.978},
  {id:'busan',name:'부산',latitude:35.1796,longitude:129.0756},
  {id:'incheon',name:'인천',latitude:37.4563,longitude:126.7052},
  {id:'daegu',name:'대구',latitude:35.8714,longitude:128.6014},
  {id:'daejeon',name:'대전',latitude:36.3504,longitude:127.3845},
  {id:'gwangju',name:'광주',latitude:35.1595,longitude:126.8526},
  {id:'ulsan',name:'울산',latitude:35.5384,longitude:129.3114},
  {id:'suwon',name:'수원',latitude:37.2636,longitude:127.0286},
  {id:'chuncheon',name:'춘천',latitude:37.8813,longitude:127.7298},
  {id:'cheongju',name:'청주',latitude:36.6424,longitude:127.489},
  {id:'jeonju',name:'전주',latitude:35.8242,longitude:127.148},
  {id:'jeju',name:'제주',latitude:33.4996,longitude:126.5312},
  {id:'tokyo',name:'도쿄',latitude:35.6762,longitude:139.6503},
  {id:'new-york',name:'뉴욕',latitude:40.7128,longitude:-74.006},
  {id:'los-angeles',name:'로스앤젤레스',latitude:34.0522,longitude:-118.2437},
  {id:'london',name:'런던',latitude:51.5074,longitude:-.1278},
  {id:'sydney',name:'시드니',latitude:-33.8688,longitude:151.2093},
] as const;
export interface QuestionLocation {latitude:number;longitude:number;source:"geolocation"|"city-search";accuracy?:number;name?:string}
export interface SkyInput {location?:QuestionLocation;mode:SkyMode;question:string;topic:keyof typeof skyTopics;relationship:string;situation:string;boundary:boolean;cityId:string;localTime:string}
export interface SkyPublic {evidenceVersion?:string;mode:SkyMode;askedAt:string;receivedAt:string;localTime:string;cityName:string;timezone:string;relationship:string;situation:string;boundary:boolean;space:string;timing:string;notice:string;shareKey:string}
export function skyShare(mode:SkyMode,key:string){return {title:skyModes[mode],text:({moving:'변화를 서두르기보다 지금 할 수 있는 선택 하나를 정리해 봐.',steady:'지킬 기준과 바꿀 기준을 나누며 나의 속도를 돌아봐.',mixed:'여러 흐름이 함께 보여. 한 방향으로 단정하기보다 선택의 여지를 남겨 봐.'}[key]||'나의 선택과 인연의 경계를 돌아보는 상징 풀이.')+' '+SPIRIT_NOTICE};}
