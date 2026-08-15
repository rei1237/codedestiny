/**
 * 연이 초상 — 운세 페이지의 브랜드 표식.
 *
 * 🔴 서버 컴포넌트로 둔다. 레포의 기존 마스코트 컴포넌트 4종(components/yeon/YeonSpriteFrame,
 *    app/oracle/.../YeonSpriteAvatar, app/destiny-compass/_components/PigFace,
 *    app/fortune-chat/PersonaAvatar)은 전부 "use client" 라, 그대로 가져오면 이 페이지에
 *    클라이언트 경계가 생긴다. scripts/verify-adsense-readiness.mjs 는 서버 렌더 텍스트만
 *    세므로 경계가 잘못 들어가면 분량 미달로 **배포가 실패**한다.
 *
 * 자산은 fortune-chat 페르소나 컷(264×372, 투명, 13~17KB)을 재사용한다. tea-house 스프라이트
 * 시트(271~484KB)나 PNG(webp 대비 4~6배)를 쓰지 않는 이유는 크기다 — images.unoptimized 라
 * 원본 바이트가 그대로 내려간다.
 */
import Image from "next/image";

/** fortune-chat 이 쓰는 것과 같은 표정 5종 */
export type YeoniMood = "greet" | "listen" | "read" | "think" | "cheer";

const SRC: Record<YeoniMood, string> = {
  greet: "/images/fortune-chat/persona/yeoni-greet.webp",
  listen: "/images/fortune-chat/persona/yeoni-listen.webp",
  read: "/images/fortune-chat/persona/yeoni-read.webp",
  think: "/images/fortune-chat/persona/yeoni-think.webp",
  cheer: "/images/fortune-chat/persona/yeoni-cheer.webp",
};

/**
 * 총운 점수를 표정으로 옮긴다. 임의 매핑이 아니라 그날 계산된 길흉을 그대로 따른다.
 */
export function moodForScore(overall: number): YeoniMood {
  if (overall >= 8) return "cheer";
  if (overall >= 6) return "greet";
  if (overall >= 5) return "listen";
  return "think";
}

export default function YeoniPortrait({
  mood = "greet",
  size = 120,
  priority = false,
  className = "",
}: {
  mood?: YeoniMood;
  size?: number;
  /** 히어로처럼 첫 화면에 보이는 자리에서만 켠다 */
  priority?: boolean;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="꽃돼지 연이"
      className={`relative block shrink-0 ${className}`}
      style={{ width: size, height: Math.round((size * 372) / 264) }}
    >
      <Image
        src={SRC[mood]}
        alt=""
        fill
        sizes={`${size}px`}
        priority={priority}
        {...(priority ? {} : { loading: "lazy" as const })}
        className="object-contain"
      />
    </span>
  );
}
