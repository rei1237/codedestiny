// 메이저 22장 에셋의 이름·대체 텍스트. 상담 해석과 분리한다.
const names = {
  ko: ['광대', '마법사', '여사제', '여황제', '황제', '교황', '연인', '전차', '힘', '은둔자', '운명의 수레바퀴', '정의', '매달린 사람', '죽음', '절제', '악마', '탑', '별', '달', '태양', '심판', '세계'],
  en: ['The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor', 'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit', 'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance', 'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World'],
  ja: ['愚者', '魔術師', '女教皇', '女帝', '皇帝', '教皇', '恋人', '戦車', '力', '隠者', '運命の輪', '正義', '吊るされた男', '死神', '節制', '悪魔', '塔', '星', '月', '太陽', '審判', '世界'],
  'zh-CN': ['愚人', '魔术师', '女祭司', '皇后', '皇帝', '教皇', '恋人', '战车', '力量', '隐士', '命运之轮', '正义', '倒吊人', '死神', '节制', '恶魔', '高塔', '星星', '月亮', '太阳', '审判', '世界'],
  'zh-TW': ['愚者', '魔術師', '女祭司', '皇后', '皇帝', '教皇', '戀人', '戰車', '力量', '隱者', '命運之輪', '正義', '倒吊人', '死神', '節制', '惡魔', '高塔', '星星', '月亮', '太陽', '審判', '世界'],
};
const labels = {
  ko: { alt: (name) => `영냥이 타로 · ${name}`, back: '영냥이 타로 카드 뒷면', frame: '영냥이 타로 금박 프레임' },
  en: { alt: (name) => `Yeongnyangi tarot · ${name}`, back: 'Yeongnyangi tarot card back', frame: 'Yeongnyangi tarot gold frame' },
  ja: { alt: (name) => `ヨンニャンイのタロット・${name}`, back: 'ヨンニャンイのタロットカード裏面', frame: 'ヨンニャンイのタロット金色フレーム' },
  'zh-CN': { alt: (name) => `灵喵塔罗 · ${name}`, back: '灵喵塔罗牌背面', frame: '灵喵塔罗金色边框' },
  'zh-TW': { alt: (name) => `靈喵塔羅 · ${name}`, back: '靈喵塔羅牌背面', frame: '靈喵塔羅金色邊框' },
};
export const YEONGNYANGI_DECK_LOCALES = Object.freeze(Object.keys(names));

export function getYeongnyangiDeckText(key, locale = 'ko') {
  const language = Object.hasOwn(names, locale) ? locale : 'en';
  if (key === 'tarot.back.name' || key === 'tarot.back.alt') return labels[language].back;
  if (key === 'tarot.frame.name' || key === 'tarot.frame.alt') return labels[language].frame;
  const match = /^tarot\.(M\d{2})\.(name|alt)$/.exec(key);
  const name = match && names[language][Number(match[1].slice(1))];
  if (!name) return '';
  return match[2] === 'alt' ? labels[language].alt(name) : name;
}
