import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';

const ko={section:'운세별 계산 근거',heading:'이야기의 바탕을 펼쳐볼까?',select:'근거 선택',none:'배치된 행성 없음',wheel:'저장된 황경과 하우스 경계로 그린 출생 차트. 아래 목록에서 행성별 설명을 선택할 수 있어요.',timingSelect:'계산된 시기 선택',timing:'저장된 시기의 흐름',related:'이 근거와 연결된 이야기',more:(n:number)=>`관련 이야기 ${n}개 더 보기`,empty:'관련 이야기가 저장되면 이곳에서 이어 읽을 수 있어요.',limits:'계산 방식과 해석의 한계',weight:(label:string)=>`${label}의 가중치`,sourceStored:'구매 당시 저장된 계산 근거',sourceCards:'서버에 저장된 카드 배열'};
type Copy=typeof ko;
const en:Copy={section:'Calculation sources by reading',heading:'Explore the basis of your reading',select:'Select a calculation detail',none:'No planets in this placement',wheel:'Birth chart drawn from the saved longitudes and house cusps. Select a planet below for details.',timingSelect:'Select a calculated period',timing:'Saved timing',related:'Chapters connected to this detail',more:(n:number)=>`Show ${n} more related chapters`,empty:'Connected chapters will appear here when saved.',limits:'Calculation method and limits of interpretation',weight:(label:string)=>`Weight of ${label}`,sourceStored:'Calculation snapshot saved at purchase',sourceCards:'Card spread saved on the server'};
const ja:Copy={section:'鑑定ごとの計算根拠',heading:'鑑定の根拠を見てみましょう',select:'計算根拠を選択',none:'この配置に惑星はありません',wheel:'保存された黄経とハウス境界から描いた出生チャートです。下の一覧で惑星を選ぶと詳細を確認できます。',timingSelect:'計算された時期を選択',timing:'保存された時期の流れ',related:'この根拠につながる章',more:(n:number)=>`関連する章をあと${n}件表示`,empty:'関連する章が保存されるとここから読めます。',limits:'計算方法と解釈の限界',weight:(label:string)=>`${label}の重み`,sourceStored:'購入時に保存された計算根拠',sourceCards:'サーバーに保存されたカードの配置'};
export const chartCopy=(locale?:ReadingLocale):Copy=>locale==='ko'||!locale?ko:locale==='ja'?ja:en;

const terms:Record<string,[string,string]>={
 '나의 사주와 오행':['My saju and five elements','私の四柱推命と五行'],'열두 궁에 담긴 삶':['Life across the twelve palaces','十二宮に表れる人生'],'별 사이의 관계':['Relationships between the stars','星の間の関係'],'라시 차트와 별의 주기':['Rashi chart and planetary periods','ラーシチャートと惑星の周期'],'나의 출생 차트':['My birth chart','私の出生チャート'],'질문 위에 펼친 카드':['Cards drawn for your question','質問に向けて引いたカード'],
 '년주':['Year pillar','年柱'],'월주':['Month pillar','月柱'],'일주':['Day pillar','日柱'],'시주':['Hour pillar','時柱'],'상대 년주':['Partner’s year pillar','相手の年柱'],'상대 월주':['Partner’s month pillar','相手の月柱'],'상대 일주':['Partner’s day pillar','相手の日柱'],'상대 시주':['Partner’s hour pillar','相手の時柱'],'오행 분포 · 월령 가중치 포함':['Five elements · adjusted for birth month','五行の分布・月令による重みを含む'],
 '천간·지지':['Heavenly stem and earthly branch','天干・地支'],'천간 십성':['Ten Gods of the stem','天干の通変星'],'주성':['Main stars','主星'],'보조성':['Supporting stars','補助星'],'긴장 요소':['Challenging stars','緊張要素'],'나의 본명숙':['My birth mansion','私の本命宿'],'상대의 본명숙':['Partner’s birth mansion','相手の本命宿'],'27숙 위치':['Position among 27 mansions','二十七宿での位置'],'두 사람의 흐름':['Relationship pattern','二人の関係の流れ'],'관계':['Relationship','関係'],'나의 역할':['My role','私の役割'],'상대의 역할':['Partner’s role','相手の役割'],'정방향 / 역방향 거리':['Forward / reverse distance','順方向・逆方向の距離'],'거리의 결':['Nature of the distance','距離の性質'],
 '달의 자리':['Moon placement','月の位置'],'나크샤트라':['Nakshatra','ナクシャトラ'],'파다':['Pada','パダ'],'별자리':['Zodiac sign','星座'],'하우스':['House','ハウス'],'황경':['Ecliptic longitude','黄経'],'상승점':['Ascendant','アセンダント'],'각':['Aspect','アスペクト'],'오브':['Orb','オーブ'],'카드':['Card','カード'],'방향':['Orientation','向き'],'정방향':['Upright','正位置'],'역방향':['Reversed','逆位置'],'주기':['Period','周期'],'시작':['Start','開始'],'끝':['End','終了'],'계산된 시기':['Calculated period','計算された時期'],
 '목':['Wood','木'],'화':['Fire','火'],'토':['Earth','土'],'금':['Metal','金'],'수':['Water','水'],'태양':['Sun','太陽'],'달':['Moon','月'],'수성':['Mercury','水星'],'금성':['Venus','金星'],'화성':['Mars','火星'],'목성':['Jupiter','木星'],'토성':['Saturn','土星'],'천왕성':['Uranus','天王星'],'해왕성':['Neptune','海王星'],'명왕성':['Pluto','冥王星'],
 '양자리':['Aries','牡羊座'],'황소자리':['Taurus','牡牛座'],'쌍둥이자리':['Gemini','双子座'],'게자리':['Cancer','蟹座'],'사자자리':['Leo','獅子座'],'처녀자리':['Virgo','乙女座'],'천칭자리':['Libra','天秤座'],'전갈자리':['Scorpio','蠍座'],'사수자리':['Sagittarius','射手座'],'염소자리':['Capricorn','山羊座'],'물병자리':['Aquarius','水瓶座'],'물고기자리':['Pisces','魚座'],'자료 없음':['No data','データなし'],'없음':['None','なし']
};
export function chartTerm(value:string,locale?:ReadingLocale):string{
 if(!locale||locale==='ko')return value;
 const index=locale==='ja'?1:0;
 if(terms[value])return terms[value][index];
 if(value.startsWith('계산된 시기 · '))return `${terms['계산된 시기'][index]} · ${chartTerm(value.slice('계산된 시기 · '.length),locale)}`;
 if(value.endsWith(' · 라그나'))return `${chartTerm(value.slice(0,-' · 라그나'.length),locale)} · ${locale==='ja'?'ラグナ':'Lagna'}`;
 if(value.endsWith(' · 신궁'))return `${value.slice(0,-' · 신궁'.length)} · ${locale==='ja'?'身宮':'Body palace'}`;
 if(value.includes(' · '))return value.split(' · ').map(part=>chartTerm(part,locale)).join(' · ');
 if(/^\d+하우스$/.test(value))return `${value.slice(0,-3)} ${locale==='ja'?'ハウス':'house'}`;
 return value;
}

const limitations:Record<string,[string,string]>={
 '강약·용신은 월령·통근·조후와 함께 읽는 참고 판단입니다.':['Strength and useful element are indicative judgments read with birth month, roots and seasonal balance.','強弱や用神は、月令・通根・寒暖のバランスと合わせて読む参考判断です。'],
 '한국 표준시 출생 기준입니다.':['Based on birth time in Korea Standard Time.','韓国標準時の出生時刻を基準にしています。'],
 '출생시간 미상: 시주와 정확한 대운 시작 시점은 해석하지 않습니다.':['Birth time unknown: the hour pillar and exact start of major luck periods are not interpreted.','出生時刻が不明のため、時柱と大運の正確な開始時点は解釈しません。'],
 '종격은 기존 엔진이 찾은 후보입니다. 기존 서비스의 생활 이력 확인을 거치지 않은 용신·종격 해석은 조건부입니다.':['The special chart pattern is a candidate identified by the existing engine. Without confirmation against life history, interpretations of the useful element and pattern are conditional.','特殊格局は既存の計算エンジンが示した候補です。生活履歴との照合を経ていない用神・格局の解釈は条件付きです。'],
 '한국 음력·표준시를 기준으로 계산한 명반입니다.':['This chart was calculated using the Korean lunar calendar and standard time.','この命盤は韓国の旧暦と標準時を基準に計算しています。'],
 '천문식 27숙 개인 분석입니다. 상대 정보 없이 궁합을 추정하지 않습니다.':['This is an astronomical 27 mansion reading for one person. It does not estimate compatibility without a partner’s details.','天文式の二十七宿による個人鑑定です。相手の情報なしに相性は推定しません。'],
 '천문식 27숙 계산이며 음력 고정표 방식과 구분합니다.':['This uses astronomical 27 mansion calculation, distinct from a fixed lunar table.','天文式の二十七宿計算で、旧暦の固定表による方式とは異なります。'],
 '요가·분할 차트는 원차트와 함께 해석합니다.':['Yogas and divisional charts are interpreted alongside the birth chart.','ヨーガと分割図は元のチャートと合わせて解釈します。'],
 '분할 차트의 행성 배치는 완전한 분할 하우스 명반이 아닙니다.':['Planet placements in the divisional chart are not a complete divisional house chart.','分割図の惑星配置は、完全な分割ハウスの命盤ではありません。'],
 '출생 차트 해석이며 실시간 트랜짓은 포함하지 않습니다.':['This is a birth chart interpretation and does not include live transits.','出生チャートの解釈であり、現在のトランジットは含みません。'],
 '질문 당시의 카드 상징을 읽습니다. 천문 계산이나 미래의 확정 증거가 아닙니다.':['The cards reflect symbols at the time of the question. They are not astronomical calculations or proof of future events.','質問時に引いたカードの象徴を読みます。天文計算や未来の確定的な証拠ではありません。']
};
export function chartLimitation(value:string,locale?:ReadingLocale):string{
 if(!locale||locale==='ko')return value;
 const index=locale==='ja'?1:0;
 if(value.startsWith('상대: '))return `${locale==='ja'?'相手':'Partner'}: ${chartLimitation(value.slice(4),locale)}`;
 return limitations[value]?.[index]||value;
}

const visualKo={glance:'한눈에 보는 이야기',glanceCaption:'장마다 영냥이가 짚은 핵심이야.',chapterCol:'장',themeCol:'주제',pointCol:'핵심 한 줄',
 keyPoints:'영냥이의 핵심 정리',timeline:'시기의 흐름',timelineCaption:'구매 당시 저장된 계산 기간이야. 금빛 선이 지금이야.',periodCol:'주기',rangeCol:'기간',now:'지금',noRange:'기간 자료 없음',
 pillars:'나의 사주 원국표',pillarRow:'천간·지지',tenGodRow:'천간 십성',elements:'오행의 균형',elementsCaption:'월령 가중치를 포함한 저장된 분포야.',
 elementCount:(label:string,n:number)=>`${label} ${n}`,says:'영냥이의 한마디',answerTable:'답의 근거와 실행',
 themes:{self:'나',wealth:'재물',love:'사랑',career:'일',relations:'관계',timing:'시기',cross:'교차',action:'실천'} as Record<string,string>,
 pillarNames:{'시주':'시주','일주':'일주','월주':'월주','년주':'년주'} as Record<string,string>};
type VisualCopy=typeof visualKo;
const visualEn:VisualCopy={glance:'Your reading at a glance',glanceCaption:'The key point Yeongnyangi picked from each chapter.',chapterCol:'Ch.',themeCol:'Theme',pointCol:'Key point',
 keyPoints:'Yeongnyangi’s key points',timeline:'Timing at a glance',timelineCaption:'Periods saved from your calculation at purchase. The gold line marks today.',periodCol:'Period',rangeCol:'Range',now:'Now',noRange:'No date range saved',
 pillars:'My four pillars',pillarRow:'Stem and branch',tenGodRow:'Ten Gods of the stem',elements:'Five element balance',elementsCaption:'Saved distribution, weighted by birth month.',
 elementCount:(label:string,n:number)=>`${label} ${n}`,says:'A word from Yeongnyangi',answerTable:'Reason, timing and action',
 themes:{self:'Self',wealth:'Wealth',love:'Love',career:'Work',relations:'Relationships',timing:'Timing',cross:'Crossing',action:'Action'},
 pillarNames:{'시주':'Hour','일주':'Day','월주':'Month','년주':'Year'}};
const visualJa:VisualCopy={glance:'ひと目でわかる鑑定',glanceCaption:'各章でヨンニャンイが押さえた要点です。',chapterCol:'章',themeCol:'テーマ',pointCol:'要点',
 keyPoints:'ヨンニャンイの要点まとめ',timeline:'時期の流れ',timelineCaption:'購入時に保存された計算上の期間です。金色の線が現在です。',periodCol:'周期',rangeCol:'期間',now:'現在',noRange:'期間の資料なし',
 pillars:'私の四柱命式',pillarRow:'天干・地支',tenGodRow:'天干の通変星',elements:'五行のバランス',elementsCaption:'月令の重みを含む保存済みの分布です。',
 elementCount:(label:string,n:number)=>`${label} ${n}`,says:'ヨンニャンイのひとこと',answerTable:'答えの根拠と実行',
 themes:{self:'自分',wealth:'財運',love:'恋愛',career:'仕事',relations:'人間関係',timing:'時期',cross:'交差',action:'実践'},
 pillarNames:{'시주':'時柱','일주':'日柱','월주':'月柱','년주':'年柱'}};
export const visualCopy=(locale?:ReadingLocale):VisualCopy=>locale==='ko'||!locale?visualKo:locale==='ja'?visualJa:visualEn;
