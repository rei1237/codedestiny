import type {
  ChapterNav,
  IChapter,
  IStory,
  SceneFixCheck,
  SceneFixInput,
  SceneFixOutput,
  SceneRevisionRecord,
  StoryAct,
  StoryGenre,
} from "./types";
export { estimateReadingMinutes, formatStoryCount } from "./metrics";

const STORY_DATA_TEXT_TRANSLATIONS = {
  ko: {
    "story.description.001": "달빛이 머무는 밤, 별의 결을 따라 운명의 문장이 조용히 열립니다.",
    "story.title.001": "제58화. 별을 훔치는 사냥꾼",
    "story.title.002": "제59화. 별 없는 왕좌",
    "story.title.003": "제60화. 왕좌에서 내려온 자",
    "story.title.004": "제61화 읽히지 않는 이름",
    "story.title.005": "프롤로그. 이상한 앱이 깔렸다",
    "story.title.006": "제1화. 꽃돼지가 되었다",
    "story.title.007": "제2화. 갈기 있는 고양이? 네오",
    "story.title.008": "제3화. 본체 인증 실패",
    "story.title.009": "제4화. 해수의 심연",
    "story.title.010": "제5화. 같은 나의 편",
    "story.title.011": "제6화. 내가 나를 버리지 않는 법",
    "story.title.012": "제7화. 먹고 노는 섬",
    "story.title.013": "제8화. 노바 스테이지 전야제",
    "story.title.014": "제9화. 검은 깃털",
    "story.title.015": "제10화. 꽃돼지 아이돌 데뷔전",
    "story.title.016": "제11화. 편인도식",
    "story.title.017": "제12화. 첫 줄의 무대",
    "story.title.018": "제13화. 맛있는 작별 인사",
    "story.title.019": "제14화. 인성의 섬, 다음 줄이 태어나는 곳",
    "story.title.020": "제15화. 기억 도서관",
    "story.title.021": "제16화. 너무 친절한 사서",
    "story.title.022": "제17화. 해석을 바꾸는 자",
    "story.title.023": "제18화. 첫 울림과 메모",
    "story.title.024": "제19화. 본뜻을 되찾는 법",
    "story.title.025": "제20화. 다시 읽는 마음",
    "story.title.026": "제21화. 아직 쓰는 중인 이름",
    "story.title.027": "제22화. 사주 명리학의 힘을 깨우는 법",
    "story.title.028": "제23화. 청토끼 금융그룹",
    "story.title.029": "제24화. 경매장에 걸린 토끼",
    "story.title.030": "제25화. 선택의 가격",
    "story.title.031": "제26화. 흰 사자의 발톱",
    "story.title.032": "제27화. 계약의 우리",
    "story.title.033": "제28화. 담보가 되지 않는 것",
    "story.title.034": "제29화. 글자는 따로 빛나지 않는다",
    "story.title.035": "제30화. 원본 계약서",
    "story.title.036": "제31화. 마지막 기둥, 신미",
    "story.title.037": "제32화. 년주의 기억",
    "story.title.038": "제33화. 현실의 아침, 운세 세계의 알림",
    "story.title.039": "제34화. 오늘의 운세 제작진",
    "story.title.040": "제35화. 흰 고양이가 말을 걸었다",
    "story.title.041": "제36화. 운은 쓰는 것이다",
    "story.title.042": "제37화. 오후 세 시 십칠분의 예언",
    "story.title.043": "제38화. 다른 운명의 상대",
    "story.title.044": "제39화. 인생 최초 최대 학점",
    "story.title.045": "제40화. 별자리 운세가 이상하다",
    "story.title.046": "제41화. 별을 읽는 법",
    "story.title.047": "제42화. 별의 이름을 돌려줘",
    "story.title.048": "제43화. 회중시계를 준 자",
    "story.title.049": "제44화. 별빛이 너무 세거나 너무 약한 날",
    "story.title.050": "제45화. 태양이 중심을 잃은 날",
    "story.title.051": "제46화. 달빛이 약해진 날",
    "story.title.052": "제47화. 별의 궁전으로 가는 준비",
    "story.title.053": "제48화. 별빛 계단의 첫 번째 고장",
    "story.title.054": "제49화. 태양과 달 사이에서",
    "story.title.055": "제50화. 말이 너무 많은 방",
    "story.title.056": "제51화. 검은 관측자",
    "story.title.057": "제52화. 별궁의 문지기",
    "story.title.058": "제53화. 불타는 관록궁",
    "story.title.059": "제54화. 별 없는 왕",
    "story.title.060": "제55화. 별 없는 문",
    "story.title.061": "제56화. 흑천의의 옷자락",
    "story.title.062": "제57화. 타락의 씨앗",
    "story.label.001": "목적 1개 제시",
    "story.label.002": "오해/지연/파장 1개 이상 반영",
    "story.label.003": "다음 장면 훅 보존",
    "story.label.004": "7단계 구조 정합성",
    "story.label.005": "해설보다 사건 중심 규칙 적용",
    "story.label.006": "캐릭터 톤 규칙 적용",
    "story.label.007": "네오 정체 확정 공개 비권장",
    "story.label.008": "무성 동기=돈 단일화 금지",
  },
} as const;

function storyDataText(key: keyof typeof STORY_DATA_TEXT_TRANSLATIONS.ko) {
  return STORY_DATA_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

import { codeDestinyPrologue } from "./chapters/prologue";
import { nc1 } from "./chapters/chapter-01";
import { nc2 } from "./chapters/chapter-02";
import { nc3 } from "./chapters/chapter-03";
import { nc4 } from "./chapters/chapter-04";
import { nc5 } from "./chapters/chapter-05";
import { nc6 } from "./chapters/chapter-06";
import { nc7 } from "./chapters/chapter-07";
import { nc8 } from "./chapters/chapter-08";
import { nc9 } from "./chapters/chapter-09";
import { nc10 } from "./chapters/chapter-10";
import { nc11 } from "./chapters/chapter-11";
import { nc12 } from "./chapters/chapter-12";
import storyOverridesJson from "./overrides.generated.json";
const baseStories: Array<IStory | IChapter> = [
  {
    _id: "story-code-destiny",
    title: "Code Destiny",
    slug: "code-destiny",
    description: storyDataText("story.description.001"),
    genre: [],
    tags: [],
    author: "Code Destiny",
    status: "ongoing",
    totalChapters: 12,
    viewCount: 49317,
    likeCount: 0,
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
  },
]

const baseChapters: IChapter[] = [
  {
    _id: "code-destiny-prologue",
    storyId: "story-code-destiny",
    slug: "prologue",
    chapterNumber: 0,
    title: "프롤로그. 이상한 앱이 깔렸다",
    content: codeDestinyPrologue,
    wordCount: codeDestinyPrologue.replace(/\s+/g, "").length,
    viewCount: 0,
    publishedAt: "2026-06-20T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
  },
  {
    _id: "code-destiny-chapter-1",
    storyId: "story-code-destiny",
    slug: "chapter-1",
    chapterNumber: 1,
    title: "제1화. 꽃돼지가 되었다",
    content: nc1,
    wordCount: nc1.replace(/\s+/g, "").length,
    viewCount: 0,
    publishedAt: "2026-06-20T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
  },
  {
    _id: "code-destiny-chapter-2",
    storyId: "story-code-destiny",
    slug: "chapter-2",
    chapterNumber: 2,
    title: "제2화. 갈기 있는 사자, 네오",
    content: nc2,
    wordCount: nc2.replace(/\s+/g, "").length,
    viewCount: 0,
    publishedAt: "2026-06-20T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
  },
  {
    _id: "code-destiny-chapter-3",
    storyId: "story-code-destiny",
    slug: "chapter-3",
    chapterNumber: 3,
    title: "제3화. 거울 속의 나",
    content: nc3,
    wordCount: nc3.replace(/\s+/g, "").length,
    viewCount: 0,
    publishedAt: "2026-06-20T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
  },
  {
    _id: "code-destiny-chapter-4",
    storyId: "story-code-destiny",
    slug: "chapter-4",
    chapterNumber: 4,
    title: "제4화. 해수의 심연",
    content: nc4,
    wordCount: nc4.replace(/\s+/g, "").length,
    viewCount: 0,
    publishedAt: "2026-06-20T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
  },
  {
    _id: "code-destiny-chapter-5",
    storyId: "story-code-destiny",
    slug: "chapter-5",
    chapterNumber: 5,
    title: "제5화. 운은 읽는 것",
    content: nc5,
    wordCount: nc5.replace(/\s+/g, "").length,
    viewCount: 0,
    publishedAt: "2026-06-20T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
  },
  {
    _id: "code-destiny-chapter-6",
    storyId: "story-code-destiny",
    slug: "chapter-6",
    chapterNumber: 6,
    title: "제6화. 첫 조각의 무게",
    content: nc6,
    wordCount: nc6.replace(/\s+/g, "").length,
    viewCount: 0,
    publishedAt: "2026-06-20T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
  },
  {
    _id: "code-destiny-chapter-7",
    storyId: "story-code-destiny",
    slug: "chapter-7",
    chapterNumber: 7,
    title: "제7화. 첫 조각의 무게",
    content: nc7,
    wordCount: nc7.replace(/\s+/g, "").length,
    viewCount: 0,
    publishedAt: "2026-06-20T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
  },
  {
    _id: "code-destiny-chapter-8",
    storyId: "story-code-destiny",
    slug: "chapter-8",
    chapterNumber: 8,
    title: "제8화. 노바 스테이지 전야",
    content: nc8,
    wordCount: nc8.replace(/\s+/g, "").length,
    viewCount: 0,
    publishedAt: "2026-06-20T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
  },
  {
    _id: "code-destiny-chapter-9",
    storyId: "story-code-destiny",
    slug: "chapter-9",
    chapterNumber: 9,
    title: "제9화. 수달, 모카",
    content: nc9,
    wordCount: nc9.replace(/\s+/g, "").length,
    viewCount: 0,
    publishedAt: "2026-06-20T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
  },
  {
    _id: "code-destiny-chapter-10",
    storyId: "story-code-destiny",
    slug: "chapter-10",
    chapterNumber: 10,
    title: "제10화. 편인도식",
    content: nc10,
    wordCount: nc10.replace(/\s+/g, "").length,
    viewCount: 0,
    publishedAt: "2026-06-20T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
  },
  {
    _id: "code-destiny-chapter-11",
    storyId: "story-code-destiny",
    slug: "chapter-11",
    chapterNumber: 11,
    title: "제11화. 첫 줄의 무대",
    content: nc11,
    wordCount: nc11.replace(/\s+/g, "").length,
    viewCount: 0,
    publishedAt: "2026-06-20T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
  },
  {
    _id: "code-destiny-chapter-12",
    storyId: "story-code-destiny",
    slug: "chapter-12",
    chapterNumber: 12,
    title: "제12화. 인성의 섬",
    content: nc12,
    wordCount: nc12.replace(/\s+/g, "").length,
    viewCount: 0,
    publishedAt: "2026-06-20T00:00:00.000Z",
    createdAt: "2026-06-20T00:00:00.000Z",
  },
]

// 관리자(꽃 admin)에서 발행한 수정본을 빌드 시 베이스 시드 위에 병합한다.
// scripts/fetch-content-overrides.mjs가 overrides.generated.json을 갱신한다(기본값은 빈 객체).
type StoryOverrideFields = { title?: string; description?: string };
type ChapterOverrideFields = { title?: string; content?: string };

const storyOverrides: Record<string, StoryOverrideFields> =
  (storyOverridesJson as { stories?: Record<string, StoryOverrideFields> }).stories ?? {};
const chapterOverrides: Record<string, ChapterOverrideFields> =
  (storyOverridesJson as { chapters?: Record<string, ChapterOverrideFields> }).chapters ?? {};

export const mockStories: Array<IStory | IChapter> = baseStories.map((story) => {
  if ("storyId" in story) return story;
  const override = storyOverrides[(story as IStory).slug];
  if (!override) return story;
  return {
    ...story,
    title: override.title || story.title,
    description: override.description || (story as IStory).description,
  };
});

export const mockChapters: IChapter[] = baseChapters.map((chapter) => {
  const override = chapterOverrides[chapter._id];
  if (!override) return chapter;
  const content = override.content || chapter.content;
  return {
    ...chapter,
    title: override.title || chapter.title,
    content,
    wordCount: content.replace(/\s+/g, "").length,
  };
});

function isStoryRecord(story: IStory | IChapter): story is IStory {
  const candidate = story as unknown as Record<string, unknown>;
  return (
    typeof candidate._id === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    Array.isArray(candidate.genre) &&
    Array.isArray(candidate.tags) &&
    typeof candidate.totalChapters === "number" &&
    !("storyId" in candidate)
  );
}

export function getStories(genre?: string) {
  const stories = mockStories.filter(isStoryRecord);
  if (!genre || genre === "전체") return stories;
  return stories.filter((story) => story.genre.includes(genre as StoryGenre));
}

export function getStoryById(storyId: string) {
  return getStories().find((story) => story.slug === storyId || story._id === storyId) || null;
}

export function getChaptersByStoryId(storyId: string) {
  const story = getStoryById(storyId);
  if (!story) return [];
  return mockChapters
    .filter((chapter) => chapter.storyId === story._id)
    .sort((a, b) => a.chapterNumber - b.chapterNumber);
}

export function getChapter(storyId: string, chapterId: string) {
  return getChaptersByStoryId(storyId).find((chapter) => chapter.slug === chapterId || chapter._id === chapterId) || null;
}

export function getChapterNavigation(storyId: string, chapterId: string): { prev: ChapterNav | null; next: ChapterNav | null } {
  const story = getStoryById(storyId);
  const chapters = getChaptersByStoryId(storyId);
  const index = chapters.findIndex((chapter) => chapter.slug === chapterId || chapter._id === chapterId);
  const toNav = (chapter: IChapter | undefined): ChapterNav | null => {
    if (!story || !chapter) return null;
    return {
      storyId: story.slug,
      chapterId: chapter.slug,
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      href: `/stories/${story.slug}/${chapter.slug}`,
    };
  };

  return {
    prev: toNav(chapters[index - 1]),
    next: toNav(chapters[index + 1]),
  };
}

export function getFirstChapterHref(storyId: string) {
  const story = getStoryById(storyId);
  const first = getChaptersByStoryId(storyId)[0];
  return story && first ? `/stories/${story.slug}/${first.slug}` : "/stories";
}

const CODE_DESTINY_ACT_RULES: Array<{ act: StoryAct; startChapter: number; endChapter: number; focus: string }> = [
  {
    act: "1막",
    startChapter: 1,
    endChapter: 9,
    focus: "무성의 간접 악역성 강화, 청토끼 타락 증빙 정리.",
  },
  {
    act: "2막",
    startChapter: 10,
    endChapter: 18,
    focus: "별 소등 시험에서 동료 능력 상실과 연이 조율 성장 라인 고정.",
  },
  {
    act: "3막",
    startChapter: 19,
    endChapter: 27,
    focus: "네오 정체는 단편 단서로만 노출, 조각 공개를 유지.",
  },
  {
    act: "4막",
    startChapter: 28,
    endChapter: 36,
    focus: "자미성 침투 구간에서 팀 결속형 위기 구조 강화.",
  },
  {
    act: "5막",
    startChapter: 37,
    endChapter: 100,
    focus: "‘검은 비 속 남자 실루엣’(박병하의 잃어버린 인간 시절)과 무성(묘아의 그릇)의 정체를 단계적으로 공개하고, 검은 호랑이 묘아의 뒤틀린 연모·집착을 완결까지 회수. 100화 완결.",
  },
];

const CODE_DESTINY_TEXT_PATTERNS = {
  misconception: /오해|착각|잘못\.|착각해서|오독|해석을 잘못/i,
  delay: /잠깐|잠시|기다|연기|미루|늦|지연|보류/i,
  fallout: /파장|후유|연쇄|대가|결과|부메랑|돌아가|반작용/i,
  hook: /다음|곧|이제|이어|바로|문 앞|뒤이어|막이|문이 열/,
  purpose: /목적|목표|결심|결정|약속|지켜|사명|해결|복구|기록|확인/i,
  worldRuleLeak: /해설|분석|설명문|결론은|결국은|요약해서/i,
  neoEmotion: /네오.*울고|네오.*울부짓|네오.*눈물을|네오.*비명을|네오.*폭발|네오.*포효/i,
  neoProtectiveAction: /네오.*막|네오.*지키|네오.*보호|네오.*방어|네오.*회수/i,
  muSongMoneyCore: /무성.*돈.*(목표|이유|전부|유일|최우선|목표가|동기)|무성.*돈을/i,
  neoIdentityLeak: /(네오의 정체|네오 정체|정체를 드러|네오가 자기|네오가 진짜|네오 이름이|네오의 이름은|네오의 신분)/i,
};

function pickStoryAct(chapterNumber: number): StoryAct {
  if (chapterNumber <= 9) return "1막";
  if (chapterNumber <= 18) return "2막";
  if (chapterNumber <= 27) return "3막";
  if (chapterNumber <= 36) return "4막";
  return "5막";
}

function getActGuide(chapterNumber: number): string {
  const act = pickStoryAct(chapterNumber);
  return (
    CODE_DESTINY_ACT_RULES.find((entry) => entry.act === act)?.focus ??
    "막 정합성 가이드를 불러오지 못했으므로 공통 플롯 룰을 적용."
  );
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function createSceneFixInput(chapter: IChapter): SceneFixInput {
  const body = chapter.content;
  const normalized = normalizeText(body);
  const hook = CODE_DESTINY_TEXT_PATTERNS.hook.exec(normalized);
  return {
    targetScene: chapter.title,
    currentProblem:
      CODE_DESTINY_TEXT_PATTERNS.neoIdentityLeak.test(normalized) || CODE_DESTINY_TEXT_PATTERNS.muSongMoneyCore.test(normalized)
        ? "현재 장면에서 금칙 동작 또는 해석형 문장 밀도가 높아 1차 축소 필요."
        : "7단계 구간(상태·자극·반응·훅)의 정합도 점검 필요.",
    causalLink: "이전 장면 결과의 파국/완충 여부를 관찰해 동기-행동-결과로 귀결되도록 조정.",
    targetTone: "연이는 선행 동작으로 말보다 행동이 앞서고, 네오는 건조한 보호 톤, 무성은 감정 도약을 최소화.",
    misunderstanding: CODE_DESTINY_TEXT_PATTERNS.misconception.test(normalized)
      ? "오해 지점이 현재 텍스트에 존재함."
      : "오해 장치가 약해 대체 지연 장치가 필요할 가능성 있음.",
    delay: CODE_DESTINY_TEXT_PATTERNS.delay.test(normalized)
      ? "지연 신호가 확인되어 다음 장면 유예 장치를 자연스럽게 이어갈 수 있음."
      : "지연 장치가 약함. 반응-결과 사이에 1개 지연 축을 추가 권장.",
    fallout: CODE_DESTINY_TEXT_PATTERNS.fallout.test(normalized)
      ? "파장 또는 반작용 신호가 검출됨."
      : "파장 신호가 약해 사건 후유 장치를 보강할 여지 있음.",
    nextHook: hook ? hook[0] : "다음 절차로 넘어가는 장면 단서를 명시(문장 말미 훅) 추가.",
    forbiddenChecks: [
      "네오 정체 전체 공개 금지",
      "무성=돈 단일 동기 고정 금지",
      "주석식 용어/기술문장 비중 과다 금지",
    ],
  };
}

function buildSceneFixOutput(chapter: IChapter): SceneFixOutput {
  const body = normalizeText(chapter.content);
  const checks: SceneFixCheck[] = [
    {
      key: "purpose",
      label: storyDataText("story.label.001"),
      pass: CODE_DESTINY_TEXT_PATTERNS.purpose.test(body),
      memo: CODE_DESTINY_TEXT_PATTERNS.purpose.test(body)
        ? "상태를 전개하는 행위 동기가 구체적으로 드러납니다."
        : "행위 동기가 여러 사건으로 분산되거나 미미합니다.",
    },
    {
      key: "trigger",
      label: storyDataText("story.label.002"),
      pass:
        CODE_DESTINY_TEXT_PATTERNS.misconception.test(body) ||
        CODE_DESTINY_TEXT_PATTERNS.delay.test(body) ||
        CODE_DESTINY_TEXT_PATTERNS.fallout.test(body),
      memo: "오해·지연·파장 중 최소 하나의 장치가 있어야 다음 장면로의 에너지 전환이 선명합니다.",
    },
    {
      key: "hook",
      label: storyDataText("story.label.003"),
      pass: CODE_DESTINY_TEXT_PATTERNS.hook.test(body),
      memo: CODE_DESTINY_TEXT_PATTERNS.hook.test(body)
        ? "연결 훅 문장이 존재해 장면 전환이 단절되지 않습니다."
        : "훅 장치가 약해 다음 장면 도입부에서 원인-결과 반전이 둔해질 수 있습니다.",
    },
    {
      key: "chain",
      label: storyDataText("story.label.004"),
      pass: CODE_DESTINY_TEXT_PATTERNS.purpose.test(body) && CODE_DESTINY_TEXT_PATTERNS.hook.test(body),
      memo: CODE_DESTINY_TEXT_PATTERNS.purpose.test(body) && CODE_DESTINY_TEXT_PATTERNS.hook.test(body)
        ? "현재 장면도 상태-자극-반응-훅의 골격이 유지됩니다."
        : "상태/반응이 짧아 구조 손실이 있을 수 있습니다.",
    },
    {
      key: "act",
      label: storyDataText("story.label.005"),
      pass: !CODE_DESTINY_TEXT_PATTERNS.worldRuleLeak.test(body),
      memo: CODE_DESTINY_TEXT_PATTERNS.worldRuleLeak.test(body)
        ? "설명형 문장이 사건보다 앞서 독자를 밀어낼 수 있어 축소 필요."
        : "사건 중심으로 판타지 작동이 유지됩니다.",
    },
    {
      key: "tone",
      label: storyDataText("story.label.006"),
      pass:
        (CODE_DESTINY_TEXT_PATTERNS.neoProtectiveAction.test(body) && !CODE_DESTINY_TEXT_PATTERNS.neoEmotion.test(body)) &&
        !CODE_DESTINY_TEXT_PATTERNS.muSongMoneyCore.test(body),
      memo: CODE_DESTINY_TEXT_PATTERNS.neoEmotion.test(body)
        ? "네오 감정 과잉 표현이 감지되어 톤 정리가 필요합니다."
        : CODE_DESTINY_TEXT_PATTERNS.muSongMoneyCore.test(body)
          ? "무성 동기가 돈으로 단일화되는 문장 감지."
          : "캐릭터 톤 방향성이 전반적으로 유지됩니다.",
    },
    {
      key: "identity",
      label: storyDataText("story.label.007"),
      pass: !CODE_DESTINY_TEXT_PATTERNS.neoIdentityLeak.test(body),
      memo: CODE_DESTINY_TEXT_PATTERNS.neoIdentityLeak.test(body)
        ? "조각 공개가 아닌 완전 노출 표현이 발견되어 대체 표현으로 환원 필요."
        : "정체는 단서형 유지가 잘 지켜지고 있습니다.",
    },
    {
      key: "money",
      label: storyDataText("story.label.008"),
      pass: !CODE_DESTINY_TEXT_PATTERNS.muSongMoneyCore.test(body),
      memo: CODE_DESTINY_TEXT_PATTERNS.muSongMoneyCore.test(body)
        ? "무성의 동기 축소가 필요합니다. 별 감쇠/절연/연결 절단 관점으로 전환하세요."
        : "무성 동기는 현재 단일 금전동기로 고정되지 않았습니다.",
    },
  ];

  const reasonLines = checks
    .filter((check) => !check.pass)
    .slice(0, 3)
    .map((check) => `${check.label}: ${check.memo}`);

  return {
    revisedText: chapter.content,
    reasonSummary:
      reasonLines.length > 0
        ? reasonLines
        : [
            "장면 목적, 훅, 오해/지연/파장 요소가 모두 확인되어 1차 구조는 유지됩니다.",
            "운명 규칙은 해설보다 사건 작동으로 정합되며 톤 편차는 경미합니다.",
            "막 목표와의 정렬 검토가 병행되면 바로 다음 훅 교차 편집이 가능합니다.",
          ],
    checks,
  };
}

function buildSceneRevisionRecord(chapter: IChapter): SceneRevisionRecord {
  const act = pickStoryAct(chapter.chapterNumber);
  return {
    sceneId: chapter._id,
    chapterNumber: chapter.chapterNumber,
    sceneTitle: chapter.title,
    act,
    input: createSceneFixInput(chapter),
    output: buildSceneFixOutput(chapter),
    actGuide: getActGuide(chapter.chapterNumber),
  };
}

export const codeDestinyRevisionPlanV1 = mockChapters.map((chapter) => buildSceneRevisionRecord(chapter));
