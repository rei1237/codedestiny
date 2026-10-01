import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';

/**
 * 자미 명반 화면(ZiweiReadingChart) 문구. 별·궁 이름은 모든 언어에서 한글 그대로 두고 한자를 곁에 단다.
 * 저작은 ko·en·ja·zh-CN·zh-TW, 나머지 로케일은 en 으로 떨어진다.
 * 등급 설명은 강약 정본(lib/ziwei-star-strength.js GRADES.label)의 뜻을 옮긴 것이다 — 좋고 나쁨이 아니라 별의 성질이 드러나는 정도다.
 */
type Grade='묘'|'왕'|'득'|'리'|'평'|'불'|'함'|'한';
type Hua='화록'|'화권'|'화과'|'화기';
type Copy={chart:string;select:string;legend:string;body:string;noMain:string;noMainShort:string;modern:string;
 kinds:Record<'main'|'assistant'|'malefic',string>;grades:Record<Grade,string>;hua:Record<Hua,string>;
 howTitle:string;how:string[];notes:string;hint:string};

const QUOTE='「入庙不加吉，平等」';
const ko:Copy={chart:'명반',select:'궁 선택',legend:'왼쪽일수록 별의 성질이 또렷한 자리 · 길흉 아님',body:'신궁',
 noMain:'주성이 없는 궁이에요. 마주 보는 궁의 주성을 빌려 함께 읽어요.',noMainShort:'주성 없음',modern:'현대 표',
 kinds:{main:'주성',assistant:'보조성',malefic:'긴장 요소'},
 grades:{묘:'성질이 가장 또렷하고 안정적으로 드러나는 자리',왕:'성질이 힘 있게 드러나는 자리',득:'자리를 얻어 무난히 드러나는 자리',리:'쓸 만하지만 힘이 한 단계 덜한 자리',평:'중간 — 함께 앉은 별·사화·마주 보는 궁의 영향을 크게 받는 자리',불:'자리를 얻지 못해 힘이 약한 자리(평과 함 사이)',함:'성질이 막히거나 비틀려 드러나기 쉬운 자리 — 보완 조건을 함께 봐요',한:'힘이 한가해 잘 쓰이지 않는 자리'},
 hua:{화록:'化祿 화록',화권:'化權 화권',화과:'化科 화과',화기:'化忌 화기'},
 howTitle:'이 별의 강약을 어떻게 읽었나',
 how:['별 옆 글자는 그 별이 이 궁의 지지에서 얼마나 또렷하게 드러나는지를 『紫微斗數全書』 권3의 별 줄에서 옮긴 거예요. 廟가 가장 또렷하고, 陷이 가장 막힌 자리예요.',
  '원전이 적지 않은 칸은 현대 표(iztro)로 채우고 "현대 표"라고 따로 적었어요. 출처가 하나뿐이라는 뜻이에요. 어느 표에도 없는 별은 글자를 비워 두었어요.',
  `강약은 길흉 점수가 아니에요. 원전도 ${QUOTE}(묘에 들어도 길성이 더하지 않으면 평범하다)이라 해서, 강한 자리만으로 좋다고 보지 않아요. 같은 궁의 다른 별·사화·마주 보는 궁과 함께 읽어요.`,
  '명반은 구매 때 저장한 계산값으로 화면을 열 때마다 다시 그려요. 이미 받은 풀이 글은 바뀌지 않아요.'],
 notes:'이 궁에서 함께 본 조건',hint:'이 소절이 짚은 궁'};
const en:Copy={chart:'Chart',select:'Select a palace',legend:'Further left, the star’s nature shows more clearly · not good or bad',body:'Body palace',
 noMain:'This palace has no main star. It is read together with the main stars of the opposite palace.',noMainShort:'no main star',modern:'modern table',
 kinds:{main:'Main stars',assistant:'Supporting stars',malefic:'Tension stars'},
 grades:{묘:'Its nature shows most clearly and steadily here',왕:'Its nature shows with strength here',득:'It finds its footing and shows without strain',리:'Usable, though one step weaker',평:'Middle — strongly shaped by companion stars, transformations and the opposite palace',불:'It lacks footing, so its force is weak (between 平 and 陷)',함:'Its nature tends to show blocked or bent — read it with the supporting conditions',한:'Its force sits idle and is little used'},
 hua:{화록:'化祿 Lu (prosperity)',화권:'化權 Quan (authority)',화과:'化科 Ke (recognition)',화기:'化忌 Ji (obstruction)'},
 howTitle:'How this star’s strength was read',
 how:['The character beside each star records how clearly that star shows in this palace’s earthly branch, taken from the star rows in volume 3 of the classical 紫微斗數全書. 廟 is the clearest and 陷 the most blocked.',
  'Where the classic gives no entry, the gap is filled from a modern table (iztro) and marked “modern table”, meaning there is only one source. Stars that neither table rates are left without a character.',
  `Strength is not a score of good or bad fortune. The classic itself says ${QUOTE} — entering 廟 without auspicious stars is ordinary — so a strong position alone is not read as good. Each star is read with its companions, transformations and the opposite palace.`,
  'The chart is redrawn from the values saved at purchase each time you open it. The reading you already received does not change.'],
 notes:'Conditions read in this palace',hint:'Palaces this section reads'};
const ja:Copy={chart:'命盤',select:'宮を選択',legend:'左ほど星の性質がはっきり出る位置 · 吉凶ではありません',body:'身宮',
 noMain:'主星のない宮です。向かい合う宮の主星を借りて一緒に読みます。',noMainShort:'主星なし',modern:'現代の表',
 kinds:{main:'主星',assistant:'補佐星',malefic:'緊張要素'},
 grades:{묘:'性質が最もはっきり、安定して現れる位置',왕:'性質が力強く現れる位置',득:'居場所を得て無理なく現れる位置',리:'使えるが、力が一段弱い位置',평:'中間 — 同宮の星・四化・対宮の影響を大きく受ける位置',불:'居場所を得られず力が弱い位置(平と陷の間)',함:'性質が詰まったり歪んだりして現れやすい位置 — 補う条件と合わせて読みます',한:'力が遊んでいて、あまり使われない位置'},
 hua:{화록:'化禄',화권:'化権',화과:'化科',화기:'化忌'},
 howTitle:'この星の強弱をどう読んだか',
 how:['星の横の文字は、その星がこの宮の地支でどれだけはっきり現れるかを『紫微斗數全書』巻三の星の行から写したものです。廟が最もはっきりし、陷が最も詰まった位置です。',
  '原典に記載のない欄は現代の表(iztro)で補い、「現代の表」と別に記しました。出典が一つだけという意味です。どちらの表にもない星は文字を空けています。',
  `強弱は吉凶の点数ではありません。原典も${QUOTE}(廟に入っても吉星が加わらなければ平凡)と述べ、強い位置だけで良いとは見ません。同宮の星・四化・対宮と合わせて読みます。`,
  '命盤は購入時に保存した計算値から、開くたびに描き直します。受け取った鑑定文は変わりません。'],
 notes:'この宮で合わせて見た条件',hint:'この節が読んだ宮'};
const zhCN:Copy={chart:'命盘',select:'选择宫位',legend:'越靠左，星性显现越鲜明 · 不代表吉凶',body:'身宫',
 noMain:'此宫没有主星，借对宫的主星一起解读。',noMainShort:'无主星',modern:'现代表',
 kinds:{main:'主星',assistant:'辅星',malefic:'紧张要素'},
 grades:{묘:'星性最鲜明、最稳定地显现的位置',왕:'星性有力地显现的位置',득:'得其位、平稳显现的位置',리:'可用，但力量弱一级的位置',평:'居中——受同宫星曜、四化与对宫影响很大的位置',불:'不得其位、力量偏弱的位置（介于平与陷之间）',함:'星性易受阻或扭曲的位置——需结合补救条件一起看',한:'力量闲置、不太发挥作用的位置'},
 hua:{화록:'化禄',화권:'化权',화과:'化科',화기:'化忌'},
 howTitle:'这颗星的强弱是怎么读的',
 how:['星旁的字记录该星在此宫地支显现得多鲜明，取自《紫微斗數全書》卷三的星曜条目。廟最鲜明，陷最受阻。',
  '原典未载的格子用现代表（iztro）补上，并另标“现代表”，表示只有一个出处。两张表都没有的星不标字。',
  `强弱不是吉凶分数。原典也说${QUOTE}（入庙而无吉星相加则平常），不以位置强就论好。要与同宫星曜、四化及对宫一起看。`,
  '命盘每次打开时都按购买时保存的计算值重新绘制，已收到的解读文字不会改变。'],
 notes:'此宫一并参考的条件',hint:'本节解读的宫位'};
const zhTW:Copy={chart:'命盤',select:'選擇宮位',legend:'越靠左，星性顯現越鮮明 · 不代表吉凶',body:'身宮',
 noMain:'此宮沒有主星，借對宮的主星一起解讀。',noMainShort:'無主星',modern:'現代表',
 kinds:{main:'主星',assistant:'輔星',malefic:'緊張要素'},
 grades:{묘:'星性最鮮明、最穩定地顯現的位置',왕:'星性有力地顯現的位置',득:'得其位、平穩顯現的位置',리:'可用，但力量弱一級的位置',평:'居中——受同宮星曜、四化與對宮影響很大的位置',불:'不得其位、力量偏弱的位置（介於平與陷之間）',함:'星性易受阻或扭曲的位置——需結合補救條件一起看',한:'力量閒置、不太發揮作用的位置'},
 hua:{화록:'化祿',화권:'化權',화과:'化科',화기:'化忌'},
 howTitle:'這顆星的強弱是怎麼讀的',
 how:['星旁的字記錄該星在此宮地支顯現得多鮮明，取自《紫微斗數全書》卷三的星曜條目。廟最鮮明，陷最受阻。',
  '原典未載的格子用現代表（iztro）補上，並另標「現代表」，表示只有一個出處。兩張表都沒有的星不標字。',
  `強弱不是吉凶分數。原典也說${QUOTE}（入廟而無吉星相加則平常），不以位置強就論好。要與同宮星曜、四化及對宮一起看。`,
  '命盤每次打開時都依購買時保存的計算值重新繪製，已收到的解讀文字不會改變。'],
 notes:'此宮一併參考的條件',hint:'本節解讀的宮位'};

export function ziweiChartCopy(locale?:ReadingLocale):Copy{
 return !locale||locale==='ko'?ko:locale==='ja'?ja:locale==='zh-CN'?zhCN:locale==='zh-TW'?zhTW:en;
}
export const gradeText=(copy:Copy,grade:string|null)=>grade&&grade in copy.grades?copy.grades[grade as Grade]:null;
export const huaText=(copy:Copy,hua?:string)=>hua&&hua in copy.hua?copy.hua[hua as Hua]:null;
/** 칸 안의 한 글자. 得地·不得地는 첫 글자만 쓴다(범례와 같은 글자). */
export const gradeGlyph=(gradeHanja:string|null)=>gradeHanja?gradeHanja[0]:null;
export const HUA_GLYPH:Record<string,string>={화록:'祿',화권:'權',화과:'科',화기:'忌'};
export const GRADE_LEGEND='廟 旺 得 利 平 不 陷';
