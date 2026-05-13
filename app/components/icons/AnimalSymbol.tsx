import type { CSSProperties } from "react";

export type AnimalSymbolName =
  | "elephant"
  | "rabbit"
  | "cat"
  | "dog"
  | "lion"
  | "pig"
  | "deer"
  | "bird"
  | "fox"
  | "bear"
  | "turtle"
  | "swan";

type AnimalSymbolProps = {
  name: AnimalSymbolName;
  size?: number;
  className?: string;
};

function animalPath(name: AnimalSymbolName) {
  switch (name) {
    case "elephant":
      return <path d="M6 12a6 6 0 1112 0v1.5A4.5 4.5 0 0113.5 18H13v2a2 2 0 11-4 0v-3h1.2a2.8 2.8 0 002.8-2.8V13h-3" />;
    case "rabbit":
      return <path d="M9 9V5a2 2 0 114 0v4M8 10a4 4 0 118 0v3a5 5 0 01-10 0v-3a2 2 0 012-2z" />;
    case "cat":
      return <path d="M8 8L6 5 4 8v5a8 8 0 0016 0V8l-2-3-2 3" />;
    case "dog":
      return <path d="M7 9L5 7 4 10v4a8 8 0 0016 0v-4l-1-3-2 2" />;
    case "lion":
      return <path d="M12 4a7 7 0 017 7v1a7 7 0 11-14 0v-1a7 7 0 017-7zm-3 7a3 3 0 106 0 3 3 0 00-6 0z" />;
    case "pig":
      return <path d="M6 10a6 6 0 1112 0v3a5 5 0 01-5 5h-2a5 5 0 01-5-5v-3zm4 1h4v2a2 2 0 11-4 0v-2z" />;
    case "deer":
      return <path d="M9 8l-2-3m2 3l-2 1m8-1l2-3m-2 3l2 1M8 10a4 4 0 118 0v3a4 4 0 01-8 0v-3z" />;
    case "bird":
      return <path d="M7 12a5 5 0 1110 0v1a5 5 0 11-10 0v-1zm8-1l3-1-2 3" />;
    case "fox":
      return <path d="M7 8L5 5 4 9v3a8 8 0 0016 0V9l-1-4-2 3M9 17l3-2 3 2" />;
    case "bear":
      return <path d="M8 8a2 2 0 114 0m4 0a2 2 0 10-4 0M6 11a6 6 0 1112 0v2a6 6 0 11-12 0v-2zm4 2h4v2a2 2 0 11-4 0v-2z" />;
    case "turtle":
      return <path d="M6 13a6 6 0 1112 0v1a4 4 0 01-4 4h-4a4 4 0 01-4-4v-1zm0 0l-2 1m14-1l2 1m-10 5l-1 2m6-2l1 2" />;
    case "swan":
      return <path d="M8 14c0-3 2-5 5-5 2.5 0 4.5 2 4.5 4.5V14a6 6 0 01-6 6h-1a4.5 4.5 0 01-4.5-4.5V15h5" />;
    default:
      return <circle cx="12" cy="12" r="7" />;
  }
}

export default function AnimalSymbol({ name, size = 64, className }: AnimalSymbolProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <span className={className} style={style} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.14" stroke="none" />
        {animalPath(name)}
      </svg>
    </span>
  );
}
