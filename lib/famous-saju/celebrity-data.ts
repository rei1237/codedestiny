import famousOverridesJson from "./overrides.generated.json";

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
  // 2026-08 확장 — 최신 화제 아이돌·배우 (생년월일: app/saju/destiny-bias/lib/celebrityProfiles.ts 교차검증 데이터 재사용)
  ["rescene-wonyi", "리센느 원이", "K-스타", "KR", "2004-05-25", null, ["보컬", "리더십", "안정감"]],
  ["rescene-liv", "리센느 리브", "K-스타", "KR", "2006-10-11", null, ["비주얼", "랩", "포즈"]],
  ["rescene-minami", "리센느 미나미", "K-스타", "JP", "2006-11-29", null, ["춤", "일본", "매력"]],
  ["rescene-mei", "리센느 메이", "K-스타", "KR", "2008-08-19", null, ["춤", "막내", "에너지"]],
  ["rescene-zena", "리센느 제나", "K-스타", "KR", "2008-11-27", null, ["보컬", "막내", "순수함"]],
  ["illit-minju", "아일릿 민주", "K-스타", "KR", "2004-05-11", null, ["리더십", "보컬", "청순"]],
  ["illit-wonhee", "아일릿 원희", "K-스타", "KR", "2007-06-26", null, ["비주얼", "랩", "분위기"]],
  ["kissoflife-natty", "키스오브라이프 나띠", "K-스타", "KR", "2002-05-30", null, ["글로벌", "퍼포먼스", "카리스마"]],
  ["lesserafim-kim-chaewon", "르세라핌 김채원", "K-스타", "KR", "2000-08-05", null, ["춤", "보컬", "우아함"]],
  ["lesserafim-huh-yunjin", "르세라핌 허윤진", "K-스타", "KR", "2001-10-08", null, ["보컬", "성장", "진정성"]],
  ["ive-lee-seo", "이서", "K-스타", "KR", "2007-02-21", null, ["보컬", "막내", "섬세함"]],
  ["ive-rei", "레이", "K-스타", "JP", "2004-10-03", null, ["랩", "다국적", "개성"]],
  ["aespa-giselle", "에스파 지젤", "K-스타", "KR", "2000-10-30", null, ["랩", "비주얼", "글로벌"]],
  ["aespa-ningning", "에스파 닝닝", "K-스타", "CN", "2002-10-23", null, ["보컬", "파워", "자신감"]],
  ["seventeen-hoshi", "세븐틴 호시", "K-스타", "KR", "1996-06-15", null, ["춤", "에너지", "리더십"]],
  ["straykids-felix", "스트레이키즈 필릭스", "K-스타", "AU", "2000-09-15", null, ["음색", "비주얼", "매력"]],
  ["enhypen-ni-ki", "엔하이픈 니키", "K-스타", "JP", "2005-12-09", null, ["춤", "막내", "성장"]],
  ["nct-jaehyun", "NCT 재현", "K-스타", "KR", "1997-02-13", null, ["보컬", "비주얼", "섬세함"]],
  ["byeon-woo-seok", "변우석", "배우", "KR", "1994-04-27", null, ["연기", "로맨스", "섬세함"]],
  ["kim-ji-won", "김지원", "배우", "KR", "1992-09-22", null, ["연기", "감정", "스타성"]],
  ["go-youn-jung", "고윤정", "배우", "KR", "1996-04-11", null, ["연기", "몰입", "청춘"]],
  ["lee-young-ji", "이영지", "가수", "KR", "2002-02-09", null, ["랩", "입담", "자유분방"]],
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
  ["yu-hae-jin", "유해진", "배우", "KR", "1970-01-04", null, ["배우", "생활감", "연기"]],
  ["naruhito", "나루히토 일왕", "왕족·정치인", "JP", "1960-02-23", null, ["왕실", "외교", "상징"], "Naruhito"],
  ["takeshi-kitano", "기타노 다케시", "JP 일본", "JP", "1947-01-18", null, ["감독", "코미디", "영화"], "Takeshi Kitano"],
  ["bruce-lee", "이소룡", "CN 중국", "US", "1940-11-27", null, ["무술", "영화", "철학"], "Bruce Lee"],
  ["jack-ma", "마윈", "기업인", "CN", "1964-09-10", null, ["창업", "플랫폼", "상업"], "Jack Ma"],
  ["confucius", "공자", "사상가·예술가", "CN", "0551-09-28", null, ["철학", "교육", "예"], "Confucius"],
  ["martin-luther-king-jr", "마틴 루터 킹", "왕족·정치인", "US", "1929-01-15", null, ["연설", "평등", "신념"], "Martin Luther King Jr."],
  ["elvis-presley", "엘비스 프레슬리", "가수", "US", "1935-01-08", null, ["로큰롤", "무대", "상징"], "Elvis Presley"],
  ["park-chan-ho", "박찬호", "스포츠", "KR", "1973-06-30", null, ["야구", "개척", "인내"]],
  ["han-kang", "한강", "감독·작가", "KR", "1970-11-27", null, ["문학", "상처", "서정성"]],
  ["toyotomi-hideyoshi", "도요토미 히데요시", "JP 일본", "JP", "1537-03-17", null, ["권력", "전략", "통일"], "Toyotomi Hideyoshi"],
  ["akira-kurosawa", "쿠로사와 아키라", "JP 일본", "JP", "1910-03-23", null, ["감독", "영화", "미학"], "Akira Kurosawa"],
  ["namie-amuro", "아무로 나미에", "가수", "JP", "1977-09-20", null, ["J-팝", "무대", "댄스"], "Namie Amuro"],
  ["zhang-yimou", "장이머우", "감독·작가", "CN", "1950-04-02", null, ["감독", "색채", "영상"], "Zhang Yimou"],
  ["mao-zedong", "마오쩌둥", "왕족·정치인", "CN", "1893-12-26", null, ["혁명", "정치", "이념"], "Mao Zedong"],
  ["steve-wozniak", "스티브 워즈니악", "기업인", "US", "1950-08-11", null, ["공학", "컴퓨터", "창업"], "Steve Wozniak"],
  ["madonna", "마돈나", "가수", "US", "1958-08-16", null, ["팝", "변신", "무대"], "Madonna"],
  ["martin-scorsese", "마틴 스코세이지", "감독·작가", "US", "1942-11-17", null, ["감독", "영화", "서사"], "Martin Scorsese"],
  ["leonardo-da-vinci", "레오나르도 다 빈치", "사상가·예술가", "IT", "1452-04-15", null, ["예술", "과학", "천재성"], "Leonardo da Vinci"],
  ["albert-einstein", "알베르트 아인슈타인", "사상가·예술가", "DE", "1879-03-14", null, ["물리학", "상상력", "우주"], "Albert Einstein"],
  ["william-shakespeare", "윌리엄 셰익스피어", "감독·작가", "UK", "1564-04-26", null, ["문학", "극작", "인간심리"], "William Shakespeare"],
];

const baseKeywords = ["유명인 사주", "사주팔자", "일간 분석", "오행 분석", "운세 사주"];

const extraAliasesBySlug: Record<string, string[]> = {
  "yi-sun-sin": ["충무공", "충무공 이순신"],
  iu: ["이지은", "IU (이지은)", "아이유"],
  "bts-rm": ["RM", "알엠", "김남준", "BTS 알엠", "BTS RM (김남준)"],
  "bruce-lee": ["이소룡 (李小龍)", "李小龍"],
  "jackie-chan": ["성룡 (成龍)", "成龍"],
  "jack-ma": ["마윈 (马云)", "马云"],
  confucius: ["공자 (孔子)", "孔子"],
  "napoleon-bonaparte": ["나폴레옹", "나폴레옹 (비교)"],
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

// 관리자(꽃 admin)에서 발행한 수정본. scripts/fetch-content-overrides.mjs가
// overrides.generated.json을 빌드 시 갱신한다(기본값은 빈 객체).
export type FamousSajuArticleOverride = {
  shortDescription?: string;
  heroCopy?: string;
  summary?: string;
  conclusion?: string;
  seoTitle?: string;
  seoDescription?: string;
};

const famousSajuOverrides: Record<string, FamousSajuArticleOverride> =
  (famousOverridesJson as { items?: Record<string, FamousSajuArticleOverride> }).items ?? {};

export function getFamousSajuArticleOverride(slug: string): FamousSajuArticleOverride | null {
  return famousSajuOverrides[slug] || null;
}

export const celebritySajuSeeds: CelebritySajuSeed[] = rawSeeds.map(([slug, name, category, country, birthDate, birthTime, tags = [], nameEn]) => {
  const categoryKey = toFamousSajuCategory(category);
  const aliases = buildAliases(slug, name, nameEn);
  const birthCalendar: FamousSajuBirthCalendar = "solar";
  const isBirthTimeKnown = Boolean(birthTime);
  const shortDescription = famousSajuOverrides[slug]?.shortDescription
    || `${name}의 공개 생년월일을 바탕으로 일간, 오행, 직업적 흐름을 살펴보는 유명인 사주 분석입니다.`;

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

// 정본 슬러그만 프리렌더한다.
// 예전에는 slug + nameKo + aliases 를 전부 돌려서 인물 1명이 URL 여러 개를 만들었고
// (134명 → 303 URL, /famous-saju 와 /insights/famous-saju 두 트리라 실제 파일 606개),
// 별칭 페이지는 본문이 정본과 100% 동일한 사본이었다. 전부 noindex + canonical 이라
// 색인이 오염되지는 않았지만 크롤 예산과 품질 평가에는 그대로 부담이 됐다.
// 내부 링크는 모두 item.slug 만 쓰므로(허브·카테고리·관련글 전부) 끊기는 경로는 없다.
export function getCelebrityStaticSlugs() {
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const item of publishedCelebritySajuSeeds) {
    const routeSlug = normalizeCelebrityLookupKey(String(item.slug || "").trim());
    if (!routeSlug || routeSlug.includes("/") || routeSlug.includes("\\") || seen.has(routeSlug)) continue;
    seen.add(routeSlug);
    slugs.push(routeSlug);
  }
  return slugs;
}

// 행적↔명리 수동 큐레이션 데이터.
// 계산 엔진으로는 인물의 실제 행적을 알 수 없으므로, 공개된 역사 기록(나무위키 등)을
// 근거로 "실제 행적 → 연결되는 십성/오행 → 해석 노트"를 slug별로 직접 매핑한다.
// 카피 생성 계층(celebrity-saju-service)이 이 데이터를 주입해 일반론이 아닌
// 인물 고유의 서술을 만든다. annotation이 없는 slug는 계산값 기반 일반 카피로 자동 폴백한다.
export type CelebritySajuAnnotationFact = {
  /** 실제로 확인되는 행적/일화 */
  deed: string;
  /** 연결할 십성(비견·겁재·정재·편관 등) 또는 오행(목·화·토·금·수) 라벨 */
  link: string;
  /** link가 십성인지 오행인지 */
  linkType: "tenGod" | "element";
  /** 행적과 명식을 잇는 역술가 해석 한 문장 */
  note: string;
};

export type CelebritySajuAnnotation = {
  /** 히어로/일주 섹션에 쓰는 인물 고유 물상 한 줄 (일간에 종속되지 않는 캐릭터 카피) */
  dayMasterImagery?: string;
  /** 최소 3개의 행적↔명리 매핑 */
  facts: CelebritySajuAnnotationFact[];
};

export const celebrityAnnotations: Record<string, CelebritySajuAnnotation> = {
  "yi-sun-sin": {
    dayMasterImagery: "칼끝 같은 관성(官星)의 압박 속에서도 스스로의 중심을 잃지 않는 장수의 결",
    facts: [
      {
        deed: "『난중일기』를 임진왜란 7년 내내 이어 쓰며 진중의 병력·군량·화약·격군 수와 날씨·물때까지 낱낱이 셈해 기록했습니다",
        link: "정재",
        linkType: "tenGod",
        note: "화려한 무용담이 아니라 끝까지 숫자를 관리하고 축적한 살림꾼의 감각이, 신뢰와 반복으로 쌓는 정재의 결과 정확히 겹칩니다",
      },
      {
        deed: "명량에서 열세 척으로 울돌목의 좁은 물목과 거센 물살을 전장으로 삼았고, 한산에서는 학익진으로 적을 넓게 감싸 격멸했습니다",
        link: "편관",
        linkType: "tenGod",
        note: "불리한 판을 피하지 않고 지형과 진법으로 정면 돌파하는 승부의 방식은, 압박을 추진력으로 바꾸는 편관·겁재의 기세로 읽힙니다",
      },
      {
        deed: "조정과 상관의 압력, 파직과 백의종군 속에서도 원칙과 군율을 굽히지 않았습니다",
        link: "비견",
        linkType: "tenGod",
        note: "타인의 시선보다 스스로 세운 기준을 먼저 붙드는 강직함은, 자기 중심을 지키는 비견의 독립성과 맞닿아 있습니다",
      },
      {
        deed: "삼도수군통제사로서 흩어진 수군을 다시 모아 '신에게는 아직 열두 척의 배가 남아 있사옵니다'라며 무너진 판을 재건했습니다",
        link: "금",
        linkType: "element",
        note: "거친 광석을 벼려 칼날을 세우듯, 부서진 조건에서 핵심만 남겨 다시 기준을 세우는 힘은 금(金) 기운의 완성 감각으로 드러납니다",
      },
    ],
  },
  "king-sejong": {
    dayMasterImagery: "백성의 눈높이까지 스스로 내려와 지식을 나누어 준 학자 군주의 결",
    facts: [
      {
        deed: "백성이 쉽게 배우도록 훈민정음을 직접 창제하고 그 원리를 『훈민정음해례본』으로 풀어냈습니다",
        link: "식신",
        linkType: "tenGod",
        note: "지식을 움켜쥐지 않고 밖으로 흘려보내 백성을 먹이고 기르는 방식은, 꾸준히 만들어 나누는 식신의 생산성과 정확히 겹칩니다",
      },
      {
        deed: "집현전을 세워 젊은 학자들과 경연에서 밤늦도록 토론하며 학문을 제도로 정착시켰습니다",
        link: "정인",
        linkType: "tenGod",
        note: "흩어진 경험을 배움의 구조로 정리하고 인재를 품어 키우는 흐름은, 학습과 보호의 기운인 정인의 결입니다",
      },
      {
        deed: "공법(전세 제도)을 정할 때 17만여 명에게 찬반을 묻는 대규모 여론조사를 시행하며 민본을 제도로 옮겼습니다",
        link: "정관",
        linkType: "tenGod",
        note: "흐트러질 수 있는 권력을 공적인 형식과 절차 안에서 다스리는 태도는, 질서와 책임의 십성인 정관으로 읽힙니다",
      },
    ],
  },
  "yu-gwan-sun": {
    dayMasterImagery: "어린 나이에도 스스로 세운 신념을 끝까지 놓지 않은 불꽃 같은 결",
    facts: [
      {
        deed: "이화학당 휴교 후 고향으로 내려가 아우내 장터의 3·1 만세운동을 직접 조직하고 앞장섰습니다",
        link: "겁재",
        linkType: "tenGod",
        note: "밀리는 판에서 오히려 날이 서고 직접 부딪쳐 돌파하는 기세는, 경쟁과 돌파력의 십성인 겁재로 드러납니다",
      },
      {
        deed: "서대문형무소에 갇혀 모진 고문을 받으면서도 옥중 만세를 멈추지 않았습니다",
        link: "편관",
        linkType: "tenGod",
        note: "극한의 압박을 피하지 않고 정면으로 받아 내는 승부성은, 편관이 위험한 자리에서 오히려 선명해지는 방식과 맞닿아 있습니다",
      },
      {
        deed: "열여덟 어린 나이에도 신념을 굽히지 않고 옥중에서 순국했습니다",
        link: "비견",
        linkType: "tenGod",
        note: "타인의 시선이나 회유보다 스스로 세운 원칙을 먼저 붙드는 강직함은, 자기 중심을 지키는 비견의 독립성입니다",
      },
    ],
  },
  "an-jung-geun": {
    dayMasterImagery: "결단의 순간과 사색의 깊이를 한 몸에 지닌 의사(義士)의 결",
    facts: [
      {
        deed: "하얼빈역에서 침략의 원흉 이토 히로부미를 저격하고 그 자리에서 대한독립을 외쳤습니다",
        link: "편관",
        linkType: "tenGod",
        note: "위험을 앞에 두고 물러서지 않고 한 번에 결행하는 힘은, 압박을 추진력으로 바꾸는 편관의 승부성으로 읽힙니다",
      },
      {
        deed: "뤼순 감옥에서 사형을 앞두고도 『동양평화론』을 집필하며 거사의 대의를 사상으로 정립했습니다",
        link: "편인",
        linkType: "tenGod",
        note: "남들이 지나친 문제를 붙잡아 낯선 생각 속으로 깊이 파고드는 태도는, 독창적 관찰과 몰입의 십성인 편인의 결입니다",
      },
      {
        deed: "동지들과 단지동맹을 맺어 왼손 넷째 손가락을 끊고 혈서로 결의를 다졌습니다",
        link: "비견",
        linkType: "tenGod",
        note: "무리에 기대기보다 스스로 세운 신념을 몸으로 증명하는 방식은, 자기 기준을 붙드는 비견의 독립성과 겹칩니다",
      },
    ],
  },
  "kim-gu": {
    dayMasterImagery: "흩어진 힘을 하나로 묶어 낸 통합형 지도자의 결",
    facts: [
      {
        deed: "대한민국임시정부의 주석으로서 분열되기 쉬운 독립운동 세력의 구심점 역할을 했습니다",
        link: "정관",
        linkType: "tenGod",
        note: "역할과 책임을 공적인 질서 안에 세워 흐트러진 힘을 묶어 내는 태도는, 질서와 책임의 십성인 정관으로 드러납니다",
      },
      {
        deed: "한인애국단을 조직해 이봉창·윤봉길 의거를 기획하며 판을 뒤흔들 결정적 한 수를 던졌습니다",
        link: "편관",
        linkType: "tenGod",
        note: "불리한 판을 정면으로 흔들어 국면을 바꾸는 결단은, 압박 속에서 승부를 거는 편관의 기세로 읽힙니다",
      },
      {
        deed: "자신의 삶과 사상을 『백범일지』에 직접 기록해 후대에 남겼습니다",
        link: "정인",
        linkType: "tenGod",
        note: "경험을 의미와 기록으로 정리해 다음 세대의 바탕으로 삼는 흐름은, 배움과 정리의 십성인 정인의 결입니다",
      },
    ],
  },
  "jeong-yak-yong": {
    dayMasterImagery: "유배의 고요 속에서 오히려 방대한 세계를 세운 실학자의 결",
    facts: [
      {
        deed: "수원화성을 쌓을 때 거중기를 직접 설계해 공사 기간과 비용을 크게 줄였습니다",
        link: "편인",
        linkType: "tenGod",
        note: "정해진 방식을 그대로 따르지 않고 낯선 원리로 우회로를 찾는 감각은, 독창적 관찰과 몰입의 십성인 편인으로 드러납니다",
      },
      {
        deed: "강진에서 18년 유배 생활을 하는 동안 『목민심서』·『경세유표』 등 500여 권을 저술했습니다",
        link: "식신",
        linkType: "tenGod",
        note: "화려한 한 번보다 멈추지 않고 꾸준히 쌓아 결과물을 만들어 내는 힘은, 지속의 생산성인 식신의 결과 겹칩니다",
      },
      {
        deed: "『목민심서』로 목민관이 지켜야 할 도리와 애민 행정의 원칙을 체계로 정리했습니다",
        link: "정관",
        linkType: "tenGod",
        note: "흩어진 실무를 공적 원칙과 질서로 세우는 태도는, 기준을 세우고 다스리는 정관의 결입니다",
      },
    ],
  },
};

export function getCelebrityAnnotation(slug: string): CelebritySajuAnnotation | null {
  return celebrityAnnotations[slug] || null;
}
