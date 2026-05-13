import type { CSSProperties } from "react";

export type DestinyIconName =
  | "star"
  | "moon"
  | "sun"
  | "sparkle"
  | "sparkleLine"
  | "heart"
  | "heartGlow"
  | "crystal"
  | "lotus"
  | "cloud"
  | "ticket"
  | "lightstick"
  | "photocard"
  | "ribbon"
  | "seal"
  | "yinYang"
  | "compass"
  | "scroll"
  | "temple"
  | "torii"
  | "animalPaw"
  | "flowerPig"
  | "tarot"
  | "rune"
  | "zodiac"
  | "palace"
  | "coin"
  | "handLine"
  | "stageLight";

export type DestinyIconProps = {
  name: DestinyIconName;
  size?: number;
  className?: string;
  variant?: "line" | "filled" | "soft" | "glow" | "badge";
};

function iconPaths(name: DestinyIconName) {
  switch (name) {
    case "star":
      return <path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.5 6.7 19.1l1-5.8-4.2-4.1 5.9-.9L12 3z" />;
    case "moon":
      return <path d="M15.2 3.6a8.9 8.9 0 108.2 12.6A7.5 7.5 0 0115.2 3.6z" />;
    case "sun":
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.2 2.2M16.9 16.9l2.2 2.2M19.1 4.9l-2.2 2.2M7.1 16.9l-2.2 2.2" />
        </>
      );
    case "sparkle":
      return (
        <>
          <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
          <path d="M18.5 14l.8 1.7L21 16.5l-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8.8-1.7zM4.5 14l.8 1.7L7 16.5l-1.7.8-.8 1.7-.8-1.7L2 16.5l1.7-.8.8-1.7z" />
        </>
      );
    case "sparkleLine":
      return (
        <>
          <path d="M7 6l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM16 4l1.3 2.8L20 8l-2.7 1.2L16 12l-1.3-2.8L12 8l2.7-1.2L16 4zM10 16h10M8 20h8" />
        </>
      );
    case "heart":
      return <path d="M12 20s-7-3.8-9-8.2C1.6 8.7 3.7 5 7 5c1.9 0 3.1 1 4 2.2C11.9 6 13.1 5 15 5c3.3 0 5.4 3.7 4 6.8C19 16.2 12 20 12 20z" />;
    case "heartGlow":
      return (
        <>
          <path d="M12 20s-7-3.8-9-8.2C1.6 8.7 3.7 5 7 5c1.9 0 3.1 1 4 2.2C11.9 6 13.1 5 15 5c3.3 0 5.4 3.7 4 6.8C19 16.2 12 20 12 20z" />
          <path d="M4.5 4.5l1.2 2.3L8 8l-2.3 1.2L4.5 11 3.3 9.2 1 8l2.3-1.2L4.5 4.5zM19.5 4.5l1.2 2.3L23 8l-2.3 1.2L19.5 11l-1.2-1.8L16 8l2.3-1.2 1.2-2.3z" />
        </>
      );
    case "crystal":
      return <path d="M7 4h10l3 5-8 11L4 9l3-5zm0 0l5 5 5-5M9.5 14h5" />;
    case "lotus":
      return <path d="M12 20c3.8 0 7-2.2 8-5-2 .3-4.3-.2-6-1.6-.9.8-1.4 1.7-2 2.6-.6-.9-1.1-1.8-2-2.6-1.7 1.4-4 1.9-6 1.6 1 2.8 4.2 5 8 5zm0-7c2.3-1 4.1-3.1 4.5-6C14.6 7.3 13 8.5 12 10c-1-1.5-2.6-2.7-4.5-3 .4 2.9 2.2 5 4.5 6z" />;
    case "cloud":
      return <path d="M8 18h8a4 4 0 100-8h-.3A5.5 5.5 0 005.2 11.8 3.8 3.8 0 008 18z" />;
    case "ticket":
      return <path d="M4 8a2 2 0 002-2h12a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4V8zm8-1v10" />;
    case "lightstick":
      return <path d="M12 3a4 4 0 014 4v1H8V7a4 4 0 014-4zm-2 5h4v6h-4V8zm-1 6h6v2H9v-2zm1 2h4v5h-4v-5z" />;
    case "photocard":
      return <path d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm2.2 4.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM8 17l2.7-2.6 2.2 2 2.5-2.4L17 17H8z" />;
    case "ribbon":
      return <path d="M12 4a4 4 0 100 8 4 4 0 000-8zm-2 7.6L8 20l4-2.2L16 20l-2-8.4" />;
    case "seal":
      return <path d="M12 3l2.1 1.2 2.4-.2 1.4 2 2.3.8.2 2.4 1.2 2.1-1.2 2.1-.2 2.4-2.3.8-1.4 2-2.4-.2L12 21l-2.1-1.2-2.4.2-1.4-2-2.3-.8-.2-2.4L2.4 12l1.2-2.1.2-2.4 2.3-.8 1.4-2 2.4.2L12 3zm0 5.5L13 11h2.5l-2 1.4.7 2.4-2.2-1.4-2.2 1.4.7-2.4-2-1.4H11l1-2.5z" />;
    case "yinYang":
      return <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0a4.5 4.5 0 010 9 4.5 4.5 0 100 9M10 7.5a1 1 0 102 0 1 1 0 00-2 0zm0 9a1 1 0 102 0 1 1 0 00-2 0z" />;
    case "compass":
      return <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm4 5l-2.6 6.1L8 16l2-5.4L16 8z" />;
    case "scroll":
      return <path d="M7 4h10a3 3 0 013 3v9a4 4 0 01-4 4H8a3 3 0 110-6h10M8 8h7M8 11h6" />;
    case "temple":
      return <path d="M3 8l9-4 9 4M5 8h14M6 8v9M10 8v9M14 8v9M18 8v9M4 17h16M3 21h18" />;
    case "torii":
      return <path d="M3 8h18M6 8v3m12-3v3M4 11h16M8 11v10m8-10v10M6 21h12" />;
    case "animalPaw":
      return <path d="M8 9.2a1.8 1.8 0 11-3.6 0 1.8 1.8 0 013.6 0zm4-2a2 2 0 11-4 0 2 2 0 014 0zm4.8 2a1.8 1.8 0 11-3.6 0 1.8 1.8 0 013.6 0zm-4.8 9.8c3.1 0 5.7-1.8 5.7-4s-2.5-4-5.7-4-5.7 1.8-5.7 4 2.5 4 5.7 4z" />;
    case "flowerPig":
      return <path d="M7 11a5 5 0 0110 0v4a4 4 0 01-4 4h-2a4 4 0 01-4-4v-4zm3 .5h4v2a2 2 0 11-4 0v-2zM6 10l-1.5-2M18 10l1.5-2M9 7l-2-1M15 7l2-1" />;
    case "tarot":
      return <path d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm5 3l1.1 2.3L16 8.8l-2 1.5.7 2.4-2.7-1.6-2.7 1.6.7-2.4-2-1.5 2.9-.5L12 6z" />;
    case "rune":
      return <path d="M8 3v18M8 3l8 6-8 6M16 9v12" />;
    case "zodiac":
      return <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />;
    case "palace":
      return <path d="M4 9h16M5 9l2-4h10l2 4M6 9v10M10 9v10M14 9v10M18 9v10M4 19h16" />;
    case "coin":
      return <path d="M12 4c4.4 0 8 1.8 8 4s-3.6 4-8 4-8-1.8-8-4 3.6-4 8-4zm-8 6v6c0 2.2 3.6 4 8 4s8-1.8 8-4v-6" />;
    case "handLine":
      return <path d="M7 13V7a1.5 1.5 0 113 0v4M10 11V6a1.5 1.5 0 113 0v5M13 11V7a1.5 1.5 0 113 0v8c0 3.3-2.7 6-6 6H9a5 5 0 01-5-5v-1.2A2.8 2.8 0 016.8 12H7z" />;
    case "stageLight":
      return <path d="M5 5h14v3l-4 4v7l-3 2-3-2v-7L5 8V5zm0 0l-2 2m16-2l2 2M3 11h3m12 0h3" />;
    default:
      return <circle cx="12" cy="12" r="8" />;
  }
}

export default function DestinyIcon({ name, size = 20, className, variant = "line" }: DestinyIconProps) {
  const fill = variant === "filled" ? "currentColor" : variant === "soft" ? "currentColor" : "none";
  const stroke = variant === "filled" ? "none" : "currentColor";
  const strokeWidth = variant === "badge" ? 1.8 : 1.65;
  const style: CSSProperties = {};

  if (variant === "soft") {
    style.opacity = 0.92;
  }
  if (variant === "glow") {
    style.filter = "drop-shadow(0 0 10px rgba(180,200,255,0.45))";
  }

  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
      >
        {variant === "badge" ? <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" stroke="none" /> : null}
        {iconPaths(name)}
      </svg>
    </span>
  );
}