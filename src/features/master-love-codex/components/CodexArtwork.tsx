"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import styles from "../styles/codex.module.css";

interface CodexArtworkProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
  priority?: boolean;
}

/** A failed request keeps its frame and accessible name without showing broken-image text. */
export default function CodexArtwork({ src, alt, width, height, sizes, className = "", priority = false }: CodexArtworkProps) {
  const [failed, setFailed] = useState(false);

  return (
    <span className={`${styles.artwork} ${className}`} role={failed ? "img" : undefined} aria-label={failed ? alt : undefined}>
      {failed ? (
        <span className={styles.artworkFallback} aria-hidden="true">
          <BookOpen size={42} strokeWidth={1} />
        </span>
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          unoptimized
          priority={priority}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
