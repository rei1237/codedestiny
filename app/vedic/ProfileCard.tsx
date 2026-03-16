"use client";

import { motion } from "framer-motion";

type VedicProfileProps = {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  locationLabel?: string;
};

const defaultProfile: VedicProfileProps = {
  name: "당신의 별자리",
  birthDate: "1990-06-15",
  birthTime: "14:30",
  locationLabel: "서울 · KST (UTC+9)",
};

type ProfileCardProps = {
  profile?: VedicProfileProps;
  onEnter: () => void;
};

export default function ProfileCard({ profile = defaultProfile, onEnter }: ProfileCardProps) {
  return (
    <motion.button
      type="button"
      className="cosmic-interactive-shell"
      aria-label="우주 프로필 카드 – 은하수 네비게이션으로 이동"
      initial={false}
      animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
      exit={{
        scale: 2.8,
        opacity: 0,
        filter: "blur(12px)",
        transition: { duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] },
      }}
      onClick={onEnter}
      transition={{ duration: 0.4 }}
    >
      <div className="cosmic-profile-card">
        <div className="cosmic-profile-orbit" aria-hidden="true" />

        <div className="cosmic-profile-card-inner">
          <div className="cosmic-avatar-orbit">
            <div className="cosmic-avatar-core" />
            <div className="cosmic-avatar-ring" />
            <div className="cosmic-avatar-orbiting-dot" />
          </div>

          <div>
            <p className="cosmic-text-primary">
              <span>VEDIC ASTROLOGY</span>
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 9999,
                  background: "rgba(248, 250, 252, 0.9)",
                  boxShadow: "0 0 10px rgba(248, 250, 252, 0.9)",
                }}
              />
              <span>조티시 베다 차트</span>
            </p>

            <h1 className="cosmic-text-name">{profile.name}</h1>

            <p className="cosmic-text-subtitle">
              태어난 순간, 하늘 가득 펼쳐진 별의 설계도를 베다식으로 해석합니다.
              <br />
              행성의 배치와 다샤의 흐름 속에서 당신의 성향과 운명을 읽어보세요.
            </p>

            <div className="cosmic-pill-row" aria-label="기본 출생 정보">
              <div className="cosmic-pill">
                <span className="cosmic-pill-label">생년월일</span>
                <span className="cosmic-pill-value">{profile.birthDate}</span>
              </div>
              <div className="cosmic-pill">
                <span className="cosmic-pill-label">출생 시각</span>
                <span className="cosmic-pill-value">{profile.birthTime}</span>
              </div>
              <div className="cosmic-pill">
                <span className="cosmic-pill-label">위치</span>
                <span className="cosmic-pill-value">{profile.locationLabel}</span>
              </div>
            </div>

            <div className="cosmic-card-footer">
              <span>지금 입력한 정보로 베다식 출생 차트를 생성합니다.</span>
              <span className="cosmic-card-footer-highlight">
                <span>✨</span>
                <span>은하수 네비게이션으로 이동</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
