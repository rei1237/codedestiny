// 첫 화면(/) 진입 웹툰 「연이의 찻집에서, 당신의 흐름을」 대본 정본.
// 콘티·프롬프트 초안·참조 시트: docs/design/entry-webtoon-20261107.md. 그림 출처 원장: docs/design/entry-webtoon-assets.json(Task 3).
// - 그림 컷(kind 'image')은 글자 없는 일러스트이고, 대사는 모두 여기 lines에서 HTML로 그린다.
// - 기록·후기·언론·가격 문구는 여기에 다시 쓰지 않는다. 렌더 때 정본 모듈에서 읽는다.
//   record  → lib/brand/trust-stories.mjs 의 공개 기록 배열(첫 export)[recordIndex]
//   reviews → id 'record-reactions'는 trust-stories.mjs 의 독자 공개 반응 배열(구매 후기 아님 고지),
//             id 'decade-reviews'는 lib/brand/customer-reviews.mjs(네오 1:1 상담·강의 이용자 후기 고지)
//   press   → app/components/PressCoverage.jsx
//   offer   → 가격은 worker/lib/paid-feature-registry.js, 1:1 상담 이력 금액은 lib/brand/founder.ts
// - 이 파일에는 정치 단어와 판매가를 두지 않는다(__tests__/ui/entry-webtoon-script.test.mjs).
// 말투: 인간 연이는 부드러운 존댓말로 독자를 "당신"이라 부르고, 네오는 짧고 정돈된 존댓말, 꽃돼지 연이는 밝고 짧게.
import { REFUND_LINE } from '../marketing/home-concerns.mjs';

/**
 * @typedef {{ speaker: 'yeoni'|'neo'|'pig'|'caption', text: string }} EntryLine
 * @typedef {{
 *   id: string,
 *   kind: 'image'|'record'|'reviews'|'press'|'concern'|'offer'|'cta',
 *   image?: { src: string, w: number, h: number, alt: string },
 *   lines: EntryLine[],
 *   recordIndex?: 1|2,
 * }} EntryCut
 * `recordIndex`는 record 컷에만 있고 trust-stories.mjs 공개 기록 배열의 0부터 센 인덱스다
 * (1 = 2024-05-12 기록, 2 = 2024-05-27 기록).
 * @typedef {{ id: 'imagine'|'record'|'decade'|'question'|'offer'|'invite', cuts: EntryCut[] }} EntryChapter
 */

const WIDE = { w: 1080, h: 720 };
const TALL = { w: 1024, h: 1536 };
const say = (speaker, ...texts) => texts.map(text => Object.freeze({ speaker, text }));
const freezeCut = cut => Object.freeze({ ...cut, lines: Object.freeze(cut.lines) });
/** 그림 컷. src는 확장자·폭 없이 둔다(렌더에서 -640.avif, -1080.avif, -720.webp를 붙인다). */
const imageCut = (id, size, alt, lines) => freezeCut({
  id, kind: 'image', image: Object.freeze({ src: `/images/entry-webtoon/${id}`, ...size, alt }), lines,
});
const htmlCut = (id, kind, lines = [], extra = {}) => freezeCut({ id, kind, lines, ...extra });
const chapter = (id, cuts) => Object.freeze({ id, cuts: Object.freeze(cuts) });

export const ENTRY_WEBTOON = Object.freeze({
  title: '연이의 찻집에서, 당신의 흐름을',
  h1: '네오가 미리 짚은 흐름, 당신의 운세로',
  skipLabel: '건너뛰기 →',
  stickyLabel: '바로 무료 운세 보기',
  ctaLabel: '무료로 내 운세 보기',
  sideLinks: Object.freeze([
    Object.freeze({ label: '고양이에게 털어놓고 싶다면', href: '/yeongnyangi/' }),
    Object.freeze({ label: '꿀꿀 운세 둘러보기', href: '/ggulggul/' }),
  ]),
  chapters: Object.freeze([
    chapter('imagine', [
      imageCut('imagine-night', WIDE, '별이 가득한 밤, 골목 끝 찻집 처마에 등불이 따뜻하게 켜져 있다',
        say('yeoni', '한번 상상해 볼까요?', '당신 앞날의 흐름을 미리 알 수 있다면.')),
      imageCut('imagine-phone', WIDE, '어두운 방에서 휴대폰을 쥔 손, 화면에는 아직 읽지 않은 메시지 알림이 떠 있다',
        say('yeoni', '기다려야 할지, 먼저 연락해야 할지 알고')),
      imageCut('imagine-desk', WIDE, '스탠드 불빛 아래 책상 위에 봉투에 든 사직서와 통장이 나란히 놓여 있다',
        say('yeoni', '움직일 때와 버틸 때를 알고')),
      imageCut('imagine-calendar', WIDE, '새해 첫 장을 펼친 벽 달력 옆에 꽃 한 송이가 꽂혀 있다',
        say('yeoni', '올해 어디에 힘을 실어야 할지 안다면.')),
      imageCut('imagine-yeoni', TALL, '한복을 입은 연이가 찻집 등불 아래에서 부드럽게 미소 지으며 이쪽을 바라본다',
        say('yeoni', '그 흐름을 미리 읽는 사람이 있어요.')),
    ]),
    chapter('record', [
      imageCut('record-study', WIDE, '봄밤의 서재, 은발의 네오가 책상 등불 아래에서 원고를 쓰고 있는 옆모습',
        say('caption', '2024년 5월, 어느 밤의 서재.', '명리학자 네오, 박병하')),
      htmlCut('record-first', 'record', say('caption', '그해 봄, 네오는 다음 해의 흐름을 글로 남겼어요.'), { recordIndex: 1 }),
      htmlCut('record-second', 'record', say('caption', '보름 뒤, 또 하나의 기록.'), { recordIndex: 2 }),
      htmlCut('record-reactions', 'reviews', say('caption', '시간이 흐른 뒤, 독자들이 그 글을 다시 찾아왔어요.')),
      imageCut('record-neo-tea', WIDE, '네오가 찻집 탁자에 찻잔을 조용히 내려놓고 차분한 눈빛으로 앞을 바라본다',
        say('neo', '운은 맞히려고 보는 게 아닙니다.', '대비하려고 봅니다.')),
    ]),
    chapter('decade', [
      imageCut('decade-table', WIDE, '1:1 상담 테이블 위에 찻잔 두 개가 마주 놓여 있고 창밖으로 계절이 바뀌어 간다',
        say('caption', '10년, 한 사람씩.', '마주 앉아 한 사람의 흐름을 풀던 1:1 상담이었어요.')),
      htmlCut('decade-reviews', 'reviews'),
      imageCut('decade-handover', TALL, '네오가 두 손으로 원고 묶음을 연이에게 건네고, 연이가 그것을 받아 든다',
        say('neo', '더 많은 사람이 먼저 알 수 있게, 부탁합니다.')),
      imageCut('decade-sign', WIDE, '밤거리에서 등불이 켜진 찻집 간판이 막 불을 밝힌다',
        say('caption', '그렇게 꿀꿀 운세가 문을 열었어요.', '계산은 규칙대로, 해설은 AI가.')),
      htmlCut('decade-press', 'press'),
    ]),
    chapter('question', [
      imageCut('question-door', TALL, '고민을 품은 손님이 찻집 문을 열고, 안에서 연이가 따뜻하게 맞이한다',
        say('yeoni', '오늘은 어떤 이야기가 궁금하세요?')),
      htmlCut('question-concern', 'concern'),
    ]),
    chapter('offer', [
      imageCut('offer-pig', WIDE, '연꽃 장식과 스카프를 한 꽃돼지 연이가 찻집 카운터 위에서 반갑게 손을 흔든다',
        say('pig', '제가 안내할게요!')),
      htmlCut('offer-manseryeok', 'offer', say('pig', '01 무료 만세력! 당신의 사주 8글자와 한 줄 성향을 바로 보여 드려요.')),
      htmlCut('offer-answer', 'offer', say('pig', '02 무료 고민 답! 고른 고민에 두세 줄로 먼저 답해 드려요.')),
      htmlCut('offer-deeper', 'offer', say('pig', '03 더 깊게! 고민별 상담, 사주 평생 소장 묶음, 대표 상담 3종이 있어요.')),
      htmlCut('offer-safety', 'offer', say('caption', '결제 전에 예시를 먼저 확인할 수 있어요.', `${REFUND_LINE}.`)),
    ]),
    chapter('invite', [
      imageCut('invite-tea', TALL, '연이가 두 손으로 김이 오르는 찻잔을 이쪽으로 내민다',
        say('yeoni', '당신의 흐름, 무료로 먼저 확인해 보세요.')),
      htmlCut('invite-cta', 'cta'),
      imageCut('invite-yeongnyangi', WIDE, '찻집 창가 방석 위에서 영냥이가 꼬리를 감고 이쪽을 올려다본다',
        say('yeoni', '고양이에게 털어놓고 싶은 밤이라면, 영냥이도 기다리고 있어요.')),
    ]),
  ]),
});

/** 장 순서대로 평탄화한 컷 목록. @returns {EntryCut[]} */
export function entryCuts() {
  return ENTRY_WEBTOON.chapters.flatMap(chapter => chapter.cuts);
}
