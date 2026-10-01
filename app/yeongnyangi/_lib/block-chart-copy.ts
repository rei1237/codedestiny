import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';

/**
 * 소절 옆 명반 강조(BlockChartHints) 머리말. 자미 궁은 ziwei-chart-copy.ts 의 hint 가 맡는다.
 * 저작은 ko·en·ja·zh-CN·zh-TW, 나머지 로케일은 en 으로 떨어진다(ziwei-chart-copy.ts 와 같은 범위).
 * 기둥·별·자리 이름과 값은 chartTerm(reading-chart-copy.ts)이 옮긴다.
 */
type Copy={pillars:string;astrology:string;vedic:string;mansions:string};

const ko:Copy={pillars:'이 소절이 짚은 기둥',astrology:'이 소절이 짚은 별',vedic:'이 소절이 짚은 자리',mansions:'이 소절이 짚은 숙'};
const en:Copy={pillars:'Pillars this section reads',astrology:'Chart points this section reads',vedic:'Placements this section reads',mansions:'Mansions this section reads'};
const ja:Copy={pillars:'この節が読んだ柱',astrology:'この節が読んだ天体',vedic:'この節が読んだ配置',mansions:'この節が読んだ宿'};
const zhCN:Copy={pillars:'本节解读的柱',astrology:'本节解读的星体',vedic:'本节解读的落点',mansions:'本节解读的宿'};
const zhTW:Copy={pillars:'本節解讀的柱',astrology:'本節解讀的星體',vedic:'本節解讀的落點',mansions:'本節解讀的宿'};

export function blockChartCopy(locale?:ReadingLocale):Copy{
 return !locale||locale==='ko'?ko:locale==='ja'?ja:locale==='zh-CN'?zhCN:locale==='zh-TW'?zhTW:en;
}
