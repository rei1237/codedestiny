// Small, deterministic signals for the supported writing languages. Presets and explicit inputs still win.
// These choose a layout, never predict an outcome or interpret a person's thoughts.
export const nativeQuestionSignals={
 options:/\b(?:or|versus|oder|atau)\b|それとも|或者|还是|還是|hay là|या फिर/iu,
 jobChange:/change jobs?|changing jobs?|leave (?:my|this) job|stay (?:in|at) (?:my|this) job|転職|离职|離職|换工作|換工作|đổi việc|chuyển việc|नौकरी बदल|cambiar de trabajo|cambio de trabajo|changer de travail|Jobwechsel|van baan veranderen|bertukar kerja/iu,
 offer:/\boffer\b|proposal|提案|提议|提議|đề nghị|प्रस्ताव|propuesta|proposition|Angebot|aanbod|tawaran/iu,
 contactAct:/(?:should I|can I).{0,15}(?:contact|text|reach out)|先に連絡|主动联系|主動聯繫|liên lạc trước|पहले संपर्क|contactar primero|contact en premier|zuerst Kontakt|eerste contact|menghubungi dahulu/iu,
 contactWait:/(?:will they|will he|will she).{0,15}(?:contact|text|reply)|連絡が来|会联系我|會聯繫我|họ có.*liên lạc|क्या वे.*संपर्क|me contactará|va.*me contacter|wird.*sich melden|zal.*contact opnemen|akan.*menghubungi saya/iu,
 reunion:/reconnect|reunion|復縁|复合|復合|tái hợp|kết nối lại|फिर जुड़|reconciliación|réconciliation|Wiederannäherung|opnieuw verbinden|bersatu semula/iu,
 feelings:/feelings for me|like me|interested in me|好意|本心|好感|喜欢我|喜歡我|cảm tình|tình cảm với tôi|मेरे लिए भावना|le gusto|sentimientos por mí|sentiments pour moi|Gefühle für mich|gevoelens voor mij|perasaan terhadap saya/iu,
 repeat:/repeat|繰り返|重复|重複|lặp lại|दोहर|repetir|repito|répèt|répét|wiederhol|herhaal|berulang/iu,
 newBond:/meet someone new|new relationship|新しい.*(?:縁|関係)|新的缘分|新的緣分|người mới|नया रिश्ता|नए व्यक्ति|conocer a alguien|nouvelle rencontre|neue Begegnung|iemand nieuws|orang baharu/iu,
 deepen:/deepen|marriage|結婚|结婚|婚姻|kết hôn|विवाह|matrimonio|mariage|Heirat|huwelijk|perkahwinan/iu,
 period:/coming month|next month|this month|一か月|来月|下个月|下個月|一个月|一個月|tháng tới|आने वाले महीने|próximo mes|mois prochain|mois à venir|kommenden Monat|komende maand|bulan (?:hadapan|akan datang)/iu,
 recovery:/burnout|exhausted|emotionally tired|疲れ|疲惫|疲憊|kiệt sức|mệt mỏi|थकान|थक गया|थक गई|agotad|épuis|erschöpft|uitgeput|keletihan/iu,
 money:/\bmoney\b|お金|金钱|金錢|tiền bạc|tài chính|पैसे|धन|dinero|argent|\bGeld\b|\bgeld\b|wang/iu,
 work:/\bwork\b|career|仕事|工作|công việc|काम|trabajo|travail|Arbeit|\bwerk\b|kerja/iu,
 relation:/relationship|partner|恋人|関係|关系|關係|quan hệ|रिश्त|relación|relation|Beziehung|relatie|hubungan/iu,
};
