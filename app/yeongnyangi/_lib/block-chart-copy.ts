import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';

/**
 * 소절 옆 명반 강조(BlockChartHints) 머리말. 자미 궁은 ziwei-chart-copy.ts 의 hint 가 맡는다.
 * 모든 ReadingLocale의 현지어를 제공한다.
 * 기둥·별·자리 이름과 값은 chartTerm(reading-chart-copy.ts)이 옮긴다.
 */
type Copy={pillars:string;astrology:string;vedic:string;mansions:string};

const ko:Copy={pillars:'이 소절이 짚은 기둥',astrology:'이 소절이 짚은 별',vedic:'이 소절이 짚은 자리',mansions:'이 소절이 짚은 숙'};
const en:Copy={pillars:'Pillars this section reads',astrology:'Chart points this section reads',vedic:'Placements this section reads',mansions:'Mansions this section reads'};
const ja:Copy={pillars:'この節が読んだ柱',astrology:'この節が読んだ天体',vedic:'この節が読んだ配置',mansions:'この節が読んだ宿'};
const zhCN:Copy={pillars:'本节解读的柱',astrology:'本节解读的星体',vedic:'本节解读的落点',mansions:'本节解读的宿'};
const zhTW:Copy={pillars:'本節解讀的柱',astrology:'本節解讀的星體',vedic:'本節解讀的落點',mansions:'本節解讀的宿'};

const copies:Record<ReadingLocale,Copy>={ko,en,ja,"zh-CN":zhCN,"zh-TW":zhTW,
vi:{"pillars":"Các trụ được luận giải trong mục này","astrology":"Các điểm chiêm tinh được luận giải","vedic":"Các vị trí được luận giải","mansions":"Các tú được luận giải"},
hi:{"pillars":"इस खंड में समझाए गए स्तंभ","astrology":"इस खंड में समझाए गए ज्योतिषीय बिंदु","vedic":"इस खंड में समझाई गई स्थितियाँ","mansions":"इस खंड में समझाए गए चंद्र आवास"},
es:{"pillars":"Pilares analizados en esta sección","astrology":"Puntos de la carta analizados","vedic":"Posiciones analizadas","mansions":"Mansiones lunares analizadas"},
fr:{"pillars":"Piliers étudiés dans cette section","astrology":"Points du thème étudiés","vedic":"Positions étudiées","mansions":"Demeures lunaires étudiées"},
de:{"pillars":"In diesem Abschnitt gedeutete Säulen","astrology":"Gedeutete Horoskoppositionen","vedic":"Gedeutete Stellungen","mansions":"Gedeutete Mondhäuser"},
nl:{"pillars":"Pijlers die dit deel bespreekt","astrology":"Besproken horoscooppunten","vedic":"Besproken posities","mansions":"Besproken maanhuizen"},
ms:{"pillars":"Tiang yang dihuraikan dalam bahagian ini","astrology":"Titik carta yang dihuraikan","vedic":"Kedudukan yang dihuraikan","mansions":"Rumah bulan yang dihuraikan"},
};

export function blockChartCopy(locale?:ReadingLocale):Copy{
 return copies[locale||'ko'];
}
