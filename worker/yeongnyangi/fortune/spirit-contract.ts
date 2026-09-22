// Shared public copy. No chart, prompt, or provider data belongs in this module.
export const SPIRIT_MODE = 'spirit-v1';
export const SPIRIT_TITLE = '영냥이의 영감 — 그 사람을 둘러싼 기운';
export const SPIRIT_NOTICE = '전통 운세 해석과 AI를 바탕으로 기운과 인연의 흐름을 상징적으로 풀어드립니다. 상대방의 실제 위치나 생각을 확인하는 서비스는 아닙니다.';
export const SPIRIT_IMAGE = '/assets/yeongnyangi/spirit/drum.webp';
export const SPIRIT_SPACE = '이번 계산에는 그 사람을 둘러싼 공간을 좁힐 근거가 없어. 조용한 자리인지, 사람들의 왕래가 많은 곳인지도 판단하기 어렵다냥. 네 출생정보를 그 사람의 소재지나 생활환경으로 옮겨 읽지는 않을게.';
export const SPIRIT_TIMING = '상담 기준일의 출생 성향만으로 연락이나 재회가 이루어질 기간을 정할 수는 없어. 이번 풀이에는 사건의 시기를 판단할 근거가 없으므로 날짜나 기간을 예언하지 않을게.';
export const spiritTopics = {space:'공간의 기운',relationship:'관계의 흐름',contact:'연락',reunion:'재회'} as const;
export type SpiritTopic = keyof typeof spiritTopics;
export interface SpiritInput {relationship:string;topic:SpiritTopic;situation:string;boundary:boolean}
export interface SpiritPublic extends SpiritInput {mode:typeof SPIRIT_MODE;shareKey?:string;askedAt:string;notice:string;space:string;timing:string}
export const spiritTitles = ['먼저 전하는 한마디','그 사람을 둘러싼 자리의 상','인연 사이에 흐르는 기운','흐름이 움직이는 때','지금 취하면 좋은 태도'];
export const spiritShare = {title:SPIRIT_TITLE,text:'그 사람을 둘러싼 기운이 궁금할 때, 확인한 사실과 추측을 나누고 나의 속도와 인연의 경계를 돌아보는 상징 풀이. '+SPIRIT_NOTICE};

const anonymousReflections:Record<string,string>={
  wood:'시작하려는 힘이 커질수록, 지금 할 수 있는 선택 하나를 먼저 정리해 봐.',
  fire:'표현하고 싶은 마음이 앞설 때, 보내지 않을 글로 감정을 먼저 정리해 봐.',
  earth:'익숙한 기준이 소중할수록, 지킬 것과 바꿀 것을 나누어 봐.',
  metal:'결론을 서두르고 싶을 때, 확인한 사실과 추측을 나누어 봐.',
  water:'생각이 깊어질수록, 잠시 추측을 내려놓고 나의 일상을 돌봐.',
};
export function buildSpiritShare(key?:string){return {...spiritShare,text:(key&&Object.hasOwn(anonymousReflections,key)?anonymousReflections[key]: '여러 선택의 결이 함께 보여. 한 방향으로 단정하기보다 나의 속도와 경계를 돌아봐.')+' '+SPIRIT_NOTICE};}
