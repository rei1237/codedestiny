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

// Flounder vs tuna (tuna-quality-20261012). Korean question books also get the roadmap, self-review and six followups;
// other locales have no question book, so they show only what every tuna order gets.
type Comparison={title:string;rows:{label:string;flounder:string;tuna:string}[]};
const comparisons:Record<Exclude<ReadingLocale,'ko'>,[string,string,string,string,string,string,string]>={
"en":["Flounder vs Tuna","Writing model","Standard model","Advanced model for key synthesis","Calculated values","Evidence explained in each chapter","Several calculated values quoted in every chapter, each with its reason"],
"ja":["ヒラメとマグロの比較","執筆モデル","標準モデル","重要な総合判断に上位モデルを活用","計算値の引用","各章で根拠を説明","各章で実際の計算値を複数引用し、そう読んだ理由も説明"],
"zh-CN":["比目鱼与金枪鱼对比","写作模型","标准模型","关键综合判断采用高级模型","计算值引用","每章解释依据","每章引用多个实际计算值并说明解读理由"],
"zh-TW":["比目魚與鮪魚比較","寫作模型","標準模型","關鍵綜合判斷採用進階模型","計算值引用","每章解釋依據","每章引用多個實際計算值並說明解讀理由"],
"vi":["So sánh cá bơn và cá ngừ","Mô hình viết","Mô hình tiêu chuẩn","Mô hình nâng cao cho phần tổng hợp quan trọng","Giá trị tính toán","Giải thích căn cứ trong mỗi chương","Mỗi chương trích nhiều giá trị tính toán thực kèm lý do diễn giải"],
"hi":["फ़्लाउंडर बनाम ट्यूना","लेखन मॉडल","मानक मॉडल","मुख्य समेकित विश्लेषण के लिए उन्नत मॉडल","गणना किए गए मान","हर अध्याय में आधार की व्याख्या","हर अध्याय में कई वास्तविक गणना-मान और उन्हें ऐसे पढ़ने का कारण"],
"es":["Lenguado vs atún","Modelo de redacción","Modelo estándar","Modelo avanzado para la síntesis clave","Valores calculados","Fundamentos explicados en cada capítulo","Varios valores calculados citados en cada capítulo, cada uno con su razón"],
"fr":["Sole ou thon","Modèle de rédaction","Modèle standard","Modèle avancé pour la synthèse essentielle","Valeurs calculées","Éléments expliqués dans chaque chapitre","Plusieurs valeurs calculées citées dans chaque chapitre, avec leur raison"],
"de":["Flunder vs. Thunfisch","Schreibmodell","Standardmodell","Fortgeschrittenes Modell für zentrale Gesamteinschätzungen","Berechnete Werte","Grundlagen in jedem Kapitel erklärt","Mehrere berechnete Werte pro Kapitel zitiert, jeweils mit Begründung"],
"nl":["Bot vs. tonijn","Schrijfmodel","Standaardmodel","Geavanceerd model voor de belangrijkste synthese","Berekende waarden","Onderbouwing in elk hoofdstuk uitgelegd","Meerdere berekende waarden per hoofdstuk geciteerd, elk met de reden"],
"ms":["Ikan sebelah lawan tuna","Model penulisan","Model standard","Model lanjutan untuk sintesis utama","Nilai yang dikira","Asas diterangkan dalam setiap bab","Beberapa nilai sebenar dipetik dalam setiap bab, berserta sebabnya"],
};
export function tierComparison(locale:ReadingLocale='ko',followups:{flounder:number;tuna:number}={flounder:2,tuna:6}):Comparison {
 if(locale==='ko')return {title:'광어 vs 참치 한눈에 비교',rows:[
  {label:'작성 모델',flounder:'표준 모델',tuna:'핵심 종합 판단에 상위 모델 활용'},
  {label:'계산값 인용',flounder:'장마다 근거 해설',tuna:'장마다 실제 계산값 2개 이상과 그렇게 읽은 이유, 내 질문과의 연결'},
  {label:'12개월 로드맵',flounder:'없음',tuna:'앞으로 12개월 월별 흐름표와 구간별 행동 처방'},
  {label:'자기 검토',flounder:'없음',tuna:'인용 부족·반복·일반론이 보인 장을 한 번 고쳐 씀'},
  {label:'추가 질문',flounder:`${followups.flounder}회`,tuna:`${followups.tuna}회`},
 ]};
 const [title,model,standard,top,cited,basic,many]=comparisons[locale];
 return {title,rows:[{label:model,flounder:standard,tuna:top},{label:cited,flounder:basic,tuna:many}]};
}
