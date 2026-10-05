// K-POP 로스터 정본 (공개 양력 생년월일만). 생시·MBTI·혈액형·사생활은 기록하지 않는다.
// 검증 절차와 출처 로그: docs/design/kpop-roster-ledger.md

export const ROSTER_VERSION = "kpop-roster-2026.10-v2";
export const ROSTER_CHECKED_ON = "2026-10-06";

/**
 * @typedef {{ url: string, label: string, checkedOn: string }} RosterSource
 * @typedef {{
 *   id: string,
 *   stageNameKo: string,
 *   stageNameEn: string,
 *   aliases: string[],
 *   birthDate: string,
 *   birthTimeKnown: false,
 *   status: "active" | "inactive",
 *   sources: RosterSource[],
 *   missing: string[],
 * }} RosterMember
 * @typedef {{
 *   id: string,
 *   nameKo: string,
 *   nameEn: string,
 *   aliases: string[],
 *   agencyLabel: string,
 *   debutYear: number,
 *   members: RosterMember[],
 * }} RosterGroup
 */

/** @returns {RosterSource} */
const src = (url, label) => Object.freeze({ url, label, checkedOn: ROSTER_CHECKED_ON });

/**
 * @param {RosterSource[]} sources 그룹 단위 출처(멤버 전원에 동일 적용)
 * @param {string} groupId
 * @param {[string, string, string, string[], (string[] | undefined)?][]} rows
 *   [stageNameKo, stageNameEn, birthDate, aliases, missing?]
 * @returns {RosterMember[]}
 */
function members(sources, groupId, rows) {
  return rows.map(([stageNameKo, stageNameEn, birthDate, aliases, missing = []]) =>
    Object.freeze({
      id: `${groupId}-${stageNameEn
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`,
      stageNameKo,
      stageNameEn,
      aliases: Object.freeze([...aliases]),
      birthDate,
      birthTimeKnown: false,
      status: missing.some((m) => m === "lineup-uncertain" || m === "birthDate-conflict") ? "inactive" : "active",
      sources: Object.freeze([...sources]),
      missing: Object.freeze([...missing]),
    }),
  );
}

/** @param {RosterGroup} g */
const group = (g) => Object.freeze({ ...g, aliases: Object.freeze([...g.aliases]), members: Object.freeze(g.members) });

const SRC = {
  bts: [
    src("https://namu.wiki/w/방탄소년단", "Namu Wiki"),
    src("https://ko.wikipedia.org/wiki/방탄소년단", "Wikipedia (ko)"),
  ],
  twice: [
    src("https://kprofiles.com/twice-members-profile/", "Kprofiles"),
    src("https://ko.wikipedia.org/wiki/트와이스", "Wikipedia (ko)"),
  ],
  blackpink: [
    src("https://kprofiles.com/black-pink-members-profile/", "Kprofiles"),
    src("https://ko.wikipedia.org/wiki/블랙핑크", "Wikipedia (ko)"),
  ],
  newjeans: [
    src("https://kprofiles.com/newjeans-members-profile/", "Kprofiles"),
    src("https://ko.wikipedia.org/wiki/뉴진스", "Wikipedia (ko)"),
  ],
  ive: [
    src("https://kprofiles.com/ive-members-profile/", "Kprofiles"),
    src("https://ko.wikipedia.org/wiki/아이브_(음악_그룹)", "Wikipedia (ko)"),
  ],
  aespa: [
    src("https://kprofiles.com/aespa-members-profile/", "Kprofiles"),
    src("https://ko.wikipedia.org/wiki/에스파", "Wikipedia (ko)"),
  ],
  "le-sserafim": [
    src("https://kprofiles.com/le-sserafim-members-profile/", "Kprofiles"),
    src("https://ko.wikipedia.org/wiki/르세라핌", "Wikipedia (ko)"),
  ],
  gidle: [
    src("https://kprofiles.com/idle-members-profile/", "Kprofiles"),
    src("https://ko.wikipedia.org/wiki/(여자)아이들", "Wikipedia (ko)"),
  ],
  seventeen: [
    src("https://kprofiles.com/seventeen-members-profile/", "Kprofiles"),
    src("https://ko.wikipedia.org/wiki/세븐틴_(음악_그룹)", "Wikipedia (ko)"),
  ],
  "stray-kids": [
    src("https://kprofiles.com/stray-kids-members-profile/", "Kprofiles"),
    src("https://ko.wikipedia.org/wiki/스트레이_키즈", "Wikipedia (ko)"),
  ],
  txt: [
    src("https://kprofiles.com/txt-members-profile/", "Kprofiles"),
    src("https://ko.wikipedia.org/wiki/투모로우바이투게더", "Wikipedia (ko)"),
  ],
  enhypen: [
    src("https://kprofiles.com/enhypen-members-profile/", "Kprofiles"),
    src("https://ko.wikipedia.org/wiki/엔하이픈", "Wikipedia (ko)"),
  ],
  riize: [
    src("https://kprofiles.com/riize-members-profile/", "Kprofiles"),
    src("https://ko.wikipedia.org/wiki/라이즈_(음악_그룹)", "Wikipedia (ko)"),
  ],
  illit: [
    src("https://kprofiles.com/illit-members-profile/", "Kprofiles"),
    src("https://ko.wikipedia.org/wiki/아일릿", "Wikipedia (ko)"),
  ],
  babymonster: [
    src("https://kprofiles.com/babymonster-members-profile/", "Kprofiles"),
    src("https://namu.wiki/w/BABYMONSTER", "Namu Wiki"),
  ],
  nmixx: [
    src("https://kprofiles.com/nmixx-profile/", "Kprofiles"),
    src("https://ko.wikipedia.org/wiki/엔믹스", "Wikipedia (ko)"),
  ],
};

/** @type {ReadonlyArray<RosterGroup>} */
export const ROSTER_GROUPS = Object.freeze([
  group({
    id: "bts",
    nameKo: "방탄소년단",
    nameEn: "BTS",
    aliases: ["방탄소년단", "방탄", "BTS", "Bangtan", "Bangtan Boys", "Bangtan Sonyeondan", "비티에스"],
    agencyLabel: "빅히트 뮤직",
    debutYear: 2013,
    members: members(SRC.bts, "bts", [
      ["알엠", "RM", "1994-09-12", ["알엠", "RM", "랩몬스터", "Rap Monster"]],
      ["진", "Jin", "1992-12-04", ["진", "Jin", "JIN"]],
      ["슈가", "Suga", "1993-03-09", ["슈가", "Suga", "SUGA", "Agust D", "어거스트 디"]],
      ["제이홉", "J-Hope", "1994-02-18", ["제이홉", "J-Hope", "j-hope", "JHope", "홉이"]],
      ["지민", "Jimin", "1995-10-13", ["지민", "Jimin", "JIMIN"]],
      ["뷔", "V", "1995-12-30", ["뷔", "V", "태태", "TaeTae"]],
      ["정국", "Jungkook", "1997-09-01", ["정국", "Jungkook", "Jung Kook", "JK", "꾹이"]],
    ]),
  }),
  group({
    id: "twice",
    nameKo: "트와이스",
    nameEn: "TWICE",
    aliases: ["트와이스", "TWICE", "Twice", "트둥이"],
    agencyLabel: "JYP 엔터테인먼트",
    debutYear: 2015,
    members: members(SRC.twice, "twice", [
      ["나연", "Nayeon", "1995-09-22", ["나연", "Nayeon", "Na-yeon", "NAYEON"]],
      ["정연", "Jeongyeon", "1996-11-01", ["정연", "Jeongyeon", "Jungyeon", "JEONGYEON"]],
      ["모모", "Momo", "1996-11-09", ["모모", "Momo", "MOMO", "Hirai Momo", "히라이 모모"]],
      ["사나", "Sana", "1996-12-29", ["사나", "Sana", "SANA", "Minatozaki Sana", "미나토자키 사나"]],
      ["지효", "Jihyo", "1997-02-01", ["지효", "Jihyo", "JIHYO"]],
      ["미나", "Mina", "1997-03-24", ["미나", "Mina", "MINA", "Myoui Mina", "묘이 미나"]],
      ["다현", "Dahyun", "1998-05-28", ["다현", "Dahyun", "DAHYUN", "두부"]],
      ["채영", "Chaeyoung", "1999-04-23", ["채영", "Chaeyoung", "CHAEYOUNG"]],
      ["쯔위", "Tzuyu", "1999-06-14", ["쯔위", "Tzuyu", "TZUYU", "Chou Tzu-yu"]],
    ]),
  }),
  group({
    id: "blackpink",
    nameKo: "블랙핑크",
    nameEn: "BLACKPINK",
    aliases: ["블랙핑크", "BLACKPINK", "Black Pink", "Blackpink", "블핑"],
    agencyLabel: "YG 엔터테인먼트",
    debutYear: 2016,
    members: members(SRC.blackpink, "blackpink", [
      ["지수", "Jisoo", "1995-01-03", ["지수", "Jisoo", "JISOO"]],
      ["제니", "Jennie", "1996-01-16", ["제니", "Jennie", "JENNIE"]],
      ["로제", "Rosé", "1997-02-11", ["로제", "Rosé", "Rose", "ROSÉ"]],
      ["리사", "Lisa", "1997-03-27", ["리사", "Lisa", "LISA", "Lalisa", "라리사"]],
    ]),
  }),
  group({
    id: "newjeans",
    nameKo: "뉴진스",
    nameEn: "NewJeans",
    aliases: ["뉴진스", "NewJeans", "New Jeans", "NJZ", "엔제이지"],
    agencyLabel: "어도어",
    debutYear: 2022,
    members: members(SRC.newjeans, "newjeans", [
      ["민지", "Minji", "2004-05-07", ["민지", "Minji", "MINJI"]],
      ["하니", "Hanni", "2004-10-06", ["하니", "Hanni", "HANNI", "Hanni Pham"]],
      ["해린", "Haerin", "2006-05-15", ["해린", "Haerin", "HAERIN", "Hae-rin"]],
      ["혜인", "Hyein", "2008-04-21", ["혜인", "Hyein", "HYEIN"]],
    ]),
  }),
  group({
    id: "ive",
    nameKo: "아이브",
    nameEn: "IVE",
    aliases: ["아이브", "IVE", "Ive"],
    agencyLabel: "스타쉽 엔터테인먼트",
    debutYear: 2021,
    members: members(SRC.ive, "ive", [
      ["가을", "Gaeul", "2002-09-24", ["가을", "Gaeul", "GAEUL"]],
      ["안유진", "An Yujin", "2003-09-01", ["안유진", "유진", "An Yujin", "Ahn Yujin", "Yujin", "AN YUJIN"]],
      ["레이", "Rei", "2004-02-03", ["레이", "Rei", "REI"]],
      ["장원영", "Jang Wonyoung", "2004-08-31", ["장원영", "원영", "Jang Wonyoung", "Wonyoung", "JANG WONYOUNG"]],
      ["리즈", "Liz", "2004-11-21", ["리즈", "Liz", "LIZ"]],
      ["이서", "Leeseo", "2007-02-21", ["이서", "Leeseo", "LEESEO"]],
    ]),
  }),
  group({
    id: "aespa",
    nameKo: "에스파",
    nameEn: "aespa",
    aliases: ["에스파", "aespa", "æspa", "AESPA", "Aespa"],
    agencyLabel: "SM 엔터테인먼트",
    debutYear: 2020,
    members: members(SRC.aespa, "aespa", [
      ["카리나", "Karina", "2000-04-11", ["카리나", "Karina", "KARINA"]],
      ["지젤", "Giselle", "2000-10-30", ["지젤", "Giselle", "GISELLE"]],
      ["윈터", "Winter", "2001-01-01", ["윈터", "Winter", "WINTER"]],
      ["닝닝", "NingNing", "2002-10-23", ["닝닝", "NingNing", "Ningning", "NINGNING"]],
    ]),
  }),
  group({
    id: "le-sserafim",
    nameKo: "르세라핌",
    nameEn: "LE SSERAFIM",
    aliases: ["르세라핌", "LE SSERAFIM", "LESSERAFIM", "Le Sserafim", "르셒"],
    agencyLabel: "쏘스뮤직",
    debutYear: 2022,
    members: members(SRC["le-sserafim"], "le-sserafim", [
      ["사쿠라", "Sakura", "1998-03-19", ["사쿠라", "Sakura", "SAKURA", "Miyawaki Sakura", "미야와키 사쿠라", "꾸라"]],
      ["김채원", "Kim Chaewon", "2000-08-01", ["김채원", "채원", "Kim Chaewon", "Chaewon", "KIM CHAEWON"]],
      ["허윤진", "Huh Yunjin", "2001-10-08", ["허윤진", "윤진", "Huh Yunjin", "Yunjin", "HUH YUNJIN"]],
      ["카즈하", "Kazuha", "2003-08-09", ["카즈하", "Kazuha", "KAZUHA", "Nakamura Kazuha", "나카무라 카즈하", "즈하"]],
      ["홍은채", "Hong Eunchae", "2006-11-10", ["홍은채", "은채", "Hong Eunchae", "Eunchae", "HONG EUNCHAE", "만채"]],
    ]),
  }),
  group({
    id: "gidle",
    nameKo: "아이들",
    nameEn: "i-dle",
    aliases: [
      "아이들", "i-dle", "I-DLE", "IDLE", "idle",
      "(여자)아이들", "여자아이들", "(G)I-DLE", "(G)I-dle", "GIDLE", "G-IDLE", "G)I-DLE",
    ],
    agencyLabel: "큐브 엔터테인먼트",
    debutYear: 2018,
    members: members(SRC.gidle, "gidle", [
      ["미연", "Miyeon", "1997-01-31", ["미연", "Miyeon", "MIYEON"]],
      ["민니", "Minnie", "1997-10-23", ["민니", "Minnie", "MINNIE"]],
      ["소연", "Soyeon", "1998-08-26", ["소연", "Soyeon", "SOYEON", "전소연", "Jeon Soyeon"]],
      ["우기", "Yuqi", "1999-09-23", ["우기", "Yuqi", "YUQI", "Song Yuqi"]],
      ["슈화", "Shuhua", "2000-01-06", ["슈화", "Shuhua", "SHUHUA", "Yeh Shuhua"]],
    ]),
  }),
  group({
    id: "seventeen",
    nameKo: "세븐틴",
    nameEn: "SEVENTEEN",
    aliases: ["세븐틴", "SEVENTEEN", "Seventeen", "SVT", "셉틴"],
    agencyLabel: "플레디스 엔터테인먼트",
    debutYear: 2015,
    members: members(SRC.seventeen, "seventeen", [
      ["에스쿱스", "S.Coups", "1995-08-08", ["에스쿱스", "S.Coups", "S.COUPS", "Scoups", "쿱스"]],
      ["정한", "Jeonghan", "1995-10-04", ["정한", "Jeonghan", "JEONGHAN"]],
      ["조슈아", "Joshua", "1995-12-30", ["조슈아", "Joshua", "JOSHUA", "Joshua Hong"]],
      ["준", "Jun", "1996-06-10", ["준", "Jun", "JUN"]],
      ["호시", "Hoshi", "1996-06-15", ["호시", "Hoshi", "HOSHI"]],
      ["원우", "Wonwoo", "1996-07-17", ["원우", "Wonwoo", "WONWOO"]],
      ["우지", "Woozi", "1996-11-22", ["우지", "Woozi", "WOOZI"]],
      ["디에잇", "The8", "1997-11-07", ["디에잇", "The8", "THE 8", "The 8", "THE8"]],
      ["민규", "Mingyu", "1997-04-06", ["민규", "Mingyu", "MINGYU"]],
      ["도겸", "DK", "1997-02-18", ["도겸", "DK", "Dokyeom", "D.K"]],
      ["승관", "Seungkwan", "1998-01-16", ["승관", "Seungkwan", "SEUNGKWAN"]],
      ["버논", "Vernon", "1998-02-18", ["버논", "Vernon", "VERNON"]],
      ["디노", "Dino", "1999-02-11", ["디노", "Dino", "DINO"]],
    ]),
  }),
  group({
    id: "stray-kids",
    nameKo: "스트레이 키즈",
    nameEn: "Stray Kids",
    aliases: ["스트레이 키즈", "스트레이키즈", "스키즈", "Stray Kids", "StrayKids", "SKZ"],
    agencyLabel: "JYP 엔터테인먼트",
    debutYear: 2018,
    members: members(SRC["stray-kids"], "stray-kids", [
      ["방찬", "Bang Chan", "1997-10-03", ["방찬", "Bang Chan", "Bangchan", "BANG CHAN", "Chan"]],
      ["리노", "Lee Know", "1998-10-25", ["리노", "Lee Know", "Leeknow", "LEE KNOW", "Lino"]],
      ["창빈", "Changbin", "1999-08-11", ["창빈", "Changbin", "CHANGBIN"]],
      ["현진", "Hyunjin", "2000-03-20", ["현진", "Hyunjin", "HYUNJIN"]],
      ["한", "Han", "2000-09-14", ["한", "Han", "HAN"]],
      ["필릭스", "Felix", "2000-09-15", ["필릭스", "Felix", "FELIX"]],
      ["승민", "Seungmin", "2000-09-22", ["승민", "Seungmin", "SEUNGMIN"]],
      ["아이엔", "I.N", "2001-02-08", ["아이엔", "I.N", "I.N.", "IN", "Jeongin"]],
    ]),
  }),
  group({
    id: "txt",
    nameKo: "투모로우바이투게더",
    nameEn: "TOMORROW X TOGETHER",
    aliases: ["투모로우바이투게더", "투바투", "TXT", "TOMORROW X TOGETHER", "Tomorrow X Together", "Tomorrow by Together"],
    agencyLabel: "빅히트 뮤직",
    debutYear: 2019,
    members: members(SRC.txt, "txt", [
      ["수빈", "Soobin", "2000-12-05", ["수빈", "Soobin", "SOOBIN"]],
      ["연준", "Yeonjun", "1999-09-13", ["연준", "Yeonjun", "YEONJUN"]],
      ["범규", "Beomgyu", "2001-03-13", ["범규", "Beomgyu", "BEOMGYU"]],
      ["태현", "Taehyun", "2002-02-05", ["태현", "Taehyun", "TAEHYUN"]],
      ["휴닝카이", "Hueningkai", "2002-08-14", ["휴닝카이", "Hueningkai", "HueningKai", "Huening Kai", "HUENINGKAI", "휴닝", "카이"]],
    ]),
  }),
  group({
    id: "enhypen",
    nameKo: "엔하이픈",
    nameEn: "ENHYPEN",
    aliases: ["엔하이픈", "ENHYPEN", "Enhypen", "엔하"],
    agencyLabel: "빌리프랩",
    debutYear: 2020,
    members: members(SRC.enhypen, "enhypen", [
      ["정원", "Jungwon", "2004-02-09", ["정원", "Jungwon", "JUNGWON"]],
      ["제이", "Jay", "2002-04-20", ["제이", "Jay", "JAY"]],
      ["제이크", "Jake", "2002-11-15", ["제이크", "Jake", "JAKE"]],
      ["성훈", "Sunghoon", "2002-12-08", ["성훈", "Sunghoon", "SUNGHOON"]],
      ["선우", "Sunoo", "2003-06-24", ["선우", "Sunoo", "SUNOO"]],
      ["니키", "Ni-Ki", "2005-12-09", ["니키", "Ni-Ki", "Niki", "NI-KI"]],
    ]),
  }),
  group({
    id: "riize",
    nameKo: "라이즈",
    nameEn: "RIIZE",
    aliases: ["라이즈", "RIIZE", "Riize"],
    agencyLabel: "SM 엔터테인먼트",
    debutYear: 2023,
    members: members(SRC.riize, "riize", [
      ["쇼타로", "Shotaro", "2000-11-25", ["쇼타로", "Shotaro", "SHOTARO"]],
      ["은석", "Eunseok", "2001-03-19", ["은석", "Eunseok", "EUNSEOK"]],
      ["성찬", "Sungchan", "2001-09-13", ["성찬", "Sungchan", "SUNGCHAN"]],
      ["원빈", "Wonbin", "2002-03-02", ["원빈", "Wonbin", "WONBIN"]],
      ["소희", "Sohee", "2003-11-21", ["소희", "Sohee", "SOHEE"]],
      ["앤톤", "Anton", "2004-03-21", ["앤톤", "Anton", "ANTON"]],
    ]),
  }),
  group({
    id: "illit",
    nameKo: "아일릿",
    nameEn: "ILLIT",
    aliases: ["아일릿", "ILLIT", "Illit"],
    agencyLabel: "빌리프랩",
    debutYear: 2024,
    members: members(SRC.illit, "illit", [
      ["윤아", "Yunah", "2004-01-15", ["윤아", "Yunah", "YUNAH"]],
      ["민주", "Minju", "2004-05-11", ["민주", "Minju", "MINJU"]],
      ["모카", "Moka", "2004-10-08", ["모카", "Moka", "MOKA"]],
      ["원희", "Wonhee", "2007-06-26", ["원희", "Wonhee", "WONHEE"]],
      ["이로하", "Iroha", "2008-02-04", ["이로하", "Iroha", "IROHA"]],
    ]),
  }),
  group({
    id: "babymonster",
    nameKo: "베이비몬스터",
    nameEn: "BABYMONSTER",
    aliases: ["베이비몬스터", "BABYMONSTER", "Babymonster", "베몬"],
    agencyLabel: "YG 엔터테인먼트",
    debutYear: 2024,
    members: members(SRC.babymonster, "babymonster", [
      ["루카", "Ruka", "2002-03-20", ["루카", "Ruka", "RUKA"]],
      ["파리타", "Pharita", "2005-08-26", ["파리타", "Pharita", "PHARITA"]],
      ["아사", "Asa", "2006-04-17", ["아사", "Asa", "ASA"]],
      ["아현", "Ahyeon", "2007-04-11", ["아현", "Ahyeon", "AHYEON"]],
      ["라미", "Rami", "2007-10-17", ["라미", "Rami", "RAMI"]],
      ["로라", "Rora", "2008-08-14", ["로라", "Rora", "RORA"]],
      ["치키타", "Chiquita", "2009-02-17", ["치키타", "Chiquita", "CHIQUITA"]],
    ]),
  }),
  group({
    id: "nmixx",
    nameKo: "엔믹스",
    nameEn: "NMIXX",
    aliases: ["엔믹스", "NMIXX", "Nmixx"],
    agencyLabel: "JYP 엔터테인먼트",
    debutYear: 2022,
    members: members(SRC.nmixx, "nmixx", [
      ["릴리", "Lily", "2002-10-17", ["릴리", "Lily", "LILY"]],
      ["해원", "Haewon", "2003-02-25", ["해원", "Haewon", "HAEWON"]],
      ["설윤", "Sullyoon", "2004-01-26", ["설윤", "Sullyoon", "SULLYOON"]],
      ["배이", "Bae", "2004-12-28", ["배이", "Bae", "BAE"]],
      ["지우", "Jiwoo", "2005-04-13", ["지우", "Jiwoo", "JIWOO"]],
      ["규진", "Kyujin", "2006-05-26", ["규진", "Kyujin", "KYUJIN"]],
    ]),
  }),
]);
