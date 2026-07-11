export const destinyBiasCelebCategories = ["전체", "걸그룹", "보이그룹", "가수·솔로", "배우", "정치인", "애니 캐릭터"] as const;

export type DestinyBiasCelebCategory = (typeof destinyBiasCelebCategories)[number];

export type DestinyBiasCelebrityPreset = {
  id: string;
  category: Exclude<DestinyBiasCelebCategory, "전체">;
  name: string;
  artist: string;
  birthDateInput: string;
  birthTimeInput: string;
  timeKnown: boolean;
  sourceLabel: string;
  searchText: string;
};

type RawCelebrityPreset = {
  category: Exclude<DestinyBiasCelebCategory, "전체">;
  fullName: string;
  birth: string;
  time?: string;
  artist?: string;
};

const idolCategories = new Set<Exclude<DestinyBiasCelebCategory, "전체">>(["걸그룹", "보이그룹"]);

function splitCelebrityName(fullName: string, category: RawCelebrityPreset["category"]) {
  if (idolCategories.has(category)) {
    const separator = fullName.lastIndexOf(" ");
    if (separator > 0) {
      return {
        artist: fullName.slice(0, separator).trim(),
        name: fullName.slice(separator + 1).trim(),
      };
    }
  }

  return {
    artist: "",
    name: fullName.trim(),
  };
}

function normalizeBirthDateInput(birth: string) {
  return birth.replace(/\D/g, "").slice(0, 8);
}

function normalizeBirthTimeInput(time?: string) {
  return String(time || "").replace(/\D/g, "").slice(0, 4);
}

const rawCelebrityPresets: RawCelebrityPreset[] = [
  { category: "걸그룹", fullName: "뉴진스 하니", birth: "2004-10-06" },
  { category: "걸그룹", fullName: "뉴진스 민지", birth: "2004-07-18" },
  { category: "걸그룹", fullName: "뉴진스 다니엘", birth: "2005-04-11" },
  { category: "걸그룹", fullName: "뉴진스 해린", birth: "2006-05-18" },
  { category: "걸그룹", fullName: "뉴진스 혜인", birth: "2008-04-21" },
  { category: "걸그룹", fullName: "아이브 안유진", birth: "2003-09-01" },
  { category: "걸그룹", fullName: "아이브 장원영", birth: "2004-08-31" },
  { category: "걸그룹", fullName: "아이브 레이", birth: "2004-10-03" },
  { category: "걸그룹", fullName: "아이브 가을", birth: "2002-09-24" },
  { category: "걸그룹", fullName: "아이브 리즈", birth: "2004-11-21" },
  { category: "걸그룹", fullName: "아이브 이서", birth: "2007-02-21" },
  { category: "걸그룹", fullName: "에스파 카리나", birth: "2000-04-11" },
  { category: "걸그룹", fullName: "에스파 지젤", birth: "2000-10-30" },
  { category: "걸그룹", fullName: "에스파 윈터", birth: "2001-01-01" },
  { category: "걸그룹", fullName: "에스파 닝닝", birth: "2002-10-23" },
  { category: "걸그룹", fullName: "르세라핌 김채원", birth: "2000-08-05" },
  { category: "걸그룹", fullName: "르세라핌 사쿠라", birth: "1998-04-19" },
  { category: "걸그룹", fullName: "르세라핌 허윤진", birth: "2001-10-08" },
  { category: "걸그룹", fullName: "르세라핌 카즈하", birth: "2003-08-09" },
  { category: "걸그룹", fullName: "르세라핌 홍은채", birth: "2006-11-10" },
  { category: "걸그룹", fullName: "블랙핑크 제니", birth: "1996-01-16" },
  { category: "걸그룹", fullName: "블랙핑크 지수", birth: "1995-01-03" },
  { category: "걸그룹", fullName: "블랙핑크 로제", birth: "1997-02-11" },
  { category: "걸그룹", fullName: "블랙핑크 리사", birth: "1997-03-27" },
  { category: "걸그룹", fullName: "트와이스 사나", birth: "1996-12-29" },
  { category: "걸그룹", fullName: "트와이스 나연", birth: "1995-09-22" },
  { category: "걸그룹", fullName: "트와이스 지효", birth: "1997-02-01" },
  { category: "걸그룹", fullName: "트와이스 모모", birth: "1996-11-09" },
  { category: "걸그룹", fullName: "트와이스 미나", birth: "1997-03-24" },
  { category: "걸그룹", fullName: "트와이스 다현", birth: "1998-05-28" },
  { category: "걸그룹", fullName: "트와이스 채영", birth: "1999-04-23" },
  { category: "걸그룹", fullName: "트와이스 쯔위", birth: "1999-06-14" },
  { category: "걸그룹", fullName: "(여자)아이들 미연", birth: "1997-01-20" },
  { category: "걸그룹", fullName: "(여자)아이들 소연", birth: "1998-08-26" },
  { category: "걸그룹", fullName: "(여자)아이들 우기", birth: "1999-09-23" },
  { category: "걸그룹", fullName: "(여자)아이들 민니", birth: "1997-10-23" },
  { category: "걸그룹", fullName: "(여자)아이들 슈화", birth: "2000-01-06" },
  { category: "걸그룹", fullName: "아일릿 민주", birth: "2004-05-11" },
  { category: "걸그룹", fullName: "아일릿 원희", birth: "2007-06-26" },
  { category: "걸그룹", fullName: "아일릿 모카", birth: "2004-10-08" },
  { category: "걸그룹", fullName: "아일릿 이로하", birth: "2008-02-04" },
  { category: "걸그룹", fullName: "키스오브라이프 나띠", birth: "2002-05-30" },
  { category: "걸그룹", fullName: "키스오브라이프 벨", birth: "2004-03-20" },
  { category: "걸그룹", fullName: "키스오브라이프 줄리", birth: "2000-03-29" },
  { category: "걸그룹", fullName: "키스오브라이프 하늘", birth: "2005-05-25" },
  { category: "걸그룹", fullName: "NMIXX 설윤", birth: "2004-01-26" },
  { category: "걸그룹", fullName: "NMIXX 해원", birth: "2003-02-25" },
  { category: "걸그룹", fullName: "NMIXX 릴리", birth: "2002-10-17" },
  { category: "걸그룹", fullName: "NMIXX 배이", birth: "2004-12-28" },
  { category: "걸그룹", fullName: "BABYMONSTER 아현", birth: "2007-04-11" },
  { category: "걸그룹", fullName: "BABYMONSTER 루카", birth: "2002-03-20" },
  { category: "걸그룹", fullName: "BABYMONSTER 아사", birth: "2006-04-17" },
  { category: "걸그룹", fullName: "BABYMONSTER 치키타", birth: "2009-02-17" },
  { category: "걸그룹", fullName: "MEOVV 엘라", birth: "2008-12-01" },
  { category: "걸그룹", fullName: "MEOVV 가원", birth: "2005-04-27" },
  { category: "걸그룹", fullName: "STAYC 시은", birth: "2001-08-01" },
  { category: "걸그룹", fullName: "STAYC 아이사", birth: "2002-01-23" },
  { category: "걸그룹", fullName: "QWER 쵸단", birth: "1998-11-01" },
  { category: "걸그룹", fullName: "QWER 마젠타", birth: "1997-06-02" },
  { category: "걸그룹", fullName: "QWER 히나", birth: "2001-01-30" },
  { category: "걸그룹", fullName: "QWER 시연", birth: "2000-05-16" },
  { category: "걸그룹", fullName: "RESCENE 원이", birth: "2004-05-25" },
  { category: "걸그룹", fullName: "RESCENE 리브", birth: "2006-10-11" },
  { category: "걸그룹", fullName: "RESCENE 미나미", birth: "2006-11-29" },
  { category: "걸그룹", fullName: "RESCENE 메이", birth: "2008-08-19" },
  { category: "걸그룹", fullName: "RESCENE 제나", birth: "2008-11-27" },
  { category: "보이그룹", fullName: "BTS 지민", birth: "1995-10-13" },
  { category: "보이그룹", fullName: "BTS 뷔", birth: "1995-12-30" },
  { category: "보이그룹", fullName: "BTS 정국", birth: "1997-09-01" },
  { category: "보이그룹", fullName: "BTS RM", birth: "1994-09-12" },
  { category: "보이그룹", fullName: "BTS 진", birth: "1992-12-04" },
  { category: "보이그룹", fullName: "BTS 슈가", birth: "1993-03-09" },
  { category: "보이그룹", fullName: "BTS 제이홉", birth: "1994-02-18" },
  { category: "보이그룹", fullName: "세븐틴 민규", birth: "1997-02-06" },
  { category: "보이그룹", fullName: "세븐틴 원우", birth: "1996-08-17" },
  { category: "보이그룹", fullName: "세븐틴 호시", birth: "1996-06-15" },
  { category: "보이그룹", fullName: "세븐틴 우지", birth: "1996-11-22" },
  { category: "보이그룹", fullName: "세븐틴 승관", birth: "1998-01-16" },
  { category: "보이그룹", fullName: "세븐틴 도겸", birth: "1997-02-18" },
  { category: "보이그룹", fullName: "NCT 재현", birth: "1997-02-13" },
  { category: "보이그룹", fullName: "NCT 태용", birth: "1995-07-01" },
  { category: "보이그룹", fullName: "NCT 마크", birth: "1999-08-02" },
  { category: "보이그룹", fullName: "NCT 해찬", birth: "2000-06-06" },
  { category: "보이그룹", fullName: "스트레이키즈 현진", birth: "2000-03-20" },
  { category: "보이그룹", fullName: "스트레이키즈 필릭스", birth: "2000-09-15" },
  { category: "보이그룹", fullName: "스트레이키즈 방찬", birth: "1997-10-03" },
  { category: "보이그룹", fullName: "스트레이키즈 리노", birth: "1998-10-25" },
  { category: "보이그룹", fullName: "스트레이키즈 창빈", birth: "1999-08-11" },
  { category: "보이그룹", fullName: "스트레이키즈 한", birth: "2000-09-14" },
  { category: "보이그룹", fullName: "스트레이키즈 승민", birth: "2000-09-22" },
  { category: "보이그룹", fullName: "스트레이키즈 아이엔", birth: "2001-02-08" },
  { category: "보이그룹", fullName: "투모로우바이투게더 연준", birth: "2002-09-13" },
  { category: "보이그룹", fullName: "투모로우바이투게더 수빈", birth: "2000-12-05" },
  { category: "보이그룹", fullName: "투모로우바이투게더 범규", birth: "2001-03-13" },
  { category: "보이그룹", fullName: "투모로우바이투게더 태현", birth: "2002-02-05" },
  { category: "보이그룹", fullName: "투모로우바이투게더 휴닝카이", birth: "2002-08-14" },
  { category: "보이그룹", fullName: "엔하이픈 정원", birth: "2004-02-09" },
  { category: "보이그룹", fullName: "엔하이픈 희승", birth: "2001-10-15" },
  { category: "보이그룹", fullName: "엔하이픈 제이", birth: "2002-04-20" },
  { category: "보이그룹", fullName: "엔하이픈 제이크", birth: "2002-11-15" },
  { category: "보이그룹", fullName: "엔하이픈 성훈", birth: "2002-12-08" },
  { category: "보이그룹", fullName: "엔하이픈 선우", birth: "2003-06-24" },
  { category: "보이그룹", fullName: "엔하이픈 니키", birth: "2005-12-09" },
  { category: "보이그룹", fullName: "아스트로 차은우", birth: "1997-03-30" },
  { category: "보이그룹", fullName: "제로베이스원 성한빈", birth: "2001-06-13" },
  { category: "보이그룹", fullName: "제로베이스원 김지웅", birth: "1998-12-14" },
  { category: "보이그룹", fullName: "제로베이스원 장하오", birth: "2000-07-25" },
  { category: "보이그룹", fullName: "제로베이스원 한유진", birth: "2007-03-20" },
  { category: "보이그룹", fullName: "RIIZE 원빈", birth: "2002-03-02" },
  { category: "보이그룹", fullName: "RIIZE 성찬", birth: "2001-09-13" },
  { category: "보이그룹", fullName: "RIIZE 쇼타로", birth: "2000-11-25" },
  { category: "보이그룹", fullName: "RIIZE 은석", birth: "2001-03-19" },
  { category: "보이그룹", fullName: "BOYNEXTDOOR 성호", birth: "2003-09-04" },
  { category: "보이그룹", fullName: "BOYNEXTDOOR 명재현", birth: "2003-04-04" },
  { category: "보이그룹", fullName: "BOYNEXTDOOR 운학", birth: "2006-11-29" },
  { category: "보이그룹", fullName: "TWS 신유", birth: "2003-11-07" },
  { category: "보이그룹", fullName: "TWS 도훈", birth: "2005-01-30" },
  { category: "보이그룹", fullName: "TWS 경민", birth: "2007-10-02" },
  { category: "가수·솔로", fullName: "아이유", birth: "1993-05-16", time: "1500" },
  { category: "가수·솔로", fullName: "태연", birth: "1989-03-09" },
  { category: "가수·솔로", fullName: "청하", birth: "1996-02-09" },
  { category: "가수·솔로", fullName: "이영지", birth: "2002-02-09" },
  { category: "가수·솔로", fullName: "비비", birth: "1997-11-26" },
  { category: "가수·솔로", fullName: "지코", birth: "1992-09-14" },
  { category: "가수·솔로", fullName: "정국", birth: "1997-09-01", artist: "BTS SOLO" },
  { category: "가수·솔로", fullName: "뷔", birth: "1995-12-30", artist: "BTS SOLO" },
  { category: "가수·솔로", fullName: "지민", birth: "1995-10-13", artist: "BTS SOLO" },
  { category: "가수·솔로", fullName: "RM", birth: "1994-09-12", artist: "BTS SOLO" },
  { category: "가수·솔로", fullName: "제니", birth: "1996-01-16", artist: "BLACKPINK SOLO" },
  { category: "가수·솔로", fullName: "리사", birth: "1997-03-27", artist: "BLACKPINK SOLO" },
  { category: "가수·솔로", fullName: "로제", birth: "1997-02-11", artist: "BLACKPINK SOLO" },
  { category: "가수·솔로", fullName: "지수", birth: "1995-01-03", artist: "BLACKPINK SOLO" },
  { category: "가수·솔로", fullName: "카리나", birth: "2000-04-11", artist: "aespa SOLO" },
  { category: "가수·솔로", fullName: "윈터", birth: "2001-01-01", artist: "aespa SOLO" },
  { category: "가수·솔로", fullName: "전소미", birth: "2001-03-09" },
  { category: "가수·솔로", fullName: "권은비", birth: "1995-09-27" },
  { category: "가수·솔로", fullName: "이채연", birth: "2000-01-11" },
  { category: "가수·솔로", fullName: "조유리", birth: "2001-10-22" },
  { category: "가수·솔로", fullName: "윤하", birth: "1988-04-29" },
  { category: "가수·솔로", fullName: "헤이즈", birth: "1991-08-09" },
  { category: "가수·솔로", fullName: "선미", birth: "1992-05-02" },
  { category: "가수·솔로", fullName: "화사", birth: "1995-07-23" },
  { category: "가수·솔로", fullName: "백현", birth: "1992-05-06" },
  { category: "가수·솔로", fullName: "카이", birth: "1994-01-14" },
  { category: "가수·솔로", fullName: "태민", birth: "1993-07-18" },
  { category: "가수·솔로", fullName: "강다니엘", birth: "1996-12-10" },
  { category: "가수·솔로", fullName: "박재범", birth: "1987-04-25" },
  { category: "가수·솔로", fullName: "크러쉬", birth: "1992-05-03" },
  { category: "가수·솔로", fullName: "10CM 권정열", birth: "1983-03-01", artist: "10CM" },
  { category: "가수·솔로", fullName: "임영웅", birth: "1991-06-16" },
  { category: "가수·솔로", fullName: "악뮤 이찬혁", birth: "1996-09-12", artist: "AKMU" },
  { category: "가수·솔로", fullName: "악뮤 이수현", birth: "1999-05-04", artist: "AKMU" },
  { category: "가수·솔로", fullName: "GD", birth: "1988-08-18", artist: "BIGBANG SOLO" },
  { category: "배우", fullName: "변우석", birth: "1994-04-27" },
  { category: "배우", fullName: "김수현", birth: "1988-02-04" },
  { category: "배우", fullName: "김지원", birth: "1992-09-22" },
  { category: "배우", fullName: "고윤정", birth: "1996-04-11" },
  { category: "배우", fullName: "박은빈", birth: "1992-09-04" },
  { category: "배우", fullName: "한소희", birth: "1994-11-18" },
  { category: "배우", fullName: "송강", birth: "1994-04-23" },
  { category: "배우", fullName: "박보검", birth: "1993-06-16" },
  { category: "배우", fullName: "김혜윤", birth: "2000-01-31" },
  { category: "배우", fullName: "공유", birth: "1979-07-10" },
  { category: "배우", fullName: "정해인", birth: "1988-05-01" },
  { category: "배우", fullName: "손석구", birth: "1983-11-12" },
  { category: "정치인", fullName: "윤석열", birth: "1960-12-18" },
  { category: "정치인", fullName: "문재인", birth: "1953-01-24" },
  { category: "정치인", fullName: "이재명", birth: "1964-12-22" },
  { category: "정치인", fullName: "한동훈", birth: "1973-06-23" },
  { category: "정치인", fullName: "도널드 트럼프", birth: "1946-06-14", time: "1054" },
  { category: "정치인", fullName: "조 바이든", birth: "1942-11-20" },
  { category: "정치인", fullName: "버락 오바마", birth: "1961-08-04", time: "1924" },
  { category: "정치인", fullName: "에마뉘엘 마크롱", birth: "1977-12-21" },
  { category: "정치인", fullName: "기시다 후미오", birth: "1957-07-29" },
  { category: "정치인", fullName: "나렌드라 모디", birth: "1950-09-17" },
  { category: "애니 캐릭터", fullName: "나루토 우즈마키", birth: "1987-10-10", artist: "나루토" },
  { category: "애니 캐릭터", fullName: "사스케 우치하", birth: "1988-07-23", artist: "나루토" },
  { category: "애니 캐릭터", fullName: "사쿠라 하루노", birth: "1988-03-28", artist: "나루토" },
  { category: "애니 캐릭터", fullName: "루피", birth: "1997-05-05", artist: "원피스" },
  { category: "애니 캐릭터", fullName: "조로", birth: "1998-11-11", artist: "원피스" },
  { category: "애니 캐릭터", fullName: "나미", birth: "1998-07-03", artist: "원피스" },
  { category: "애니 캐릭터", fullName: "상디", birth: "1998-03-02", artist: "원피스" },
  { category: "애니 캐릭터", fullName: "로빈", birth: "1992-02-06", artist: "원피스" },
  { category: "애니 캐릭터", fullName: "고죠 사토루", birth: "1989-12-07", artist: "주술회전" },
  { category: "애니 캐릭터", fullName: "후시구로 메구미", birth: "2002-12-22", artist: "주술회전" },
  { category: "애니 캐릭터", fullName: "쿠기사키 노바라", birth: "2002-08-07", artist: "주술회전" },
  { category: "애니 캐릭터", fullName: "이타도리 유지", birth: "2003-03-20", artist: "주술회전" },
  { category: "애니 캐릭터", fullName: "손오공", birth: "1984-04-16", artist: "드래곤볼" },
  { category: "애니 캐릭터", fullName: "치치", birth: "1984-05-12", artist: "드래곤볼" },
  { category: "애니 캐릭터", fullName: "베지터", birth: "1984-08-14", artist: "드래곤볼" },
  { category: "애니 캐릭터", fullName: "미사카 미코토", birth: "1992-05-02", artist: "어떤 과학의 초전자포" },
  { category: "애니 캐릭터", fullName: "아스나", birth: "2007-09-30", artist: "소드 아트 온라인" },
  { category: "애니 캐릭터", fullName: "키리토", birth: "2008-10-07", artist: "소드 아트 온라인" },
  { category: "애니 캐릭터", fullName: "이누야샤", birth: "1981-11-03", artist: "이누야샤" },
  { category: "애니 캐릭터", fullName: "하울", birth: "1986-06-13", artist: "하울의 움직이는 성" },
  { category: "애니 캐릭터", fullName: "치히로", birth: "1999-08-11", artist: "센과 치히로의 행방불명" },
  { category: "애니 캐릭터", fullName: "탄지로", birth: "2001-07-14", artist: "귀멸의 칼날" },
  { category: "애니 캐릭터", fullName: "네즈코", birth: "2003-12-28", artist: "귀멸의 칼날" },
  { category: "애니 캐릭터", fullName: "카나오 츠유리", birth: "2001-05-19", artist: "귀멸의 칼날" },
  { category: "애니 캐릭터", fullName: "렌고쿠", birth: "1994-05-10", artist: "귀멸의 칼날" },
  { category: "애니 캐릭터", fullName: "요르 포저", birth: "1993-04-06", artist: "SPY×FAMILY" },
  { category: "애니 캐릭터", fullName: "로이드 포저", birth: "1989-11-11", artist: "SPY×FAMILY" },
  { category: "애니 캐릭터", fullName: "아냐 포저", birth: "2016-10-01", artist: "SPY×FAMILY" },
];

export const destinyBiasCelebrityPresets: DestinyBiasCelebrityPreset[] = rawCelebrityPresets.map((item, index) => {
  const nameParts = splitCelebrityName(item.fullName, item.category);
  const birthDateInput = normalizeBirthDateInput(item.birth);
  const birthTimeInput = normalizeBirthTimeInput(item.time);
  const artist = String(item.artist || nameParts.artist || "").trim();
  const name = String(nameParts.name || item.fullName).trim();
  const searchParts = [item.fullName, name, artist, item.category, birthDateInput];

  return {
    id: `bias-celeb-${index + 1}`,
    category: item.category,
    name,
    artist,
    birthDateInput,
    birthTimeInput,
    timeKnown: birthTimeInput.length === 4,
    sourceLabel: item.fullName,
    searchText: searchParts.join(" ").toLowerCase(),
  };
});