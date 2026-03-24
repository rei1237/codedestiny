/**
 * Sikojen Povailu - 형태 데이터베이스
 * 핀란드 주석점술의 핵심 형태들과 그들의 의미
 */

export interface Shape {
  id: string;
  name_ko: string;
  name_fi: string;
  name_en: string;
  icon: string; // 이모지 아이콘
  meaning_ko: string;
  meaning_fi: string;
  meaning_en: string;
  // 숨겨진 그림자의미 (shadow reading)
  shadow_meaning_ko: string;
  shadow_meaning_fi: string;
  shadow_meaning_en: string;
  category: 'travel' | 'wealth' | 'love' | 'health' | 'secret' | 'luck' | 'adventure';
  advice_ko: string;
  advice_fi: string;
  color: string; // 카드 배경 색상
}

export const SHAPES: Shape[] = [
  {
    id: 'boat',
    name_ko: '항해하는 보트',
    name_fi: 'Purjevene',
    name_en: 'Sailing Boat',
    icon: '⛵',
    meaning_ko: '새로운 여행과 모험이 기다리고 있어요. 미지의 세계로 나아갈 용기를 얻을 거예요.',
    meaning_fi: 'Uusi matka ja seikkailu odottavat sinua. Saat rohkeutta lähteä tuntemattomaan.',
    meaning_en: 'New journey and adventure await you. You will gain courage to explore the unknown.',
    shadow_meaning_ko: '그림자 속에서 보트는 거울이 되고, 당신의 내면 여행의 시작을 알린다.',
    shadow_meaning_fi: 'Varjossa vene muuttuu peiliksi, ilmoittaen sisäisen matkasi alkua.',
    shadow_meaning_en: 'In shadow, the boat becomes a mirror, announcing the beginning of your inner journey.',
    category: 'travel',
    advice_ko: '두려움 없이 새로운 기회를 받아들이세요.',
    advice_fi: 'Hyväksy uudet mahdollisuudet ilman pelkoa.',
    color: '#B3E5FC'
  },
  {
    id: 'heart',
    name_ko: '사랑의 심장',
    name_fi: 'Rakkaus Sydän',
    name_en: 'Heart of Love',
    icon: '❤️',
    meaning_ko: '연애운이 상승합니다. 깊은 감정의 세찬 흐름 속에 당신이 있을 거예요.',
    meaning_fi: 'Rakkausonnesi nousee. Olet syvien tunteiden voimakkaassa virtauksessa.',
    meaning_en: 'Your love fortune rises. You will be in a strong flow of deep emotions.',
    shadow_meaning_ko: '그림자 속 심장은 골짜기가 되고, 외로움과 배움의 시간을 말한다.',
    shadow_meaning_fi: 'Varjossa sydän muuttuu laaksoksi, puhuen yksinäisyydestä ja oppimisesta.',
    shadow_meaning_en: 'In shadow, the heart becomes a valley, speaking of loneliness and learning.',
    category: 'love',
    advice_ko: '마음 가는 사람에게 솔직해지세요.',
    advice_fi: 'Ole rehellinen sydäntäsi kuuntelevalle ihmiselle.',
    color: '#F8BBD0'
  },
  {
    id: 'money_purse',
    name_ko: '부의 동전주머니',
    name_fi: 'Varaston Koti',
    name_en: 'Wealth Purse',
    icon: '💰',
    meaning_ko: '재물운이 풍성합니다. 금전적인 안정과 번영이 다가올 거예요.',
    meaning_fi: 'Varallisuutesi runsasta. Taloudellinen vakaus ja vaurauden tulee.',
    meaning_en: 'Your wealth fortune is abundant. Financial stability and prosperity are approaching.',
    shadow_meaning_ko: '그림자 속 동전주머니는 모래시계가 되고, 시간의 소중함을 일깨운다.',
    shadow_meaning_fi: 'Varjossa silkkupussi muuttuu hiekkalasilaksi, muistuttaen ajan arvosta.',
    shadow_meaning_en: 'In shadow, the purse becomes an hourglass, reminding of the value of time.',
    category: 'wealth',
    advice_ko: '번 돈을 현명하게 관리하고 저축하세요.',
    advice_fi: 'Hallitse anseattuasi viisaasti ja säästele.',
    color: '#C8E6C9'
  },
  {
    id: 'key',
    name_ko: '비밀의 열쇠',
    name_fi: 'Salainen Avain',
    name_en: 'Secret Key',
    icon: '🔑',
    meaning_ko: '숨겨진 기회가 열릴 것입니다. 당신이 찾던 답이 곧 보일 거예요.',
    meaning_fi: 'Piilotettu mahdollisuus avautuu. Vastaus, jota olet etsinyt, näkyy pian.',
    meaning_en: 'Hidden opportunities will open. The answer you seek will soon appear.',
    shadow_meaning_ko: '그림자 속 열쇠는 잠금장치가 되고, 깨달음이 오기 전의 시간을 말한다.',
    shadow_meaning_fi: 'Varjossa avain muuttuu lukoksi, puhuen ajasta ennen valaistumista.',
    shadow_meaning_en: 'In shadow, the key becomes a lock, speaking of the time before enlightenment.',
    category: 'secret',
    advice_ko: '자신의 직감을 믿고 신비로운 것들에 열린 마음을 가지세요.',
    advice_fi: 'Luota vaistoonsa ja ole avoin mystiselle.',
    color: '#FFE0B2'
  },
  {
    id: 'sun',
    name_ko: '번영의 태양',
    name_fi: 'Vauraus Aurinko',
    name_en: 'Prosperity Sun',
    icon: '☀️',
    meaning_ko: '밝은 미래가 기다립니다. 건강과 행운이 함께 올 것입니다.',
    meaning_fi: 'Kirkas tulevaisuus odottaa. Terveys ja onni tulevat yhdessä.',
    meaning_en: 'A bright future awaits. Health and luck will come together.',
    shadow_meaning_ko: '그림자 속 태양은 달이 되고, 내면의 조용한 빛을 나타낸다.',
    shadow_meaning_fi: 'Varjossa aurinko muuttuu kuuksi, osoittaen sisäisen hiljaisen valon.',
    shadow_meaning_en: 'In shadow, the sun becomes the moon, showing your inner quiet light.',
    category: 'luck',
    advice_ko: '긍정적인 에너지를 주변에 전파하세요.',
    advice_fi: 'Levitä positiivista energiaa ympärillesi.',
    color: '#FFF9C4'
  },
  {
    id: 'flower',
    name_ko: '피는 꽃',
    name_fi: 'Kukkiva Kukka',
    name_en: 'Blooming Flower',
    icon: '🌸',
    meaning_ko: '새로운 시작과 성장의 시기입니다. 당신의 잠재력이 꽃을 필 것입니다.',
    meaning_fi: 'Uuden alkamisen ja kasvun aika. Sinun potentiaalisi kukkii.',
    meaning_en: 'It is a time of new beginnings and growth. Your potential will blossom.',
    shadow_meaning_ko: '그림자 속 꽃은 가시가 되고, 성장 과정의 아픔을 말한다.',
    shadow_meaning_fi: 'Varjossa kukka muuttuu piikiksi, puhuen kasvun kipuista.',
    shadow_meaning_en: 'In shadow, the flower becomes a thorn, speaking of the pain of growth.',
    category: 'luck',
    advice_ko: '현재의 노력을 계속하면 곧 결실을 맺을 것입니다.',
    advice_fi: 'Jatka nykyisiä ponnistuksiasi, hedelmä tulee pian.',
    color: '#F8BBD0'
  },
  {
    id: 'compass',
    name_ko: '길을 찾는 나침반',
    name_fi: 'Polun Kompassi',
    name_en: 'Guiding Compass',
    icon: '🧭',
    meaning_ko: '올바른 방향이 보일 것입니다. 인생의 나침반이 맞춰질 거예요.',
    meaning_fi: 'Oikea suunta näkyy. Elämäsi kompassi asettuu paikoilleen.',
    meaning_en: 'The right direction will become clear. Your life compass will align.',
    shadow_meaning_ko: '그림자 속 나침반은 미로가 되고, 방향 상실의 의미를 담는다.',
    shadow_meaning_fi: 'Varjossa kompassi muuttuu labyrintiksi, sisältäen suunnan menetyksen merkityksen.',
    shadow_meaning_en: 'In shadow, the compass becomes a maze, holding the meaning of lost direction.',
    category: 'adventure',
    advice_ko: '자신의 내면의 목소리에 귀 기울이세요.',
    advice_fi: 'Kuuntele sisäisen äänesi.',
    color: '#E1BEE7'
  },
  {
    id: 'tree',
    name_ko: '뿌리내린 나무',
    name_fi: 'Juuratunut Puu',
    name_en: 'Rooted Tree',
    icon: '🌲',
    meaning_ko: '안정감과 번영이 함께합니다. 깊은 뿌리를 내릴 시간입니다.',
    meaning_fi: 'Vakaus ja vauraus liittyvät. On aika juurtua syvemmälle.',
    meaning_en: 'Stability and prosperity come together. It is time to root deeper.',
    shadow_meaning_ko: '그림자 속 나무는 낙엽이 되고, 변화와 순환의 의미를 담는다.',
    shadow_meaning_fi: 'Varjossa puu muuttuu lehdeksi, sisältäen muutoksen ja kiertävyyden merkityksen.',
    shadow_meaning_en: 'In shadow, the tree becomes a leaf, holding the meaning of change and cycles.',
    category: 'luck',
    advice_ko: '현재의 것들을 소중히 여기고 장기적 계획을 세우세요.',
    advice_fi: 'Arvosta nykyisiä asioita ja suunnittele pitkäjänteisesti.',
    color: '#C8E6C9'
  },
  {
    id: 'star',
    name_ko: '반짝이는 별',
    name_fi: 'Kimaltava Tähti',
    name_en: 'Twinkling Star',
    icon: '⭐',
    meaning_ko: '꿈이 현실이 될 단서를 얻습니다. 희망과 영감이 가득합니다.',
    meaning_fi: 'Saat vihjeitä unelmasi toteutumiseen. Täynnä toivoa ja inspiraatiota.',
    meaning_en: 'You will get clues for your dreams to come true. Full of hope and inspiration.',
    shadow_meaning_ko: '그림자 속 별은 어둠이 되고, 스스로를 찾는 내면의 여정을 말한다.',
    shadow_meaning_fi: 'Varjossa tähti muuttuu pimeyteen, puhuen sisäisestä itsensä löytämisen matkasta.',
    shadow_meaning_en: 'In shadow, the star becomes darkness, speaking of the inner journey of self-discovery.',
    category: 'luck',
    advice_ko: '작은 것부터 시작해서 큰 꿈을 이루어 가세요.',
    advice_fi: 'Aloita pienestä ja toteuta suuret unelmasi.',
    color: '#FFF9C4'
  },
  {
    id: 'crown',
    name_ko: '승리의 왕관',
    name_fi: 'Voiton Kruunu',
    name_en: 'Crown of Victory',
    icon: '👑',
    meaning_ko: '성공과 영광이 기다립니다. 당신의 노력이 인정받을 것입니다.',
    meaning_fi: 'Menestys ja kunnia odottavat. Ponnisteluasi tunnustetaan.',
    meaning_en: 'Success and glory await. Your efforts will be recognized.',
    shadow_meaning_ko: '그림자 속 왕관은 쇠사슬이 되고, 책임과 의무의 무게를 말한다.',
    shadow_meaning_fi: 'Varjossa kruunu muuttuu ketjuksi, puhuen vastuun ja velvollisuuden painosta.',
    shadow_meaning_en: 'In shadow, the crown becomes a chain, speaking of the weight of responsibility.',
    category: 'luck',
    advice_ko: '극기와 자기관리로 최고를 향해 나아가세요.',
    advice_fi: 'Lähde kohti korkeutta itsekurilla ja itsehallinnalla.',
    color: '#FFE0B2'
  },
  {
    id: 'bridge',
    name_ko: '연결의 다리',
    name_fi: 'Yhteyden Silta',
    name_en: 'Bridge of Connection',
    icon: '🌉',
    meaning_ko: '사람들과의 만남과 소통이 중요한 시기입니다. 관계가 깊어질 것입니다.',
    meaning_fi: 'Ihmisten kohtaaminen ja kommunikaatio ovat tärkeitä. Suhteet syvenevät.',
    meaning_en: 'Meeting and communicating with people is important. Relationships will deepen.',
    shadow_meaning_ko: '그림자 속 다리는 끝이 없는 강이 되고, 연결의 어려움을 나타낸다.',
    shadow_meaning_fi: 'Varjossa silta muuttuu loputon joeksi, osoittaen yhteyden vaikeuksia.',
    shadow_meaning_en: 'In shadow, the bridge becomes an endless river, showing the difficulty of connection.',
    category: 'love',
    advice_ko: '진심으로 타인과 연결되려 하세요.',
    advice_fi: 'Pyri yhtymään muihin vilpittömästi.',
    color: '#BBDEFB'
  },
  {
    id: 'feather',
    name_ko: '가벼운 깃털',
    name_fi: 'Kevyt Höyhen',
    name_en: 'Light Feather',
    icon: '🪶',
    meaning_ko: '심신의 가벼움과 자유가 찾아옵니다. 속박에서 벗어날 시간입니다.',
    meaning_fi: 'Ruumiin ja mielen keveys ja vapaus löytyvät. Aika vapauttaa itseä kahleista.',
    meaning_en: 'Lightness of body and mind and freedom are coming. It is time to free yourself.',
    shadow_meaning_ko: '그림자 속 깃털은 무게가 되고, 내려놓아야 할 것들을 나타낸다.',
    shadow_meaning_fi: 'Varjossa höyhen muuttuu painoksi, osoittaen mitä on päästävä irti.',
    shadow_meaning_en: 'In shadow, the feather becomes weight, showing what must be released.',
    category: 'health',
    advice_ko: '불필요한 것들을 놓아주세요.',
    advice_fi: 'Päästä irti tarpeettomista asioista.',
    color: '#E0F2F1'
  },
  {
    id: 'fox',
    name_ko: '영리한 여우',
    name_fi: 'Ovela Kettu',
    name_en: 'Clever Fox',
    icon: '🦊',
    meaning_ko: '당신의 지혜와 기지가 문제를 풀 것입니다. 영적 성장을 경험할 거예요.',
    meaning_fi: 'Sinun viisautesi ja terävä mielesi ratkaisevat ongelmaa. Kokemuksellinen spiritual kasvu.',
    meaning_en: 'Your wisdom and quick thinking will solve the problem. You will experience spiritual growth.',
    shadow_meaning_ko: '그림자 속 여우는 올빼미가 되고, 숨겨진 진실의 발견을 알린다.',
    shadow_meaning_fi: 'Varjossa kettu muuttuu pöllöksi, ilmoittaen piilotetun totuuden löytämisestä.',
    shadow_meaning_en: 'In shadow, the fox becomes an owl, announcing the discovery of hidden truth.',
    category: 'secret',
    advice_ko: '당신의 직감을 믿고 지혜롭게 선택하세요.',
    advice_fi: 'Luota vaistoonsa ja valitse viisaasti.',
    color: '#FFCCBC'
  },
  {
    id: 'anchor',
    name_ko: '희망의 닻',
    name_fi: 'Toivon Ankkuri',
    name_en: 'Anchor of Hope',
    icon: '⚓',
    meaning_ko: '폭풍이 지나갑니다. 안정된 시간이 올 것입니다.',
    meaning_fi: 'Myrsky menee. Vakaa aika tulee.',
    meaning_en: 'The storm will pass. Stable times are coming.',
    shadow_meaning_ko: '그림자 속 닻은 부표가 되고, 계속되는 변동을 나타낸다.',
    shadow_meaning_fi: 'Varjossa ankkuri muuttuu poijuksi, osoittaen jatkuvaa muutosta.',
    shadow_meaning_en: 'In shadow, the anchor becomes a buoy, showing continued change.',
    category: 'luck',
    advice_ko: '어려운 순간도 이겨낼 수 있습니다. 희망을 잃지 마세요.',
    advice_fi: 'Voit selvitä vaikeissakin hetkissa. Älä menetä toivoa.',
    color: '#B3E5FC'
  }
];

export function getRandomShape(): Shape {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)];
}

export function getShapeById(id: string): Shape | undefined {
  return SHAPES.find(shape => shape.id === id);
}

export function getShapesByCategory(category: string): Shape[] {
  return SHAPES.filter(shape => shape.category === category);
}
