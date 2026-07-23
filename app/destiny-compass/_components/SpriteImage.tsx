"use client";
/**
 * R2 캐릭터/히어로 이미지 렌더 헬퍼 — next/image 사용(원시 img 태그 금지 규칙) + 로드 실패 시 조용히 숨김.
 * next.config images.unoptimized:true 라 외부 R2 URL을 그대로 사용한다.
 */
import Image from "next/image";
import { useState, type CSSProperties } from "react";

interface SpriteImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function SpriteImage({
  src,
  alt,
  width,
  height,
  fill,
  sizes,
  priority,
  className,
  style,
}: SpriteImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return null;
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      priority={priority}
      className={className}
      style={style}
      // R2 PNG의 Referer 기반 크로스오리진 차단(ORB) 회피 — NeoWarRoomAssetImage 정본 패턴
      referrerPolicy="no-referrer"
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
