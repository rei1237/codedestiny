import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {tarotSpreadStoredLabel} from './yeongnyangi-spread-locales';
export {localizedTarotSpread as localizedSpread} from './yeongnyangi-spread-locales';
export const tarotCatalogLocales=['en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms'] as const;
// Legacy v2 position IDs repeat; localize by the stored Korean label. V3 reuses the shared catalog.
export const tarotCatalogRows:Record<string,string>={
 self_view:'How I see the other person|自分から見た相手|我眼中的对方|我眼中的對方|Cách tôi nhìn người ấy|मैं दूसरे को कैसे देखता हूँ|Cómo veo a la otra persona|Ma perception de l’autre|Wie ich die andere Person sehe|Hoe ik de ander zie|Cara saya melihat mereka',
 other_view:'Their possible view of the relationship|相手から見た関係の可能性|对方可能如何看待关系|對方可能如何看待關係|Góc nhìn có thể có của người ấy về quan hệ|रिश्ते पर उनका संभावित दृष्टिकोण|Su posible visión de la relación|Sa perception possible de la relation|Ihre mögliche Sicht auf die Beziehung|Hun mogelijke kijk op de relatie|Pandangan mereka yang mungkin tentang hubungan',
 other_feeling:'Possible feelings toward me|自分に向けた感情の可能性|对我可能的感受|對我可能的感受|Cảm xúc có thể có dành cho tôi|मेरे प्रति संभावित भावनाएँ|Posibles sentimientos hacia mí|Sentiments possibles à mon égard|Mögliche Gefühle mir gegenüber|Mogelijke gevoelens voor mij|Perasaan yang mungkin terhadap saya',
 other_intent:'Possible willingness to approach|近づく意思の可能性|可能靠近的意愿|可能靠近的意願|Ý muốn đến gần có thể có|पास आने की संभावित इच्छा|Posible disposición a acercarse|Disposition possible à se rapprocher|Mögliche Bereitschaft zur Annäherung|Mogelijke bereidheid tot toenadering|Kesediaan yang mungkin untuk mendekati',
 distance:'Current distance between us|今の二人の距離|目前双方的距离|目前雙方的距離|Khoảng cách hiện tại|हमारे बीच मौजूदा दूरी|Distancia actual entre ambos|Distance actuelle entre nous|Aktueller Abstand zwischen uns|Huidige afstand tussen ons|Jarak semasa antara kita',
 hidden_tasks:'Visible relationship and less obvious challenges|見えている関係と隠れた課題|显现的关系与不明显的课题|顯現的關係與不明顯的課題|Quan hệ hiện rõ và thử thách khó thấy|दिखता रिश्ता और कम स्पष्ट चुनौतियाँ|Relación visible y retos menos evidentes|Relation visible et défis moins évidents|Sichtbare Beziehung und weniger erkennbare Aufgaben|Zichtbare relatie en minder duidelijke uitdagingen|Hubungan yang kelihatan dan cabaran kurang jelas',
 emotional_acceptance:'Accepting my feelings|感情を受け止める|接纳自己的感受|接納自己的感受|Chấp nhận cảm xúc|अपनी भावनाएँ स्वीकारना|Aceptar mis emociones|Accueillir mes émotions|Gefühle annehmen|Mijn gevoelens aanvaarden|Menerima perasaan sendiri',
 resource:'Available resources|使える資源|可用的资源|可用的資源|Nguồn lực sẵn có|उपलब्ध संसाधन|Recursos disponibles|Ressources disponibles|Verfügbare Ressourcen|Beschikbare middelen|Sumber yang ada',
 next_action:'Next action|次の行動|下一步行动|下一步行動|Hành động tiếp theo|अगला कदम|Próxima acción|Prochaine action|Nächster Schritt|Volgende stap|Tindakan seterusnya',
 my_wish:'What I hope for|自分の願い|我的期待|我的期待|Điều tôi mong muốn|मेरी इच्छा|Lo que deseo|Ce que je souhaite|Was ich mir wünsche|Wat ik hoop|Harapan saya',
 approach_barrier:'Barriers to approaching|近づく際の障壁|接近的阻碍|接近的阻礙|Trở ngại khi đến gần|पास आने की बाधाएँ|Barreras al acercamiento|Freins au rapprochement|Hürden der Annäherung|Drempels voor toenadering|Halangan untuk mendekati',
 boundary:'Boundaries to respect|尊重したい境界線|需要尊重的边界|需要尊重的界線|Ranh giới cần tôn trọng|सम्मान योग्य सीमाएँ|Límites que respetar|Limites à respecter|Zu achtende Grenzen|Grenzen om te respecteren|Batas yang perlu dihormati',
 observed_attitude:'Interpreting observed behavior|見えている態度の解釈|观察到的态度的解读|觀察到的態度的解讀|Diễn giải hành vi quan sát được|देखे गए व्यवहार की व्याख्या|Interpretar la conducta observada|Interpréter les attitudes observées|Beobachtetes Verhalten deuten|Waargenomen gedrag duiden|Mentafsir sikap yang diperhatikan',
 to_adjust:'What can be adjusted|調整できること|可以协调的部分|可以協調的部分|Điều có thể điều chỉnh|क्या समायोजित कर सकते हैं|Lo que se puede ajustar|Ce qui peut être ajusté|Was sich abstimmen lässt|Wat je kunt afstemmen|Perkara yang boleh diselaraskan',
 remaining_feeling:'Remaining feelings|残っている感情|仍在的情感|仍在的情感|Cảm xúc còn lại|शेष भावनाएँ|Sentimientos que quedan|Sentiments qui restent|Verbliebene Gefühle|Overgebleven gevoelens|Perasaan yang masih ada',
 recontact_condition:'Conditions for renewed contact|再び連絡する条件|重新联系的条件|重新聯繫的條件|Điều kiện liên lạc lại|फिर संपर्क की शर्तें|Condiciones para retomar contacto|Conditions pour reprendre contact|Bedingungen für neuen Kontakt|Voorwaarden voor nieuw contact|Syarat untuk berhubung semula',
 let_go:'Patterns to release|手放したいパターン|可放下的模式|可放下的模式|Mô thức nên buông|छोड़ने योग्य ढर्रे|Patrones que soltar|Schémas à laisser partir|Muster loslassen|Patronen loslaten|Corak untuk dilepaskan',
 criteria:'Decision criteria|選択の基準|选择标准|選擇標準|Tiêu chí lựa chọn|निर्णय के मापदंड|Criterios de elección|Critères de choix|Entscheidungskriterien|Keuzecriteria|Kriteria pilihan',
 burden:'Burden to consider|引き受ける負担|需要承担的负担|需要承擔的負擔|Gánh nặng cần cân nhắc|विचार योग्य बोझ|Carga a considerar|Charge à considérer|Zu bedenkende Belastung|Te overwegen belasting|Beban untuk dipertimbangkan',
 core_value:'Core values|大切にしたい価値|核心价值|核心價值|Giá trị cốt lõi|मूल मूल्य|Valores centrales|Valeurs essentielles|Kernwerte|Kernwaarden|Nilai teras',
 flow:'Possible direction|考えられる流れ|可能的走向|可能的走向|Hướng có thể xảy ra|संभावित दिशा|Rumbo posible|Direction possible|Mögliche Richtung|Mogelijke richting|Arah yang mungkin',
 current_method:'Current approach|現在の方法|当前方法|目前方法|Cách làm hiện tại|मौजूदा तरीका|Enfoque actual|Approche actuelle|Bisherige Vorgehensweise|Huidige aanpak|Pendekatan semasa',
 strength:'Strengths to use|活かしたい強み|可发挥的优势|可發揮的優勢|Điểm mạnh nên dùng|काम आने वाली खूबियाँ|Fortalezas que usar|Forces à mobiliser|Nutzbare Stärken|Sterke kanten benutten|Kekuatan untuk digunakan',
 habit:'A habit to practice|実践したい習慣|可实践的习惯|可實踐的習慣|Thói quen nên thực hành|अभ्यास करने योग्य आदत|Un hábito que practicar|Une habitude à pratiquer|Eine Gewohnheit üben|Een gewoonte oefenen|Tabiat untuk diamalkan',
 pull:'What attracts me|惹かれる理由|吸引我的原因|吸引我的原因|Điều thu hút tôi|मुझे क्या आकर्षित करता है|Lo que me atrae|Ce qui m’attire|Was mich anzieht|Wat mij aantrekt|Perkara yang menarik saya',
 need:'Needs I try to protect|守ろうとする願い|想守护的需要|想守護的需要|Nhu cầu muốn bảo vệ|सुरक्षित रखने की ज़रूरतें|Necesidades que protejo|Besoins que je protège|Bedürfnisse, die ich schütze|Behoeften die ik bescherm|Keperluan yang saya lindungi',
 may_rest:'Where I can pause|休んでもよいところ|可以休息的部分|可以休息的部分|Điều có thể tạm nghỉ|कहाँ विराम ले सकते हैं|Dónde puedo parar|Où je peux faire une pause|Wo ich pausieren darf|Waar ik mag pauzeren|Bahagian yang boleh direhatkan',
 support:'Available support|頼れる支え|可获得的支持|可獲得的支持|Hỗ trợ sẵn có|उपलब्ध सहारा|Apoyo disponible|Soutien disponible|Verfügbare Unterstützung|Beschikbare steun|Sokongan yang ada',
 practice:'Practical guidance|実践の助言|实践建议|實踐建議|Gợi ý thực hành|व्यावहारिक सलाह|Orientación práctica|Conseils pratiques|Praktische Hinweise|Praktische begeleiding|Panduan praktikal',
 present:'Present situation|現在|现在的情况|現在的情況|Hiện tại|वर्तमान स्थिति|Situación presente|Situation présente|Gegenwart|Huidige situatie|Keadaan kini',
 core_conflict:'Core conflict|中心となる葛藤|核心矛盾|核心矛盾|Xung đột cốt lõi|मुख्य टकराव|Conflicto central|Conflit central|Kernkonflikt|Kernconflict|Konflik utama',
 background:'Background|背景|背景|背景|Bối cảnh|पृष्ठभूमि|Trasfondo|Contexte|Hintergrund|Achtergrond|Latar belakang',
 overall:'Overall direction|全体の方向|整体方向|整體方向|Hướng tổng thể|समग्र दिशा|Rumbo general|Direction générale|Gesamtrichtung|Algemene richting|Arah keseluruhan',
 hidden_influence:'Less visible influences|見えにくい影響|不易察觉的影响|不易察覺的影響|Ảnh hưởng khó thấy|कम दिखाई देने वाले प्रभाव|Influencias menos visibles|Influences moins visibles|Weniger sichtbare Einflüsse|Minder zichtbare invloeden|Pengaruh kurang jelas',
 advice:'Advice|助言|建议|建議|Lời khuyên|सलाह|Consejo|Conseils|Rat|Advies|Nasihat',
 near_future:'Possible upcoming influences|これからの影響の可能性|可能到来的影响|可能到來的影響|Ảnh hưởng có thể sắp tới|संभावित आने वाले प्रभाव|Posibles influencias próximas|Influences possibles à venir|Mögliche kommende Einflüsse|Mogelijke komende invloeden|Pengaruh yang mungkin datang',
};
export function tarotCatalogLabel(id:string,locale:ReadingLocale):string|undefined{
 return locale==='ko'?undefined:tarotCatalogRows[id]?.split('|')[tarotCatalogLocales.indexOf(locale)];
}
const legacyPositionLabels:Record<string,string>={
 '원인':'background','과정':'current_method','결과':'flow','카드의 자리':'present',
 '내가 바라보는 상대':'self_view','상대가 관계 전체를 보는 시각':'other_view','관계에 대한 상대의 시선':'other_view',
 '상대가 나를 바라보는 마음':'other_feeling','상대 감정의 가능성':'other_feeling','상대의 연애 의지와 열망':'other_intent','다가올 의지의 가능성':'other_intent',
 '관계를 가로막는 핵심 요인':'core_conflict','관계의 핵심 장애물':'core_conflict','앞으로 펼쳐질 단기적 결말':'near_future','가까운 선택의 방향':'near_future',
 '겉으로 보이는 태도':'observed_attitude','감정의 경향':'remaining_feeling','다가오지 않는 이유':'approach_barrier','숨겨진 욕구':'need','관계에 대한 판단':'criteria',
 '현재의 거리':'distance','소통을 막는 것':'approach_barrier','다가갈 조건':'recontact_condition','가까운 흐름':'near_future','행동 조언':'practice',
 '아직 남아 있는 마음':'remaining_feeling','상대가 보이는 마음의 결':'observed_attitude','연락이 멈춘 현실 신호':'approach_barrier','다시 닿을 수 있는 거리':'boundary','관계 회복의 조건과 기준':'recontact_condition',
 '내 현재 마음':'my_wish','상대 쪽 관계 흐름':'other_view','두 사람 사이의 끌림':'pull','겉으로 드러난 관계와 숨은 과제':'hidden_tasks','가까운 미래의 가능성':'near_future','관계 조언과 종합 판단':'advice',
 '살아나는 일의 결':'strength','덜 소모되는 방향':'may_rest','마음의 소명':'core_value','문턱 너머의 생활':'near_future','현실로 여는 첫 행동':'next_action','놓아야 할 낡은 기준':'let_go','남길 기준과 옮길 방향':'overall',
 '현재의 돈 습관':'habit','활용할 자원':'resource','주의할 부담':'burden','조정할 선택':'to_adjust',
 '숨겨진 진실':'hidden_influence','감정 수용':'emotional_acceptance','회복 단서':'support','다음 행동':'next_action',
};
export function localizedTarotPosition(label:string,locale:ReadingLocale='ko'){
 return locale==='ko'?label:tarotCatalogLabel(legacyPositionLabels[label],locale)||tarotSpreadStoredLabel(label,locale)||label;
}
