// 텍스트 리더용 스토리 데이터 로더.
//
// 본문은 scripts/build-story-text.mjs 가 public/codedestiny-novel.html 에서 추출한
// episodes.generated.json 을 그대로 읽는다(파생물, 손으로 고치지 말 것).
// 아래의 로그라인·아크 구성·화자 표시명만 사람이 관리한다.
//
// 로그라인은 lib/stories/chapters/* 의 산문 초고를 편집자가 읽고 한두 줄로 압축한 것이다.
// 산문판과 VN 판은 같은 이야기의 다른 판본이므로 둘 다 색인하면 자기중복이 된다.
// 산문판은 여기 요약의 집필 소스로만 쓰고, 색인 대상은 VN 정본 하나로 둔다.
import generated from "./episodes.generated.json";

export interface StoryBeat {
  s: string;
  t: string;
  sceneBreak?: boolean;
  im?: string;
  skill?: { el?: string; unit?: string; name?: string; han?: string };
}

export interface StoryEpisode {
  no: string;
  slug: string;
  title: string;
  tag: string;
  beats: StoryBeat[];
}

const payload = generated as { version: number; sourceHash: string; episodes: StoryEpisode[] };

export const STORY_EPISODES: StoryEpisode[] = payload.episodes;
export const STORY_SOURCE_HASH = payload.sourceHash;

/** VN 원본(NAME 맵)과 동일한 화자 표시명. 나레이션과 시스템 문구는 이름을 붙이지 않는다. */
export const STORY_SPEAKERS: Record<string, string> = {
  n: "",
  sys: "",
  yeon: "연이",
  neo: "네오",
  mu: "무성",
  geo: "거울 속 연이",
  moka: "모카",
  crow: "까마귀",
  luna: "루나블룸",
  ln: "루나",
  lns: "루나 언니",
  rab: "청토끼",
  baek: "백문",
  pje: "서한비",
  god: "운명의 신",
};

export interface StoryArc {
  key: string;
  title: string;
  summary: string;
  from: number;
  to: number;
}

/**
 * 7부 아크. 경계는 VN 원본의 배경 전환과 사주 십성(비겁·식상·재성·인성) 구조를 따른다.
 * 아크별로 별도 URL 을 만들지 않는다 — 허브 안의 섹션으로 충분하고, URL 만 늘리면
 * 정확히 이번 AdSense 거절의 패턴을 반복하게 된다.
 */
export const STORY_ARCS: StoryArc[] = [
  {
    key: "bigyeop",
    title: "1부 · 비겁의 섬",
    summary:
      "평범한 회사원 연이가 정체 모를 앱을 깔고 꽃돼지의 몸으로 운세 세계에 떨어진다. 자기 자신과 같은 기운을 가진 존재들이 모인 첫 섬에서, 연이는 스스로를 어떻게 부를지부터 다시 배운다.",
    from: 0,
    to: 6,
  },
  {
    key: "siksang",
    title: "2부 · 식상의 섬",
    summary:
      "먹고 만들고 표현하는 섬. 재능이 곧 통화가 되는 곳에서 연이는 처음으로 무대에 선다. 무엇을 잘하는지보다 무엇을 나눌 수 있는지가 묻는 자리다.",
    from: 7,
    to: 14,
  },
  {
    key: "jaeseong",
    title: "3부 · 재성의 섬",
    summary:
      "강을 건너면 황금 냄새가 나는 섬. 청토끼 금융그룹과 회중시계가 등장하며, 가진 것과 지켜야 할 것 사이에서 처음으로 큰 선택을 하게 된다.",
    from: 15,
    to: 18,
  },
  {
    key: "inseong",
    title: "4부 · 인성의 도서관",
    summary:
      "책들이 숨 쉬는 곳에서 연이는 자신의 명식을 이루는 네 번째 기둥과 마주한다. 사서 백문의 오래된 상처가 드러나며, 이야기는 개인의 성장에서 관계의 내력으로 넘어간다.",
    from: 19,
    to: 23,
  },
  {
    key: "gyeyak",
    title: "5부 · 계약의 끝과 귀환",
    summary:
      "원본 계약서가 열리고 재성의 발톱이 드러난다. 모든 기둥이 제자리를 찾은 뒤 연이는 돌아가는 문 앞에 서지만, 현실로 돌아온 계절은 떠날 때와 같지 않다.",
    from: 24,
    to: 30,
  },
  {
    key: "jamidusu",
    title: "6부 · 자미두수, 별들의 궁",
    summary:
      "두 번째 부름은 별들의 궁으로 이어진다. 검은 깃털의 주인이 밝혀지고, 그릇과 이름을 둘러싼 이야기가 자미두수 열두 궁의 구조 위에서 펼쳐진다.",
    from: 31,
    to: 34,
  },
  {
    key: "sukuyo",
    title: "7부 · 숙요, 붉은 실 · 결말",
    summary:
      "붉은 실의 세계에서 서한비와 박병하라는 두 이름이 드러난다. 끊을 수 없는 실과 붙잡힌 파수꾼, 그리고 운명의 신 앞에서 연이는 읽는 쪽이 아니라 쓰는 쪽에 선다.",
    from: 35,
    to: 43,
  },
];

/** 화별 로그라인. 산문 초고를 읽고 편집자가 한 줄로 압축했다. */
export const STORY_LOGLINES: Record<string, string> = {
  prologue: "알람 세 개를 다 끄고도 일어나지 못하는 아침, 깔린 적 없는 앱 하나가 화면에 떠 있다.",
  "ep-01": "눈을 뜨니 몸이 꽃돼지다. 말은 통하는데 아무도 연이를 사람으로 보지 않는다.",
  "ep-02": "갈기 달린 고양이를 자처하는 네오가 나타나 다짜고짜 이곳의 규칙을 설명하기 시작한다.",
  "ep-03": "본체 인증에 실패한다. 돌아갈 방법을 찾으려면 자신의 명식부터 증명해야 한다.",
  "ep-04": "해수의 심연에서 연이는 자기 안의 물 기운과 처음으로 정면으로 마주한다.",
  "ep-05": "같은 기운을 가진 존재가 늘 같은 편은 아니라는 것을 배운다.",
  "ep-06": "거울 너머의 또 다른 연이가 묻는다. 너는 네가 누구인지 알고 있느냐고.",
  "ep-07": "먹고 노는 섬에 도착한다. 여기서는 재능이 곧 화폐다.",
  "ep-08": "노바 전야제. 무대에 서기 전날 밤, 연이는 자신이 무엇을 보여 줄 수 있는지 헤아려 본다.",
  "ep-09": "검은 깃털이 처음 등장한다. 누구의 것인지는 아직 아무도 모른다.",
  "ep-10": "데뷔전. 준비한 것과 실제로 통하는 것이 다르다는 걸 무대 위에서 알게 된다.",
  "ep-11": "재능을 먹고 자라는 그림자가 섬을 돌아다닌다.",
  "ep-12": "첫 줄의 무대에 서기까지, 연이는 자신의 표현이 어디서 오는지 되짚는다.",
  "ep-13": "맛있는 작별. 식상의 섬을 떠나는 자리에서 모카가 마지막 접시를 내온다.",
  "ep-14": "숨을 세는 법을 배운다. 급할수록 호흡부터 고르라는, 이 세계에서 가장 오래된 조언.",
  "ep-15": "강 건너에서 황금 냄새가 난다. 재성의 섬이 시작된다.",
  "ep-16": "탄 빵의 냄새. 잘못 구운 것 하나가 무엇을 무너뜨리는지 보게 된다.",
  "ep-17": "청토끼 금융그룹의 문이 열린다. 이 섬의 규칙은 계약서로 쓰여 있다.",
  "ep-18": "회중시계가 열릴 때, 빌린 시간과 자기 시간의 경계가 드러난다.",
  "ep-19": "책들이 숨 쉬는 곳. 인성의 도서관에 들어선다.",
  "ep-20": "본뜻의 서가에서 연이는 자신이 읽어 온 문장들의 원래 의미를 마주한다.",
  "ep-21": "기억의 열람실. 잊었다고 믿었던 장면이 그대로 꽂혀 있다.",
  "ep-22": "네 번째 기둥이 모습을 드러낸다. 명식이 비로소 완성된다.",
  "ep-23": "사서 백문의 오래된 상처가 드러나고, 이야기는 개인에서 관계로 넘어간다.",
  "ep-24": "원본 계약서가 열린다. 누가 무엇을 걸었는지가 처음으로 명확해진다.",
  "ep-25": "재성의 발톱. 가진 것을 지키려는 힘이 어디까지 갈 수 있는지 본다.",
  "ep-26": "모든 기둥이 제자리에 놓인다. 연이는 자신의 이름을 다시 부른다.",
  "ep-27": "갓 구운 아침. 길었던 밤이 끝나고 처음으로 편안한 식탁에 앉는다.",
  "ep-28": "돌아가는 문 앞에 선다. 여기서 나가면 무엇이 남는지 알면서도 손을 뻗는다.",
  "ep-29": "달라진 계절. 현실로 돌아왔지만 떠날 때와 같은 자리가 아니다.",
  "ep-30": "앱이 다시 울린 밤. 끝난 줄 알았던 이야기가 두 번째 장을 연다.",
  "ep-31": "별들의 궁. 자미두수 열두 궁의 구조 위에서 새로운 무대가 펼쳐진다.",
  "ep-32": "검은 깃털의 주인이 밝혀진다.",
  "ep-33": "그릇. 무엇을 담을 수 있는가가 무엇을 가졌는가보다 먼저 묻힌다.",
  "ep-34": "이름을 돌려주다. 빼앗겼던 것과 스스로 내려놓았던 것을 구분하게 된다.",
  "ep-35": "붉은 실의 세계. 숙요 27수가 관계의 지도를 펼친다.",
  "ep-36": "서한비. 실의 저쪽 끝에 있던 이름 하나가 불린다.",
  "ep-37": "박병하. 또 하나의 이름이 드러나며 두 세계가 겹쳐진다.",
  "ep-38": "끊을 수 없는 실. 끊는 것과 놓는 것이 같지 않다는 걸 알게 된다.",
  "ep-39": "붙잡힌 파수꾼. 지키려던 사람이 가장 오래 갇혀 있었다.",
  "ep-40": "운명의 신 앞에 선다. 묻는 쪽과 답하는 쪽이 뒤바뀐다.",
  "ep-41": "사랑의 힘. 이 세계에서 가장 계산되지 않는 변수가 움직인다.",
  "ep-42": "최종화. 읽는 이름에서 쓰는 운명으로, 연이가 마지막 문장을 직접 적는다.",
  "ep-43": "벚꽃 강가의 약속. 모든 것이 끝난 자리에서 새로 시작되는 계절.",
};

export function getEpisodeBySlug(slug: string): StoryEpisode | null {
  const key = String(slug || "").trim().toLowerCase();
  return STORY_EPISODES.find((episode) => episode.slug === key) || null;
}

export function getEpisodeIndex(slug: string): number {
  return STORY_EPISODES.findIndex((episode) => episode.slug === String(slug || "").trim().toLowerCase());
}

export function getArcForIndex(index: number): StoryArc | null {
  return STORY_ARCS.find((arc) => index >= arc.from && index <= arc.to) || null;
}

export function countKorean(episode: StoryEpisode): number {
  return episode.beats.reduce((sum, beat) => sum + (beat.t.match(/[가-힣]/g) || []).length, 0);
}

/** 420자를 1분으로 잡은 대략의 읽는 시간(분). */
export function readingMinutes(episode: StoryEpisode): number {
  return Math.max(1, Math.round(countKorean(episode) / 420));
}

/** 아크별로 관련 점술 가이드를 하나씩 연결한다(고아 가이드에 주제 관련 인바운드 공급). */
export const ARC_GUIDE_LINKS: Record<string, { href: string; label: string }> = {
  bigyeop: { href: "/saju/ten-gods/", label: "십성 해석 가이드" },
  siksang: { href: "/saju/ten-gods/", label: "십성 해석 가이드" },
  jaeseong: { href: "/saju/five-elements/", label: "오행과 균형 가이드" },
  inseong: { href: "/saju/guide/", label: "사주 명리학 기본 가이드" },
  gyeyak: { href: "/saju/guide/", label: "사주 명리학 기본 가이드" },
  jamidusu: { href: "/ziwei/guide/", label: "자미두수 명반 읽는 법" },
  sukuyo: { href: "/sukuyo/guide/", label: "숙요 27숙과 궁합 구조" },
};
