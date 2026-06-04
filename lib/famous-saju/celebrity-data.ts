export type BirthStatus = "verified" | "public" | "uncertain" | "unknown";
export type BirthTimeStatus = "verified" | "unknown" | "estimated_not_used";
export type FamousSajuCategory = "historical" | "entertainer" | "sports" | "business" | "politics" | "creator" | "other";
export type FamousSajuBirthCalendar = "solar" | "lunar" | "unknown";

export type FamousSajuPerson = {
  id: string;
  slug: string;
  nameKo: string;
  nameEn?: string;
  aliases: string[];
  category: FamousSajuCategory;
  birthDate: string;
  birthCalendar: FamousSajuBirthCalendar;
  birthTime?: string | null;
  birthPlace?: string | null;
  gender?: "male" | "female" | "unknown";
  isBirthTimeKnown: boolean;
  isHistoricalDateUncertain?: boolean;
  seoKeywords: string[];
  imageQueries: string[];
  shortDescription: string;
  published: boolean;
};

export type CelebritySajuSeed = {
  id: string;
  slug: string;
  nameKo: string;
  name: string;
  nameEn?: string;
  aliases: string[];
  categoryKey: FamousSajuCategory;
  category: string;
  subCategory?: string;
  country?: string;
  birthDate: string | null;
  birthCalendar: FamousSajuBirthCalendar;
  birthTime?: string | null;
  birthPlace?: string | null;
  calendarType?: "solar" | "lunar";
  gender?: "male" | "female" | "unknown";
  birthDateStatus: BirthStatus;
  birthTimeStatus: BirthTimeStatus;
  isBirthTimeKnown: boolean;
  isHistoricalDateUncertain?: boolean;
  shortBio: string;
  shortDescription: string;
  profileImage?: string | null;
  tags: string[];
  seoKeywords: string[];
  imageQueries: string[];
  published: boolean;
};

export const famousSajuCategories = [
  "역사 위인",
  "왕족·정치인",
  "K-스타",
  "배우",
  "가수",
  "스포츠",
  "기업인",
  "감독·작가",
  "JP 일본",
  "CN 중국",
  "US 미국",
  "사상가·예술가",
] as const;

type RawCelebritySeed = [
  slug: string,
  name: string,
  category: string,
  country: string,
  birthDate: string,
  birthTime?: string | null,
  tags?: string[],
  nameEn?: string,
];

const rawSeeds: RawCelebritySeed[] = [
  ["king-sejong", "세종대왕", "역사 위인", "KR", "1397-05-15", null, ["학문", "창조", "통치"]],
  ["yi-sun-sin", "이순신", "역사 위인", "KR", "1545-04-28", null, ["전략", "책임", "리더십"]],
  ["yu-gwan-sun", "유관순", "역사 위인", "KR", "1902-12-16", null, ["신념", "용기", "독립운동"]],
  ["an-jung-geun", "안중근", "역사 위인", "KR", "1879-09-02", null, ["정의", "철학", "결단"]],
  ["kim-gu", "김구", "왕족·정치인", "KR", "1876-08-29", null, ["독립운동", "통합", "정치"]],
  ["shin-saimdang", "신사임당", "사상가·예술가", "KR", "1504-12-05", null, ["예술", "문학", "섬세함"]],
  ["yi-hwang", "이황", "사상가·예술가", "KR", "1501-11-25", null, ["학문", "수양", "철학"]],
  ["yi-i", "이이", "사상가·예술가", "KR", "1536-12-26", null, ["개혁", "학문", "실천"]],
  ["jeong-yak-yong", "정약용", "사상가·예술가", "KR", "1762-08-05", null, ["실학", "저술", "개혁"]],
  ["park-chung-hee", "박정희", "왕족·정치인", "KR", "1917-11-14", null, ["정치", "산업화", "결단"]],
  ["kim-dae-jung", "김대중", "왕족·정치인", "KR", "1924-01-06", null, ["민주주의", "평화", "외교"]],
  ["barack-obama", "버락 오바마", "왕족·정치인", "US", "1961-08-04", "19:24", ["연설", "정치", "외교"], "Barack Obama"],
  ["joe-biden", "조 바이든", "왕족·정치인", "US", "1942-11-20", null, ["정치", "협상", "공공성"], "Joe Biden"],
  ["donald-trump", "도널드 트럼프", "왕족·정치인", "US", "1946-06-14", "10:54", ["정치", "사업", "브랜딩"], "Donald Trump"],
  ["kamala-harris", "카멀라 해리스", "왕족·정치인", "US", "1964-10-20", "21:28", ["법", "정치", "리더십"], "Kamala Harris"],
  ["winston-churchill", "윈스턴 처칠", "왕족·정치인", "UK", "1874-11-30", "01:30", ["연설", "전략", "리더십"], "Winston Churchill"],
  ["mahatma-gandhi", "마하트마 간디", "사상가·예술가", "IN", "1869-10-02", null, ["비폭력", "신념", "철학"], "Mahatma Gandhi"],
  ["napoleon-bonaparte", "나폴레옹 보나파르트", "왕족·정치인", "FR", "1769-08-15", null, ["전략", "권력", "개척"], "Napoleon Bonaparte"],
  ["bts-rm", "BTS RM", "K-스타", "KR", "1994-09-12", null, ["리더", "언어", "창작"], "RM"],
  ["bts-jin", "BTS 진", "K-스타", "KR", "1992-12-04", null, ["보컬", "무대", "친화력"], "Jin"],
  ["bts-suga", "BTS 슈가", "K-스타", "KR", "1993-03-09", null, ["프로듀싱", "집중", "음악"], "Suga"],
  ["bts-j-hope", "BTS 제이홉", "K-스타", "KR", "1994-02-18", null, ["춤", "리듬", "활력"], "J-Hope"],
  ["bts-jimin", "BTS 지민", "K-스타", "KR", "1995-10-13", null, ["무대", "표현", "감성"], "Jimin"],
  ["bts-v", "BTS 뷔", "K-스타", "KR", "1995-12-30", null, ["음색", "예술", "매력"], "V"],
  ["bts-jungkook", "BTS 정국", "K-스타", "KR", "1997-09-01", null, ["보컬", "성장", "퍼포먼스"], "Jungkook"],
  ["iu", "아이유", "가수", "KR", "1993-05-16", "15:00", ["노래", "연기", "서정성"], "IU"],
  ["blackpink-jisoo", "블랙핑크 지수", "K-스타", "KR", "1995-01-03", null, ["보컬", "연기", "품격"], "Jisoo"],
  ["blackpink-jennie", "블랙핑크 제니", "K-스타", "KR", "1996-01-16", null, ["무대", "스타일", "카리스마"], "Jennie"],
  ["blackpink-rose", "블랙핑크 로제", "K-스타", "KR", "1997-02-11", null, ["음색", "감성", "음악"], "Rose"],
  ["blackpink-lisa", "블랙핑크 리사", "K-스타", "TH", "1997-03-27", null, ["춤", "퍼포먼스", "글로벌"], "Lisa"],
  ["newjeans-minji", "뉴진스 민지", "K-스타", "KR", "2004-05-07", null, ["K-팝", "이미지", "무대"]],
  ["newjeans-hanni", "뉴진스 하니", "K-스타", "VN", "2004-10-06", null, ["보컬", "무대", "청량"]],
  ["newjeans-danielle", "뉴진스 다니엘", "K-스타", "KR", "2005-04-11", null, ["표현", "글로벌", "무대"]],
  ["newjeans-haerin", "뉴진스 해린", "K-스타", "KR", "2006-05-15", null, ["무대", "집중", "이미지"]],
  ["newjeans-hyein", "뉴진스 혜인", "K-스타", "KR", "2008-04-21", null, ["성장", "표현", "K-팝"]],
  ["ive-jang-wonyoung", "장원영", "K-스타", "KR", "2004-08-31", null, ["무대", "비주얼", "스타성"]],
  ["ive-ahn-yujin", "안유진", "K-스타", "KR", "2003-09-01", null, ["리더십", "무대", "활력"]],
  ["aespa-karina", "에스파 카리나", "K-스타", "KR", "2000-04-11", null, ["퍼포먼스", "이미지", "리더"]],
  ["aespa-winter", "에스파 윈터", "K-스타", "KR", "2001-01-01", null, ["보컬", "무대", "선명함"]],
  ["song-hye-kyo", "송혜교", "배우", "KR", "1981-11-22", null, ["배우", "드라마", "감성"]],
  ["jun-ji-hyun", "전지현", "배우", "KR", "1981-10-30", null, ["배우", "카리스마", "코미디"]],
  ["kim-soo-hyun", "김수현", "배우", "KR", "1988-02-16", null, ["배우", "몰입", "스타성"]],
  ["song-joong-ki", "송중기", "배우", "KR", "1985-09-19", null, ["배우", "드라마", "지성"]],
  ["hyun-bin", "현빈", "배우", "KR", "1982-09-25", null, ["배우", "절제", "멜로"]],
  ["son-ye-jin", "손예진", "배우", "KR", "1982-01-11", null, ["배우", "감성", "멜로"]],
  ["gong-yoo", "공유", "배우", "KR", "1979-07-10", null, ["배우", "카리스마", "장르"]],
  ["park-bo-gum", "박보검", "배우", "KR", "1993-06-16", null, ["배우", "청춘", "성실"]],
  ["lee-min-ho", "이민호", "배우", "KR", "1987-06-22", null, ["배우", "한류", "스타성"]],
  ["kim-tae-ri", "김태리", "배우", "KR", "1990-04-24", null, ["배우", "개성", "몰입"]],
  ["ma-dong-seok", "마동석", "배우", "KR", "1971-03-01", null, ["액션", "배우", "힘"]],
  ["youn-yuh-jung", "윤여정", "배우", "KR", "1947-06-19", null, ["배우", "관록", "자유"]],
  ["bong-joon-ho", "봉준호", "감독·작가", "KR", "1969-09-14", null, ["감독", "영화", "구조"]],
  ["park-chan-wook", "박찬욱", "감독·작가", "KR", "1963-08-23", null, ["감독", "미장센", "심리"]],
  ["son-heung-min", "손흥민", "스포츠", "KR", "1992-07-08", null, ["축구", "속도", "집중"]],
  ["kim-yuna", "김연아", "스포츠", "KR", "1990-09-05", null, ["피겨", "완성도", "집중"]],
  ["park-se-ri", "박세리", "스포츠", "KR", "1977-09-28", null, ["골프", "개척", "집념"]],
  ["ryu-hyun-jin", "류현진", "스포츠", "KR", "1987-03-25", null, ["야구", "제구", "침착"]],
  ["steve-jobs", "스티브 잡스", "기업인", "US", "1955-02-24", "19:15", ["창업", "디자인", "집중"], "Steve Jobs"],
  ["elon-musk", "일론 머스크", "기업인", "US", "1971-06-28", null, ["창업", "기술", "도전"], "Elon Musk"],
  ["bill-gates", "빌 게이츠", "기업인", "US", "1955-10-28", "22:00", ["소프트웨어", "전략", "자선"], "Bill Gates"],
  ["warren-buffett", "워런 버핏", "기업인", "US", "1930-08-30", "15:00", ["투자", "인내", "가치"], "Warren Buffett"],
  ["jeff-bezos", "제프 베이조스", "기업인", "US", "1964-01-12", null, ["창업", "확장", "전략"], "Jeff Bezos"],
  ["mark-zuckerberg", "마크 저커버그", "기업인", "US", "1984-05-14", null, ["플랫폼", "연결", "기술"], "Mark Zuckerberg"],
  ["oprah-winfrey", "오프라 윈프리", "US 미국", "US", "1954-01-29", "04:30", ["미디어", "공감", "영향력"], "Oprah Winfrey"],
  ["taylor-swift", "테일러 스위프트", "가수", "US", "1989-12-13", null, ["음악", "서사", "무대"], "Taylor Swift"],
  ["beyonce", "비욘세", "가수", "US", "1981-09-04", null, ["보컬", "퍼포먼스", "여왕"], "Beyonce"],
  ["lady-gaga", "레이디 가가", "가수", "US", "1986-03-28", null, ["음악", "연기", "변신"], "Lady Gaga"],
  ["ariana-grande", "아리아나 그란데", "가수", "US", "1993-06-26", null, ["보컬", "팝", "무대"], "Ariana Grande"],
  ["michael-jackson", "마이클 잭슨", "가수", "US", "1958-08-29", null, ["팝", "댄스", "무대"], "Michael Jackson"],
  ["billie-eilish", "빌리 아일리시", "가수", "US", "2001-12-18", null, ["팝", "개성", "감각"], "Billie Eilish"],
  ["brad-pitt", "브래드 피트", "배우", "US", "1963-12-18", "06:31", ["배우", "영화", "스타성"], "Brad Pitt"],
  ["angelina-jolie", "안젤리나 졸리", "배우", "US", "1975-06-04", "09:09", ["배우", "인도주의", "카리스마"], "Angelina Jolie"],
  ["leonardo-dicaprio", "레오나르도 디카프리오", "배우", "US", "1974-11-11", null, ["배우", "몰입", "환경"], "Leonardo DiCaprio"],
  ["scarlett-johansson", "스칼렛 요한슨", "배우", "US", "1984-11-22", null, ["배우", "영화", "매력"], "Scarlett Johansson"],
  ["meryl-streep", "메릴 스트립", "배우", "US", "1949-06-22", null, ["배우", "관록", "연기"], "Meryl Streep"],
  ["keanu-reeves", "키아누 리브스", "배우", "US", "1964-09-02", null, ["배우", "액션", "겸손"], "Keanu Reeves"],
  ["robert-downey-jr", "로버트 다우니 주니어", "배우", "US", "1965-04-04", null, ["배우", "재기", "카리스마"], "Robert Downey Jr."],
  ["michael-jordan", "마이클 조던", "스포츠", "US", "1963-02-17", null, ["농구", "승부", "브랜드"], "Michael Jordan"],
  ["lebron-james", "르브론 제임스", "스포츠", "US", "1984-12-30", null, ["농구", "리더십", "체력"], "LeBron James"],
  ["serena-williams", "세리나 윌리엄스", "스포츠", "US", "1981-09-26", null, ["테니스", "승부", "집중"], "Serena Williams"],
  ["tiger-woods", "타이거 우즈", "스포츠", "US", "1975-12-30", null, ["골프", "집중", "복귀"], "Tiger Woods"],
  ["miyazaki-hayao", "미야자키 하야오", "JP 일본", "JP", "1941-01-05", null, ["감독", "상상력", "애니메이션"], "Hayao Miyazaki"],
  ["murakami-haruki", "무라카미 하루키", "JP 일본", "JP", "1949-01-12", null, ["문학", "고독", "상상"], "Haruki Murakami"],
  ["akutagawa-ryunosuke", "아쿠타가와 류노스케", "JP 일본", "JP", "1892-03-01", null, ["문학", "단편", "심리"], "Ryunosuke Akutagawa"],
  ["osamu-tezuka", "데즈카 오사무", "JP 일본", "JP", "1928-11-03", null, ["만화", "창작", "개척"], "Osamu Tezuka"],
  ["otani-shohei", "오타니 쇼헤이", "JP 일본", "JP", "1994-07-05", null, ["야구", "도전", "스포츠"], "Shohei Ohtani"],
  ["hanyu-yuzuru", "하뉴 유즈루", "JP 일본", "JP", "1994-12-07", null, ["피겨", "예술", "집중"], "Yuzuru Hanyu"],
  ["jackie-chan", "성룡", "CN 중국", "CN", "1954-04-07", null, ["액션", "영화", "몸"], "Jackie Chan"],
  ["jet-li", "이연걸", "CN 중국", "CN", "1963-04-26", null, ["무술", "영화", "절제"], "Jet Li"],
  ["zhang-ziyi", "장쯔이", "CN 중국", "CN", "1979-02-09", null, ["배우", "영화", "미감"], "Zhang Ziyi"],
  ["gong-li", "공리", "CN 중국", "CN", "1965-12-31", null, ["배우", "영화", "감정"], "Gong Li"],
  ["tony-leung", "양조위", "CN 중국", "CN", "1962-06-27", null, ["배우", "절제", "감성"], "Tony Leung"],
  ["faye-wong", "왕페이", "CN 중국", "CN", "1969-08-08", null, ["음색", "팝", "몽환"], "Faye Wong"],
  ["jay-chou", "저우제룬", "CN 중국", "CN", "1979-01-18", null, ["작곡", "팝", "리듬"], "Jay Chou"],
  ["shah-rukh-khan", "샤루크 칸", "배우", "IN", "1965-11-02", "14:26", ["배우", "볼리우드", "스타성"], "Shah Rukh Khan"],
  ["amitabh-bachchan", "아미타브 바찬", "배우", "IN", "1942-10-11", "16:00", ["배우", "관록", "영화"], "Amitabh Bachchan"],
  ["priyanka-chopra", "프리얀카 초프라", "배우", "IN", "1982-07-18", null, ["배우", "글로벌", "무대"], "Priyanka Chopra"],
  ["cristiano-ronaldo", "크리스티아누 호날두", "스포츠", "PT", "1985-02-05", null, ["축구", "자기관리", "득점"], "Cristiano Ronaldo"],
  ["lionel-messi", "리오넬 메시", "스포츠", "AR", "1987-06-24", null, ["축구", "창의성", "기술"], "Lionel Messi"],
  ["david-beckham", "데이비드 베컴", "스포츠", "UK", "1975-05-02", null, ["축구", "브랜드", "킥"], "David Beckham"],
  ["kylian-mbappe", "킬리안 음바페", "스포츠", "FR", "1998-12-20", null, ["축구", "속도", "승부"], "Kylian Mbappe"],
  ["adele", "아델", "가수", "UK", "1988-05-05", null, ["보컬", "감정", "팝"], "Adele"],
  ["ed-sheeran", "에드 시런", "가수", "UK", "1991-02-17", null, ["기타", "작곡", "팝"], "Ed Sheeran"],
  ["john-lennon", "존 레논", "가수", "UK", "1940-10-09", "06:30", ["음악", "평화", "상상"], "John Lennon"],
  ["mozart", "모차르트", "사상가·예술가", "AT", "1756-01-27", "20:00", ["음악", "천재성", "작곡"], "Wolfgang Amadeus Mozart"],
  ["beethoven", "베토벤", "사상가·예술가", "DE", "1770-12-17", null, ["음악", "의지", "작곡"], "Ludwig van Beethoven"],
  ["marilyn-monroe", "마릴린 먼로", "US 미국", "US", "1926-06-01", "09:30", ["배우", "매력", "상징"], "Marilyn Monroe"],
  ["audrey-hepburn", "오드리 헵번", "배우", "UK", "1929-05-04", null, ["배우", "우아함", "봉사"], "Audrey Hepburn"],
  ["emma-watson", "엠마 왓슨", "배우", "UK", "1990-04-15", null, ["배우", "인권", "지성"], "Emma Watson"],
  ["kate-winslet", "케이트 윈슬렛", "배우", "UK", "1975-10-05", null, ["배우", "감정", "연기"], "Kate Winslet"],
  ["steven-spielberg", "스티븐 스필버그", "감독·작가", "US", "1946-12-18", null, ["감독", "영화", "상상력"], "Steven Spielberg"],
  ["christopher-nolan", "크리스토퍼 놀란", "감독·작가", "UK", "1970-07-30", null, ["감독", "구조", "시간"], "Christopher Nolan"],
  ["j-k-rowling", "J.K. 롤링", "감독·작가", "UK", "1965-07-31", null, ["작가", "세계관", "상상력"], "J.K. Rowling"],
];

const baseKeywords = ["유명인 사주", "사주팔자", "일간 분석", "오행 분석", "운세 사주"];

const extraAliasesBySlug: Record<string, string[]> = {
  "yi-sun-sin": ["충무공", "충무공 이순신"],
  iu: ["이지은"],
  "bts-rm": ["RM", "알엠", "김남준", "BTS 알엠"],
};

function uniqueText(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function toFamousSajuCategory(category: string): FamousSajuCategory {
  if (category === "역사 위인") return "historical";
  if (category === "왕족·정치인") return "politics";
  if (category === "스포츠") return "sports";
  if (category === "기업인") return "business";
  if (category === "감독·작가" || category === "사상가·예술가") return "creator";
  if (category === "K-스타" || category === "배우" || category === "가수") return "entertainer";
  return "other";
}

export function normalizeCelebrityLookupKey(value: string) {
  let decoded = String(value || "").trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    decoded = String(value || "").trim();
  }
  return decoded
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function buildAliases(slug: string, nameKo: string, nameEn?: string) {
  const slugText = slug.replace(/-/g, " ");
  return uniqueText([nameKo, nameEn, slugText, ...(extraAliasesBySlug[slug] || [])]);
}

function isDateUncertain(category: string, birthDate: string) {
  const year = Number(birthDate.slice(0, 4));
  return category === "역사 위인" && Number.isFinite(year) && year < 1900;
}

export const celebritySajuSeeds: CelebritySajuSeed[] = rawSeeds.map(([slug, name, category, country, birthDate, birthTime, tags = [], nameEn]) => {
  const categoryKey = toFamousSajuCategory(category);
  const aliases = buildAliases(slug, name, nameEn);
  const birthCalendar: FamousSajuBirthCalendar = "solar";
  const isBirthTimeKnown = Boolean(birthTime);
  const shortDescription = `${name}의 공개 생년월일을 바탕으로 일간, 오행, 직업적 흐름을 살펴보는 유명인 사주 분석입니다.`;

  return {
    id: slug,
    slug,
    nameKo: name,
    name,
    nameEn,
    aliases,
    categoryKey,
    category,
    country,
    birthDate,
    birthCalendar,
    birthTime: birthTime || null,
    birthPlace: null,
    calendarType: "solar",
    gender: "unknown",
    birthDateStatus: "public",
    birthTimeStatus: isBirthTimeKnown ? "verified" : "unknown",
    isBirthTimeKnown,
    isHistoricalDateUncertain: isDateUncertain(category, birthDate),
    shortBio: shortDescription,
    shortDescription,
    profileImage: null,
    tags,
    seoKeywords: [...baseKeywords, `${name} 사주`, `${name} 사주풀이`, `${category} 사주`],
    imageQueries: [`${name} ${category} 인물`, `${category} destiny portrait`, "five elements saju"],
    published: true,
  };
});

export const publishedCelebritySajuSeeds = celebritySajuSeeds.filter((item) => item.published && item.birthDate);

export const famousSajuPeople: FamousSajuPerson[] = publishedCelebritySajuSeeds.map((item) => ({
  id: item.id,
  slug: item.slug,
  nameKo: item.nameKo,
  nameEn: item.nameEn,
  aliases: item.aliases,
  category: item.categoryKey,
  birthDate: item.birthDate || "",
  birthCalendar: item.birthCalendar,
  birthTime: item.birthTime,
  birthPlace: item.birthPlace,
  gender: item.gender,
  isBirthTimeKnown: item.isBirthTimeKnown,
  isHistoricalDateUncertain: item.isHistoricalDateUncertain,
  seoKeywords: item.seoKeywords,
  imageQueries: item.imageQueries,
  shortDescription: item.shortDescription,
  published: item.published,
}));

export function categoryToSlug(category: string) {
  const table: Record<string, string> = {
    "역사 위인": "history",
    "왕족·정치인": "politics",
    "K-스타": "k-star",
    "배우": "actor",
    "가수": "singer",
    "스포츠": "sports",
    "기업인": "business",
    "감독·작가": "director-writer",
    "JP 일본": "jp",
    "CN 중국": "cn",
    "US 미국": "us",
    "사상가·예술가": "thinker-artist",
  };
  return table[category] || String(category).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function getCelebrityBySlug(slug: string) {
  const key = normalizeCelebrityLookupKey(slug);
  return publishedCelebritySajuSeeds.find((item) => {
    const keys = [item.slug, item.nameKo, item.name, item.nameEn, ...item.aliases].map((value) => normalizeCelebrityLookupKey(String(value || "")));
    return keys.includes(key);
  }) || null;
}

export function getCelebrityStaticSlugs() {
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const item of publishedCelebritySajuSeeds) {
    for (const value of [item.slug, item.nameKo, ...item.aliases]) {
      const routeSlug = normalizeCelebrityLookupKey(String(value || "").trim());
      if (!routeSlug || routeSlug.includes("/") || routeSlug.includes("\\") || seen.has(routeSlug)) continue;
      seen.add(routeSlug);
      slugs.push(routeSlug);
    }
  }
  return slugs;
}

export function getCelebritiesByCategory(category: string) {
  return publishedCelebritySajuSeeds.filter((item) => categoryToSlug(item.category) === category);
}
