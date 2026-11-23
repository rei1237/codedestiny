import { useState } from "react";
import { NovelLine } from "./Dialogue";
import { wardrobeKey } from "./battle-appearance";
import type { Variant } from "./formation";
import s from "./collection.module.css";

const stories: Record<string, { title: string; beats: [boolean, string][] }> = {
  yeon: {
    title: "네 번째 알람",
    beats: [
      [
        false,
        "서재 탁자에 휴대폰이 엎어져 있었다. 연이는 종이책 사이에 작은 꽃잎 하나를 끼웠다.",
      ],
      [
        true,
        "알람을 또 맞출까 하다가 말았어. 오늘은 이걸 보면 생각날 것 같아서.",
      ],
      [
        false,
        "책을 덮자 분홍 꽃잎 끝이 빼꼼 나왔다. 연이가 뿌듯한 얼굴로 시계를 보았다.",
      ],
      [
        true,
        "이런. 책 읽기로 한 시간은 벌써 지났네. 그럼 지금부터 한 장만 같이 읽자.",
      ],
    ],
  },
  neo: {
    title: "비워 둔 한 수",
    beats: [
      [
        false,
        "영냥이가 찻잔 세 개를 탁자 위에 나란히 밀었다. 마지막 한 자리는 비워 두었다.",
      ],
      [true, "첫 수는 내가 둔다. 다음은 자네가 둬."],
      [
        false,
        "당신이 빈 곳에 손을 올리자 고양이 꼬리가 모자 끝을 툭 건드렸다.",
      ],
      [true, "잘 봤군. 찻잔만 옮기라는 말은 한 적 없지. 이제 차부터 마셔."],
    ],
  },
  yun: {
    title: "마르지 않은 한 칸",
    beats: [
      [
        false,
        "윤달의 붓이 종이 위를 일곱 번 지났다. 여덟째 칸 앞에서 먹 한 방울이 부풀었다.",
      ],
      [
        true,
        "이 칸을 대신 채워 드릴 수도 있어요. 그런데 숙녀분 글씨가 제 것보다 재밌을 것 같아서요.",
      ],
      [
        false,
        "당신이 붓을 받자 윤달은 장갑을 낀 손으로 벼루가 밀리지 않게 눌렀다.",
      ],
      [
        true,
        "아, 획이 삐쳤네요. 그대로 두시죠. 다음에 오시면 누구 글씨인지 금방 알아보게.",
      ],
    ],
  },
  pje: {
    title: "우산을 말리는 자리",
    beats: [
      [
        false,
        "처마 아래 빗물이 가늘어졌다. 서한비는 검은 우산을 접으려다 다시 활짝 펼쳤다.",
      ],
      [
        true,
        "젖은 채 접으면 내일 펼쳤을 때 종이 냄새가 나요. 잠깐만 여기 둬도 될까요?",
      ],
      [
        false,
        "당신이 의자를 밀어 자리를 내주자 우산 끝에 모였던 물방울 하나가 빈 찻잔에 떨어졌다.",
      ],
      [true, "고마워요. 다음에 비가 오면 그땐 제가 자리 하나 내드릴게요."],
    ],
  },
  moka: {
    title: "뚜껑 둘, 쉼표 하나",
    beats: [
      [
        false,
        "모카가 국자로 냄비 가장자리를 두드렸다. 딱, 따닥. 세 번째 박자가 올 자리에 잘 구운 꼬치 한 개가 놓였다.",
      ],
      [
        true,
        "여기서 너 차례야. 한 입 먹고 대답해. 짜면 한 번, 싱거우면 두 번!",
      ],
      [
        false,
        "당신은 접시를 한 바퀴 돌려 빈 꼬치만 돌려줬다. 모카의 수염이 씰룩였다.",
      ],
      [true, "야, 그건 악보에 없는 대답이잖아. …좋다. 후렴 한 꼬치 더 간다!"],
    ],
  },
  ln: {
    title: "꽃 모양 빵의 행선지",
    beats: [
      [
        false,
        "루나가 창가에 바구니를 내려놓았다. 보자기 틈으로 꽃잎이 하나 떨어진 빵이 보였다.",
      ],
      [
        true,
        "언니가 구운 거야. 배달하다 꽃잎 하나가 떨어졌는데, 맛은 그대로겠지?",
      ],
      [
        false,
        "당신이 빵을 반으로 가르자 양쪽에 작은 꽃봉오리 같은 모양이 생겼다. 토끼 귀가 쫑긋 섰다.",
      ],
      [true, "하나가 둘이 됐네! 그럼 이건 우리 둘한테 배달 완료!"],
    ],
  },
};
export function CharacterRoom({
  v,
  still,
  close,
  costumeId,
}: {
  v: Variant;
  still: boolean;
  close: () => void;
  costumeId: string;
}) {
  const story = stories[v.baseCharacterId],
    [page, setPage] = useState(0);
  const [spoken, text] = story.beats[page];
  return (
    <section className={s.room}>
      <div className={s.roomTitle}>
        <small>캐릭터 룸 · 게임 각색</small>
        <h3>{story.title}</h3>
        <span>{v.name}의 개인 이야기</span>
      </div>
      <div className={s.roomText}>
        <NovelLine
          key={page}
          idleActor={v.baseCharacterId}
          wardrobe={wardrobeKey(v.baseCharacterId,v.battleVariantId,costumeId)}
          speaker={spoken ? v.baseCharacterId : "n"}
          text={text}
          still={still}
        />
        <div className={s.bar}>
          <span>
            {page + 1} / {story.beats.length}
          </span>
          <button disabled={!page} onClick={() => setPage(page - 1)}>
            이전
          </button>
          {page + 1 < story.beats.length ? (
            <button onClick={() => setPage(page + 1)}>다음 문장</button>
          ) : (
            <button onClick={() => setPage(0)}>다시 읽기</button>
          )}
          <button onClick={close}>카드 상세로</button>
        </div>
      </div>
    </section>
  );
}
