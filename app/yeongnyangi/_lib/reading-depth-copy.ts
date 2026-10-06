import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
type Tier='mackerel'|'salmon'|'flounder'|'tuna';
type Copy={sharedTopics:string;tiers:Record<Tier,string>};
// One expert reasoning standard; historical chapter scope and purchase snapshots stay unchanged.
const copies:Record<ReadingLocale,{sharedTopics:string;approach:string}>={
"ko":{sharedTopics:"모든 생선에서 질문에 필요한 가장 깊은 분석을 제공해요. 상담 범위가 달라도 근거를 살피고 설명하는 품질은 같아요.",approach:"근거의 우선순위와 조건별 선택, 행동 뒤 점검할 신호까지."},
"en":{sharedTopics:"Every fish uses the same high standard of analysis and explanation within the chosen consultation scope.",approach:"Which evidence takes priority, choices by situation and signs to review after acting."},
"ja":{sharedTopics:"どの魚のプランでも、選んだ相談範囲について同じ高い水準で根拠を検討し、深く説明します。",approach:"根拠の優先順位、条件別の選択と行動後に確かめる兆候まで。"},
"zh-CN":{sharedTopics:"所有鱼种咨询都以同样高的标准，在所选范围内深入分析依据并清楚解释。",approach:"说明依据的优先顺序、条件对应的选择，以及行动后需观察的信号。"},
"zh-TW":{sharedTopics:"所有魚種諮詢都以同樣高的標準，在所選範圍內深入分析依據並清楚解釋。",approach:"說明依據的優先順序、條件對應的選擇，以及行動後需觀察的訊號。"},
"vi":{sharedTopics:"Mọi gói cá đều phân tích căn cứ và giải thích chuyên sâu theo cùng tiêu chuẩn cao trong phạm vi tư vấn đã chọn.",approach:"Ưu tiên căn cứ nào, chọn theo điều kiện và theo dõi dấu hiệu sau hành động."},
"hi":{sharedTopics:"हर मछली योजना में चुने गए परामर्श दायरे के भीतर एक ही उच्च मानक से आधारों का गहरा विश्लेषण और स्पष्ट व्याख्या मिलती है।",approach:"आधारों की प्राथमिकता, शर्तों के अनुसार चुनाव और कदम उठाने के बाद जाँचने योग्य संकेत।"},
"es":{sharedTopics:"Todos los planes ofrecen el mismo alto nivel de análisis y explicación dentro del alcance elegido.",approach:"Qué fundamento priorizar, cómo elegir y qué señales revisar después de actuar."},
"fr":{sharedTopics:"Chaque formule offre le même niveau approfondi d’analyse et d’explication dans le cadre de la consultation choisie.",approach:"Hiérarchiser les éléments, choisir selon les conditions et observer les signes après l’action."},
"de":{sharedTopics:"Jeder Fisch bietet innerhalb des gewählten Beratungsumfangs denselben hohen Standard an fundierter Analyse und Erklärung.",approach:"Grundlagen gewichten, situationsbezogen wählen und nach dem Handeln Signale prüfen."},
"nl":{sharedTopics:"Elke vis biedt binnen de gekozen adviesomvang dezelfde hoge kwaliteit van grondige analyse en uitleg.",approach:"Aanwijzingen afwegen, per situatie kiezen en signalen na je actie bekijken."},
"ms":{sharedTopics:"Semua pelan ikan memberikan analisis mendalam dan penjelasan dengan standard tinggi yang sama dalam skop konsultasi yang dipilih.",approach:"Keutamaan asas, pilihan mengikut syarat dan tanda yang diperhatikan selepas bertindak."}
};
export function readingDepthCopy(locale:ReadingLocale='ko'):Copy {
 const c=copies[locale];return {sharedTopics:c.sharedTopics,tiers:{mackerel:c.approach,salmon:c.approach,flounder:c.approach,tuna:c.approach}};
}
export function readingTierDepth(tier:string,locale:ReadingLocale='ko'):string|undefined {
 return ['mackerel','salmon','flounder','tuna'].includes(tier)?copies[locale].approach:undefined;
}
