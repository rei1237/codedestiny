// /music 전용 인라인 SVG. lucide-react 를 페이지 청크에서 빼기 위해 필요한 10개만 둔다.
// 모두 장식용(aria-hidden)이며 라벨은 버튼의 aria-label 이 맡는다.
type IconProps = { size?: number };

function Svg({ size = 20, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function PlayIcon({ size }: IconProps) {
  return <Svg size={size}><path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" /></Svg>;
}
export function PauseIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}
export function PrevIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M19 5v14L9 12z" fill="currentColor" stroke="none" />
      <rect x="4" y="5" width="2.5" height="14" rx="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}
export function NextIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M5 5v14l10-7z" fill="currentColor" stroke="none" />
      <rect x="17.5" y="5" width="2.5" height="14" rx="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}
export function VolumeIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </Svg>
  );
}
export function MuteIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="m22 9-6 6" />
      <path d="m16 9 6 6" />
    </Svg>
  );
}
export function RepeatIcon({ size, one = false }: IconProps & { one?: boolean }) {
  return (
    <Svg size={size}>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      {one ? <path d="M11 10h1v4" /> : null}
    </Svg>
  );
}
export function ShuffleIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.6-8.6c.8-1.1 2-1.7 3.3-1.7H22" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
      <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
      <path d="m18 14 4 4-4 4" />
    </Svg>
  );
}
export function ShareIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4" />
      <path d="m15.4 6.5-6.8 4" />
    </Svg>
  );
}
export function LyricsIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M4 6h16" />
      <path d="M4 12h10" />
      <path d="M4 18h13" />
    </Svg>
  );
}
export function LockIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}
export function DownloadIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 21h16" />
    </Svg>
  );
}
export function CloseIcon({ size }: IconProps) {
  return (
    <Svg size={size}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  );
}
