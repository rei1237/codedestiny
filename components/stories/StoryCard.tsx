"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { formatStoryCount } from "@/lib/stories/metrics";
import type { IStory } from "@/lib/stories/types";
import styles from "./storyComponents.module.css";

interface StoryCardProps {
  story: IStory;
}

interface GenreCoverStyle {
  background: string;
  moonColor: string;
  moonGlow: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
}

const GENRE_COVER_STYLES: Record<string, GenreCoverStyle> = {
  명리학: {
    background: "linear-gradient(155deg, #1a0f3d 0%, #0d0828 45%, #1e1246 100%)",
    moonColor: "radial-gradient(circle at 38% 38%, #f5f0ff 0%, #c4b5fd 40%, #7c5fe6 70%, transparent 100%)",
    moonGlow: "0 0 28px rgba(167, 139, 250, 0.45), 0 0 70px rgba(139, 92, 246, 0.18)",
    badgeColor: "#c4b5fd",
    badgeBg: "rgba(124, 95, 230, 0.3)",
    badgeBorder: "rgba(167, 139, 250, 0.3)",
  },
  타로: {
    background: "linear-gradient(155deg, #0f1a2e 0%, #08111f 45%, #152240 100%)",
    moonColor: "radial-gradient(circle at 38% 38%, #e0f0ff 0%, #93c5fd 40%, #3b82f6 70%, transparent 100%)",
    moonGlow: "0 0 28px rgba(147, 197, 253, 0.4), 0 0 70px rgba(59, 130, 246, 0.15)",
    badgeColor: "#93c5fd",
    badgeBg: "rgba(59, 130, 246, 0.25)",
    badgeBorder: "rgba(147, 197, 253, 0.3)",
  },
  자미두수: {
    background: "linear-gradient(155deg, #171123 0%, #0c0818 45%, #241636 100%)",
    moonColor: "radial-gradient(circle at 38% 38%, #f0ecff 0%, #d8b4fe 40%, #8b5cf6 70%, transparent 100%)",
    moonGlow: "0 0 28px rgba(216, 180, 254, 0.38), 0 0 70px rgba(139, 92, 246, 0.16)",
    badgeColor: "#d8b4fe",
    badgeBg: "rgba(139, 92, 246, 0.24)",
    badgeBorder: "rgba(216, 180, 254, 0.3)",
  },
  점성술: {
    background: "linear-gradient(155deg, #0c1a1a 0%, #061212 45%, #122020 100%)",
    moonColor: "radial-gradient(circle at 38% 38%, #ecfdf5 0%, #6ee7b7 40%, #059669 70%, transparent 100%)",
    moonGlow: "0 0 28px rgba(110, 231, 183, 0.4), 0 0 70px rgba(5, 150, 105, 0.15)",
    badgeColor: "#6ee7b7",
    badgeBg: "rgba(5, 150, 105, 0.25)",
    badgeBorder: "rgba(110, 231, 183, 0.3)",
  },
  숙요점: {
    background: "linear-gradient(155deg, #1a0a14 0%, #12060e 45%, #200f1a 100%)",
    moonColor: "radial-gradient(circle at 38% 38%, #fdf2f8 0%, #f9a8d4 40%, #ec4899 70%, transparent 100%)",
    moonGlow: "0 0 28px rgba(249, 168, 212, 0.4), 0 0 70px rgba(236, 72, 153, 0.15)",
    badgeColor: "#f9a8d4",
    badgeBg: "rgba(236, 72, 153, 0.25)",
    badgeBorder: "rgba(249, 168, 212, 0.3)",
  },
};

export default function StoryCard({ story }: StoryCardProps) {
  const [continueHref, setContinueHref] = useState("");
  const primaryGenre = story.genre[0] || "Code Destiny";
  const genreStyle = GENRE_COVER_STYLES[story.genre[0] || "명리학"];
  const coverVars = {
    "--cover-bg": genreStyle.background,
    "--cover-moon": genreStyle.moonColor,
    "--cover-moon-glow": genreStyle.moonGlow,
    "--cover-badge-color": genreStyle.badgeColor,
    "--cover-badge-bg": genreStyle.badgeBg,
    "--cover-badge-border": genreStyle.badgeBorder,
  } as CSSProperties;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("cd-reading-progress");
      if (!raw) return;
      const progress = JSON.parse(raw)?.[story._id];
      if (progress?.lastChapterId) {
        setContinueHref(`/stories/${story.slug}/${progress.lastChapterId}`);
      }
    } catch (_) {}
  }, [story._id, story.slug]);

  return (
    <Link className={styles.card} href={continueHref || `/stories/${story.slug}`} aria-label={`${story.title} 읽기`}>
      {continueHref ? <span className={styles.ribbon}>📖 이어읽기</span> : null}
      <div className={styles.cover} style={coverVars}>
        {story.coverImage ? <img src={story.coverImage} alt="" loading="lazy" decoding="async" /> : null}
        {!story.coverImage ? (
          <>
            <span className={styles.coverBadge}>{primaryGenre}</span>
            <span className={styles.coverMoon} />
            <span className={styles.coverFade} />
            <span className={styles.coverShimmer} />
          </>
        ) : null}
      </div>
      <div className={styles.body}>
        <h2 className={styles.title}>{story.title}</h2>
        <p className={styles.description}>{story.description}</p>
        <div className={styles.meta}>
          <span className={styles.counts}>
            <span>👁️ {formatStoryCount(story.viewCount)}</span>
            <span>✨ {formatStoryCount(story.likeCount)}</span>
          </span>
          <span className={`${styles.statusBadge} ${story.status === "completed" ? styles.statusBadgeCompleted : styles.statusBadgeOngoing}`}>
            {story.status === "completed" ? "완결" : "연재중"}
          </span>
        </div>
      </div>
    </Link>
  );
}
