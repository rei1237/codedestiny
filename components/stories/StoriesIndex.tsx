"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { estimateReadingMinutes, getStories } from "@/lib/stories/data";
import {
  READER_BODY_FONT_OPTIONS,
  READER_DISPLAY_FONT_STACK,
  READING_PRESET_OPTIONS,
  useReaderSettings,
} from "@/hooks/useReaderSettings";
import StoryCard from "./StoryCard";
import styles from "@/app/stories/stories.module.css";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkle: boolean;
  duration: number;
  delay: number;
}

function generateStars(count: number, seed = 42): Star[] {
  let s = seed;
  const rng = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  return Array.from({ length: count }, () => {
    const sizeRoll = rng();
    return {
      x: rng() * 100,
      y: rng() * 100,
      size: sizeRoll < 0.15 ? 1.6 : sizeRoll < 0.5 ? 1 : 0.7,
      opacity: 0.2 + rng() * 0.45,
      twinkle: rng() < 0.2,
      duration: 2.8 + rng() * 2.4,
      delay: rng() * 2.8,
    };
  });
}

export default function StoriesIndex() {
  const { settings, updateSetting, applyPreset } = useReaderSettings();
  const [continueHref, setContinueHref] = useState("");
  const stories = getStories();
  const story = stories[0];
  const stars = useMemo(() => generateStars(42), []);
  const selectedFont = READER_BODY_FONT_OPTIONS.find((option) => option.id === settings.bodyFont) || READER_BODY_FONT_OPTIONS[0];
  const fontStyle = {
    "--story-font-display": READER_DISPLAY_FONT_STACK,
    "--story-font-body": selectedFont.family,
  } as CSSProperties;
  const sampleMinutes = story ? estimateReadingMinutes(story.description.length * 12) : 0;

  useEffect(() => {
    if (!story) return;
    try {
      const raw = window.localStorage.getItem("cd-reading-progress");
      if (!raw) return;
      const progress = JSON.parse(raw)?.[story._id];
      if (progress?.lastChapterId) {
        setContinueHref(`/stories/${story.slug}/${progress.lastChapterId}`);
      }
    } catch (_) {}
  }, [story]);

  return (
    <div className={styles.stage} style={fontStyle}>
      <div className={styles.stars} aria-hidden="true">
        {stars.map((star, index) => (
          <span
            className={`${styles.star} ${star.twinkle ? styles.starTwinkle : ""}`}
            key={`story-star-${index}`}
            style={
              {
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                "--star-opacity": star.opacity,
                "--twinkle-duration": `${star.duration}s`,
                "--twinkle-delay": `${star.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <header className={styles.hero}>
        <div className={styles.moonAmbient} aria-hidden="true" />
        <div className={styles.moonOrb} aria-hidden="true" />
        <div className={styles.heroContent}>
          <span className={styles.kicker}>MOONLIT SERIAL</span>
          <h1>
            <span>별빛 아래 펼쳐지는</span>
            <strong>Code Destiny Novel</strong>
          </h1>
          <p>달빛의 결은 남기고, 읽는 피로는 덜어낸 화면으로 한 편씩 오래 머물 수 있게 정리했습니다.</p>
          <div className={styles.divider} aria-hidden="true">
            <span />
            <b>◈</b>
            <span />
          </div>
          <div className={styles.entryRibbon} aria-label="달빛 서재 모드">
            <span>입장부터 마지막 문장까지 별빛 가독성으로 다듬은 달빛 서재 모드</span>
          </div>
        </div>
      </header>

      {stories.length === 1 && story ? (
        <section className={styles.featuredLayout} aria-label="대표 웹소설">
          <article className={styles.featuredStoryCard}>
            <span className={styles.featuredEyebrow}>대표 작품</span>
            <h2>{story.title}</h2>
            <p>{story.description}</p>
            <div className={styles.featuredMeta}>
              <span>{story.totalChapters}화 공개</span>
              <span>무료 공개</span>
              <span>예상 호흡 {sampleMinutes}분</span>
            </div>
            <div className={styles.featuredActions}>
              <Link href={continueHref || `/stories/${story.slug}`}>{continueHref ? "이어읽기" : "챕터 목록"}</Link>
              <Link className={styles.secondaryAction} href={`/stories/${story.slug}/prologue`}>
                프롤로그 열기
              </Link>
            </div>
          </article>

          <aside className={styles.readerCard}>
            <div className={styles.readerCardHead}>
              <span className={styles.readerCardEyebrow}>읽기 환경</span>
              <strong>{selectedFont.label}</strong>
            </div>
            <div className={styles.readerPreview} style={{ fontFamily: selectedFont.family, fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}>
              별빛은 잔잔하게 흐르고, 문장은 오래 머무를수록 더 또렷해집니다.
            </div>
            <div className={styles.readerStats}>
              <span>{settings.fontSize}px</span>
              <span>{settings.lineHeight.toFixed(2)} 행간</span>
              <span>{READING_PRESET_OPTIONS.find((preset) => preset.id === settings.readingPreset)?.label || "편안하게"}</span>
            </div>
            <div className={styles.readerPresetRow}>
              {READING_PRESET_OPTIONS.map((preset) => (
                <button
                  className={`${styles.readerChip} ${settings.readingPreset === preset.id ? styles.readerChipActive : ""}`}
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className={styles.readerFontList}>
              {READER_BODY_FONT_OPTIONS.map((option) => (
                <button
                  className={`${styles.readerFontButton} ${settings.bodyFont === option.id ? styles.readerFontButtonActive : ""}`}
                  key={option.id}
                  type="button"
                  onClick={() => updateSetting("bodyFont", option.id)}
                >
                  <strong>{option.label}</strong>
                  <span style={{ fontFamily: option.family }}>{option.preview}</span>
                </button>
              ))}
            </div>
            <div className={styles.readerScaleRow}>
              <button className={styles.readerScaleButton} type="button" onClick={() => updateSetting("fontSize", Math.max(14, settings.fontSize - 1))}>
                A-
              </button>
              <div className={styles.readerScaleTrack}>
                <span style={{ width: `${((settings.fontSize - 14) / 10) * 100}%` }} />
              </div>
              <button className={styles.readerScaleButton} type="button" onClick={() => updateSetting("fontSize", Math.min(24, settings.fontSize + 1))}>
                A+
              </button>
            </div>
          </aside>
        </section>
      ) : (
        <section className={styles.grid} aria-label="Code Destiny novel">
          {stories.map((item) => (
            <StoryCard key={item._id} story={item} />
          ))}
        </section>
      )}
    </div>
  );
}
