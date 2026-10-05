import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';

export const tarotCatalogLocales=['en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms'] as const;
// IDs refer to the existing catalog. These are display labels only, never calculation or stored draw data.
export const tarotCatalogRows:Record<string,string>={
 self_view:'How I see the other person|自分から見た相手|我眼中的对方|我眼中的對方|Cách tôi nhìn người ấy|मैं दूसरे को कैसे देखता हूँ|Cómo veo a la otra persona|Ma perception de l’autre|Wie ich die andere Person sehe|Hoe ik de ander zie|Cara saya melihat mereka',
 other_view:'Their possible view of the relationship|相手から見た関係の可能性|对方可能如何看待关系|對方可能如何看待關係|Góc nhìn có thể có của người ấy về quan hệ|रिश्ते पर उनका संभावित दृष्टिकोण|Su posible visión de la relación|Sa perception possible de la relation|Ihre mögliche Sicht auf die Beziehung|Hun mogelijke kijk op de relatie|Pandangan mereka yang mungkin tentang hubungan',
 other_feeling:'Possible feelings toward me|自分に向けた感情の可能性|对我可能的感受|對我可能的感受|Cảm xúc có thể có dành cho tôi|मेरे प्रति संभावित भावनाएँ|Posibles sentimientos hacia mí|Sentiments possibles à mon égard|Mögliche Gefühle mir gegenüber|Mogelijke gevoelens voor mij|Perasaan yang mungkin terhadap saya',
 other_intent:'Possible willingness to approach|近づく意思の可能性|可能靠近的意愿|可能靠近的意願|Ý muốn đến gần có thể có|पास आने की संभावित इच्छा|Posible disposición a acercarse|Disposition possible à se rapprocher|Mögliche Bereitschaft zur Annäherung|Mogelijke bereidheid tot toenadering|Kesediaan yang mungkin untuk mendekati',
 distance:'Current distance between us|今の二人の距離|目前双方的距离|目前雙方的距離|Khoảng cách hiện tại|हमारे बीच मौजूदा दूरी|Distancia actual entre ambos|Distance actuelle entre nous|Aktueller Abstand zwischen uns|Huidige afstand tussen ons|Jarak semasa antara kita',
 hidden_tasks:'Visible relationship and less obvious challenges|見えている関係と隠れた課題|显现的关系与不明显的课题|顯現的關係與不明顯的課題|Quan hệ hiện rõ và thử thách khó thấy|दिखता रिश्ता और कम स्पष्ट चुनौतियाँ|Relación visible y retos menos evidentes|Relation visible et défis moins évidents|Sichtbare Beziehung und weniger erkennbare Aufgaben|Zichtbare relatie en minder duidelijke uitdagingen|Hubungan yang kelihatan dan cabaran kurang jelas',
 emotional_acceptance:'Accepting my feelings|感情を受け止める|接纳自己的感受|接納自己的感受|Chấp nhận cảm xúc|अपनी भावनाएँ स्वीकारना|Aceptar mis emociones|Accueillir mes émotions|Gefühle annehmen|Mijn gevoelens aanvaarden|Menerima perasaan sendiri',
 yn_one_word:'A word for this moment|今の自分への一言|此刻的一句话|此刻的一句話|Một lời cho lúc này|इस पल के लिए एक बात|Una palabra para este momento|Un mot pour cet instant|Ein Gedanke für diesen Moment|Een woord voor dit moment|Sepatah kata untuk saat ini',
 yn_knot_three:'Untangling a stuck situation|行き詰まりをほどく糸口|解开困局的线索|解開困局的線索|Gỡ nút thắt hiện tại|उलझी स्थिति सुलझाने का सूत्र|Desenredar una situación|Dénouer une situation|Eine festgefahrene Lage lösen|Een vastgelopen situatie ontwarren|Merungkai keadaan buntu',
 yn_contact_first:'Should I reach out first?|先に連絡してもいい？|我该先联系吗？|我該先聯繫嗎？|Tôi có nên liên lạc trước?|क्या मैं पहले संपर्क करूँ?|¿Debería dar el primer paso?|Prendre contact en premier ?|Soll ich zuerst Kontakt aufnehmen?|Zal ik als eerste contact zoeken?|Patutkah saya menghubungi dahulu?',
 yn_crossed_six:'Why do we miss each other’s meaning?|なぜ気持ちがすれ違う？|为何总是错过彼此的意思？|為何總是錯過彼此的意思？|Vì sao chúng ta hiểu lệch nhau?|हम एक-दूसरे को क्यों नहीं समझ पाते?|¿Por qué no nos entendemos?|Pourquoi se comprend-on mal ?|Warum reden wir aneinander vorbei?|Waarom begrijpen we elkaar niet?|Mengapa kita saling salah faham?',
 yn_reunion_seven:'Could reconnecting be different?|また会えたら変わる？|重新相遇会不同吗？|重新相遇會不同嗎？|Gặp lại có thể khác trước không?|क्या फिर जुड़ना अलग हो सकता है?|¿Podría ser diferente al volver?|Se retrouver autrement ?|Könnte ein neuer Anfang anders sein?|Kan opnieuw verbinden anders zijn?|Mungkinkah pertemuan semula berbeza?',
 yn_new_bond_five:'Making room for a new connection|新しいご縁を迎えるには|为新关系留出空间|為新關係留出空間|Mở lòng cho kết nối mới|नए रिश्ते के लिए जगह बनाना|Dar espacio a un nuevo vínculo|Faire place à un nouveau lien|Raum für eine neue Verbindung|Ruimte voor een nieuwe band|Memberi ruang kepada hubungan baharu',
 yn_deepen_seven:'Deepening your relationship|関係を深めるために|让关系更深入|讓關係更深入|Nuôi dưỡng quan hệ sâu hơn|रिश्ते में गहराई लाना|Profundizar la relación|Approfondir la relation|Die Beziehung vertiefen|Je relatie verdiepen|Mendalami hubungan',
 yn_ab_seven:'A or B: what fits me?|AとB、自分に合うのは？|A与B，哪个适合我？|A與B，哪個適合我？|A hay B phù hợp với tôi?|A या B: मेरे लिए क्या सही है?|A o B: ¿qué encaja conmigo?|A ou B : que choisir pour moi ?|A oder B: Was passt zu mir?|A of B: wat past bij mij?|A atau B: yang mana sesuai?',
 yn_stay_leave_nine:'Staying or changing jobs|転職と残留、二つの道|留下还是换工作|留下還是換工作|Ở lại hay chuyển việc|नौकरी में रहना या बदलना|Quedarse o cambiar de trabajo|Rester ou changer de travail|Bleiben oder den Job wechseln|Blijven of van baan veranderen|Kekal atau bertukar kerja',
 yn_work_block_six:'Where is my work getting stuck?|仕事はどこで止まっている？|工作卡在哪里？|工作卡在哪裡？|Công việc đang vướng ở đâu?|मेरे काम में रुकावट कहाँ है?|¿Dónde se atasca mi trabajo?|Où mon travail se bloque-t-il ?|Wo stockt meine Arbeit?|Waar loopt mijn werk vast?|Di manakah kerja saya tersekat?',
 yn_money_pattern_five:'My patterns with money|お金との付き合い方|我与金钱的相处模式|我與金錢的相處模式|Thói quen của tôi với tiền|पैसे के साथ मेरे व्यवहार|Mis patrones con el dinero|Mes habitudes avec l’argent|Meine Muster im Umgang mit Geld|Mijn patronen met geld|Corak saya mengurus wang',
 yn_offer_six:'Should I accept this offer?|この提案を受けていい？|该接受这个提议吗？|該接受這個提議嗎？|Tôi có nên nhận đề nghị này?|क्या यह प्रस्ताव स्वीकार करूँ?|¿Acepto esta propuesta?|Accepter cette proposition ?|Soll ich dieses Angebot annehmen?|Zal ik dit aanbod aannemen?|Patutkah saya menerima tawaran ini?',
 yn_repeat_pattern_six:'Why do I repeat relationship patterns?|同じ関係を繰り返すのはなぜ？|为何重复同样的关系模式？|為何重複同樣的關係模式？|Vì sao tôi lặp lại mô thức quan hệ?|मैं रिश्तों में वही ढर्रे क्यों दोहराता हूँ?|¿Por qué repito patrones de relación?|Pourquoi ces schémas relationnels reviennent-ils ?|Warum wiederholen sich meine Beziehungsmuster?|Waarom herhaal ik relatiepatronen?|Mengapa corak hubungan berulang?',
 yn_recovery_four:'Rest for a tired heart|疲れた心の回復|给疲惫的心一点休息|給疲憊的心一點休息|Hồi phục khi lòng mệt mỏi|थके मन के लिए विश्राम|Descanso para un corazón cansado|Du repos pour un cœur fatigué|Erholung für ein müdes Herz|Rust voor een vermoeid hart|Rehat untuk hati yang letih',
 yn_month_compass_six:'A compass for the coming month|これから一か月の指針|未来一个月的方向|未來一個月的方向|Định hướng cho tháng tới|आने वाले महीने की दिशा|Una brújula para el próximo mes|Un repère pour le mois à venir|Orientierung für den kommenden Monat|Een kompas voor de komende maand|Panduan untuk bulan akan datang',
 yn_whole_map_ten:'Seeing the whole situation|複雑な悩みの全体像|看清复杂问题的全貌|看清複雜問題的全貌|Nhìn toàn cảnh vấn đề|पूरी स्थिति को समझना|Ver la situación completa|Voir la situation dans son ensemble|Die ganze Situation betrachten|De hele situatie overzien|Melihat keseluruhan keadaan',
 trad_past_present_future:'Past, present and possible future|過去・現在・未来の可能性|过去、现在与未来的可能|過去、現在與未來的可能|Quá khứ, hiện tại và khả năng phía trước|अतीत, वर्तमान और संभावित भविष्य|Pasado, presente y futuro posible|Passé, présent et avenir possible|Vergangenheit, Gegenwart und mögliche Zukunft|Verleden, heden en mogelijke toekomst|Masa lalu, kini dan kemungkinan masa depan',
 trad_horseshoe_seven:'Horseshoe spread|ホースシュー|马蹄牌阵|馬蹄牌陣|Trải bài móng ngựa|घोड़े की नाल विन्यास|Tirada de herradura|Tirage en fer à cheval|Hufeisenlegung|Hoefijzerlegging|Susunan ladam kuda',
 trad_celtic_cross_ten:'Celtic Cross|ケルト十字|凯尔特十字|凱爾特十字|Thập tự Celtic|केल्टिक क्रॉस|Cruz celta|Croix celtique|Keltisches Kreuz|Keltisch kruis|Salib Celtic',
 attitude:'Attitude to consider|見つめたい姿勢|值得思考的态度|值得思考的態度|Thái độ cần xem xét|विचार करने योग्य रवैया|Actitud a considerar|Attitude à considérer|Haltung zum Überdenken|Houding om te overwegen|Sikap untuk dipertimbangkan',
 knot:'Current knot|今の行き詰まり|当前的症结|目前的癥結|Nút thắt hiện tại|मौजूदा उलझन|Nudo actual|Nœud actuel|Aktueller Knoten|Huidige knoop|Kebuntuan semasa',
 resource:'Available resources|使える資源|可用的资源|可用的資源|Nguồn lực sẵn có|उपलब्ध संसाधन|Recursos disponibles|Ressources disponibles|Verfügbare Ressourcen|Beschikbare middelen|Sumber yang ada',
 next_action:'Next action|次の行動|下一步行动|下一步行動|Hành động tiếp theo|अगला कदम|Próxima acción|Prochaine action|Nächster Schritt|Volgende stap|Tindakan seterusnya',
 my_wish:'What I hope for|自分の願い|我的期待|我的期待|Điều tôi mong muốn|मेरी इच्छा|Lo que deseo|Ce que je souhaite|Was ich mir wünsche|Wat ik hoop|Harapan saya',
 current_communication:'Current communication|今のやり取り|目前的沟通|目前的溝通|Giao tiếp hiện tại|मौजूदा संवाद|Comunicación actual|Communication actuelle|Aktuelle Kommunikation|Huidige communicatie|Komunikasi semasa',
 approach_barrier:'Barriers to approaching|近づく際の障壁|接近的阻碍|接近的阻礙|Trở ngại khi đến gần|पास आने की बाधाएँ|Barreras al acercamiento|Freins au rapprochement|Hürden der Annäherung|Drempels voor toenadering|Halangan untuk mendekati',
 boundary:'Boundaries to respect|尊重したい境界線|需要尊重的边界|需要尊重的界線|Ranh giới cần tôn trọng|सम्मान योग्य सीमाएँ|Límites que respetar|Limites à respecter|Zu achtende Grenzen|Grenzen om te respecteren|Batas yang perlu dihormati',
 if_contact:'If I choose to reach out|連絡を選ぶ場合の流れ|若选择联系|若選擇聯繫|Nếu tôi chọn liên lạc|यदि मैं संपर्क चुनूँ|Si decido contactar|Si je décide de contacter|Wenn ich Kontakt aufnehme|Als ik contact zoek|Jika saya memilih untuk menghubungi',
 my_expectation:'My expectations|自分の期待|我的期望|我的期望|Kỳ vọng của tôi|मेरी अपेक्षाएँ|Mis expectativas|Mes attentes|Meine Erwartungen|Mijn verwachtingen|Jangkaan saya',
 observed_attitude:'Interpreting observed behavior|見えている態度の解釈|观察到的态度的解读|觀察到的態度的解讀|Diễn giải hành vi quan sát được|देखे गए व्यवहार की व्याख्या|Interpretar la conducta observada|Interpréter les attitudes observées|Beobachtetes Verhalten deuten|Waargenomen gedrag duiden|Mentafsir sikap yang diperhatikan',
 communication_style:'Communication style|伝え方|沟通方式|溝通方式|Cách giao tiếp|संवाद का तरीका|Forma de comunicar|Manière de communiquer|Kommunikationsstil|Communicatiestijl|Gaya komunikasi',
 mismatch:'Where meanings diverge|すれ違うところ|分歧所在|分歧所在|Điểm lệch nhau|मतभेद का बिंदु|Punto de desencuentro|Point de décalage|Wo es auseinandergeht|Waar het schuurt|Titik ketidakselarasan',
 to_adjust:'What can be adjusted|調整できること|可以协调的部分|可以協調的部分|Điều có thể điều chỉnh|क्या समायोजित कर सकते हैं|Lo que se puede ajustar|Ce qui peut être ajusté|Was sich abstimmen lässt|Wat je kunt afstemmen|Perkara yang boleh diselaraskan',
 pattern_flow:'If this pattern continues|この傾向が続く場合|若模式继续|若模式繼續|Nếu mô thức tiếp diễn|यदि यह ढर्रा चलता रहे|Si el patrón continúa|Si ce schéma continue|Wenn das Muster anhält|Als het patroon doorgaat|Jika corak ini berterusan',
 remaining_feeling:'Remaining feelings|残っている感情|仍在的情感|仍在的情感|Cảm xúc còn lại|शेष भावनाएँ|Sentimientos que quedan|Sentiments qui restent|Verbliebene Gefühle|Overgebleven gevoelens|Perasaan yang masih ada',
 lesson:'Lessons from separation|別れから学ぶこと|从分离中学习|從分離中學習|Bài học từ chia tay|अलगाव से मिली सीख|Aprender de la separación|Apprendre de la séparation|Aus der Trennung lernen|Leren van de breuk|Pelajaran daripada perpisahan',
 repeat_risk:'Risk of repetition|繰り返しのリスク|重复的风险|重複的風險|Nguy cơ lặp lại|दोहराव का जोखिम|Riesgo de repetición|Risque de répétition|Wiederholungsrisiko|Risico op herhaling|Risiko berulang',
 my_change:'Changes within my control|自分が変えられること|我能改变的部分|我能改變的部分|Điều tôi có thể thay đổi|मेरे नियंत्रण में बदलाव|Cambios a mi alcance|Changements à ma portée|Was ich selbst ändern kann|Wat ik zelf kan veranderen|Perubahan dalam kawalan saya',
 change_check:'Signs of change to observe|相手の変化を確かめる点|观察变化的线索|觀察變化的線索|Dấu hiệu thay đổi cần quan sát|बदलाव के देखने योग्य संकेत|Señales de cambio que observar|Signes de changement à observer|Anzeichen für Veränderung|Tekenen van verandering|Petunjuk perubahan untuk diperhatikan',
 recontact_condition:'Conditions for renewed contact|再び連絡する条件|重新联系的条件|重新聯繫的條件|Điều kiện liên lạc lại|फिर संपर्क की शर्तें|Condiciones para retomar contacto|Conditions pour reprendre contact|Bedingungen für neuen Kontakt|Voorwaarden voor nieuw contact|Syarat untuk berhubung semula',
 if_met:'Direction if conditions are met|条件が整う場合の方向|条件满足时的方向|條件滿足時的方向|Hướng đi nếu đủ điều kiện|शर्तें पूरी होने पर दिशा|Rumbo si se cumplen las condiciones|Direction si les conditions sont réunies|Richtung bei erfüllten Bedingungen|Richting als voorwaarden kloppen|Arah jika syarat dipenuhi',
 readiness:'Current readiness|今の準備状態|目前的准备|目前的準備|Mức sẵn sàng hiện tại|मौजूदा तैयारी|Preparación actual|Préparation actuelle|Aktuelle Bereitschaft|Huidige bereidheid|Kesediaan semasa',
 charm:'Strengths to express|表に出したい魅力|可以展现的魅力|可以展現的魅力|Điểm thu hút nên thể hiện|दिखाने योग्य खूबियाँ|Cualidades que expresar|Atouts à exprimer|Stärken zeigen|Sterke kanten tonen|Daya tarikan untuk ditonjolkan',
 let_go:'Patterns to release|手放したいパターン|可放下的模式|可放下的模式|Mô thức nên buông|छोड़ने योग्य ढर्रे|Patrones que soltar|Schémas à laisser partir|Muster loslassen|Patronen loslaten|Corak untuk dilepaskan',
 widen:'Ways to meet people|出会いを広げる行動|拓展相遇的行动|拓展相遇的行動|Cách mở rộng gặp gỡ|लोगों से मिलने के तरीके|Ampliar los encuentros|Élargir les rencontres|Neue Begegnungen ermöglichen|Meer mensen ontmoeten|Cara meluaskan pertemuan',
 begin_advice:'Advice for a new relationship|関係の始め方の助言|开始关系的建议|開始關係的建議|Lời khuyên khi bắt đầu|नए रिश्ते की सलाह|Consejo para empezar una relación|Conseils pour commencer une relation|Rat für den Beziehungsbeginn|Advies voor een nieuwe relatie|Nasihat memulakan hubungan',
 common_ground:'Common ground|共通の土台|共同基础|共同基礎|Nền tảng chung|साझा आधार|Base común|Base commune|Gemeinsame Grundlage|Gemeenschappelijke basis|Asas bersama',
 my_need:'My needs|自分の必要|我的需要|我的需要|Nhu cầu của tôi|मेरी ज़रूरतें|Mis necesidades|Mes besoins|Meine Bedürfnisse|Mijn behoeften|Keperluan saya',
 other_need_hypothesis:'Possible needs of the other person|相手の必要についての仮説|对方可能的需要|對方可能的需要|Nhu cầu có thể có của người ấy|दूसरे की संभावित ज़रूरतें|Posibles necesidades de la otra persona|Besoins possibles de l’autre|Mögliche Bedürfnisse der anderen Person|Mogelijke behoeften van de ander|Keperluan yang mungkin bagi mereka',
 friction:'Practical friction|現実の摩擦|现实摩擦|現實摩擦|Vướng mắc thực tế|व्यावहारिक टकराव|Fricción cotidiana|Frottements concrets|Reibung im Alltag|Wrijving in de praktijk|Geseran praktikal',
 conflict_response:'Responding to conflict|衝突への対応|面对冲突|面對衝突|Ứng phó xung đột|टकराव पर प्रतिक्रिया|Responder al conflicto|Réagir au conflit|Mit Konflikten umgehen|Omgaan met conflict|Menangani konflik',
 agreement:'What to agree together|二人で合意すること|共同商定的事|共同商定的事|Điều cần thống nhất|मिलकर तय करने वाली बातें|Acuerdos compartidos|Accords à construire ensemble|Gemeinsame Vereinbarungen|Samen afspraken maken|Perkara untuk dipersetujui bersama',
 growth:'Direction for growth|関係が育つ方向|关系成长的方向|關係成長的方向|Hướng phát triển|विकास की दिशा|Dirección de crecimiento|Direction de croissance|Wachstumsrichtung|Richting voor groei|Arah perkembangan',
 criteria:'Decision criteria|選択の基準|选择标准|選擇標準|Tiêu chí lựa chọn|निर्णय के मापदंड|Criterios de elección|Critères de choix|Entscheidungskriterien|Keuzecriteria|Kriteria pilihan',
 opportunity:'Opportunity|機会|机会|機會|Cơ hội|अवसर|Oportunidad|Possibilité|Chance|Kans|Peluang',
 burden:'Burden to consider|引き受ける負担|需要承担的负担|需要承擔的負擔|Gánh nặng cần cân nhắc|विचार योग्य बोझ|Carga a considerar|Charge à considérer|Zu bedenkende Belastung|Te overwegen belasting|Beban untuk dipertimbangkan',
 action:'Action|行動|行动|行動|Hành động|कदम|Acción|Action|Handlung|Actie|Tindakan',
 core_value:'Core values|大切にしたい価値|核心价值|核心價值|Giá trị cốt lõi|मूल मूल्य|Valores centrales|Valeurs essentielles|Kernwerte|Kernwaarden|Nilai teras',
 stay:'Staying|今の職場に残る|留任|留任|Ở lại|वहीं रहना|Quedarse|Rester|Bleiben|Blijven|Kekal',
 leave:'Changing jobs|転職する|换工作|換工作|Chuyển việc|नौकरी बदलना|Cambiar de trabajo|Changer de travail|Jobwechsel|Overstappen|Bertukar kerja',
 constraint:'Constraints|制約|限制|限制|Giới hạn|सीमाएँ|Limitaciones|Contraintes|Einschränkungen|Beperkingen|Kekangan',
 flow:'Possible direction|考えられる流れ|可能的走向|可能的走向|Hướng có thể xảy ra|संभावित दिशा|Rumbo posible|Direction possible|Mögliche Richtung|Mogelijke richting|Arah yang mungkin',
 current_method:'Current approach|現在の方法|当前方法|目前方法|Cách làm hiện tại|मौजूदा तरीका|Enfoque actual|Approche actuelle|Bisherige Vorgehensweise|Huidige aanpak|Pendekatan semasa',
 strength:'Strengths to use|活かしたい強み|可发挥的优势|可發揮的優勢|Điểm mạnh nên dùng|काम आने वाली खूबियाँ|Fortalezas que usar|Forces à mobiliser|Nutzbare Stärken|Sterke kanten benutten|Kekuatan untuk digunakan',
 inner_block:'Internal obstacles|内側の障壁|内在阻碍|內在阻礙|Trở ngại bên trong|भीतरी बाधाएँ|Obstáculos internos|Obstacles intérieurs|Innere Hindernisse|Innerlijke obstakels|Halangan dalaman',
 outer_constraint:'External constraints|外側の制約|外在限制|外在限制|Giới hạn bên ngoài|बाहरी सीमाएँ|Límites externos|Contraintes extérieures|Äußere Einschränkungen|Externe beperkingen|Kekangan luaran',
 small_experiment:'A small experiment|小さく試すこと|小小的尝试|小小的嘗試|Thử nghiệm nhỏ|छोटा प्रयोग|Un pequeño experimento|Une petite expérience|Ein kleiner Versuch|Een klein experiment|Percubaan kecil',
 check_change:'Changes to review|点検する変化|需要检视的变化|需要檢視的變化|Thay đổi cần xem lại|समीक्षा योग्य बदलाव|Cambios que revisar|Changements à examiner|Veränderungen prüfen|Veranderingen bekijken|Perubahan untuk disemak',
 resource_use:'Using resources|資源の使い方|资源运用|資源運用|Cách dùng nguồn lực|संसाधनों का उपयोग|Uso de recursos|Utilisation des ressources|Ressourcen nutzen|Middelen gebruiken|Penggunaan sumber',
 drain_pattern:'Patterns of depletion|消耗のパターン|消耗模式|消耗模式|Mô thức hao hụt|क्षय के ढर्रे|Patrones de desgaste|Schémas d’épuisement|Muster der Erschöpfung|Patronen van uitputting|Corak penyusutan',
 missed_task:'Overlooked management tasks|見落とした管理課題|遗漏的管理任务|遺漏的管理任務|Việc quản lý bỏ sót|छूटे प्रबंधन कार्य|Tareas de gestión olvidadas|Gestion négligée|Übersehene Verwaltungsaufgaben|Vergeten beheertaken|Tugas pengurusan terlepas pandang',
 habit:'A habit to practice|実践したい習慣|可实践的习惯|可實踐的習慣|Thói quen nên thực hành|अभ्यास करने योग्य आदत|Un hábito que practicar|Une habitude à pratiquer|Eine Gewohnheit üben|Een gewoonte oefenen|Tabiat untuk diamalkan',
 pull:'What attracts me|惹かれる理由|吸引我的原因|吸引我的原因|Điều thu hút tôi|मुझे क्या आकर्षित करता है|Lo que me atrae|Ce qui m’attire|Was mich anzieht|Wat mij aantrekt|Perkara yang menarik saya',
 expected_gain:'Expected benefits|期待する利点|期待的收益|期待的收益|Lợi ích kỳ vọng|अपेक्षित लाभ|Beneficios esperados|Bénéfices espérés|Erhoffte Vorteile|Verwachte voordelen|Manfaat yang dijangka',
 to_verify:'What to verify|追加で確かめること|需要核实的事|需要核實的事|Điều cần xác minh|क्या जाँचना है|Lo que verificar|Ce qu’il faut vérifier|Was zu prüfen ist|Wat je moet nagaan|Perkara untuk disahkan',
 to_negotiate:'Terms to discuss|相談したい条件|需要商议的条件|需要商議的條件|Điều kiện cần bàn|चर्चा की शर्तें|Condiciones que negociar|Conditions à discuter|Bedingungen besprechen|Voorwaarden bespreken|Syarat untuk dibincangkan',
 scene:'Recurring situation|繰り返す場面|重复的场景|重複的場景|Tình huống lặp lại|बार-बार की स्थिति|Situación recurrente|Situation récurrente|Wiederkehrende Situation|Terugkerende situatie|Situasi berulang',
 reaction:'My reaction|そのときの反応|当时的反应|當時的反應|Phản ứng của tôi|मेरी प्रतिक्रिया|Mi reacción|Ma réaction|Meine Reaktion|Mijn reactie|Reaksi saya',
 need:'Needs I try to protect|守ろうとする願い|想守护的需要|想守護的需要|Nhu cầu muốn bảo vệ|सुरक्षित रखने की ज़रूरतें|Necesidades que protejo|Besoins que je protège|Bedürfnisse, die ich schütze|Behoeften die ik bescherm|Keperluan yang saya lindungi',
 cost:'Cost of this reaction|反応の代償|反应的代价|反應的代價|Cái giá của phản ứng|प्रतिक्रिया की कीमत|Coste de esta reacción|Coût de cette réaction|Preis dieser Reaktion|Prijs van deze reactie|Kesan reaksi ini',
 alternative:'Alternative action|別の行動|另一种行动|另一種行動|Hành động khác|वैकल्पिक कदम|Acción alternativa|Autre action|Alternative Handlung|Andere actie|Tindakan alternatif',
 boundary_practice:'Practicing boundaries|境界線を練習する|练习建立边界|練習建立界線|Tập giữ ranh giới|सीमाओं का अभ्यास|Practicar límites|Apprendre à poser des limites|Grenzen üben|Grenzen oefenen|Melatih batas',
 drain:'Sources of exhaustion|疲れの要因|疲惫的来源|疲憊的來源|Nguồn gây mệt mỏi|थकान के स्रोत|Fuentes de agotamiento|Sources de fatigue|Ursachen der Erschöpfung|Bronnen van uitputting|Punca keletihan',
 may_rest:'Where I can pause|休んでもよいところ|可以休息的部分|可以休息的部分|Điều có thể tạm nghỉ|कहाँ विराम ले सकते हैं|Dónde puedo parar|Où je peux faire une pause|Wo ich pausieren darf|Waar ik mag pauzeren|Bahagian yang boleh direhatkan',
 support:'Available support|頼れる支え|可获得的支持|可獲得的支持|Hỗ trợ sẵn có|उपलब्ध सहारा|Apoyo disponible|Soutien disponible|Verfügbare Unterstützung|Beschikbare steun|Sokongan yang ada',
 small_step:'A small step toward recovery|小さな回復の行動|恢复的一小步|恢復的一小步|Bước nhỏ để hồi phục|सुधार का छोटा कदम|Un pequeño paso para recuperarme|Un petit pas vers le repos|Ein kleiner Erholungsschritt|Een kleine stap naar herstel|Langkah kecil untuk pulih',
 theme:'Theme for the month|一か月のテーマ|本月主题|本月主題|Chủ đề của tháng|महीने का विषय|Tema del mes|Thème du mois|Monatsthema|Thema van de maand|Tema bulan ini',
 week:'Weekly focus|週の焦点|每周重点|每週重點|Trọng tâm tuần|सप्ताह का ध्यान|Enfoque semanal|Point d’attention de la semaine|Wochenschwerpunkt|Weekfocus|Fokus mingguan',
 practice:'Practical guidance|実践の助言|实践建议|實踐建議|Gợi ý thực hành|व्यावहारिक सलाह|Orientación práctica|Conseils pratiques|Praktische Hinweise|Praktische begeleiding|Panduan praktikal',
 present:'Present situation|現在|现在的情况|現在的情況|Hiện tại|वर्तमान स्थिति|Situación presente|Situation présente|Gegenwart|Huidige situatie|Keadaan kini',
 core_conflict:'Core conflict|中心となる葛藤|核心矛盾|核心矛盾|Xung đột cốt lõi|मुख्य टकराव|Conflicto central|Conflit central|Kernkonflikt|Kernconflict|Konflik utama',
 background:'Background|背景|背景|背景|Bối cảnh|पृष्ठभूमि|Trasfondo|Contexte|Hintergrund|Achtergrond|Latar belakang',
 overlooked:'Overlooked factors|見落とした要素|忽略的因素|忽略的因素|Yếu tố bỏ qua|अनदेखे कारक|Factores ignorados|Facteurs négligés|Übersehene Faktoren|Over het hoofd geziene factoren|Faktor terlepas pandang',
 my_resource:'My resources|自分の資源|我的资源|我的資源|Nguồn lực của tôi|मेरे संसाधन|Mis recursos|Mes ressources|Meine Ressourcen|Mijn middelen|Sumber saya',
 outer_condition:'External conditions|外部の条件|外部条件|外部條件|Điều kiện bên ngoài|बाहरी परिस्थितियाँ|Condiciones externas|Conditions extérieures|Äußere Bedingungen|Externe omstandigheden|Keadaan luaran',
 near_change:'Near-term changes|近い時期の変化|近期的变化|近期的變化|Thay đổi gần tới|निकट अवधि के बदलाव|Cambios cercanos|Changements proches|Nahe Veränderungen|Veranderingen op korte termijn|Perubahan terdekat',
 overall:'Overall direction|全体の方向|整体方向|整體方向|Hướng tổng thể|समग्र दिशा|Rumbo general|Direction générale|Gesamtrichtung|Algemene richting|Arah keseluruhan',
 past:'Past influences|過去の影響|过去的影响|過去的影響|Ảnh hưởng quá khứ|अतीत का प्रभाव|Influencias del pasado|Influences passées|Vergangene Einflüsse|Invloeden uit het verleden|Pengaruh masa lalu',
 hidden_influence:'Less visible influences|見えにくい影響|不易察觉的影响|不易察覺的影響|Ảnh hưởng khó thấy|कम दिखाई देने वाले प्रभाव|Influencias menos visibles|Influences moins visibles|Weniger sichtbare Einflüsse|Minder zichtbare invloeden|Pengaruh kurang jelas',
 obstacle:'Obstacles|障壁|阻碍|阻礙|Trở ngại|बाधाएँ|Obstáculos|Obstacles|Hindernisse|Obstakels|Halangan',
 surroundings:'Surrounding influences|周囲の影響|周围的影响|周圍的影響|Ảnh hưởng xung quanh|आसपास के प्रभाव|Influencias del entorno|Influences de l’entourage|Einflüsse des Umfelds|Invloeden uit de omgeving|Pengaruh sekeliling',
 advice:'Advice|助言|建议|建議|Lời khuyên|सलाह|Consejo|Conseils|Rat|Advies|Nasihat',
 crossing:'The crossing challenge|向き合う課題|横亘的挑战|橫亙的挑戰|Thử thách trước mắt|सामने की चुनौती|El desafío que cruza el camino|Le défi à traverser|Die kreuzende Herausforderung|De uitdaging op je pad|Cabaran yang melintang',
 crown:'Conscious goals|意識している目標|意识中的目标|意識中的目標|Mục tiêu ý thức được|सचेत लक्ष्य|Metas conscientes|Objectifs conscients|Bewusste Ziele|Bewuste doelen|Matlamat sedar',
 foundation:'Underlying foundation|土台|根基|根基|Nền tảng bên dưới|बुनियादी आधार|Base subyacente|Fondation sous-jacente|Zugrunde liegende Basis|Onderliggende basis|Asas yang mendasari',
 recent_past:'Recent influences|直近の過去の影響|近期过去的影响|近期過去的影響|Ảnh hưởng gần đây|हाल के प्रभाव|Influencias recientes|Influences récentes|Jüngste Einflüsse|Recente invloeden|Pengaruh baru-baru ini',
 near_future:'Possible upcoming influences|これからの影響の可能性|可能到来的影响|可能到來的影響|Ảnh hưởng có thể sắp tới|संभावित आने वाले प्रभाव|Posibles influencias próximas|Influences possibles à venir|Mögliche kommende Einflüsse|Mogelijke komende invloeden|Pengaruh yang mungkin datang',
 environment:'Surrounding environment|周囲の環境|周围环境|周圍環境|Môi trường xung quanh|आसपास का माहौल|Entorno|Environnement|Umfeld|Omgeving|Persekitaran',
 hopes_fears:'Hopes and fears|願いと不安|希望与担忧|希望與擔憂|Hy vọng và lo lắng|आशाएँ और डर|Esperanzas y temores|Espoirs et craintes|Hoffnungen und Ängste|Hoop en vrees|Harapan dan kebimbangan',
};
const aliases:Record<string,string>={now:'present',future:'flow',outcome:'flow',self:'attitude',want:'my_wish',alternative_action:'alternative'};
export function tarotCatalogLabel(id:string,locale:ReadingLocale):string|undefined{
 if(locale==='ko')return undefined;
 const value=tarotCatalogRows[aliases[id]||id];
 if(value)return value.split('|')[tarotCatalogLocales.indexOf(locale)];
 const option=/^([ab])_(opportunity|burden|action)$/.exec(id);
 if(option)return `${option[1].toUpperCase()} · ${tarotCatalogLabel(option[2],locale)}`;
 const job=/^(stay|leave)_(resource|constraint|action|flow)$/.exec(id);
 if(job)return `${tarotCatalogLabel(job[1],locale)} · ${tarotCatalogLabel(job[2],locale)}`;
 const week=/^week([1-4])$/.exec(id);
 if(week)return `${tarotCatalogLabel('week',locale)} ${week[1]}`;
 return undefined;
}
export function localizedSpread<T extends {id:string;title:string;summary?:string;positions:readonly {id:string;label:string;question:string}[]}>(spread:T,locale:ReadingLocale):T{
 if(locale==='ko')return spread;
 // Unknown historical versions keep their stored labels. Current catalog coverage is exhaustively tested.
 const title=tarotCatalogLabel(spread.id,locale);
 if(!title)return spread;
 const positions=spread.positions.map(p=>({...p,label:tarotCatalogLabel(p.id,locale)||p.label,question:''}));
 return {...spread,title,summary:positions.map(p=>p.label).join(' · '),positions};
}

// Legacy v2 position IDs are not unique across spreads (for example "hidden"). Match the stored label.
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
 return locale==='ko'?label:tarotCatalogLabel(legacyPositionLabels[label],locale)||label;
}
