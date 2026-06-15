"use client";

import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════
   LOVE CODE — 사주 기반 연애 시뮬레이션
   lunar-javascript + /api/love-saju-pillar 기반
   절기(節氣) 정확 사주 팔자 계산
═══════════════════════════════════════════════ */

const STYLES = `
:root {
  --pink-soft: #fff1f2;
  --pink-light: #ffe4e6;
  --pink-medium: #fecdd3;
  --pink-accent: #fb7185;
  --rose: #e11d48;
  --lavender: #f5f3ff;
  --lavender-accent: #8b5cf6;
  --cream: #fffdfa;
  --peach: #fff7ed;
  --text-main: #4c0519;
  --text-dim: #881337;
  --glass: rgba(255, 255, 255, 0.65);
  --glass-dark: rgba(255, 255, 255, 0.85);
  --border: rgba(251, 113, 133, 0.2);
  --shadow: 0 12px 40px rgba(225, 29, 72, 0.1);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: linear-gradient(135deg, #fff1f2 0%, #fff7ed 50%, #f5f3ff 100%);
  color: var(--text-main);
  font-family: var(--font-body);
  min-height: 100vh;
  overflow-x: hidden;
}

.cd-app { min-height: 100vh; position: relative; overflow: hidden; }

.cd-stars { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
.cd-star {
  position: absolute; border-radius: 50%; background: #fb7185;
  animation: twinkle var(--d) var(--dl) ease-in-out infinite alternate;
}
@keyframes twinkle {
  from { opacity: var(--lo); transform: scale(1); }
  to   { opacity: var(--hi); transform: scale(1.3); }
}
.cd-nebula {
  position: fixed; border-radius: 50%;
  filter: blur(80px); pointer-events: none; z-index: 0;
}

.cd-screen {
  position: relative; z-index: 10;
  height: 100%; overflow-y: auto; overflow-x: hidden;
  display: flex; flex-direction: column;
  align-items: center; justify-content: flex-start;
  padding: 24px 20px;
  -webkit-overflow-scrolling: touch;
}

.cd-portal-logo {
  font-size: 56px; margin-bottom: 16px;
  animation: float 4s ease-in-out infinite;
  filter: drop-shadow(0 0 20px rgba(251,113,133,0.3));
}
@keyframes float {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
.cd-portal-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(28px, 6vw, 52px);
  color: var(--rose);
  letter-spacing: 0.1em;
  text-align: center;
  margin-bottom: 6px;
  text-shadow: 0 4px 12px rgba(225,29,72,0.1);
}
.cd-portal-sub {
  font-family: var(--font-body);
  font-weight: 400;
  font-size: clamp(14px, 2.5vw, 18px);
  color: var(--text-dim);
  letter-spacing: 0.05em;
  text-align: center;
  margin-bottom: 36px;
}

/* ── 프리셋 카드 그리드 ── */
.lc-preset-grid {
  width: 100%; max-width: 900px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}
.lc-preset-card {
  background: var(--glass);
  border: 1.5px solid var(--border);
  border-radius: 24px;
  padding: 24px 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow);
}
.lc-preset-card::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(251,113,133,0.1), transparent);
  opacity: 0; transition: opacity 0.3s;
}
.lc-preset-card:hover { 
  border-color: var(--pink-accent); 
  transform: translateY(-8px) scale(1.02); 
  box-shadow: 0 20px 40px rgba(225, 29, 72, 0.15); 
}
.lc-preset-card:hover::before { opacity: 1; }
.lc-preset-emoji { font-size: 48px; margin-bottom: 12px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1)); }
.lc-preset-name { font-size: 18px; font-weight: 700; color: var(--rose); margin-bottom: 4px; }
.lc-preset-tag {
  display: inline-block;
  font-size: 11px; color: var(--text-dim);
  background: var(--pink-soft);
  border: 1px solid var(--border);
  border-radius: 12px; padding: 4px 10px;
  margin: 4px 4px 0 0;
  font-weight: 600;
}
.lc-preset-dm { font-size: 13px; color: var(--text-dim); margin-top: 10px; font-weight: 600; opacity: 0.8; }

/* ── 직접 입력 폼 ── */
.cd-form-card {
  width: 100%; max-width: 480px;
  background: var(--glass-dark);
  border: 1.5px solid var(--border);
  border-radius: 32px;
  padding: 40px 32px;
  backdrop-filter: blur(24px);
  position: relative;
  box-shadow: 0 24px 80px rgba(225, 29, 72, 0.12);
}
.cd-form-group { margin-bottom: 24px; }
.cd-form-label {
  display: block; font-size: 12px; color: var(--rose);
  letter-spacing: 0.05em; font-weight: 700; margin-bottom: 10px;
}
.cd-input {
  width: 100%;
  background: #fff;
  border: 1.5px solid var(--border);
  border-radius: 16px;
  padding: 14px 18px;
  color: var(--text-main);
  font-family: var(--font-body);
  font-size: 16px; outline: none; transition: all 0.3s; appearance: none;
}
.cd-input:focus {
  border-color: var(--pink-accent);
  box-shadow: 0 0 0 4px rgba(251, 113, 133, 0.1);
}
.cd-input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cd-check-label {
  display: flex; align-items: center; gap: 10px;
  margin-top: 12px; cursor: pointer;
  font-size: 14px; color: var(--text-dim);
  font-weight: 500;
}
.cd-check-label input[type=checkbox] { accent-color: var(--rose); width: 18px; height: 18px; }

.cd-fate-btn {
  width: 100%; padding: 18px;
  background: linear-gradient(135deg, #fb7185, #e11d48);
  border: none; border-radius: 18px;
  color: #fff;
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 17px; letter-spacing: 0.05em;
  cursor: pointer; margin-top: 12px;
  transition: all 0.3s;
  box-shadow: 0 10px 25px rgba(225, 29, 72, 0.25);
}
.cd-fate-btn:hover { 
  transform: translateY(-4px) scale(1.02); 
  box-shadow: 0 15px 35px rgba(225, 29, 72, 0.35); 
}
.cd-fate-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

/* ── AWAKENING ── */
.cd-awakening {
  width: 100%; max-width: 580px;
  animation: awaken 1s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes awaken {
  from { opacity: 0; transform: translateY(40px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.cd-avatar-wrap { position: relative; width: 160px; height: 160px; margin: 0 auto 32px; }
.cd-avatar {
  width: 160px; height: 160px; border-radius: 50%;
  background: linear-gradient(135deg, #fff, #ffe4e6);
  border: 4px solid #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 84px;
  box-shadow: 0 20px 50px rgba(225, 29, 72, 0.2), inset 0 4px 12px rgba(0,0,0,0.05);
}
.cd-avatar-ring {
  position: absolute; inset: -12px; border-radius: 50%;
  border: 2px dashed rgba(225, 29, 72, 0.3);
  animation: spin 12s linear infinite;
}
.cd-avatar-ring2 {
  position: absolute; inset: -24px; border-radius: 50%;
  border: 1px dashed rgba(225, 29, 72, 0.15);
  animation: spin 20s linear infinite reverse;
}
@keyframes spin { to { transform: rotate(360deg); } }
.cd-score-badge {
  position: absolute; top: 0; right: -10px;
  background: var(--crimson); color: #fff;
  border-radius: 20px; padding: 4px 10px;
  font-size: 11px; letter-spacing: 0.05em;
  font-family: var(--font-playful);
  box-shadow: 0 0 20px rgba(192,50,74,0.5);
}
.cd-char-name {
  font-family: var(--font-body);
  font-weight: 700;
  font-size: clamp(24px, 6vw, 36px);
  color: var(--rose); text-align: center;
  letter-spacing: 0.05em; margin-bottom: 8px;
}
.cd-char-sub {
  font-size: 16px; color: var(--text-dim);
  text-align: center; font-weight: 500; margin-bottom: 24px;
}
.cd-traits {
  display: flex; flex-wrap: wrap; gap: 10px;
  justify-content: center; margin-bottom: 32px;
}
.cd-trait {
  padding: 6px 18px;
  border: 1.5px solid var(--border); border-radius: 20px;
  font-size: 13px; color: var(--rose); background: #fff;
  font-weight: 600;
  animation: awaken 0.5s ease-out both;
}
.cd-stats-card {
  background: var(--glass); border: 1.5px solid var(--border);
  border-radius: 24px; padding: 24px; margin-bottom: 16px;
  box-shadow: var(--shadow);
}
.cd-stats-title {
  font-size: 12px; color: var(--rose);
  letter-spacing: 0.1em; font-weight: 700; text-transform: uppercase; margin-bottom: 20px;
}
.cd-stat-row { display: flex; align-items: center; gap: 16px; margin-bottom: 14px; }
.cd-stat-label { width: 60px; font-size: 14px; color: var(--text-dim); font-weight: 600; }
.cd-stat-track { flex: 1; height: 8px; background: #fff; border-radius: 4px; overflow: hidden; border: 1px solid var(--border); }
.cd-stat-fill { height: 100%; border-radius: 4px; transition: width 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s; }
.cd-stat-num { width: 32px; font-size: 14px; color: var(--rose); text-align: right; font-weight: 700; }

.cd-synastry {
  background: linear-gradient(135deg, var(--pink-soft), var(--peach));
  border: 1.5px solid var(--border);
  border-radius: 24px; padding: 24px;
  text-align: center; margin-bottom: 24px;
  box-shadow: var(--shadow);
}
.cd-synastry-label { font-size: 13px; color: var(--text-dim); margin-bottom: 8px; font-weight: 600; }
.cd-synastry-score {
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 48px; color: var(--rose);
  line-height: 1;
}
.cd-synastry-detail { font-size: 13px; color: var(--text-dim); margin-top: 10px; font-weight: 500; }

.cd-start-btn {
  width: 100%; padding: 18px;
  background: #fff; border: 2px solid var(--rose);
  border-radius: 18px; color: var(--rose);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 17px; letter-spacing: 0.05em; cursor: pointer;
  transition: all 0.3s;
}
.cd-start-btn:hover { background: var(--rose); color: #fff; box-shadow: 0 10px 25px rgba(225, 29, 72, 0.2); }

/* ── CHAT ── */
.cd-chat-wrap {
  width: 100%; max-width: 620px;
  height: 100dvh;
  display: flex; flex-direction: column;
  margin: 0 auto;
  background: #fff;
}

.cd-chat-header {
  padding: 16px 20px;
  background: #fff; border-bottom: 1.5px solid var(--border);
  display: flex; align-items: center; gap: 14px; flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}
.cd-hdr-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  background: var(--pink-soft); border: 2px solid var(--pink-medium);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; flex-shrink: 0;
}
.cd-hdr-name { font-size: 17px; color: var(--text-main); font-weight: 700; }
.cd-hdr-mood { font-size: 13px; color: var(--text-dim); margin-top: 2px; font-weight: 500; }
.cd-event-btn {
  padding: 8px 16px;
  background: var(--pink-soft);
  border: 1.5px solid var(--pink-medium);
  border-radius: 12px; color: var(--rose);
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 13px; cursor: pointer; transition: all 0.2s;
}
.cd-event-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(225,29,72,0.1); }

.cd-affinity-bar {
  padding: 12px 20px 16px;
  background: var(--cream); border-bottom: 1.5px solid var(--border); flex-shrink: 0;
}
.cd-aff-top {
  display: flex; justify-content: space-between;
  font-size: 12px; color: var(--text-dim); margin-bottom: 8px; font-weight: 700;
}
.cd-aff-num { color: var(--rose); }
.cd-aff-track { height: 8px; background: #fff; border-radius: 4px; overflow: hidden; border: 1px solid var(--border); }
.cd-aff-fill {
  height: 100%;
  background: linear-gradient(90deg, #fb7185, #e11d48);
  border-radius: 4px; transition: width 0.6s cubic-bezier(0.16,1,0.3,1);
}

.cd-status-bar {
  padding: 10px 20px 14px;
  background: var(--cream); border-bottom: 1.5px solid var(--border); flex-shrink: 0;
  display: flex; align-items: center; gap: 16px;
}
.cd-status-item { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.cd-status-label { font-size: 11px; color: var(--text-dim); font-weight: 700; display: flex; justify-content: space-between; }
.cd-status-track { height: 6px; background: #fff; border-radius: 3px; overflow: hidden; border: 1px solid var(--border); }
.cd-status-fill { height: 100%; border-radius: 3px; transition: width 0.6s cubic-bezier(0.16,1,0.3,1); }

.cd-messages {
  flex: 1; min-height: 0;
  overflow-y: auto; padding: 24px 20px;
  display: flex; flex-direction: column; gap: 20px;
  background: var(--peach);
}
.cd-msg { max-width: 85%; animation: msgIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
.cd-bubble {
  padding: 14px 18px; border-radius: 20px;
  font-size: 15px; line-height: 1.6;
  box-shadow: 0 4px 15px rgba(0,0,0,0.04);
}
.cd-msg.npc .cd-bubble { 
  background: #fff; border: 1.5px solid var(--border); 
  color: var(--text-main); border-bottom-left-radius: 4px;
}
.cd-msg.user .cd-bubble {
  background: var(--rose); color: #fff; 
  border-bottom-right-radius: 4px;
}

.cd-input-area {
  padding: 16px 20px;
  background: #fff; border-top: 1.5px solid var(--border);
  display: flex; gap: 12px; align-items: flex-end; flex-shrink: 0;
}
.cd-textarea {
  flex: 1; background: var(--pink-soft); border: 1.5px solid var(--border);
  border-radius: 16px; padding: 12px 18px; color: var(--text-main);
  font-family: var(--font-body); font-size: 15px; resize: none;
  min-height: 48px; max-height: 140px; outline: none; transition: all 0.2s;
}
.cd-textarea:focus { background: #fff; border-color: var(--pink-accent); }
.cd-send-btn {
  width: 48px; height: 48px; border-radius: 50%;
  background: var(--rose); border: none; color: #fff; font-size: 20px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(225,29,72,0.25);
}

.cd-overlay {
  position: fixed; inset: 0; background: rgba(76, 5, 25, 0.4);
  backdrop-filter: blur(12px); z-index: 200;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.cd-scenario-card {
  width: 100%; max-width: 520px;
  max-height: 90vh;
  background: #fff; border-radius: 32px; overflow: hidden;
  box-shadow: 0 32px 100px rgba(0,0,0,0.15);
  display: flex; flex-direction: column;
}
.cd-scene-bg {
  height: 180px; display: flex; align-items: center; justify-content: center;
  font-size: 84px; position: relative;
  background: linear-gradient(135deg, var(--pink-light), var(--peach));
}
.cd-scene-body { padding: 32px; overflow-y: auto; }
.cd-scene-type { font-size: 12px; color: var(--rose); font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 12px; text-align: center; }
.cd-scene-desc { font-size: 16px; color: var(--text-dim); line-height: 1.7; margin-bottom: 20px; font-weight: 500; }
.cd-scene-dialogue {
  background: var(--pink-soft); border-radius: 20px; padding: 20px;
  font-size: 16px; color: var(--text-main); line-height: 1.6; margin-bottom: 24px;
  border: 1.5px solid var(--border);
}
.cd-choices { display: flex; flex-direction: column; gap: 12px; }
.cd-choice {
  padding: 16px 20px; border-radius: 16px; border: 2px solid var(--border);
  background: #fff; color: var(--text-main); font-weight: 600;
  font-size: 15px; text-align: left; transition: all 0.2s;
}
.cd-choice:hover { border-color: var(--rose); background: var(--pink-soft); transform: translateX(8px); }
.cd-choice.wood { border-color: rgba(74,140,92,0.35); }
.cd-choice.wood:hover { background: rgba(74,140,92,0.12); border-color: rgba(74,140,92,0.6); }
.cd-choice.fire { border-color: rgba(200,75,42,0.35); }
.cd-choice.fire:hover { background: rgba(200,75,42,0.12); border-color: rgba(200,75,42,0.6); }
.cd-choice.water { border-color: rgba(74,127,165,0.35); }
.cd-choice.water:hover { background: rgba(74,127,165,0.12); border-color: rgba(74,127,165,0.6); }
.cd-choice.earth { border-color: rgba(184,148,58,0.35); }
.cd-choice.earth:hover { background: rgba(184,148,58,0.12); border-color: rgba(184,148,58,0.6); }
.cd-choice.metal { border-color: rgba(140,160,184,0.35); }
.cd-choice.metal:hover { background: rgba(140,160,184,0.12); border-color: rgba(140,160,184,0.6); }
.cd-el-badge {
  display: inline-block; width: 20px; height: 20px; border-radius: 50%;
  font-size: 10px; text-align: center; line-height: 20px;
  margin-right: 8px; vertical-align: middle; font-weight: 700;
}
.cd-el-badge.wood { background: rgba(74,140,92,0.2); color: var(--wood-c); }
.cd-el-badge.fire { background: rgba(200,75,42,0.2); color: var(--fire-c); }
.cd-el-badge.water { background: rgba(74,127,165,0.2); color: var(--water-c); }
.cd-el-badge.earth { background: rgba(184,148,58,0.2); color: var(--earth-c); }
.cd-el-badge.metal { background: rgba(140,160,184,0.2); color: var(--metal-c); }

.cd-atmo {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.cd-atmo-chip {
  font-size: 10px;
  letter-spacing: 0.05em;
  color: var(--text-dim);
  border: 1px solid rgba(249,168,212,0.22);
  border-radius: 999px;
  padding: 3px 9px;
  background: rgba(255,255,255,0.03);
}

.cd-result { padding: 22px; text-align: center; }
.cd-critical {
  font-size: 12px; color: var(--gold);
  letter-spacing: 0.15em; margin-bottom: 16px;
  animation: breathe 1.5s ease-in-out infinite;
}
@keyframes breathe { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
.cd-result-dialogue {
  font-size: 14px; color: var(--text); line-height: 1.75;
  padding: 13px 15px;
  background: rgba(232,160,191,0.04);
  border-left: 2px solid var(--rose-dim);
  border-radius: 0 8px 8px 0; margin-bottom: 18px; text-align: left;
}
.cd-aff-result {
  font-family: var(--font-playful);
  font-size: 36px; line-height: 1; margin-bottom: 5px;
}
.cd-aff-result.pos { color: #5BA87A; text-shadow: 0 0 30px rgba(91,168,122,0.5); }
.cd-aff-result.neg { color: var(--crimson); text-shadow: 0 0 30px rgba(192,50,74,0.5); }
.cd-aff-result-label { font-size: 12px; color: var(--text-dim); margin-bottom: 22px; }
.cd-close-btn {
  padding: 12px 34px; background: transparent;
  border: 1px solid var(--gold-dim); border-radius: 10px; color: var(--gold);
  font-family: var(--font-body); font-size: 14px; letter-spacing: 0.04em;
  cursor: pointer; transition: all 0.3s;
}
.cd-close-btn:hover { background: rgba(200,169,110,0.1); border-color: var(--gold); }

.cd-toast {
  position: fixed; top: 80px; right: 20px;
  background: rgba(10,10,28,0.93); border: 1px solid var(--border);
  border-radius: 12px; padding: 11px 17px;
  font-size: 13px; color: var(--text-dim);
  z-index: 300; pointer-events: none;
  animation: toastIn 0.3s ease-out both;
}
@keyframes toastIn {
  from { transform: translateX(120%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

/* ── 배너 ── */
.lc-banner {
  width: 100%; max-width: 540px;
  border-radius: 18px; overflow: hidden; margin-bottom: 24px;
  box-shadow: 0 0 60px rgba(232,160,191,0.22);
  border: 1px solid rgba(232,160,191,0.18);
}
.lc-banner img { width: 100%; height: auto; display: block; }

/* ── 탭 ── */
.lc-tabs {
  display: flex; gap: 0;
  background: var(--glass);
  border: 1px solid var(--border);
  border-radius: 12px; margin-bottom: 28px;
  overflow: hidden;
}
.lc-tab {
  flex: 1; padding: 10px 16px;
  background: transparent; border: none;
  color: var(--text-dim); font-family: var(--font-body);
  font-size: 13px; cursor: pointer; transition: all 0.25s;
  letter-spacing: 0.05em;
}
.lc-tab.active {
  background: rgba(249,168,212,0.1);
  color: var(--rose);
  border-bottom: 2px solid var(--rose);
}

/* ── 젠더 토글 ── */
.lc-gender-toggle { display:flex; gap:10px; margin-bottom:18px; width:100%; max-width:520px; }
.lc-gender-btn {
  flex:1; padding:9px 18px; border-radius:12px; border:1px solid var(--border);
  background: var(--glass); color: var(--text-dim); font-family:var(--font-body);
  font-size:14px; cursor:pointer; transition: all 0.25s; letter-spacing:0.05em;
}
.lc-gender-btn.active-m {
  background: rgba(100,180,255,0.12); border-color: rgba(100,180,255,0.5); color:#93c5fd;
}
.lc-gender-btn.active-f {
  background: rgba(249,168,212,0.14); border-color: rgba(249,168,212,0.55); color: var(--rose);
}

/* ── 매칭 결과 카드 ── */
.lc-match-card {
  background: var(--glass); border:1px solid var(--border); border-radius:16px;
  padding:16px 18px; cursor:pointer; transition:all 0.28s; display:flex; align-items:center; gap:14px;
}
.lc-match-card:hover {
  border-color: var(--border-hover); transform:translateY(-3px);
  box-shadow: 0 8px 32px rgba(249,168,212,0.22);
}
.lc-match-rank {
  font-family:var(--font-playful); font-size:20px; color:var(--gold);
  width:32px; flex-shrink:0; text-align:center;
}
.lc-match-pct {
  font-family:var(--font-playful); font-size:17px; margin-left:auto; flex-shrink:0;
}
.lc-match-pct.high { color:#f9a8d4; }
.lc-match-pct.mid  { color:#fcd34d; }
.lc-match-pct.low  { color:#c4a0bf; }

/* ── 내 사주 설정 화면 ── */
.lc-self-header {
  font-family: var(--font-playful);
  font-size: clamp(18px, 4vw, 28px); color: #93c5fd;
  letter-spacing: 0.2em; text-align: center; margin-bottom: 6px;
  text-shadow: 0 0 40px rgba(100,180,255,0.35);
}
.lc-self-sub {
  font-family: var(--font-display); font-style: normal;
  font-size: 13px; color: var(--text-dim); text-align: center;
  margin-bottom: 30px; letter-spacing: 0.1em;
}
.lc-self-setup {
  width: 100%; max-width: 460px;
  background: linear-gradient(160deg, rgba(20,30,60,0.65), rgba(10,15,30,0.75));
  border: 1px solid rgba(100,180,255,0.22);
  border-radius: 22px; padding: 32px 28px;
  backdrop-filter: blur(20px); position: relative;
}
.lc-self-setup::before {
  content: '';
  position: absolute; inset: 0; border-radius: 22px;
  background: linear-gradient(135deg, rgba(100,180,255,0.04) 0%, transparent 60%);
  pointer-events: none;
}
.lc-self-avatar-preview {
  width: 90px; height: 90px; border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #1A2A40, #04040F);
  border: 2px solid rgba(100,180,255,0.55);
  display: flex; align-items: center; justify-content: center;
  font-size: 48px;
  box-shadow: 0 0 50px rgba(100,180,255,0.22), inset 0 0 30px rgba(0,0,0,0.5);
  margin: 0 auto 18px;
  animation: float 4s ease-in-out infinite;
  transition: transform 0.3s;
}
@keyframes avatarReveal {
  0% {
    opacity: 0;
    transform: scale(0.25) rotate(-14deg);
    filter: blur(16px) brightness(2.1);
  }
  45% {
    opacity: 1;
    transform: scale(1.16) rotate(2deg);
    filter: blur(0) brightness(1.35);
  }
  70% { transform: scale(0.94) rotate(-1deg); }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0);
    filter: blur(0) brightness(1);
  }
}
@keyframes particleBurst {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(1); }
}
@keyframes runeReveal {
  from { opacity: 0; transform: translateY(8px) scale(0.92); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.lc-avatar-birth-anim {
  position: relative;
  animation: avatarReveal 1.15s cubic-bezier(0.16,1,0.3,1) both;
}
.lc-avatar-particle {
  position: absolute;
  left: 50%; top: 50%;
  width: 8px; height: 8px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(147,197,253,0.95) 0%, rgba(147,197,253,0.05) 72%);
  box-shadow: 0 0 16px rgba(147,197,253,0.6);
  pointer-events: none;
  animation: particleBurst 1s ease-out forwards;
}
.lc-pillar-reveal {
  animation: runeReveal 0.5s ease-out both;
}
.lc-self-result {
  margin-top: 20px;
  background: rgba(100,180,255,0.06);
  border: 1px solid rgba(100,180,255,0.2);
  border-radius: 16px; padding: 18px 20px;
  text-align: center;
  animation: awaken 0.6s cubic-bezier(0.16,1,0.3,1) both;
}
.lc-self-result-title {
  font-family: var(--font-playful);
  font-size: 17px; color: #93c5fd; margin-bottom: 4px;
}
.lc-self-result-sub {
  font-size: 12px; color: var(--text-dim); margin-bottom: 12px;
}
.lc-self-traits {
  display: flex; flex-wrap: wrap; gap: 6px;
  justify-content: center; margin-bottom: 14px;
}
.lc-self-trait {
  padding: 4px 12px;
  border: 1px solid rgba(100,180,255,0.25); border-radius: 20px;
  font-size: 11px; color: rgba(147,197,253,0.85);
  background: rgba(100,180,255,0.07);
}
.lc-self-pillars {
  display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; margin: 10px 0;
}
.lc-self-pillar {
  background: rgba(100,180,255,0.06); border-radius: 8px;
  padding: 8px 4px; border: 1px solid rgba(100,180,255,0.15);
  text-align: center;
}
.lc-continue-btn {
  width: 100%; padding: 15px;
  background: linear-gradient(135deg, rgba(100,140,255,0.3), rgba(120,80,200,0.3));
  border: 1px solid rgba(100,180,255,0.45);
  border-radius: 10px; color: #93c5fd;
  font-family: var(--font-body);
  font-size: 15px; letter-spacing: 0.18em;
  cursor: pointer; margin-top: 18px;
  transition: all 0.3s; position: relative; overflow: hidden;
}
.lc-continue-btn:hover { box-shadow: 0 0 36px rgba(100,180,255,0.3); transform: translateY(-2px); }
.lc-skip-btn {
  margin-top: 12px; background: transparent; border: none;
  color: rgba(196,160,191,0.55); font-family:var(--font-body);
  font-size: 12px; cursor: pointer; letter-spacing: 0.08em;
  padding: 6px 0; display: block; width: 100%; text-align: center;
  transition: color 0.25s;
}
.lc-skip-btn:hover { color: var(--text-dim); }

/* ── 두 아바타 대면 (awakening) ── */
.lc-versus-wrap {
  display: flex; align-items: center; gap: 14px;
  width: 100%; max-width: 640px; margin-bottom: 18px;
}
.lc-versus-side {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.lc-versus-avatar {
  width: 76px; height: 76px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 42px;
  animation: awaken 0.6s cubic-bezier(0.16,1,0.3,1) both;
}
.lc-versus-avatar.mine {
  background: radial-gradient(circle at 35% 35%, #1A2A40, #04040F);
  border: 2px solid rgba(100,180,255,0.55);
  box-shadow: 0 0 36px rgba(100,180,255,0.2);
}
.lc-versus-avatar.npc {
  background: radial-gradient(circle at 35% 35%, #2A1A30, #04040F);
  border: 2px solid var(--gold-dim);
  box-shadow: 0 0 36px rgba(200,169,110,0.2);
}
.lc-versus-name { font-size: 13px; font-weight: 700; text-align: center; }
.lc-versus-name.mine { color: #93c5fd; }
.lc-versus-name.npc  { color: var(--gold); }
.lc-versus-dm { font-size: 10px; color: var(--text-dim); text-align: center; }
.lc-vs-sep {
  flex-shrink: 0;
  font-family: var(--font-playful);
  font-size: 14px; color: rgba(200,169,110,0.55);
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.lc-compat-block {
  width: 100%; max-width: 640px;
  background: linear-gradient(135deg, rgba(100,180,255,0.08), rgba(192,50,74,0.08));
  border: 1px solid rgba(100,180,255,0.22);
  border-radius: 16px; padding: 16px 20px;
  text-align: center; margin-bottom: 20px;
}
.lc-compat-num {
  font-family: var(--font-playful);
  font-size: 44px; line-height: 1;
  background: linear-gradient(135deg, #93c5fd 0%, #f9a8d4 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.lc-compat-label { font-size: 11px; color: var(--text-dim); margin-top: 4px; letter-spacing: 0.12em; }
.lc-compat-desc  { font-size: 12px; color: var(--rose); margin-top: 8px; }
/* 내 아바타 미니 뱃지 (chat header) */
.lc-my-mini {
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(30,50,80,0.8);
  border: 1px solid rgba(100,180,255,0.35);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
/* portal에 내 사주 배너 */
.lc-my-banner {
  width: 100%; max-width: 560px;
  background: rgba(100,180,255,0.06);
  border: 1px solid rgba(100,180,255,0.2);
  border-radius: 14px; padding: 12px 18px;
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 20px;
}
.lc-my-banner-edit {
  margin-left: auto; background: transparent; border: none;
  color: rgba(147,197,253,0.5); font-size: 11px; cursor: pointer;
  letter-spacing: 0.04em; font-family:var(--font-body);
  padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(100,180,255,0.18);
  transition: all 0.2s;
}
.lc-my-banner-edit:hover { color: #93c5fd; border-color: rgba(100,180,255,0.4); }
`;

/* ═══════════════════════════════════════════════
   ── 생시 12지지 선택 옵션 ──
═══════════════════════════════════════════════ */

const SINJU_OPTIONS = [
  { label: '자시 (子時, 23:00-01:00)', hour: 0,  han: '子', kr: '자' },
  { label: '축시 (丑時, 01:00-03:00)', hour: 2,  han: '丑', kr: '축' },
  { label: '인시 (寅時, 03:00-05:00)', hour: 4,  han: '寅', kr: '인' },
  { label: '묘시 (卯時, 05:00-07:00)', hour: 6,  han: '卯', kr: '묘' },
  { label: '진시 (辰時, 07:00-09:00)', hour: 8,  han: '辰', kr: '진' },
  { label: '사시 (巳時, 09:00-11:00)', hour: 10, han: '巳', kr: '사' },
  { label: '오시 (午時, 11:00-13:00)', hour: 12, han: '午', kr: '오' },
  { label: '미시 (未時, 13:00-15:00)', hour: 14, han: '未', kr: '미' },
  { label: '신시 (申時, 15:00-17:00)', hour: 16, han: '申', kr: '신' },
  { label: '유시 (酉時, 17:00-19:00)', hour: 18, han: '酉', kr: '유' },
  { label: '술시 (戌時, 19:00-21:00)', hour: 20, han: '戌', kr: '술' },
  { label: '해시 (亥時, 21:00-23:00)', hour: 22, han: '亥', kr: '해' },
];

/* ─────────────────────────────────────────────
   사주 팔자 API 호출 (/api/love-saju-pillar)
   lunar-javascript 절기 기반 정확 계산
───────────────────────────────────────────── */
async function fetchSajuPillar({ name, gender, year, month, day, hour }) {
  const res = await fetch('/api/love-saju-pillar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, gender, year, month, day, hour }),
  });
  if (!res.ok) throw new Error(`saju-api ${res.status}`);
  return res.json();
}

/* ─ API 응답 → 페르소나 객체 변환 ─ */
function apiDataToPersona(data) {
  return {
    name:         data.name,
    gender:       data.gender,
    dayMaster:    data.dayMasterName,
    dayMasterKan: data.dayMasterGanKr,
    dayMasterElement: data.dayMasterElement,
    mbti:         data.mbti,
    coreTraits:   data.coreTraits,
    stats:        data.stats,
    tastes: {
      idealDateSpot: data.idealDateSpot,
      favTaste:      data.favTaste,
    },
    fiveElements:  data.fiveElements,
    specialStars:  data.specialStars,
    yongshin:      data.yongshin,
    initialAffinity: data.initialAffinity,
    greeting:      data.greeting,
    scenarioEmoji: data.scenarioEmoji,
    dmEmoji:       data.dmEmoji,
    pillars:       data.pillars,
    mainSipsin:    data.mainSipsin,
    sipsinTraits:  data.sipsinTraits,
    sajuPersonaSummary: data.sajuPersonaSummary,
    id: `npc_${Date.now()}`,
  };
}

/* ─ 오행 궁합 점수 계산 (로컬, 일간 기반) ─ */
const EL_HARMONY = {
  목: { 목:4, 화:6, 토:1, 금:2, 수:5 },
  화: { 목:5, 화:4, 토:6, 금:1, 수:2 },
  토: { 목:2, 화:5, 토:4, 금:6, 수:1 },
  금: { 목:1, 화:2, 토:5, 금:4, 수:6 },
  수: { 목:6, 화:1, 토:2, 금:5, 수:4 },
};
function elemHarmony(el1, el2) {
  return (EL_HARMONY[el1]?.[el2] || 3) + (EL_HARMONY[el2]?.[el1] || 3);
}

const STEMS = ['갑','을','병','정','무','기','경','신','임','계'];
const STEM_ELEMENTS = ['목','목','화','화','토','토','금','금','수','수'];

const DM_EMOJI = {
  갑:'🌲',을:'🌸',병:'☀️',정:'🕯️',무:'⛰️',기:'🌾',경:'⚔️',신:'💎',임:'🌊',계:'🌧️'
};
const EL_CLASS = { 목:'wood', 화:'fire', 토:'earth', 금:'metal', 수:'water' };
const MOOD_EMOJI = { 기쁨:'😊', 슬픔:'🥺', 화남:'😠', 설렘:'🥰', 냉담함:'😑' };

const STAT_META = {
  passion:     { label:'열정', color:'#C84B2A' },
  empathy:     { label:'공감', color:'#4A8C5C' },
  logic:       { label:'논리', color:'#8CA0B8' },
  stability:   { label:'안정', color:'#B8943A' },
  sociability: { label:'사교성', color:'#E8A0BF' },
};

/* BRANCHES 는 응답 데이터 표시용으로만 유지 */
const BRANCHES = ['자','축','인','묘','진','사','오','미','신','유','술','해'];

/* ═══════════════════════════════════════════════
   ── 대화 & 시나리오 로컬 데이터베이스 ──
═══════════════════════════════════════════════ */

// 사용자 입력 키워드 → 호감도 판정
const POSITIVE_KEYWORDS = ['좋아','예뻐','멋있','대단','칭찬','귀엽','재밌','보고싶','설레','맞아','진짜','완전','최고','ㅋㅋ','😊','❤️','💕','🥰'];
const NEGATIVE_KEYWORDS = ['싫어','별로','무섭','촌스','지루','답답','이상','아니','그냥','모르','어색','피곤','🙄','😒'];
const EMPATHY_KEYWORDS = ['괜찮아','미안','고생','힘들','이해','들어줄게','천천히','걱정','괜히','상처'];
const AGGRESSIVE_KEYWORDS = ['닥쳐','꺼져','짜증','병신','미쳤','최악','한심','개같','fuck','shit'];
const ROMANCE_NICKNAMES = ['자기야','자기','애기','우리','오빠','누나','공주','왕자'];

function analyzeUserInput(text, persona) {
  const raw = String(text || '').trim();
  const lower = raw.toLowerCase();
  let score = 0;

  POSITIVE_KEYWORDS.forEach(k => { if (lower.includes(k)) score += 2; });
  NEGATIVE_KEYWORDS.forEach(k => { if (lower.includes(k)) score -= 2; });

  EMPATHY_KEYWORDS.forEach(k => { if (lower.includes(k)) score += 2; });
  AGGRESSIVE_KEYWORDS.forEach(k => { if (lower.includes(k)) score -= 4; });

  ROMANCE_NICKNAMES.forEach(k => {
    if (lower.includes(k)) score += (persona?.initialAffinity || 0) > 35 ? 2 : 1;
  });

  // 존중 화법은 정관/정인 성향에게 특히 가산
  const politeStyle = /(요\b|습니다|해요|괜찮으|고마워요|미안해요)/.test(lower);
  if (politeStyle) {
    const sipsin = persona?.mainSipsin;
    score += (sipsin === '정관' || sipsin === '정인') ? 2 : 1;
  }

  // 한두 단어 답변은 몰입감 저하로 약한 감점
  if (raw.length > 0 && raw.length < 4) score -= 1;

  // 용신 오행 키워드 보너스
  const elKeywords = { 목:'자연|산|나무|꽃|초록', 화:'불|열정|뜨거|핫|에너지', 토:'안정|집|따뜻|믿음|편안', 금:'멋있|강해|냉철|날카|미래', 수:'자유|여행|바다|흐름|직관' };
  const yonkw = elKeywords[persona?.yongshin] || '';
  yonkw.split('|').forEach(k => { if (lower.includes(k)) score += 3; });
  return Math.max(-8, Math.min(8, score));
}

// 일간별 NPC 응답 패턴
const NPC_RESPONSES = {
  갑: {
    기쁨: ["그래, 나도 그렇게 생각했어. 역시.", "네가 그렇게 말해주니까 기분 좋다—별로 티 안 내는 편인데.", "흠, 맞네. 사실 나도 기대하고 있었어."],
    슬픔: ["…뭔가 기분이 꺼지네. 말 없어도 돼.", "아무것도 아니야. 그냥 생각할 게 많아서.", "혼자 있고 싶은 거 아닌데, 위로 같은 건 됐어."],
    화남: ["솔직히 그 말 좀 불편했어. 그냥 넘어가기가 싫더라고.", "나 화 잘 안 내는데, 지금 좀 그래.", "…했어? 아, 알겠어. 나중에 얘기하자."],
    설렘: ["왜 이런 기분인데. 좀 낯서네.", "별거 아닌데 신경 쓰여. 이상하다.", "…솔직히 좀 기대돼. 이런 말 잘 안 하는데."],
    냉담함: ["그래.", "…그냥 그렇구나.", "어떻게 반응해야 할지 모르겠어."],
  },
  을: {
    기쁨: ["어, 정말? 그렇게 봐줘서 고마워 😊", "나도 그렇게 느꼈는데 같은 생각이라니까.", "사실 좀 불안했거든. 그 말 들으니까 한결 나아."],
    슬픔: ["…그냥 좀 복잡해. 별거 아닌데.", "괜찮아. 관심 가져줘서 고마워.", "아무것도 아니야—진짜로. 신경 써줘서 따뜻하다."],
    화남: ["화가 아니라, 좀 상처받은 거야.", "굳이 싸울 생각은 없어. 그냥 알아줬으면 해.", "…다음엔 좀 더 조심해줄래?"],
    설렘: ["어, 왜 이렇게 신경 쓰이지.", "나 이런 거 잘 못 숨기는 편인데—티 나?", "즐거워. 오랜만에 이런 기분."],
    냉담함: ["어, 그렇구나.", "…잘 모르겠어.", "알겠어."],
  },
  병: {
    기쁨: ["진짜?! 나도! 완전 통했다 ㅋㅋ", "역시 너랑 대화하면 재밌어. 에너지 받는다 진짜.", "아 맞아 맞아! 그렇게 생각했는데 다행이다."],
    슬픔: ["야 왜 그래. 나한테 얘기해도 되는데.", "에이 그런 날 있잖아. 같이 맛있는 거 먹으러 가자!", "내가 뭐 잘못한 거 있어? 말해."],
    화남: ["진짜? 그랬어? 솔직히 나 좀 황당한데.", "아 그거 좀 아니지 않아? 솔직히.", "직접 말해. 나 숨기는 거 진짜 못 참아."],
    설렘: ["야 왜 이렇게 설레 ㅋㅋ 진짜 낯설다.", "나 이런 거 잘 티나나? 어색한데 좋다.", "뭔가 기대되는 게 있어—뭔지 모르겠지만."],
    냉담함: ["어, 뭐.", "응.", "알겠어."],
  },
  정: {
    기쁨: ["그 말, 진짜 내 마음이랑 같아. 고마워 💕", "나 그런 거 좋아하는 거 알았어? 세심하다.", "같이 있으면 따뜻해. 자꾸 기대고 싶어져."],
    슬픔: ["말 안 해도 알아. 그냥 옆에 있어줄게.", "나 표정 관리 잘 못하나봐. 티났어?", "…괜찮아. 이런 순간 같이 있어줘서 고마워."],
    화남: ["상처받은 거야, 화난 게 아니라.", "말하기 싫은데 알아줬으면 해. 모순이지.", "나한테 좀 더 신경 써줄 수 있어?"],
    설렘: ["왜 이렇게 두근거리지. 오랜만이다 이 느낌.", "나 좀 속 보이는 편인데… 괜찮아?", "자꾸 생각나. 어떡하지."],
    냉담함: ["그렇구나.", "…알겠어.", "응."],
  },
  무: {
    기쁨: ["그런 거 알아채줘서 고마워. 별로 없는데.", "나 표현 잘 못하는데, 좋긴 해.", "믿어도 되는 사람이란 게 느껴져."],
    슬픔: ["그냥 좀 지쳐서 그래. 걱정하지 마.", "…내 얘기 들어줄 여유 있어?", "시간이 좀 있으면 해결되는 거야."],
    화남: ["나 화 잘 안 내는데. 진짜 좀 지나쳤어.", "지금 당장 말하기보다 좀 생각해보고 싶어.", "이런 일 반복되면 나도 힘들어."],
    설렘: ["뭔가 평소랑 다르게 신경 쓰이네.", "별 감정 없다고 생각했는데. 낯설다.", "믿었는데 더 생겨나고 있어. 좋은 건지 모르겠어."],
    냉담함: ["어.", "알겠어.", "그렇군."],
  },
  기: {
    기쁨: ["진짜? 나도 그렇게 생각했어 😊 역시!", "어, 맞아 맞아! 눈치 빠르다.", "자꾸 이야기하고 싶어진다. 나 이러면 안 되는데 ㅋㅋ"],
    슬픔: ["나 사실 좀 속상했어. 말 못 했는데.", "표현 안 하다 혼자 쌓이는 편이야.", "자꾸 신경 써줘서 오히려 더 약해지는 것 같아."],
    화남: ["나 참는 거 많이 쌓이면 이상해져.", "솔직히 좀 섭섭했어.", "그냥 한번만 먼저 물어봐줬으면 했어."],
    설렘: ["나 티나나 ㅋㅋ 어색해.", "자꾸 생각나서 뭔가 이상해.", "이런 거 좀 쑥스러운데 말하고 싶어진다."],
    냉담함: ["어, 뭐 그렇지.", "응.", "알겠어."],
  },
  경: {
    기쁨: ["솔직히 좀 인정할게. 잘했어.", "나 칭찬 잘 안 하는 편인데, 진심으로 하는 거야.", "좋아. 그게 맞아."],
    슬픔: ["감정 표현 잘 못해서. 티 안 내는 거야.", "…나한테 말하기 불편하면 됐어.", "그냥 이기적으로 혼자 있고 싶어."],
    화남: ["직접 말할게. 그건 아니었어.", "기분 나쁜 척 안 하는 편인데 지금은 좀 그래.", "다음엔 그러지 마."],
    설렘: ["뭔가 이상하게 신경 쓰여. 내 스타일 아닌데.", "흠. 좋은 게 좋은 건데 인정하는 게 좀 그래.", "솔직히 좀 기다려졌어."],
    냉담함: ["그래.", "뭐.", "알겠어."],
  },
  신: {
    기쁨: ["…생각보다 마음에 들어. 진짜로.", "나 쉽게 이런 말 안 하는 편인데. 좋아.", "맞아. 나도 그 부분 신경 썼는데 알아줘서 기뻐."],
    슬픔: ["말 없다고 괜찮은 게 아니야.", "…별거 아닌 것처럼 보이지만 좀 힘들어.", "세심하게 봐줘서 고마워. 혼자만 알아채는 건 피곤하거든."],
    화남: ["표현 안 했다고 몰라야 하는 건 아니잖아.", "완벽하고 싶었는데 기대 이하야서.", "…한번 더 그러면 진짜 정 떨어질 것 같아."],
    설렘: ["…왜 이러지. 이런 거 별로 안 좋아하는데.", "마음이 좀 복잡해. 좋은 방향으로.", "자꾸 기억에 남는다."],
    냉담함: ["그렇구나.", "…알겠어.", "네."],
  },
  임: {
    기쁨: ["오 신기하다? 나랑 비슷하게 생각했네!", "어 재밌다 이거. 더 얘기해봐.", "나 궁금한 게 많은 편인데 너한테는 더 생기네."],
    슬픔: ["뭔가 계속 흘러가는 기분이야. 이상하게.", "잠깐 멈추고 싶어. 같이 있어줘.", "…생각이 너무 많아서 말 못 하겠어."],
    화남: ["직접 충돌은 좀 번거로운데, 뭔가 맞지 않는 느낌이야.", "흠. 그건 좀 아닌 것 같은데.", "내가 지금 왜 이러는지 나도 모르겠어."],
    설렘: ["이상하게 자꾸 돌아오게 돼. 왜 그런지 모르겠어.", "나 잘 안 끌리는 편인데 뭔가 다르네.", "…계속 생각할 것 같아."],
    냉담함: ["그렇구나.", "어.", "응 뭐."],
  },
  계: {
    기쁨: ["…그 말, 생각보다 많이 와닿았어.", "나 표현 서투른데. 고마워 그냥.", "너랑 있으면 조용한데 불편하지 않아."],
    슬픔: ["말로 하기 어려운 게 있어. 알아줬으면 해.", "…괜찮다고 하고 싶은데 솔직히 잘 모르겠어.", "혼자 있는 게 편할 때가 있어. 지금처럼."],
    화남: ["뭔가 잘못됐는데 딱 집어 말 못하겠어.", "…상처받은 것 같아. 말 안 해도 알아줬으면.", "그냥 조금만 더 신경 써줬으면 했어."],
    설렘: ["이상하게 자꾸 네 생각이 나. 왜 그러지.", "…마음이 흔들리는 게 좀 낯설어.", "나 이런 거 잘 못 숨기는데 괜찮은지 모르겠어."],
    냉담함: ["…", "그렇구나.", "알겠어."],
  },
};

/* ═══════════════════════════════════════════════
   ── 십신별 특수 이벤트 반응 ──
═══════════════════════════════════════════════ */

const SIPSIN_JEALOUSY = {
  편관: (name) => `"잠깐만— (상대방을 데리고 자리를 피하며) 이 사람 나랑 같이 온 거야. 다음에는 그냥 지나쳐줘."`,
  정관: (name) => `"(당황한 기색을 숨기며, 예의바르게) 죄송하지만 지금 데이트 중입니다. 양해해 주시겠어요?"`,
  식신: (name) => `"오~ 번호를요? (웃으며 ${name}을 바라보며) 미안한데, 이 사람이 내 사람이라서요~ 하하."`,
  상관: (name) => `"(직접적으로) 우리 데이트 중이에요. 그냥 가주시면 좋겠는데요?"`,
  정인: (name) => `"(속으로는 질투가 끓어오르지만 표정을 관리하며) 괜찮아, 그럴 수도 있지. 근데…나는 좀 속상해."`,
  편인: (name) => `"(말없이 ${name}의 팔을 살짝 잡으며) …가자."`,
  비견: (name) => `"(눈빛이 날카로워지며) 뭐야, 내 앞에서 번호를 물어봐? 솔직히 좀 기분 나쁜데."`,
  겁재: (name) => `"(자존심이 상했지만 쿨한 척하며) 아, 뭐 번호는 줄 수 있지. 근데 ${name}이 원하면 얘기 달라."`,
  편재: (name) => `"어— (쾌활하게 웃으며) 내가 먼저 찜한 거야. 타이밍 아쉽네요~ 다음에."`,
  정재: (name) => `"(조금 긴장하며) 지금 함께 있는 분인데요. (${name}에게 귓속말로) 어떡하지?"`,
};

const SIPSIN_BILL_REACTION = {
  편재: (name) => `"(먼저 카드를 꺼내며) 이거 내가 낼게. 이런 거 내는 게 좋아."`,
  정재: (name) => `"(영수증을 꼼꼼히 보며) 우리 반반으로 하자. 아니면 내가 낼까? 아직 어색하잖아."`,
  비견: (name) => `"(자존심을 걸며) 아니, 내가 낼게. 다음에 ${name}이 내."`,
  겁재: (name) => `"내가 낸다고. 이런 거 지면 안 되지— 농담이야. 그냥 내고 싶어서."`,
  식신: (name) => `"(웃으며 배를 잡으며) 나 이거 진짜 맛있었어. 내가 부를게~ 다음엔 ${name}이 내는 거로."`,
  상관: (name) => `"(카드를 꺼내면서) 내가 낼게. 이런 거 따지는 거 좀 별로야, 솔직히."`,
  정관: (name) => `"(조용히 카드를 낸다) 오늘은 내가 낼게. 다음엔 ${name}이 준비해줘."`,
  편관: (name) => `"(단호하게) 내가 낸다. 끝."`,
  정인: (name) => `"(${name}이 카드를 꺼내기 전에 먼저 결제하며) 괜찮아, 내가 낼게. 오늘 즐거웠어."`,
  편인: (name) => `"(조용히 카드를 내밀며) …그냥 내가 낼게. 어색하게 따지지 말자."`,
};

const SIPSIN_DRUNK_REVEAL = {
  갑: (name) => `"…나 사실 처음부터 ${name}이 좋았어. 직진이 내 스타일이라서— 오늘 말하려고 했어, 진짜로."`,
  을: (name) => `"(호기심 가득한 눈빛으로) 나 ${name}한테 사실 많이 의지하고 싶었어. 혼자 다 하는 척하는데 피곤하거든."`,
  병: (name) => `"야 진짜야— (신나서) 나 오늘 진짜 즐거웠어. 너랑 있으면 세상이 더 예쁘잖아, 진짜로!"`,
  정: (name) => `"(눈이 촉촉해지면서) 있잖아, 나… ${name}이 소중해. 잃고 싶지 않아. 그게 다야."`,
  무: (name) => `"(무거운 말을 꺼내며) 나 쉽게 사람 안 믿는데, 너는 달라. 시간이 지날수록 더."`,
  기: (name) => `"(뭔가 고백하려다 웃으며) 야, 나 사실 ${name}이 옆에 있으면 편해. 그게 제일 무서운 거야."`,
  경: (name) => `"(평소보다 솔직해지며) 나 원래 이런 말 못 하는데— 좋아해. 짧게 말하는 편이라서."`,
  신: (name) => `"(살짝 눈물이 맺히며) 사실 나 외로웠어. ${name} 알아줬으면 했는데— 이제 말했으니까 됐어."`,
  임: (name) => `"(바람처럼 흘려보내던 말들이 쏟아지며) 나 사실 ${name}이랑 계속 있고 싶어. 흘러가기 싫다, 오늘만큼은."`,
  계: (name) => `"(작은 목소리로) …나 사실 ${name}이 많이 마음에 걸려. 아무한테도 이런 말 못 했는데."`,
};

function getSipsinJealousy(persona) {
  const fn = SIPSIN_JEALOUSY[persona.mainSipsin] || SIPSIN_JEALOUSY['정관'];
  return fn(persona.name);
}
function getSipsinBillReaction(persona) {
  const fn = SIPSIN_BILL_REACTION[persona.mainSipsin] || SIPSIN_BILL_REACTION['정관'];
  return fn(persona.name);
}
function getSipsinDrunkReveal(persona) {
  const fn = SIPSIN_DRUNK_REVEAL[persona.dayMasterKan] || SIPSIN_DRUNK_REVEAL['갑'];
  return fn('당신');
}

/* 호감도 단계 레이블 */
function affinityLabel(val) {
  if (val < 15)  return '낯선 사이';
  if (val < 30)  return '조심스러운 호기심';
  if (val < 50)  return '설레는 만남';
  if (val < 70)  return '서로를 알아가는 중';
  if (val < 85)  return '특별한 인연';
  return '운명의 상대';
}

function getNPCResponse(stem, mood, affinityChange) {
  const stemSafe = Object.keys(NPC_RESPONSES).includes(stem) ? stem : '갑';
  const moodSafe = Object.keys(NPC_RESPONSES[stemSafe]).includes(mood) ? mood : '냉담함';
  const pool = NPC_RESPONSES[stemSafe][moodSafe];
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildFinalEnding({ persona, affinity, scenarioHistory }) {
  const totalDelta = scenarioHistory.reduce((acc, cur) => acc + (cur.delta || 0), 0);
  const hitCount = scenarioHistory.filter((x) => x.isHit).length;
  const highRiskCount = scenarioHistory.filter((x) => x.risk === 'HIGH').length;
  const placeCount = [...new Set(scenarioHistory.map((x) => x.type))].length;

  const arcScore = Math.max(0, Math.min(100,
    Math.round((affinity * 0.55) + ((totalDelta + 30) * 0.55) + (hitCount * 4) - (highRiskCount * 2))
  ));

  let endingTier = 'bittersweet';
  if (arcScore >= 92 && affinity >= 90 && hitCount >= 4) endingTier = 'mythic';
  else if (arcScore >= 84 && affinity >= 82) endingTier = 'fated';
  else if (arcScore >= 75) endingTier = 'deep';
  else if (arcScore >= 65) endingTier = 'steady';
  else if (arcScore >= 55) endingTier = 'wavering';
  else if (arcScore >= 43) endingTier = 'bittersweet';
  else if (arcScore >= 30) endingTier = 'drift';
  else endingTier = 'closed';

  const endingMap = {
    mythic: {
      title: '서사시 엔딩',
      line: `${persona.name}와 당신은 서로를 각성시키는 동반자로 진화했습니다.`,
      fate: '연애를 넘어 인생 파트너십으로 확장되는 강한 인연입니다.',
      color: 'text-fuchsia-100',
    },
    fated: {
      title: '운명 결속 엔딩',
      line: `${persona.name}와 당신은 서로의 결핍을 채우는 궁합으로 깊게 결속됩니다.`,
      fate: '썸을 넘어 진지한 연인 단계로 빠르게 진입할 가능성이 높습니다.',
      color: 'text-rose-200',
    },
    deep: {
      title: '심연 공명 엔딩',
      line: `${persona.name}와 당신은 감정의 결을 깊게 이해하며 밀도를 쌓아갑니다.`,
      fate: '강한 신뢰를 기반으로 한 깊은 관계로 이어질 확률이 높습니다.',
      color: 'text-amber-100',
    },
    steady: {
      title: '장기 연애 엔딩',
      line: `${persona.name}와 당신은 속도보다 신뢰를 선택하며 안정적인 관계를 만듭니다.`,
      fate: '자주 부딪히더라도 대화로 복구 가능한 건강한 인연입니다.',
      color: 'text-amber-200',
    },
    wavering: {
      title: '진동 엔딩',
      line: `${persona.name}와 당신은 끌림과 망설임 사이를 오가며 리듬을 찾는 중입니다.`,
      fate: '한 번의 깊은 대화가 관계 방향을 결정할 수 있습니다.',
      color: 'text-cyan-100',
    },
    bittersweet: {
      title: '미완의 계절 엔딩',
      line: `${persona.name}와 당신은 강한 끌림은 있었지만 리듬 차이를 완전히 좁히진 못했습니다.`,
      fate: '좋은 기억으로 남거나, 시간 후 재회 가능성이 있는 인연입니다.',
      color: 'text-indigo-200',
    },
    drift: {
      title: '엇갈린 궤도 엔딩',
      line: `${persona.name}와 당신은 감정의 타이밍이 자주 어긋나며 거리가 벌어졌습니다.`,
      fate: '지금은 인연을 놓아주는 편이 서로에게 더 나은 결말일 수 있습니다.',
      color: 'text-slate-200',
    },
    closed: {
      title: '종장 엔딩',
      line: `${persona.name}와 당신의 이야기는 이번 장에서 조용히 닫혔습니다.`,
      fate: '관계를 멈추고 자신을 회복하는 선택이 필요한 시기입니다.',
      color: 'text-zinc-300',
    },
  };

  const selected = endingMap[endingTier];
  return {
    ...selected,
    score: affinity,
    arcScore,
    hitCount,
    totalDelta,
    highRiskCount,
    placeCount,
  };
}

const SCENE_ATMOSPHERE = {
  '카페 데이트': {
    visual: '노을 카페 · 창가 잔광',
    sound: 'vinyl_jazz, cup_clink, soft_chatter',
    bg: 'linear-gradient(160deg, rgba(52,24,66,0.92), rgba(30,14,42,0.9))',
  },
  '공원 산책': {
    visual: '벚꽃 산책로 · 저녁 바람',
    sound: 'petal_wind, footstep_gravel, dusk_birds',
    bg: 'linear-gradient(160deg, rgba(36,62,56,0.92), rgba(22,30,46,0.9))',
  },
  '저녁 식사': {
    visual: '도심 레스토랑 · 금빛 조명',
    sound: 'cutlery, lounge_piano, low_ambience',
    bg: 'linear-gradient(160deg, rgba(54,30,32,0.95), rgba(28,16,24,0.9))',
  },
  '영화 관람': {
    visual: '엔딩 크레딧 · 잔광',
    sound: 'film_theme, projector_hum, popcorn_crisp',
    bg: 'linear-gradient(160deg, rgba(20,24,44,0.95), rgba(8,12,24,0.92))',
  },
  '드라이브': {
    visual: '야간 도로 · 네온 반사',
    sound: 'night_drive, radio_lofi, city_passby',
    bg: 'linear-gradient(160deg, rgba(16,28,52,0.95), rgba(8,12,24,0.92))',
  },
  '전시회': {
    visual: '화이트 큐브 · 정적 공명',
    sound: 'gallery_reverb, soft_step, distant_whisper',
    bg: 'linear-gradient(160deg, rgba(44,42,62,0.93), rgba(24,22,36,0.92))',
  },
  '야외 나들이': {
    visual: '능선 전망 · 맑은 공기',
    sound: 'mountain_wind, fabric_rustle, breath_sync',
    bg: 'linear-gradient(160deg, rgba(32,58,48,0.93), rgba(16,28,34,0.92))',
  },
  '해질녘 산책': {
    visual: '매직 아워 · 주황빛 거리',
    sound: 'sunset_city, distant_laughter, slow_steps',
    bg: 'linear-gradient(160deg, rgba(72,38,44,0.94), rgba(28,14,22,0.92))',
  },
  '갑작스러운 비': {
    visual: '빗소리 골목 · 한 우산',
    sound: 'rain_soft, umbrella_tap, wet_street',
    bg: 'linear-gradient(160deg, rgba(20,30,52,0.95), rgba(10,16,28,0.93))',
  },
  '영화관 취향 배틀': {
    visual: '극장 로비 · 팝콘 향',
    sound: 'cinema_hall, trailer_bass, ticket_beep',
    bg: 'linear-gradient(160deg, rgba(44,18,36,0.95), rgba(20,10,22,0.93))',
  },
  '기념일 깜짝 이벤트': {
    visual: '리본 선물 · 손끝 떨림',
    sound: 'ribbon_rustle, heart_beat, warm_pad',
    bg: 'linear-gradient(160deg, rgba(68,22,42,0.95), rgba(26,10,22,0.93))',
  },
  '계산서 배틀': {
    visual: '테이블 위 카드 · 눈빛 전쟁',
    sound: 'card_slide, table_hum, quiet_laugh',
    bg: 'linear-gradient(160deg, rgba(52,28,34,0.95), rgba(24,14,20,0.93))',
  },
  '방해자의 등장': {
    visual: '거리 교차점 · 긴장 정적',
    sound: 'street_murmur, sudden_silence, heartbeat_low',
    bg: 'linear-gradient(160deg, rgba(46,18,28,0.95), rgba(20,10,18,0.93))',
  },
  '과거의 그림자': {
    visual: '옛 기억의 잔상 · 멈춘 발걸음',
    sound: 'memory_echo, city_lowpass, slowed_breath',
    bg: 'linear-gradient(160deg, rgba(26,24,44,0.95), rgba(16,12,22,0.93))',
  },
  '취중 진담': {
    visual: '늦은 바 · 낮은 조도',
    sound: 'ice_clink, bar_roomtone, confessional_piano',
    bg: 'linear-gradient(160deg, rgba(50,24,40,0.95), rgba(18,10,18,0.93))',
  },
};

function getScenarioAtmosphere(sc) {
  if (!sc) return null;
  return SCENE_ATMOSPHERE[sc.type] || {
    visual: '심야 데이트 · 미지의 기류',
    sound: 'night_ambience, soft_piano, pulse',
    bg: 'linear-gradient(160deg, rgba(18,14,28,0.95), rgba(10,8,16,0.92))',
  };
}

/* ═══════════════════════════════════════════════
   ── 시나리오 데이터베이스 ──
   (다양한 데이트 코스 × 오행 선택지)
═══════════════════════════════════════════════ */

const SCENARIO_DB = [
  {
    backgroundEmoji: '☕🌙',
    type: '카페 데이트',
    situationDescription: '늦은 오후, 골목 안 작은 카페에 마주 앉았다. 창밖으로 노을이 스며들고, 커피 향이 은은하게 번진다.',
    npcDialogue: (name) => `"뭐 마실 거야? 나는 보통 달달한 거 시키는 편인데— ${name}는 어때?"`,
    choices: [
      { id:'c1', text:'같은 걸로 시킬게. 너의 취향이 궁금해서.', element:'목', risk:'LOW', reaction: (name) => `"어, 진짜? 선택이 같다는 게 왜 이렇게 좋지. ${name}한테는 솔직하게 말하고 싶어져."`, score:+6 },
      { id:'c2', text:'나는 아메리카노. 단 건 좀 별로거든.', element:'금', risk:'MEDIUM', reaction: (name) => `"그렇구나— 나랑 취향이 다르네. 근데 솔직하게 말하는 거 나쁘지 않아."`, score:+2 },
      { id:'c3', text:'(스마트폰을 꺼내 메뉴 사진 찍으며) 잠깐, 인스타에 올려야 해서.', element:'화', risk:'HIGH', reaction: (name) => `"아… 그래. 올리고 싶으면 올려. 근데 나 사진은 좀 사전에 얘기해줘야 하는 타입이야."`, score:-3 },
    ],
  },
  {
    backgroundEmoji: '🌸🚶',
    type: '공원 산책',
    situationDescription: '봄바람이 스치는 공원, 벚꽃 잎이 흩날린다. 나란히 걷다가 벤치 앞에 멈춰 섰다.',
    npcDialogue: (name) => `"여기 앉을까? 좀 쉬고 싶어서— ${name}는 걷는 거 괜찮아?"`,
    choices: [
      { id:'c1', text:'나야 좋지. 이 경치 그냥 지나치기 아깝잖아.', element:'목', risk:'LOW', reaction: (name) => `"맞아, 이런 순간이 좋아. ${name}랑 같이 보니까 더 예쁘다."`, score:+7 },
    ],
  },
  /* ── 신규: 늦은 밤 산책 ── */
  {
    backgroundEmoji: '🌙🌃',
    type: '늦은 밤 산책',
    narrative: '가로등 불빛만 남은 조용한 거리. 차가운 밤공기가 두 사람 사이를 감싸지만, 맞잡은 온기가 느껴질 것만 같다.',
    situationDescription: '밤이 깊었습니다. 집으로 돌아가는 길, 상대방이 조금 느리게 걷기 시작합니다.',
    npcDialogue: (name) => `"벌써 이렇게 됐네. 시간 진짜 빠르다. (${name}을 힐끗 보며) 오늘 하루 어땠어?"`,
    choices: [
      { id:'c1', text:'아쉬워. 조금 더 걷고 싶을 정도로.', element:'수', risk:'LOW', trustDelta: 3, tensionDelta: 8, reaction: (name) => `"(살짝 웃으며) 나도. 그럼 한 바퀴만 더 돌까?"`, score:+9 },
      { id:'c2', text:'피곤하긴 한데, 네 목소리 들으니까 괜찮아.', element:'화', risk:'MEDIUM', trustDelta: 2, tensionDelta: 10, reaction: (name) => `"…그런 말 어디서 배워와? 사람 당황스럽게."`, score:+8 },
      { id:'c3', text:'응, 재밌었어. 내일 출근 잘해.', element:'금', risk:'HIGH', trustDelta: 1, tensionDelta: -5, reaction: (name) => `"…그래, 현실적이네. 너도 잘 가."`, score:-2 },
      { id:'c4', text:'말없이 웃으며 고개를 끄덕인다.', element:'토', risk:'LOW', trustDelta: 5, tensionDelta: 5, reaction: (name) => `"(함께 미소 지으며) 나도 그래. 말 안 해도 알 것 같아."`, score:+7 },
    ],
  },
  /* ── 신규: 사소한 오해 ── */
  {
    backgroundEmoji: '🗯️😕',
    type: '사소한 오해',
    narrative: '농담처럼 던진 한마디가 상대방의 표정을 굳게 만들었다. 공기가 순식간에 서늘해진다.',
    situationDescription: '방금 한 농담이 상대방의 아픈 곳을 건드린 모양입니다. 분위기가 급격히 가라앉습니다.',
    npcDialogue: (name) => `"…방금 그 말, 무슨 뜻으로 한 거야? 나한테는 좀 그렇게 들리는데."`,
    choices: [
      { id:'c1', text:'미안해. 그런 뜻 아니었어. 내가 생각이 짧았네.', element:'토', risk:'LOW', trustDelta: 8, tensionDelta: -5, reaction: (name) => `"…솔직하게 사과하니까 화도 못 내겠네. 다음엔 조심해줘."`, score:+6 },
      { id:'c2', text:'(당황해서 웃으며) 아니, 왜 그렇게 진지하게 받아들여?', element:'화', risk:'HIGH', trustDelta: -5, tensionDelta: 12, reaction: (name) => `"진지하게 들리니까 그렇지. (고개를 돌리며) 좀 실망이야."`, score:-8 },
      { id:'c3', text:'(잠시 침묵하다가) 네 기분을 상하게 하려던 건 절대 아니야.', element:'금', risk:'MEDIUM', trustDelta: 4, tensionDelta: 2, reaction: (name) => `"…알겠어. 무슨 마음인지. 그냥 내가 좀 예민했나 봐."`, score:+3 },
    ],
  },
  /* ── 신규: 과거의 상처 ── */
  {
    backgroundEmoji: '🤕🍂',
    type: '과거의 상처 고백',
    narrative: '조용한 분위기 속에서 상대방이 평소보다 낮은 목소리로 자신의 옛 이야기를 꺼내기 시작한다.',
    situationDescription: '상대방이 평소의 밝은 모습 뒤에 숨겨왔던 아픈 기억을 조심스럽게 털어놓습니다.',
    npcDialogue: (name) => `"나 사실… 예전에 사람한테 크게 데인 적이 있거든. 그래서 누굴 믿는 게 좀 겁나."`,
    choices: [
      { id:'c1', text:'말해줘서 고마워. 내가 네 편이 되어줄게.', element:'목', risk:'LOW', trustDelta: 12, tensionDelta: 3, reaction: (name) => `"(울컥한 듯 고개를 숙였다가) …그 말, 기억해둘게."`, score:+10 },
      { id:'c2', text:'다 지난 일이잖아. 이제 행복한 생각만 해.', element:'화', risk:'MEDIUM', trustDelta: -2, tensionDelta: -4, reaction: (name) => `"그게 말처럼 쉬우면 얼마나 좋을까. (씁쓸한 미소)"`, score:-2 },
      { id:'c3', text:'그 사람이 나빴네. 네 잘못이 아니야.', element:'토', risk:'LOW', trustDelta: 7, tensionDelta: 0, reaction: (name) => `"…응. 고마워. 그렇게 말해주니까 좀 낫네."`, score:+7 },
    ],
  },
  /* ── 신규: 손이 스칠 듯 말 듯 ── */
  {
    backgroundEmoji: '🤝💓',
    type: '손이 스칠 듯 말 듯',
    narrative: '나란히 걷는 사이, 손끝이 가끔씩 닿았다 떨어진다. 묘한 긴장감이 온몸을 타고 흐른다.',
    situationDescription: '가까운 거리에서 걷다 보니 자꾸만 손이 스칩니다. 공기마저 달콤하고 아찔하게 느껴지는 순간입니다.',
    npcDialogue: (name) => `"(부끄러운 듯 시선을 창밖으로 던지며) …오늘 공기 진짜 달다, 그치?"`,
    choices: [
      { id:'c1', text:'(살짝 손가락을 걸며) 응. 너랑 있어서 그런가 봐.', element:'수', risk:'MEDIUM', trustDelta: 3, tensionDelta: 15, reaction: (name) => `"(움찔하다가 놓지 않고) …심장 소리 들릴 것 같아."`, score:+11 },
      { id:'c2', text:'(손을 주머니에 넣으며) 그러게. 이제 좀 쌀쌀해지네.', element:'금', risk:'HIGH', trustDelta: 0, tensionDelta: -10, reaction: (name) => `"…어? 어, 그렇네. (어색해진 분위기)"`, score:-5 },
      { id:'c3', text:'(장난스럽게 손을 툭 치며) 야, 너 손 왜 이렇게 커?', element:'목', risk:'LOW', trustDelta: 2, tensionDelta: 5, reaction: (name) => `"ㅋㅋ 뭐야 갑자기. (웃으며 긴장이 풀린 듯)"`, score:+6 },
    ],
  },
  /* ── 신규: 갑작스러운 고백 ── */
  {
    backgroundEmoji: '💘🎬',
    type: '갑작스러운 고백 분위기',
    narrative: '시선이 마주쳤다. 평소보다 긴 호흡이 이어지고, 세상의 모든 소음이 사라진 것 같은 기분이 든다.',
    situationDescription: '상대방이 당신을 빤히 바라봅니다. 금방이라도 무슨 말이 튀어나올 것만 같은, 긴장감 넘치는 정적입니다.',
    npcDialogue: (name) => `"나 더 이상 숨기기 싫어. 너한테 나… 어떤 사람이야?"`,
    choices: [
      { id:'c1', text:'없어서는 안 될, 가장 소중한 사람.', element:'수', risk:'MEDIUM', trustDelta: 10, tensionDelta: 18, reaction: (name) => `"(눈이 커지며) …나도. 내가 하고 싶던 말이었어."`, score:+15 },
      { id:'c2', text:'글쎄, 좀 더 알아가야 할 사이?', element:'토', risk:'HIGH', trustDelta: -3, tensionDelta: -12, reaction: (name) => `"아… 그래. 내가 너무 성급했나 보다. (씁쓸)"`, score:-10 },
      { id:'c3', text:'나를 웃게 만드는 유일한 사람.', element:'목', risk:'LOW', trustDelta: 8, tensionDelta: 12, reaction: (name) => `"…기쁘다. 네 웃음 내가 지켜주고 싶어."`, score:+12 },
    ],
  },
  {
    backgroundEmoji: '🍱🥢',
    type: '저녁 식사',
    situationDescription: '함께 식당에 들어왔다. 메뉴판을 보며 상대방이 묻는다.',
    npcDialogue: (name) => `"뭐 먹을래? 여기 매운 거 잘한다는데, ${name}는 매운 거 잘 먹어?"`,
    choices: [
      { id:'c1', text:'응, 완전 좋아해! 너랑 같이 먹으면 더 맛있을 것 같아.', element:'화', risk:'LOW', reaction: (name) => `"오, 다행이다. 고마워, 그냥 이렇게 맞춰주는 사람이 편해. ${name} 좋다."`, score:+8 },
      { id:'c2', text:'나 매운 거 잘 못 먹는데, 왜 물어보는 건지 알아?', element:'금', risk:'MEDIUM', reaction: (name) => `"아, 미안. 그런 거 미리 얘기해줘야지— 그럼 메뉴 바꾸자."`, score:+1 },
      { id:'c3', text:'일단 반반씩 시키면 되지 않아? 효율적이잖아.', element:'금', risk:'MEDIUM', reaction: (name) => `"효율적이네 ㅋㅋ 뭔가 로맨틱한 상황인데 현실적으로 대처하는 거 웃겨."`, score:+3 },
    ],
  },
  {
    backgroundEmoji: '🎬🍿',
    type: '영화 관람',
    situationDescription: '영화가 끝나고 불이 켜졌다. 엔딩 크레딧이 올라가는 동안 그가 네 반응을 기다리는 눈치다.',
    npcDialogue: (name) => `"어땠어? 나는 엔딩이 좀 아쉬웠는데— ${name}는 어떻게 봤어?"`,
    choices: [
      { id:'c1', text:'나도 그 장면 좀 아쉬웠어. 두 번째 만남 장면에서 그 선택이 달랐으면.', element:'수', risk:'LOW', reaction: (name) => `"맞아 맞아! ${name} 나랑 영화 취향 비슷하다. 다음에 또 보자."`, score:+9 },
      { id:'c2', text:'좋았는데. 근데 너 긴장했지? 팝콘 엄청 빨리 먹던데.', element:'화', risk:'MEDIUM', reaction: (name) => `"…눈치챘어? 재밌는 게 나오면 그렇게 돼. ${name} 관찰력 좋네."`, score:+4 },
      { id:'c3', text:'솔직히 좀 지루했어. 평점 과대평가인 것 같아.', element:'금', risk:'HIGH', reaction: (name) => `"아… 그렇구나. 나는 괜찮았는데— 취향이 다를 수 있지 뭐."`, score:-1 },
    ],
  },
  {
    backgroundEmoji: '🌊🚗',
    type: '드라이브',
    situationDescription: '야간 드라이브, 차창 밖으로 도심 불빛이 흐른다. 라디오에서 모르는 노래가 잔잔하게 흘러나온다.',
    npcDialogue: (name) => `"어디 가고 싶어? 그냥 달려도 되고— ${name}가 정해줘."`,
    choices: [
      { id:'c1', text:'바다 쪽으로 가자. 이 시간에 보는 바다 좋아해.', element:'수', risk:'LOW', reaction: (name) => `"나도. 이렇게 딱 맞는 대답이 오면 좀 설레잖아. ${name} 잘 알겠다 이제."`, score:+8 },
      { id:'c2', text:'(라디오 볼륨 올리며) 이 노래 좋다. 알아?', element:'화', risk:'MEDIUM', reaction: (name) => `"처음 들었는데 좋네. 앞으로도 ${name}가 추천해줘."`, score:+5 },
      { id:'c3', text:'어디 가도 상관없어. 피곤하면 그냥 집에 가도 돼.', element:'토', risk:'HIGH', reaction: (name) => `"…아, 피곤해? 그럼 내릴게. (잠시 침묵)"`, score:-4 },
    ],
  },
  {
    backgroundEmoji: '🖼️🎨',
    type: '전시회',
    situationDescription: '조용한 갤러리. 그가 한 작품 앞에 오래 서있다. 다가가자 눈빛이 달라진 걸 느낀다.',
    npcDialogue: (name) => `"이거 보면 뭔가 느껴지지 않아? 나는 이 작품이 왜인지 계속 당기는데— ${name}는 어때?"`,
    choices: [
      { id:'c1', text:'뭔가 외로운 것 같은데, 동시에 자유로워 보여.', element:'수', risk:'LOW', reaction: (name) => `"…어, 맞아. 나도 그렇게 봤어. ${name}, 나랑 같은 걸 느끼는 사람이구나."`, score:+9 },
      { id:'c2', text:'솔직히 잘 모르겠어. 설명해줘.', element:'목', risk:'MEDIUM', reaction: (name) => `"하하, 솔직하다. 나도 정답은 모르는데— 같이 생각해보자."`, score:+3 },
      { id:'c3', text:'(작품 옆 안내판 보며) 가격이 얼마야? 비싸겠다.', element:'금', risk:'HIGH', reaction: (name) => `"가격? …그 얘기가 나올 줄은 몰랐어. 뭐, 그렇게 볼 수도 있지."`, score:-3 },
    ],
  },
  {
    backgroundEmoji: '🏔️⛺',
    type: '야외 나들이',
    situationDescription: '배낭을 메고 올라온 짧은 등산 코스. 정상에서 탁 트인 뷰를 마주했다. 그가 옆에 선다.',
    npcDialogue: (name) => `"야, 진짜 경치 좋다. 이런 곳 오길 잘했어— ${name} 덕분에 왔네."`,
    choices: [
      { id:'c1', text:'네 얼굴에 바람 맞아서 더 좋다는 거 알아?', element:'화', risk:'LOW', reaction: (name) => `"…갑툭튀야 진짜. 왜 이런 말이 그냥 나와? 근데 기분 좋아."`, score:+10 },
      { id:'c2', text:'여기 오길 잘했어. 다음엔 더 긴 코스 도전해볼까?', element:'목', risk:'LOW', reaction: (name) => `"좋아! 다음에도 같이 오자는 거잖아. 그 말이 제일 좋다."`, score:+7 },
      { id:'c3', text:'무릎이 좀 아프네. 이런 거 좋아하지?', element:'토', risk:'HIGH', reaction: (name) => `"미리 말했으면 됐는데. …괜찮아? 그냥 천천히 내려가자."`, score:-1 },
    ],
  },
  {
    backgroundEmoji: '🍦🌇',
    type: '해질녘 산책',
    situationDescription: '아이스크림을 들고 나란히 걷고 있다. 하늘이 붉게 물들고, 그가 갑자기 멈춰 선다.',
    npcDialogue: (name) => `"저 하늘 봐. 이런 색 좋아해. 사진 찍어도 저렇게 안 나오는 게 아쉬워— ${name} 기억에 남겨둬야겠다."`,
    choices: [
      { id:'c1', text:'기억에 남을 거야. 나도 그러니까.', element:'수', risk:'LOW', reaction: (name) => `"…그 말이 왜 이렇게 좋지. ${name} 좀 반칙이야."`, score:+10 },
      { id:'c2', text:'사진 찍어줄까? 저 배경이면 잘 나올 것 같아서.', element:'목', risk:'LOW', reaction: (name) => `"어, 찍어줘. 나 셀카는 별론데 누가 찍어주는 건 좋아."`, score:+6 },
      { id:'c3', text:'(폰 보며) 오늘 날씨 진짜 좋았네. 내일은 비 온대.', element:'금', risk:'HIGH', reaction: (name) => `"…그래. (말 없이 다시 걷기 시작)"`, score:-4 },
    ],
  },
  /* ── 신규: 갑작스러운 비 ── */
  {
    backgroundEmoji: '🌧️☂️',
    type: '갑작스러운 비',
    narrative: '갑자기 굵은 빗방울이 쏟아지기 시작했다. 우산이 하나뿐이다. 당신과 그 사람 사이의 거리가 어색하게 좁혀진다.',
    situationDescription: '예고 없이 쏟아지는 빗속, 작은 우산 하나. 어깨가 맞닿을 것 같은 거리에 두 사람이 선다.',
    npcDialogue: (name) => `"어… 우산이 하나밖에 없네. (잠시 망설이다 우산을 ${name} 쪽으로 더 기울이며) 이쪽이 더 맞아?"`,
    choices: [
      { id:'c1', text:'(살짝 어깨를 붙이며) 같이 쓰면 되잖아. 이 정도면 충분해.', element:'수', risk:'LOW', reaction: (name) => `"…(말없이 우산을 더 기울이며) 그래, 충분해. 오히려 좋다."`, score:+10 },
      { id:'c2', text:'나는 좀 젖어도 돼. 네가 더 써.', element:'목', risk:'LOW', reaction: (name) => `"그런 말 왜 해. (단호하게 같이 들어오라는 듯 당기며) 같이 써."`, score:+8 },
      { id:'c3', text:'(떨어져 서며) 어, 나 이쪽이 더 편해. 조금만 걸어가면 카페 있잖아.', element:'금', risk:'HIGH', reaction: (name) => `"…그래, 카페 가자. (조금 멀어진 거리를 느끼며)"`, score:-2 },
      { id:'c4', text:'(우산을 통째로 내어주며) 네가 써. 나는 비 맞는 거 좋아해서.', element:'화', risk:'MEDIUM', reaction: (name) => `"바보야. (황당하다가 결국 웃으며 같이 들어와서) 같이 쓰자, 진짜."`, score:+6 },
    ],
  },
  /* ── 신규: 영화관 취향 갈등 ── */
  {
    backgroundEmoji: '🎬🍿',
    type: '영화관 취향 배틀',
    narrative: '팝콘 냄새가 가득한 영화관 로비. 두 사람이 다른 영화를 가리키고 있다. 어떤 선택을 해야 할까.',
    situationDescription: '당신은 지금 팝콘 냄새가 가득한 영화관 로비에 서 있습니다. 상대방이 당신을 빤히 바라보며 말합니다.',
    npcDialogue: (name) => `"나는 이 공포영화 보고 싶은데, ${name}은 좀 다른 거 보고 싶어했지? 어떡하지?"`,
    choices: [
      { id:'c1', text:'네가 보고 싶은 거 봐. 나는 옆에 있을게.', element:'토', risk:'LOW', reaction: (name) => `"진짜? …(살짝 놀라며) 그럼 내가 오히려 미안하잖아. 고마워, 그냥 나 무서우면 잡아."`, score:+9 },
      { id:'c2', text:'(다른 걸 추천하며) 이건 어때? 둘 다 볼 거 같아서.', element:'목', risk:'LOW', reaction: (name) => `"오, 이거— 사실 나도 궁금했는데. ${name} 눈치 빠르다."`, score:+7 },
      { id:'c3', text:'나는 내가 보고 싶은 거 볼게. 우린 따로 봐도 되잖아.', element:'금', risk:'HIGH', reaction: (name) => `"…그래도 되는데, 같이 보고 싶었는데. (실망한 기색)"`, score:-4 },
      { id:'c4', text:'공포 영화 나도 좋아. 무서울 때 잡아줘.', element:'화', risk:'MEDIUM', reaction: (name) => `"ㅋㅋㅋ 그런 속셈이야? (웃으며) 좋아, 나도 잡아줄게."`, score:+8 },
    ],
  },
  /* ── 신규: 깜짝 기념일 선물 ── */
  {
    backgroundEmoji: '🎁🌹',
    type: '기념일 깜짝 이벤트',
    narrative: '갑자기 작은 리본이 달린 선물 박스가 당신 앞에 놓인다. 상대방이 수줍게 웃으며 말한다.',
    situationDescription: '기대하지 않았던 순간, 상대방이 작은 선물 박스를 내밀며 조심스럽게 웃는다. 당신의 반응이 오늘의 분위기를 가를 것이다.',
    npcDialogue: (name) => `"사실 오늘… (선물을 내밀며) 준비했어. 별거 아닌데 ${name}한테 주고 싶었어."`,
    choices: [
      { id:'c1', text:'(천천히 열어보며) 어떻게 알았어? 내가 좋아하는 거잖아.', element:'수', risk:'LOW', reaction: (name) => `"(환하게 웃으며) 기억해뒀어. ${name} 말 다 듣거든."`, score:+12 },
      { id:'c2', text:'나도 뭔가 주고 싶었는데, 이렇게 먼저 줘버리면 어떡해.', element:'목', risk:'LOW', reaction: (name) => `"다음엔 ${name}이 줘. 그걸로 충분해."`, score:+9 },
      { id:'c3', text:'(선물을 받으며) 어, 고마워. (바로 가방에 넣으려 하며)', element:'금', risk:'HIGH', reaction: (name) => `"…지금 열어봐도 되는데. (살짝 서운한 표정)"`, score:-3 },
      { id:'c4', text:'(포장 보며 장난치듯) 폭탄 아니지? 열어봐도 돼?', element:'화', risk:'MEDIUM', reaction: (name) => `"ㅋㅋ 터진다, 진짜로. 빨리 열어봐."`, score:+6 },
    ],
  },
  /* ── 신규: 계산서 배틀 ── */
  {
    backgroundEmoji: '💳🍽️',
    type: '계산서 배틀',
    narrative: '맛있는 저녁 식사가 끝났다. 직원이 계산서를 테이블에 놓는 순간, 두 사람의 손이 동시에 움직인다.',
    situationDescription: '맛있는 식사가 끝나고 계산서가 테이블 위에 놓였다. 상대방이 카드를 꺼내려 한다.',
    npcDialogue: (name) => `"(카드를 꺼내며) 오늘은 내가 낼게. ${name}이 골라준 식당이니까."`,
    choices: [
      { id:'c1', text:'(상대방 카드를 살짝 막으며) 이번엔 내가 낼게. 다음에 네가 내.'  , element:'화', risk:'LOW', reaction: (name) => `"(잠시 눈싸움하다 웃으며) …그래, 다음엔 내가 낸다. 꼭."`, score:+9 },
      { id:'c2', text:'반반으로 하자. 그게 제일 편하잖아.'                               , element:'금', risk:'MEDIUM', reaction: (name) => `"현실적이다 ㅋㅋ. 뭐, 그러자. 근데 다음엔 내가 낼게."`, score:+3 },
      { id:'c3', text:'(엉거주춤하며) 어… 어떻게 하지. (망설이다 결국 상대방이 내도록)', element:'토', risk:'HIGH', reaction: (name) => `"(계산하면서) 괜찮아, 근데 다음엔 ${name}이 내줘."`, score:+1 },
      { id:'c4', text:'(먼저 자리에서 일어나 계산대로 가며) 먼저 계산할게!'              , element:'목', risk:'LOW', reaction: (name) => `"어! 야— (쫓아오며) 진짜 빠르다. 고마워, 다음엔 꼭."`, score:+8 },
    ],
  },
  /* ── 신규: 길거리 방해꾼 ── */
  {
    backgroundEmoji: '🚶‍♂️💔',
    type: '방해자의 등장',
    narrative: '데이트 도중 갑자기 낯선 사람이 다가와 번호를 물어본다. 당신과 상대방, 그리고 낯선 이 사이에 어색한 공기가 흐른다.',
    situationDescription: '모든 것이 완벽한 데이트 중, 갑자기 낯선 사람이 다가와 상대방에게 번호를 요청한다. 상대방은 당신의 눈치를 본다.',
    npcDialogue: (name) => `"(당황한 눈빛으로 ${name}을 바라보며) 어떡하지…?"`,
    choices: [
      { id:'c1', text:'(자연스럽게 상대방 곁에 서며) 죄송한데, 우리 데이트 중이에요.', element:'금', risk:'LOW', reaction: (name, p) => `"(낯선 사람이 떠난 뒤, 소리 없이 웃으며) 고마워. 그 말 해줄 것 같았어— ${name} 믿을 만해."`, score:+11 },
      { id:'c2', text:'(상대방에게 소곤소곤) 네가 알아서 해도 돼. 나 괜찮아.', element:'수', risk:'MEDIUM', reaction: (name) => `"…괜찮은 거야? 솔직히 조금은 아쉬웠는데. (작게 웃으며) 그냥 봐주는 건가."`, score:-1 },
      { id:'c3', text:'(시선을 피하며 폰만 본다)', element:'토', risk:'HIGH', reaction: (name) => `"(혼자 상황을 정리하고 나서) 어, 뭐야 갑자기. …불편했어?"`, score:-5 },
      { id:'c4', text:'(손을 살짝 잡으며) 우리 가자.', element:'화', risk:'LOW', reaction: (name) => `"(잠깐 굳다가 미소 지으며) …그래. 어디 가?"`, score:+12 },
    ],
  },
  /* ── 신규: 과거의 그림자 (전 애인 조우) ── */
  {
    backgroundEmoji: '😬👤',
    type: '과거의 그림자',
    narrative: '데이트 중 상대방이 갑자기 발걸음을 멈췄다. 저 멀리서 누군가와 눈이 마주쳤다. 그 사람의 표정이 복잡하게 흔들린다.',
    situationDescription: '당신과의 산책 도중, 상대방이 갑자기 굳는다. 시선을 따라가 보니 낯선 사람—아마도 전 연인인 것 같다.',
    npcDialogue: (name) => `"(작은 목소리로) 어…저기 잠깐. 미안, ${name} 잠깐 기다려줄 수 있어?"`,
    choices: [
      { id:'c1', text:'(부드럽게) 괜찮아. 나 여기 있을게.', element:'토', risk:'LOW', reaction: (name) => `"(잠깐 대화 후 돌아오며) 고마워. 기다려줘서. 뭔가 ${name}이 있어서 더 편하게 말할 수 있었어."`, score:+8 },
      { id:'c2', text:'(아무 말 없이 자연스럽게 옆에 서 있는다)', element:'수', risk:'LOW', reaction: (name) => `"(짧게 눈을 맞추며) 아무것도 묻지 않아줘서 고마워. 이야기하고 싶을 때 할게."`, score:+9 },
      { id:'c3', text:'(시큰둥하게) 오래 걸려? 나 잠깐 저기 카페 가 있을게.', element:'금', risk:'HIGH', reaction: (name) => `"아… 알겠어. (혼자 상황을 정리하며 씁쓸해지는 표정)"`, score:-4 },
      { id:'c4', text:'괜찮아? 얼굴이 좀 굳었는데. 걱정되네.', element:'목', risk:'LOW', reaction: (name) => `"(고마운 듯 작게 웃으며) 응, 괜찮아. 그냥 잠깐 이상했어. ${name} 덕분에 괜찮아졌어."`, score:+7 },
    ],
  },
  /* ── 신규: 취중 진담 ── */
  {
    backgroundEmoji: '🍶🌙',
    type: '취중 진담',
    narrative: '데이트의 마지막 코스인 조용한 술자리. 분위기가 무르익었고, 상대방의 눈이 평소보다 조금 촉촉해 보인다.',
    situationDescription: '날이 저물고 조명이 낮아진 조용한 술집. 분위기가 무르익을수록 상대방의 말이 조금씩 솔직해지기 시작한다.',
    npcDialogue: (name) => `"사실… 나 오늘 ${name}한테 하고 싶은 말 있었어. (술잔을 내려놓으며) 이거 마저 마시면 말할 수 있을 것 같아."`,
    choices: [
      { id:'c1', text:'(잔을 살짝 밀어주며) 마셔. 나 들을게.', element:'수', risk:'LOW', reaction: (name, p) => `"…(조금 취한 눈으로 웃으며) 고마워. 있잖아— 솔직히 말하면, 난 ${name}이 특별해."`, score:+11 },
      { id:'c2', text:'말 안 해도 돼. 그냥 지금 이 순간 좋아.', element:'토', risk:'LOW', reaction: (name) => `"(조용히 고개 끄덕이며) 나도. …이 순간 기억해둘게."`, score:+10 },
      { id:'c3', text:'(장난처럼) 술김에 하는 말은 안 믿어~ 내일 다시 해.', element:'화', risk:'MEDIUM', reaction: (name) => `"ㅋㅋ 냉정하다. 알겠어, 내일 해줄게— 근데 진심이야."`, score:+5 },
      { id:'c4', text:'어, 나도 졸린데. 오늘 일찍 마무리하자.', element:'금', risk:'HIGH', reaction: (name) => `"(할 말을 삼키며) …그래, 그러자. (오늘은 조용히 마무리되는 밤)"`, score:-6 },
    ],
  },
];

// 랜덤 시나리오 (중복 최소화) 
function getNextScenario(usedIndices) {
  const available = SCENARIO_DB.map((_, i) => i).filter(i => !usedIndices.includes(i));
  if (available.length === 0) return { scenario: SCENARIO_DB[Math.floor(Math.random() * SCENARIO_DB.length)], idx: 0 };
  const idx = available[Math.floor(Math.random() * available.length)];
  return { scenario: SCENARIO_DB[idx], idx };
}

/* ═══════════════════════════════════════════════
   ── 오행 궁합 기반 최고의 상대 매칭 ──
═══════════════════════════════════════════════ */

// [내 오행][상대 오행] = 궁합 점수 (최대 6)
// 상생(生): +열정, 상극(克): -마이너스, 동행(同): +안정
const ELEMENT_HARMONY = {
  목: { 목:4, 화:6, 토:1, 금:2, 수:5 },
  화: { 목:5, 화:4, 토:6, 금:1, 수:2 },
  토: { 목:2, 화:5, 토:4, 금:6, 수:1 },
  금: { 목:1, 화:2, 토:5, 금:4, 수:6 },
  수: { 목:6, 화:1, 토:2, 금:5, 수:4 },
};

function computeMatchScore(userStem, npcStem) {
  const userEl = STEM_ELEMENTS[STEMS.indexOf(userStem)];
  const npcEl  = STEM_ELEMENTS[STEMS.indexOf(npcStem)];
  if (!userEl || !npcEl) return 6;
  return (ELEMENT_HARMONY[userEl]?.[npcEl] || 3) + (ELEMENT_HARMONY[npcEl]?.[userEl] || 3);
}

async function findBestMatches(userYear, userMonth, userDay, userHour, presets) {
  const KR_STEMS = ['갑','을','병','정','무','기','경','신','임','계'];
  const [userData, ...npcResults] = await Promise.all([
    fetchSajuPillar({ year: userYear, month: userMonth, day: userDay, hour: userHour, name: '나', gender: '여' }),
    ...presets.map(p => fetchSajuPillar({ year: p.birth.year, month: p.birth.month, day: p.birth.day, hour: p.birth.hour, name: p.name, gender: p.gender || '남' })),
  ]);
  const userStem = STEMS[KR_STEMS.indexOf(userData.dayMasterGanKr)] || '甲';
  return presets
    .map((p, i) => {
      const npcStem = STEMS[KR_STEMS.indexOf(npcResults[i]?.dayMasterGanKr)] || '甲';
      const score   = computeMatchScore(userStem, npcStem);
      const matchPct = Math.min(99, Math.round(score / 12 * 100));
      return { ...p, matchScore: score, matchPct, npcStem };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

/* ═══════════════════════════════════════════════
   ── 사주 기반 남성 케이스 프리셋 ──
═══════════════════════════════════════════════ */

const MALE_PRESETS = [
  {
    emoji: '🌲',
    name: '이준혁',
    birth: { year: 1995, month: 3, day: 15, hour: 10 },
    gender: '남',
    desc: '갑목 일간 · ENFJ',
    tags: ['직진형', '리더십', '솔직한'],
  },
  {
    emoji: '☀️',
    name: '김도윤',
    birth: { year: 1997, month: 7, day: 4, hour: 14 },
    gender: '남',
    desc: '병화 일간 · ESFP',
    tags: ['활발함', '열정적', '솔직함'],
  },
  {
    emoji: '💎',
    name: '박서준',
    birth: { year: 1993, month: 11, day: 22, hour: 20 },
    gender: '남',
    desc: '신금 일간 · INTJ',
    tags: ['완벽주의', '냉철한', '섬세함'],
  },
  {
    emoji: '🌊',
    name: '최민준',
    birth: { year: 1999, month: 1, day: 8, hour: 6 },
    gender: '남',
    desc: '임수 일간 · INTP',
    tags: ['자유로움', '탐구적', '유연함'],
  },
  {
    emoji: '⛰️',
    name: '정태현',
    birth: { year: 1991, month: 5, day: 30, hour: 12 },
    gender: '남',
    desc: '무토 일간 · ISTJ',
    tags: ['믿음직한', '신중함', '책임감'],
  },
  {
    emoji: '🕯️',
    name: '윤재원',
    birth: { year: 1996, month: 9, day: 17, hour: 18 },
    gender: '남',
    desc: '정화 일간 · INFJ',
    tags: ['따뜻함', '헌신적', '로맨틱'],
  },
  {
    emoji: '🌸',
    name: '장현우',
    birth: { year: 1998, month: 4, day: 25, hour: 8 },
    gender: '남',
    desc: '을목 일간 · ISFP',
    tags: ['섬세함', '배려심', '감성적'],
  },
  {
    emoji: '⚔️',
    name: '오성민',
    birth: { year: 1994, month: 8, day: 9, hour: 16 },
    gender: '남',
    desc: '경금 일간 · ESTP',
    tags: ['강직함', '원칙주의', '냉철한'],
  },
];

/* ═══════════════════════════════════════════════
   ── 사주 기반 여성 케이스 프리셋 ──
═══════════════════════════════════════════════ */

const FEMALE_PRESETS = [
  {
    emoji: '🌸',
    name: '이수현',
    birth: { year: 1997, month: 3, day: 22, hour: 10 },
    gender: '여',
    desc: '여성 일간 · ISFJ',
    tags: ['섬세함', '배려심', '따뜻한'],
  },
  {
    emoji: '☀️',
    name: '김지아',
    birth: { year: 1998, month: 7, day: 15, hour: 14 },
    gender: '여',
    desc: '여성 일간 · ENFP',
    tags: ['활발함', '솔직함', '에너지'],
  },
  {
    emoji: '💎',
    name: '박서연',
    birth: { year: 1995, month: 11, day: 8, hour: 20 },
    gender: '여',
    desc: '여성 일간 · INTJ',
    tags: ['완벽주의', '냉철한', '지적'],
  },
  {
    emoji: '🌊',
    name: '최예린',
    birth: { year: 2000, month: 1, day: 20, hour: 6 },
    gender: '여',
    desc: '여성 일간 · INFP',
    tags: ['자유로움', '감수성', '직관적'],
  },
  {
    emoji: '🌙',
    name: '정하은',
    birth: { year: 1996, month: 9, day: 5, hour: 18 },
    gender: '여',
    desc: '여성 일간 · INFJ',
    tags: ['내면적', '직관적', '신비로운'],
  },
  {
    emoji: '🌿',
    name: '윤체원',
    birth: { year: 1999, month: 4, day: 12, hour: 8 },
    gender: '여',
    desc: '여성 일간 · ENFJ',
    tags: ['리더십', '카리스마', '직진형'],
  },
  {
    emoji: '🕯️',
    name: '장민서',
    birth: { year: 1994, month: 8, day: 28, hour: 16 },
    gender: '여',
    desc: '여성 일간 · ISFP',
    tags: ['따뜻함', '헌신적', '로맨틱'],
  },
  {
    emoji: '⛰️',
    name: '오지현',
    birth: { year: 1993, month: 5, day: 17, hour: 12 },
    gender: '여',
    desc: '여성 일간 · ISTJ',
    tags: ['신뢰감', '책임감', '안정적'],
  },
];

/* ═══════════════════════════════════════════════
   ── 배경 별 & 성운 ──
═══════════════════════════════════════════════ */

const STARS = Array.from({ length: 90 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  d: `${Math.random() * 3 + 2}s`,
  dl: `${Math.random() * 4}s`,
  lo: Math.random() * 0.15,
  hi: Math.random() * 0.55 + 0.25,
}));

const NEBULAE = [
  { x:'-10%', y:'20%', size:500, color:'rgba(180,20,120,0.07)' },
  { x:'60%',  y:'60%', size:450, color:'rgba(190,24,93,0.06)'  },
  { x:'20%',  y:'70%', size:380, color:'rgba(124,58,237,0.05)' },
  { x:'50%',  y:'10%', size:300, color:'rgba(249,168,212,0.04)' },
];

/* ═══════════════════════════════════════════════
   ── 메인 컴포넌트 ──
═══════════════════════════════════════════════ */

/* ── 사주 오행 궁합 점수 계산 ──
   두 일간 오행 간 상생·상극 기반 퍼센트 반환
─────────────────────────────────────────────── */
function computeRealSynastry(myP, npcP) {
  if (!myP || !npcP) return null;
  const resolveElement = (p) => {
    if (!p) return null;
    if (p.dayMasterElement && EL_CLASS[p.dayMasterElement]) return p.dayMasterElement;
    const stemIdx = STEMS.indexOf(p.dayMasterKan);
    if (stemIdx >= 0) return STEM_ELEMENTS[stemIdx] || null;
    return null;
  };
  const myEl = resolveElement(myP);
  const npcEl = resolveElement(npcP);
  if (!myEl || !npcEl) return null;
  const raw = elemHarmony(myEl, npcEl); // 최대 12
  const pct = Math.min(99, Math.round(raw / 12 * 100));
  const label =
    pct >= 85 ? '운명의 상대 ✦' :
    pct >= 70 ? '강한 상성' :
    pct >= 55 ? '좋은 인연' :
    pct >= 40 ? '보통 궁합' :
    '성장형 인연';
  const desc =
    pct >= 85 ? `${myEl}과 ${npcEl}의 에너지가 완전 공명합니다` :
    pct >= 70 ? `${myEl}이 ${npcEl}을 이끌어 시너지를 만듭니다` :
    pct >= 55 ? `두 오행이 서로 균형을 잡아갑니다` :
    pct >= 40 ? `차이를 통해 서로 성장하는 인연입니다` :
    `충돌하지만 극복하면 깊어지는 관계입니다`;
  return { pct, label, desc, myEl, npcEl };
}

function computeInitialScoresFromSyn(myPersona, npcPersona) {
  const syn = computeRealSynastry(myPersona, npcPersona);
  if (!syn) return { affinity: 30, trust: 30, tension: 15, curiosity: 40 };

  // 호감도 (Affinity): 기본 오행 궁합 기반
  const affinity = Math.max(10, Math.min(85, Math.round(syn.pct * 0.8 + 10)));
  
  // 신뢰도 (Trust): 토/금 기운이나 상생 관계에서 높음
  const isSaeng = ['Wood','Fire','Earth','Metal','Water'].some((el, i, arr) => {
    const next = arr[(i + 1) % 5];
    return (myPersona.dayMasterElement === el && npcPersona.dayMasterElement === next);
  });
  const trust = isSaeng ? 45 : 30;

  // 긴장감 (Tension): 상극 관계나 특정 십신(편관, 겁재) 발달 시 높음
  const isGuk = ['Wood','Earth','Water','Fire','Metal'].some((el, i, arr) => {
    const next = arr[(i + 1) % 5];
    return (myPersona.dayMasterElement === el && npcPersona.dayMasterElement === next);
  });
  const tension = isGuk ? 35 : 15;

  // 호기심 (Curiosity): 서로 없는 오행을 가졌을 때 높음
  const myEls = Object.keys(myPersona.fiveElements || {}).filter(k => (myPersona.fiveElements[k] || 0) > 0);
  const npcEls = Object.keys(npcPersona.fiveElements || {}).filter(k => (npcPersona.fiveElements[k] || 0) > 0);
  const diffCount = npcEls.filter(e => !myEls.includes(e)).length;
  const curiosity = 30 + (diffCount * 12);

  return { affinity, trust, tension: Math.min(60, tension), curiosity: Math.min(80, curiosity), syn };
}

function computeImmersiveDelta({ rawDelta, text, mood, affinity, synPct, comboStreak }) {
  let tuned = rawDelta;
  if (String(text || '').trim().length >= 16 && rawDelta > 0) tuned += 1;
  if (mood === '설렘' && rawDelta > 0) tuned += 1;
  if (mood === '화남' && rawDelta < 0) tuned -= 1;
  if (affinity >= 75 && rawDelta > 0) tuned += 1;
  if (synPct >= 80 && rawDelta > 0) tuned += 1;
  if (rawDelta >= 3 && comboStreak >= 1) tuned += 1;
  if (rawDelta <= -3 && comboStreak >= 2) tuned -= 1;
  return Math.max(-10, Math.min(10, tuned));
}

function computeScenarioScore({ choice, persona, mood, affinity, synPct, comboStreak }) {
  let score = choice?.score || 0;
  if (choice?.element === persona?.yongshin) score += 5;
  if (synPct >= 80 && score > 0) score += 1;
  if (mood === '설렘' && score > 0) score += 1;
  if (mood === '화남' && score < 0) score -= 1;
  if ((choice?.risk || 'MEDIUM') === 'HIGH' && affinity < 35) score -= 1;
  if (comboStreak >= 2 && score > 0) score += 1;
  return Math.max(-10, Math.min(14, score));
}

export default function LoveSimulation() {
  const [screen, setScreen] = useState('self'); // self | portal | awakening | chat
  const [tab, setTab] = useState('preset');        // preset | match | custom
  // 내 사주 아바타
  const [myPersona, setMyPersona] = useState(null);
  const [myForm, setMyForm] = useState({ name:'', year:'', month:'', day:'', sinju:0, noTime:false });
  const [myGender, setMyGender] = useState('여');
  const [myLoadingPersona, setMyLoadingPersona] = useState(false);
  const [autoLoadingMyPersona, setAutoLoadingMyPersona] = useState(false);
  const [avatarRevealing, setAvatarRevealing] = useState(false);
  const [npcGender, setNpcGender] = useState('\ub0a8');  // \ub0a8 | \uc5ec
  const [form, setForm] = useState({ name:'', year:'', month:'', day:'', sinju: 0, noTime:false });
  const [matchForm, setMatchForm] = useState({ year:'', month:'', day:'' });
  const [matchResults, setMatchResults] = useState(null);
  const [persona, setPersona] = useState(null);
  const [affinity, setAffinity] = useState(30); // affection
  const [trust, setTrust] = useState(30);
  const [tension, setTension] = useState(10);
  const [curiosity, setCuriosity] = useState(20);
  const [relationshipStage, setRelationshipStage] = useState('first_meeting');
  const [mood, setMood] = useState('설렘');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [affinityAnim, setAffinityAnim] = useState(false);
  const [scenario, setScenario] = useState(null);
  const [scenPhase, setScenPhase] = useState('event');
  const [scenResult, setScenResult] = useState(null);
  const [usedScenarios, setUsedScenarios] = useState([]);
  const [scenarioHistory, setScenarioHistory] = useState([]);
  const [endingResult, setEndingResult] = useState(null);
  const [endingOpen, setEndingOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [liveSynastry, setLiveSynastry] = useState(null);
  const [comboStreak, setComboStreak] = useState(0);
  const msgEnd = useRef(null);
  const typingRef = useRef(null);
  const greetingShownRef = useRef(false);
  const [loadingPersona, setLoadingPersona] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const scenarioAtmosphere = scenario ? getScenarioAtmosphere(scenario) : null;

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, busy]);

  // 컴포넌트 언마운트 시 타이핑 인터벌 정리용
  useEffect(() => {
    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, []);

  // 마운트 시 프로필 카드(localStorage)에서 내 사주 자동 로드
  useEffect(() => {
    async function autoLoadFromProfile() {
      try {
        const ns = 'FORTUNE_APP_USER_PROFILES';
        const list = JSON.parse(localStorage.getItem(ns + '.list') || '[]');
        const currId = localStorage.getItem(ns + '.current');
        const profile = (currId && list.find(p => p.id === currId)) || list[0] || null;
        if (!profile || !profile.birth || !profile.birth.year) return;
        const b = profile.birth;
        const genderKr = profile.gender === 'F' ? '여' : '남';
        const hour = b.hour != null ? b.hour : 12;
        // 가장 가까운 생시 인덱스 찾기
        const sinIdx = SINJU_OPTIONS.reduce((best, s, i) =>
          Math.abs(s.hour - hour) < Math.abs(SINJU_OPTIONS[best].hour - hour) ? i : best, 0);
        const formData = {
          name: profile.name || '사용자',
          year: String(b.year), month: String(b.month), day: String(b.day),
          sinju: sinIdx, noTime: b.hour == null,
        };
        setMyForm(formData);
        setMyGender(genderKr);
        setAutoLoadingMyPersona(true);
        try {
          const apiHour = formData.noTime ? 12 : (SINJU_OPTIONS[sinIdx]?.hour ?? hour);
          const data = await fetchSajuPillar({ name: formData.name, gender: genderKr, year: b.year, month: b.month, day: b.day, hour: apiHour });
          const p = apiDataToPersona(data);
          setMyPersona(p);
          setMatchForm({ year: String(b.year), month: String(b.month), day: String(b.day) });
          setScreen('portal');
        } catch (_) {
          // API 실패 시 self 화면 유지 (수동 재시도 가능)
        }
        setAutoLoadingMyPersona(false);
      } catch (_) {}
    }
    autoLoadFromProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 채팅 메시지 3개마다 자동으로 데이트 이벤트 발생
  useEffect(() => {
    if (screen !== 'chat' || !persona || scenario || busy) return;
    const npcCount = messages.filter(m => m.role === 'npc').length;
    if (npcCount > 0 && npcCount % 3 === 0) {
      const timer = setTimeout(() => triggerScenario(), 1500);
      return () => clearTimeout(timer);
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 엔피시(NPC) 메시지 타이프라이터 엔피 수신 */
  function addNpcMsgTyped(text, affinityChange) {
    const msgId = Date.now() + Math.random();
    setMessages(prev => [...prev, { role: 'npc', text, affinityChange, msgId, typedLen: 0 }]);
    if (typingRef.current) clearInterval(typingRef.current);
    let len = 0;
    typingRef.current = setInterval(() => {
      len++;
      setMessages(prev => prev.map(m =>
        m.msgId === msgId ? { ...m, typedLen: Math.min(len, m.text.length) } : m
      ));
      if (len >= text.length) {
        clearInterval(typingRef.current);
        typingRef.current = null;
      }
    }, 28);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  function ensureMyPersonaReady() {
    if (myPersona) return true;
    showToast('내 사주를 먼저 분석한 뒤 궁합 체크 후 시뮬레이션을 시작할 수 있어요.');
    setScreen('self');
    return false;
  }

  /* ── 내 사주 분석 → myPersona 생성 ── */
  async function loadMyPersonaData() {
    const { name, year, month, day, sinju, noTime } = myForm;
    if (!name || !year || !month || !day) return;
    const hour = noTime ? 12 : (SINJU_OPTIONS[sinju]?.hour ?? 12);
    setMyLoadingPersona(true);
    try {
      const data = await fetchSajuPillar({ name, gender: myGender, year: Number(year), month: Number(month), day: Number(day), hour });
      const p = apiDataToPersona(data);
      setMyPersona(p);
      setAvatarRevealing(true);
      setTimeout(() => setAvatarRevealing(false), 1400);
      // 매칭 탭을 위해 matchForm 자동 채움
      setMatchForm({ year: String(year), month: String(month), day: String(day) });
    } catch (e) {
      showToast('내 사주 계산 중 오류가 발생했어요.');
    } finally {
      setMyLoadingPersona(false);
    }
  }

  /* ── API 호출 후 게임 시작 ── */
  async function loadAndStartGame({ name, gender, year, month, day, hour, presetEmoji }) {
    setLoadingPersona(true);
    greetingShownRef.current = false;
    try {
      const data = await fetchSajuPillar({ name, gender, year, month, day, hour });
      const p = apiDataToPersona(data);
      if (presetEmoji) p.emoji = presetEmoji;
      startGame(p);
    } catch (e) {
      showToast('사주 계산 중 오류가 발생했어요.');
    } finally {
      setLoadingPersona(false);
    }
  }

  /* ── 프리셋 선택 ── */
  function selectPreset(preset) {
    if (!ensureMyPersonaReady()) return;
    const gdr = preset.gender || '남';
    loadAndStartGame({
      name: preset.name, gender: gdr,
      year: preset.birth.year, month: preset.birth.month, day: preset.birth.day, hour: preset.birth.hour,
      presetEmoji: preset.emoji,
    });
  }

  /* ── 직접 입력 ── */
  function submitCustom() {
    if (!ensureMyPersonaReady()) return;
    const { name, year, month, day, sinju, noTime } = form;
    if (!name || !year || !month || !day) return;
    const hour = noTime ? 12 : (SINJU_OPTIONS[sinju]?.hour ?? 12);
    loadAndStartGame({ name, gender: npcGender, year: Number(year), month: Number(month), day: Number(day), hour });
  }

  function startGame(p) {
    if (!myPersona) {
      ensureMyPersonaReady();
      return;
    }
    const scores = computeInitialScoresFromSyn(myPersona, p);
    
    setPersona(p);
    setLiveSynastry(scores.syn);
    setAffinity(scores.affinity);
    setTrust(scores.trust);
    setTension(scores.tension);
    setCuriosity(scores.curiosity);
    
    setRelationshipStage('first_meeting');
    setComboStreak(0);
    setMood('설렘');
    setMessages([]);
    setUsedScenarios([]);
    setScenarioHistory([]);
    setEndingResult(null);
    setEndingOpen(false);
    setScreen('awakening');
  }

  /* ── 채팅 전송 ── */
  function sendMsg() {
    if (!input.trim() || busy) return;
    const txt = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role:'user', text: txt }]);
    setBusy(true);

    // 입력 분석
    const rawDelta = analyzeUserInput(txt, persona);
    const delta = computeImmersiveDelta({
      rawDelta,
      text: txt,
      mood,
      affinity,
      synPct: liveSynastry?.pct || 50,
      comboStreak,
    });
    const newAff = Math.max(0, Math.min(100, affinity + delta));
    setComboStreak((prev) => (delta > 0 ? prev + 1 : delta < 0 ? 0 : prev));

    // 감정 업데이트
    let newMood = mood;
    if (delta >= 3) newMood = '기쁨';
    else if (delta <= -3) newMood = '화남';
    else if (delta > 0 && affinity > 40) newMood = '설렘';
    else if (delta < 0 && affinity < 30) newMood = '냉담함';
    else if (Math.random() < 0.15) newMood = '슬픔';

    if (newMood !== mood) {
      setMood(newMood);
      showToast(`${persona.name}의 감정 변화 ${MOOD_EMOJI[newMood] || ''} ${newMood}`);
    }

    setTimeout(() => {
      const reply = getNPCResponse(persona.dayMasterKan, newMood, delta);
      setAffinityAnim(true);
      setAffinity(newAff);
      setTimeout(() => setAffinityAnim(false), 600);
      addNpcMsgTyped(reply, delta);
      setBusy(false);
    }, 700 + Math.random() * 400);
  }

  /* ── 시나리오 트리거 ── */
  function triggerScenario() {
    if (busy) return;
    const { scenario: sc, idx } = getNextScenario(usedScenarios);
    setUsedScenarios(prev => [...prev, idx]);
    setScenario(sc);
    setScenPhase('event');
    setScenResult(null);
  }

  /* ── 선택지 처리 ── */
  function handleChoice(choice) {
    const yon = persona.yongshin;
    const isHit = choice.element === yon;
    const baseScore = computeScenarioScore({
      choice,
      persona,
      mood,
      affinity,
      synPct: liveSynastry?.pct || 50,
      comboStreak,
    });
    const newAff = Math.max(0, Math.min(100, affinity + baseScore));
    setAffinity(newAff);
    
    // 신규 지표 업데이트
    const tDelta = choice.trustDelta || (baseScore > 0 ? 2 : baseScore < 0 ? -1 : 0);
    const tenDelta = choice.tensionDelta || (choice.risk === 'HIGH' ? 5 : 1);
    const curDelta = choice.curiosityDelta || (baseScore > 5 ? 3 : 1);
    
    setTrust(prev => Math.max(0, Math.min(100, prev + tDelta)));
    setTension(prev => Math.max(0, Math.min(100, prev + tenDelta)));
    setCuriosity(prev => Math.max(0, Math.min(100, prev + curDelta)));

    setComboStreak((prev) => (baseScore > 0 ? prev + 1 : baseScore < 0 ? 0 : prev));

    let newMood = mood;
    if (baseScore >= 6) newMood = '기쁨';
    else if (baseScore >= 3) newMood = '설렘';
    else if (baseScore < 0) newMood = '냉담함';
    setMood(newMood);

    setScenarioHistory((prev) => [
      ...prev,
      {
        type: scenario?.type || '일반 이벤트',
        choiceText: choice.text,
        delta: baseScore,
        isHit,
        risk: choice.risk || 'MEDIUM',
        element: choice.element,
        moodAtChoice: mood,
      },
    ]);

    // 특수 시나리오 십신 반응 주입
    let reaction;
    const scenType = scenario?.type || '';
    if (scenType === '방해자의 등장' && choice.score > 0) {
      reaction = getSipsinJealousy(persona);
    } else if (scenType === '계산서 배틀' && choice.score > 0) {
      reaction = getSipsinBillReaction(persona);
    } else if (scenType === '취중 진담' && choice.score > 0) {
      reaction = getSipsinDrunkReveal(persona);
    } else {
      reaction = typeof choice.reaction === 'function'
        ? choice.reaction(persona.name)
        : choice.reaction;
    }

    setScenResult({ reaction, baseScore, isHit });
    setScenPhase('result');
  }

  /* ── 시나리오 닫기 ── */
  function closeScenario() {
    if (scenResult?.reaction) {
      addNpcMsgTyped(
        scenResult.reaction.replace(/^"|"$/g, ''),
        scenResult.baseScore
      );
    }
    setScenario(null);
    setScenResult(null);
    if (scenarioHistory.length >= 8) {
      setTimeout(() => openEndingReport(), 280);
    }
  }

  function openEndingReport() {
    if (!persona) return;
    const result = buildFinalEnding({
      persona,
      affinity,
      scenarioHistory,
    });
    setEndingResult(result);
    setEndingOpen(true);
  }

  /* ─── RENDER ─── */
  return (
    <>
      <style>{STYLES}</style>
      <div className="cd-app fixed inset-0 z-[60] h-screen w-screen overflow-hidden">

        {/* 별 배경 (Pink/Rose) */}
        <div className="cd-stars">
          {STARS.map(s => (
            <div key={s.id} className="cd-star" style={{
              left:`${s.x}%`, top:`${s.y}%`,
              width:`${s.size}px`, height:`${s.size}px`,
              '--d':s.d, '--dl':s.dl, '--lo':s.lo, '--hi':s.hi,
            }} />
          ))}
        </div>
        {NEBULAE.map((n, i) => (
          <div key={i} className="cd-nebula" style={{
            left:n.x, top:n.y, width:n.size, height:n.size, background: 'rgba(251, 113, 133, 0.05)',
          }} />
        ))}

        {/* Toast */}
        {toast && <div className="cd-toast">{toast}</div>}

        {/* ══ SELF SETUP — 내 사주 입력 ══ */}
        {screen === 'self' && (
          <div className="cd-screen px-4 py-10 md:px-8">
            {/* 별빛 아이콘 */}
            <div style={{ fontSize:64, marginBottom:16, animation:'float 4s ease-in-out infinite' }}>💌</div>
            <h1 className="cd-portal-title">나의 연애 기질 분석</h1>
            <p className="cd-portal-sub">
              당신의 사주에 새겨진 <strong style={{color:'var(--rose)'}}>연애 기질</strong>을 먼저 분석합니다.<br/>
              이 정보를 바탕으로 당신과 특별한 이야기를 만들어갈 상대방이 결정됩니다.
            </p>

            {/* 자동 로딩 중 표시 */}
            {autoLoadingMyPersona && (
              <div style={{
                width:'100%', maxWidth:460, textAlign:'center',
                padding:'40px 20px', background:'var(--glass-dark)',
                border:'1.5px solid var(--border)', borderRadius:32,
                marginBottom:24, boxShadow: 'var(--shadow)'
              }}>
                <div style={{fontSize:40, marginBottom:16, animation:'float 3s ease-in-out infinite'}}>✨</div>
                <p style={{color:'var(--rose)', fontWeight:700, fontSize:15, letterSpacing:'0.05em'}}>연애 프로필 연동 중…</p>
                <p style={{color:'var(--text-dim)', fontSize:12, marginTop:8}}>당신의 운명적 기질을 읽어오고 있습니다</p>
              </div>
            )}

            <div className="lc-self-setup" style={{opacity: autoLoadingMyPersona ? 0.35 : 1, pointerEvents: autoLoadingMyPersona ? 'none' : 'auto'}}>
              {/* 내 성별 토글 */}
              <div className="lc-gender-toggle" style={{marginBottom:20}}>
                <button className={`lc-gender-btn${myGender==='여'?' active-f':''}`}
                  onClick={() => setMyGender('여')}>💕 여성</button>
                <button className={`lc-gender-btn${myGender==='남'?' active-m':''}`}
                  onClick={() => setMyGender('남')}>💙 남성</button>
              </div>

              <div className="cd-form-group">
                <label className="cd-form-label">나의 이름</label>
                <input className="cd-input" placeholder="이름을 입력하세요"
                  value={myForm.name}
                  onChange={e => setMyForm({...myForm, name: e.target.value})} />
              </div>

              <div className="cd-form-group">
                <label className="cd-form-label">나의 생년월일</label>
                <div className="cd-input-row" style={{marginBottom:8}}>
                  <input className="cd-input" placeholder="년도 (예: 1998)"
                    value={myForm.year}
                    onChange={e => setMyForm({...myForm, year: e.target.value})} />
                  <input className="cd-input" placeholder="월 (1-12)"
                    value={myForm.month}
                    onChange={e => setMyForm({...myForm, month: e.target.value})} />
                </div>
                <input className="cd-input" placeholder="일 (1-31)"
                  value={myForm.day}
                  onChange={e => setMyForm({...myForm, day: e.target.value})} />
              </div>

              <div className="cd-form-group">
                <label className="cd-form-label">태어난 시간 (생시)</label>
                <select className="cd-input" disabled={myForm.noTime}
                  value={myForm.sinju}
                  onChange={e => setMyForm({...myForm, sinju: Number(e.target.value)})}
                  style={{opacity: myForm.noTime ? 0.4 : 1}}>
                  {SINJU_OPTIONS.map((s,i) => (
                    <option key={s.kr} value={i}>{s.label}</option>
                  ))}
                </select>
                <label className="cd-check-label">
                  <input type="checkbox" checked={myForm.noTime}
                    onChange={e => setMyForm({...myForm, noTime: e.target.checked})} />
                  태어난 시간을 모릅니다
                </label>
              </div>

              {/* 분석 버튼 */}
              <button className="cd-fate-btn"
                disabled={!myForm.name || !myForm.year || !myForm.month || !myForm.day || myLoadingPersona}
                onClick={async () => {
                  await loadMyPersonaData();
                }}>
                {myLoadingPersona ? '✦ 연애 기질 분석 중…' : '💕 나의 연애 성향 분석하기'}
              </button>

              {/* 생성 완료 미리보기 */}
              {myPersona && (
                <div className="lc-self-result">
                  <div className={`lc-self-avatar-preview${avatarRevealing ? ' lc-avatar-birth-anim' : ''}`}>
                    {DM_EMOJI[myPersona.dayMasterKan] || '🌟'}
                    {avatarRevealing && [
                      { tx:'-72px', ty:'-54px', d:'0ms' },
                      { tx:'12px',  ty:'-78px', d:'70ms' },
                      { tx:'76px',  ty:'-30px', d:'130ms' },
                      { tx:'72px',  ty:'34px',  d:'190ms' },
                      { tx:'-10px', ty:'80px',  d:'240ms' },
                      { tx:'-76px', ty:'24px',  d:'300ms' },
                    ].map((pt, idx) => (
                      <span
                        key={`pt-${idx}`}
                        className="lc-avatar-particle"
                        style={{ '--tx': pt.tx, '--ty': pt.ty, animationDelay: pt.d }}
                      />
                    ))}
                  </div>
                  <p className="lc-self-result-title">{myPersona.name}</p>
                  <p className="lc-self-result-sub">
                    {myPersona.dayMaster} · {myPersona.mbti}
                    {myPersona.mainSipsin && <span style={{color:'var(--rose)'}}> · {myPersona.mainSipsin}</span>}
                  </p>
                  <div className="lc-self-traits">
                    {(myPersona.coreTraits||[]).slice(0,4).map(t => (
                      <span key={t} className="lc-self-trait">{t}</span>
                    ))}
                  </div>
                  {/* 내 사주 팔자 */}
                  {myPersona.pillars && (
                    <div className="lc-self-pillars">
                      {[{l:'年',p:myPersona.pillars.year},{l:'月',p:myPersona.pillars.month},{l:'日',p:myPersona.pillars.day},{l:'時',p:myPersona.pillars.hour}].map(({l,p}) => (
                        <div key={l} className="lc-self-pillar lc-pillar-reveal" style={{ animationDelay: avatarRevealing ? `${({ '年': 0, '月': 80, '日': 160, '時': 240 }[l])}ms` : '0ms' }}>
                          <p style={{fontSize:9, color:'rgba(100,180,255,0.6)', marginBottom:3}}>{l}柱</p>
                          <p style={{fontSize:17, fontWeight:700, color:'#93c5fd', lineHeight:1}}>{p?.gan||'?'}</p>
                          <p style={{fontSize:17, fontWeight:700, color:'#f9a8d4', lineHeight:1.2}}>{p?.zhi||'?'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {myPersona.sajuPersonaSummary && (
                    <p style={{fontSize:12, color:'var(--text-dim)', lineHeight:1.7, marginTop:12, fontStyle:'italic'}}>
                      ✦ {myPersona.sajuPersonaSummary}
                    </p>
                  )}
                </div>
              )}

              {/* 다음 단계 버튼 */}
              <button className="lc-continue-btn"
                disabled={myLoadingPersona}
                onClick={() => setScreen('portal')}>
                {myPersona ? `✦ 상대방 캐릭터 생성하기 →` : '상대방 찾으러 가기 →'}
              </button>
              {!myPersona && (
                <button className="lc-skip-btn" onClick={() => setScreen('portal')}>
                  프로필 자동 연동이 안 되면 내 사주를 먼저 생성해 주세요
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══ PORTAL ══ */}
        {screen === 'portal' && (
          <div className="cd-screen px-4 py-10 md:px-8">
            <div className="lc-banner">
              <img src="/fuctionassets/lovesimulation.webp" alt="LOVE CODE 사주 연애 시뮬레이션" />
            </div>

            <div className="cd-portal-logo">💕</div>
            <h1 className="cd-portal-title">LOVE CODE</h1>
            <p className="cd-portal-sub max-w-2xl rounded-2xl border border-rose-200/10 bg-black/20 px-4 py-3 backdrop-blur-sm">
              당신의 사주 명리학적 연애 기질을 바탕으로,<br/>
              가상의 상대방 캐릭터를 생성하고 실제 데이트처럼 대화와 선택을 이어가는 연애 시뮬레이션입니다.<br/>
              <span style={{ fontSize:'12px', opacity: 0.7 }}>이곳에서 생성되는 아바타는 당신과 특별한 감정선을 만들 가상의 연애 상대입니다.</span>
              {myPersona && (
                <span style={{ display:'block', fontSize:'11px', color:'#93c5fd', marginTop:4, opacity:0.85 }}>
                  ✦ 내 사주 연동됨 — 오행 궁합으로 초기 호감도가 결정됩니다
                </span>
              )}
              {!myPersona && (
                <span style={{ display:'block', fontSize:'11px', color:'rgba(249,168,212,0.75)', marginTop:4 }}>
                  내 사주 미입력 · 시뮬레이션 시작 잠금 ·{' '}
                  <button onClick={() => setScreen('self')} style={{ background:'none', border:'none', color:'#93c5fd', cursor:'pointer', fontSize:'11px', padding:0, textDecoration:'underline' }}>입력하러 가기</button>
                </span>
              )}
            </p>

            {/* ── 내 사주 배너 ── */}
            {myPersona && (
              <div className="lc-my-banner w-full max-w-[560px]" style={{
                background: 'var(--glass-dark)', border: '1.5px solid var(--border)',
                borderRadius: 20, padding: '16px 20px', display: 'flex', alignItems: 'center',
                gap: 16, marginBottom: 24, boxShadow: 'var(--shadow)'
              }}>
                <div style={{fontSize:32}}>{DM_EMOJI[myPersona.dayMasterKan] || '🌟'}</div>
                <div style={{flex:1}}>
                  <p style={{fontSize:14, color:'var(--rose)', fontWeight:700}}>{myPersona.name}님 (나)</p>
                  <p style={{fontSize:12, color:'var(--text-dim)'}}>
                    {myPersona.dayMaster} · {myPersona.mbti}
                  </p>
                </div>
                <button className="lc-my-banner-edit" onClick={() => setScreen('self')} style={{
                  background: 'var(--pink-soft)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '6px 12px', fontSize: 12, color: 'var(--rose)', fontWeight: 600
                }}>수정</button>
              </div>
            )}

            {/* 탭 */}
            <div className="lc-tabs w-full max-w-[560px]" style={{
              display: 'flex', background: 'var(--glass)', borderRadius: 20,
              padding: 6, marginBottom: 32, border: '1.5px solid var(--border)'
            }}>
              <button className={`lc-tab${tab==='preset'?' active':''}`} onClick={() => setTab('preset')} style={{
                flex: 1, padding: '12px', borderRadius: 16, border: 'none',
                background: tab === 'preset' ? 'var(--rose)' : 'transparent',
                color: tab === 'preset' ? '#fff' : 'var(--text-dim)',
                fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s'
              }}>💕 운명 캐릭터</button>
              <button className={`lc-tab${tab==='match'?' active':''}`} onClick={() => { setTab('match'); setMatchResults(null); }} style={{
                flex: 1, padding: '12px', borderRadius: 16, border: 'none',
                background: tab === 'match' ? 'var(--rose)' : 'transparent',
                color: tab === 'match' ? '#fff' : 'var(--text-dim)',
                fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s'
              }}>🔮 궁합 추천</button>
              <button className={`lc-tab${tab==='custom'?' active':''}`} onClick={() => setTab('custom')} style={{
                flex: 1, padding: '12px', borderRadius: 16, border: 'none',
                background: tab === 'custom' ? 'var(--rose)' : 'transparent',
                color: tab === 'custom' ? '#fff' : 'var(--text-dim)',
                fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s'
              }}>✦ 직접 입력</button>
            </div>

            {/* ── 케이스 선택 탭 ── */}
            {tab === 'preset' && (
              <>
                <div className="lc-gender-toggle">
                  <button
                    className={`lc-gender-btn${npcGender==='남'?' active-m':''}`}
                    onClick={() => setNpcGender('남')}>
                    💙 남성 NPC
                  </button>
                  <button
                    className={`lc-gender-btn${npcGender==='여'?' active-f':''}`}
                    onClick={() => setNpcGender('여')}>
                    💕 여성 NPC
                  </button>
                </div>
                <div className="lc-preset-grid">
                  {(npcGender === '여' ? FEMALE_PRESETS : MALE_PRESETS).map((p) => (
                    <div
                      key={p.name}
                      className={`lc-preset-card${(loadingPersona || !myPersona) ? ' lc-preset-loading' : ''}`}
                      onClick={() => !loadingPersona && selectPreset(p)}>
                      <div className="lc-preset-emoji">{p.emoji}</div>
                      <div className="lc-preset-name">{p.name}</div>
                      <div className="lc-preset-dm">{p.desc}</div>
                      <div style={{ marginTop: 8 }}>
                        {p.tags.map(t => <span key={t} className="lc-preset-tag">{t}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
                {loadingPersona && (
                  <p style={{ textAlign:'center', color:'var(--gold)', fontSize:13, marginTop:12 }}>✦ 사주 계산 중…</p>
                )}
                {!myPersona && (
                  <p style={{ textAlign:'center', color:'rgba(249,168,212,0.8)', fontSize:12, marginTop:12 }}>
                    내 사주 선분석 후 궁합 체크가 완료되어야 시작할 수 있습니다.
                  </p>
                )}
              </>
            )}

            {/* ── 사주 매칭 탭 ── */}
            {tab === 'match' && (
              <div className="cd-form-card w-full max-w-[560px] rounded-3xl border border-rose-200/15 bg-black/30 shadow-[0_24px_80px_rgba(236,72,153,0.12)]">
                <p style={{ fontSize:13, color:'var(--rose)', marginBottom:18, textAlign:'center', letterSpacing:'0.08em' }}>
                  ✦ 나의 생년월일로 충합도가 가장 높은 시뮬레이션 상대를 추천해 드립니다 ✦
                </p>
                <div className="lc-gender-toggle" style={{ marginBottom:16, display:'flex', gap:8 }}>
                  <button className={`lc-gender-btn${npcGender==='남'?' active-m':''}`} onClick={() => setNpcGender('남')} style={{
                    flex:1, padding:'10px', borderRadius:12, border:'1.5px solid var(--border)',
                    background: npcGender === '남' ? 'var(--rose)' : '#fff',
                    color: npcGender === '남' ? '#fff' : 'var(--text-dim)', fontWeight:700
                  }}>💙 남성 캐릭터</button>
                  <button className={`lc-gender-btn${npcGender==='여'?' active-f':''}`} onClick={() => setNpcGender('여')} style={{
                    flex:1, padding:'10px', borderRadius:12, border:'1.5px solid var(--border)',
                    background: npcGender === '여' ? 'var(--rose)' : '#fff',
                    color: npcGender === '여' ? '#fff' : 'var(--text-dim)', fontWeight:700
                  }}>💕 여성 캐릭터</button>
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">나의 생년월일</label>
                  <div className="cd-input-row" style={{ marginBottom:10 }}>
                    <input className="cd-input" placeholder="년도 (예: 1998)"
                      value={matchForm.year} onChange={e => setMatchForm({...matchForm, year:e.target.value})} />
                    <input className="cd-input" placeholder="월 (1-12)"
                      value={matchForm.month} onChange={e => setMatchForm({...matchForm, month:e.target.value})} />
                  </div>
                  <input className="cd-input" placeholder="일 (1-31)"
                    value={matchForm.day} onChange={e => setMatchForm({...matchForm, day:e.target.value})} />
                </div>
                <button className="cd-fate-btn"
                  disabled={!matchForm.year || !matchForm.month || !matchForm.day || matchLoading}
                  onClick={async () => {
                    if (!matchForm.year || !matchForm.month || !matchForm.day) return;
                    const pool = npcGender === '여' ? FEMALE_PRESETS : MALE_PRESETS;
                    setMatchLoading(true);
                    try {
                      const results = await findBestMatches(
                        Number(matchForm.year), Number(matchForm.month), Number(matchForm.day), 12, pool
                      );
                      setMatchResults(results);
                    } catch (e) { showToast('궁합 계산 중 오류가 발생했어요.'); }
                    finally { setMatchLoading(false); }
                  }}>
                  {matchLoading ? '계산 중…' : '💕 최고의 상대 찾기'}
                </button>
                {matchResults && (
                  <div style={{ marginTop:22 }}>
                    <p style={{ fontSize:11, color:'var(--text-dim)', textAlign:'center', marginBottom:14, letterSpacing:'0.1em' }}>
                      ✦ 사주 궁합 순위 — 클릭하면 바로 시뮬레이션 시작 ✦
                    </p>
                    {matchResults.slice(0, 4).map((m, i) => {
                      const rank = ['✦','◈','◇','○'][i] || '·';
                      const pctClass = m.matchPct >= 70 ? 'high' : m.matchPct >= 50 ? 'mid' : 'low';
                      return (
                        <div key={m.name} className="lc-match-card" onClick={() => selectPreset(m)} style={{ marginBottom:10, opacity: myPersona ? 1 : 0.55 }}>
                          <span className="lc-match-rank">{rank}</span>
                          <div style={{ flex:1 }}>
                            <p style={{ fontSize:15, color:'var(--gold)', fontWeight:700, marginBottom:3 }}>
                              {m.emoji} {m.name}
                            </p>
                            <p style={{ fontSize:12, color:'var(--text-dim)' }}>{m.desc}</p>
                            <div style={{ marginTop:4 }}>
                              {m.tags.map(t => <span key={t} className="lc-preset-tag">{t}</span>)}
                            </div>
                          </div>
                          <span className={`lc-match-pct ${pctClass}`}>{m.matchPct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── 직접 입력 탭 ── */}
            {tab === 'custom' && (
              <div className="cd-form-card">
                <p style={{ fontSize:14, color:'var(--rose)', marginBottom:20, textAlign:'center', fontWeight:700 }}>
                  ✦ 상대방의 정보를 입력해 궁합을 분석합니다 ✦
                </p>
                <div className="lc-gender-toggle" style={{ marginBottom:20, display:'flex', gap:8 }}>
                  <button className={`lc-gender-btn${npcGender==='남'?' active-m':''}`} onClick={() => setNpcGender('남')} style={{
                    flex:1, padding:'12px', borderRadius:14, border:'1.5px solid var(--border)',
                    background: npcGender === '남' ? 'var(--rose)' : '#fff',
                    color: npcGender === '남' ? '#fff' : 'var(--text-dim)', fontWeight:700
                  }}>💙 남성 분석</button>
                  <button className={`lc-gender-btn${npcGender==='여'?' active-f':''}`} onClick={() => setNpcGender('여')} style={{
                    flex:1, padding:'12px', borderRadius:14, border:'1.5px solid var(--border)',
                    background: npcGender === '여' ? 'var(--rose)' : '#fff',
                    color: npcGender === '여' ? '#fff' : 'var(--text-dim)', fontWeight:700
                  }}>💕 여성 분석</button>
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">상대방 이름</label>
                  <input className="cd-input" placeholder="이름을 입력하세요"
                    value={form.name} onChange={e => setForm({...form, name:e.target.value})} />
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">생년월일</label>
                  <div className="cd-input-row" style={{ marginBottom: 12 }}>
                    <input className="cd-input" placeholder="년도 (예: 1996)"
                      value={form.year} onChange={e => setForm({...form, year:e.target.value})} />
                    <input className="cd-input" placeholder="월 (1-12)"
                      value={form.month} onChange={e => setForm({...form, month:e.target.value})} />
                  </div>
                  <input className="cd-input" placeholder="일 (1-31)"
                    value={form.day} onChange={e => setForm({...form, day:e.target.value})} />
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">태어난 시간 (생시)</label>
                  <select className="cd-input" disabled={form.noTime}
                    value={form.sinju}
                    onChange={e => setForm({...form, sinju: Number(e.target.value)})}
                    style={{ opacity: form.noTime ? 0.4 : 1 }}>
                    {SINJU_OPTIONS.map((s, i) => (
                      <option key={s.kr} value={i}>{s.label}</option>
                    ))}
                  </select>
                  <label className="cd-check-label">
                    <input type="checkbox" checked={form.noTime}
                      onChange={e => setForm({...form, noTime:e.target.checked})} />
                    태어난 시간을 모릅니다
                  </label>
                </div>
                <button className="cd-fate-btn"
                  onClick={submitCustom}
                  disabled={!myPersona || !form.name || !form.year || !form.month || !form.day || loadingPersona}>
                  {loadingPersona ? '✦ 사주 페르소나 분석 중…' : !myPersona ? '✦ 내 사주 먼저 분석 필요 ✦' : '💕 사주 페르소나 깨우기'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ AWAKENING ══ */}
        {screen === 'awakening' && persona && (
          <div className="cd-screen px-4 py-10 md:px-8">
            <div className="cd-awakening">
              <p style={{ fontSize:14, color:'var(--rose)', letterSpacing:'0.1em', textAlign:'center', marginBottom:32, fontWeight:700 }}>
                {persona.gender === '여' ? '✦ 그녀의 사주 페르소나가 깨어났습니다 ✦' : '✦ 그의 사주 페르소나가 깨어났습니다 ✦'}
              </p>

              {myPersona && (
                <>
                  <div className="lc-versus-wrap" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, marginBottom: 40
                  }}>
                    <div className="lc-versus-side" style={{textAlign:'center'}}>
                      <div className="cd-avatar" style={{width:100, height:100, fontSize:48, border:'3px solid var(--rose)'}}>
                        {DM_EMOJI[myPersona.dayMasterKan] || '🌟'}
                      </div>
                      <p style={{marginTop:12, fontWeight:700, color:'var(--text-main)'}}>{myPersona.name}</p>
                    </div>
                    <div className="lc-vs-sep" style={{fontSize:24, fontWeight:900, color:'var(--pink-accent)', opacity:0.6}}>VS</div>
                    <div className="lc-versus-side" style={{textAlign:'center'}}>
                      <div className="cd-avatar" style={{width:100, height:100, fontSize:48, border:'3px solid var(--rose)'}}>
                        {DM_EMOJI[persona.dayMasterKan] || '✨'}
                      </div>
                      <p style={{marginTop:12, fontWeight:700, color:'var(--text-main)'}}>{persona.name}</p>
                    </div>
                  </div>

                  {liveSynastry && (
                    <div className="cd-synastry">
                      <p className="cd-synastry-score">{liveSynastry.pct}%</p>
                      <p className="cd-synastry-label">종합 인연 지수 · {liveSynastry.label}</p>
                      <p className="cd-synastry-detail">{liveSynastry.desc}</p>
                    </div>
                  )}
                </>
              )}

              <h2 className="cd-char-name">{persona.name}</h2>
              <p className="cd-char-sub">{persona.dayMaster} · {persona.mbti}</p>
              {persona.mainSipsin && (
                <p style={{ textAlign:'center', fontSize:12, color:'var(--gold)', marginBottom:12, letterSpacing:'0.1em' }}>
                  주성(主星): <span style={{ color:'var(--rose)' }}>{persona.mainSipsin}</span>
                  {persona.sipsinTraits?.length > 0 && (
                    <span style={{ color:'var(--text-dim)' }}> · {persona.sipsinTraits.join(' · ')}</span>
                  )}
                </p>
              )}

              <div className="cd-traits">
                {(persona.coreTraits || []).map((t, i) => (
                  <span key={t} className="cd-trait" style={{ animationDelay:`${i*0.1}s` }}>{t}</span>
                ))}
                {persona.scenarioEmoji && <span className="cd-trait">{persona.scenarioEmoji}</span>}
              </div>

              {/* 사주 팔자 카드 */}
              {persona.pillars && (
                <div className="cd-stats-card" style={{ marginBottom: 20 }}>
                  <p className="cd-stats-title">사주 팔자 (四柱八字)</p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, textAlign:'center' }}>
                    {[
                      { label:'年柱', pillar: persona.pillars.year },
                      { label:'月柱', pillar: persona.pillars.month },
                      { label:'日柱', pillar: persona.pillars.day },
                      { label:'時柱', pillar: persona.pillars.hour },
                    ].map(({ label, pillar }) => (
                      <div key={label} style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'10px 4px', border:'1px solid rgba(200,169,110,0.2)' }}>
                        <p style={{ fontSize:10, color:'var(--gold)', marginBottom:4, letterSpacing:'0.1em' }}>{label}</p>
                        <p style={{ fontSize:20, fontWeight:700, lineHeight:1.1, color:'var(--fg)' }}>{pillar?.gan || '?'}</p>
                        <p style={{ fontSize:20, fontWeight:700, lineHeight:1.1, color:'var(--rose)' }}>{pillar?.zhi || '?'}</p>
                        <p style={{ fontSize:10, color:'var(--text-dim)', marginTop:4 }}>{pillar?.ganKr || ''}{pillar?.zhiKr || ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="cd-stats-card">
                <p className="cd-stats-title">오행 능력치 분석</p>
                {Object.entries(persona.stats || {}).map(([key, val]) => (
                  <div key={key} className="cd-stat-row">
                    <span className="cd-stat-label">{STAT_META[key]?.label || key}</span>
                    <div className="cd-stat-track">
                      <div className="cd-stat-fill" style={{ width:`${val}%`, background: STAT_META[key]?.color || '#C8A96E' }} />
                    </div>
                    <span className="cd-stat-num">{val}</span>
                  </div>
                ))}
              </div>

              <div className="cd-synastry">
                <p className="cd-synastry-label">✦ 궁합 반영 첫 만남 호감도 ✦</p>
                <p className="cd-synastry-score">{affinity ?? persona.initialAffinity ?? 10}%</p>
                <p className="cd-synastry-detail">
                  용신({persona.yongshin}) 에너지 · 이상형: {persona.tastes?.idealDateSpot}
                  {persona.tastes?.favTaste && ` · ${persona.tastes.favTaste} 선호`}
                </p>
              </div>

              {/* 오행 분포 미리보기 */}
              <div className="cd-stats-card" style={{ marginBottom: 20 }}>
                <p className="cd-stats-title">오행 에너지 분포</p>
                {Object.entries(persona.fiveElements || {}).map(([el, val]) => (
                  <div key={el} className="cd-stat-row">
                    <span className="cd-stat-label">{el}</span>
                    <div className="cd-stat-track">
                      <div className="cd-stat-fill" style={{
                        width:`${val}%`,
                        background: `var(--${EL_CLASS[el]}-c, #C8A96E)`,
                      }} />
                    </div>
                    <span className="cd-stat-num">{val}%</span>
                  </div>
                ))}
              </div>

              {/* 사주 페르소나 요약 */}
              {persona.sajuPersonaSummary && (
                <div className="cd-narrative" style={{ width:'100%', maxWidth:480, marginBottom:18 }}>
                  ✦ {persona.sajuPersonaSummary}
                </div>
              )}

              <button className="cd-start-btn" onClick={() => {
                setScreen('chat');
                setTimeout(() => {
                  if (!greetingShownRef.current) {
                    greetingShownRef.current = true;
                    addNpcMsgTyped(persona.greeting, 0);
                  }
                }, 120);
              }}>
                ✦ 운명의 만남을 시작하다 ✦
              </button>
            </div>
          </div>
        )}

        {/* ══ CHAT ══ */}
        {screen === 'chat' && persona && (
          <div className="cd-chat-wrap">
            <div className="cd-chat-header">
              {myPersona && (
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: 'var(--pink-soft)',
                  border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 20
                }} title={`${myPersona.name} (나)`}>
                  {DM_EMOJI[myPersona.dayMasterKan] || '🌟'}
                </div>
              )}
              <div className="cd-hdr-avatar">{DM_EMOJI[persona.dayMasterKan] || '✨'}</div>
              <div style={{flex: 1}}>
                <p className="cd-hdr-name">{persona.name}</p>
                <p className="cd-hdr-mood">{MOOD_EMOJI[mood] || ''} {mood} · {persona.dayMaster}</p>
              </div>
              <div style={{display:'flex', gap:8}}>
                <button className="cd-event-btn" onClick={triggerScenario} disabled={busy}>
                  🎲 이벤트
                </button>
                <button
                  className="cd-event-btn"
                  onClick={openEndingReport}
                  disabled={scenarioHistory.length < 4}
                  style={{background: 'var(--rose)', color: '#fff', borderColor: 'var(--rose)'}}
                >
                  📖 결말
                </button>
              </div>
            </div>

            {/* ── 호감도 바 ── */}
            <div className="cd-affinity-bar">
              <div className="cd-aff-top">
                <span>💕 호감도</span>
                <span className="cd-aff-num" style={{
                  transition:'color 0.3s',
                  color: affinityAnim ? 'var(--pink-accent)' : 'var(--rose)',
                }}>
                  {affinity} / 100
                </span>
              </div>
              <div className="cd-aff-track">
                <div className="cd-aff-fill" style={{ width:`${affinity}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>
                <span>{affinityLabel(affinity)}</span>
                <span>에피소드 {scenarioHistory.length} / 8</span>
              </div>
            </div>

            {/* ── 상세 관계 지표 ── */}
            <div className="cd-status-bar">
              <div className="cd-status-item">
                <div className="cd-status-label">
                  <span>🤝 신뢰</span>
                  <span>{trust}%</span>
                </div>
                <div className="cd-status-track">
                  <div className="cd-status-fill" style={{ width:`${trust}%`, background:'#4ade80' }} />
                </div>
              </div>
              <div className="cd-status-item">
                <div className="cd-status-label">
                  <span>⚡ 긴장</span>
                  <span>{tension}%</span>
                </div>
                <div className="cd-status-track">
                  <div className="cd-status-fill" style={{ width:`${tension}%`, background:'#f87171' }} />
                </div>
              </div>
              <div className="cd-status-item">
                <div className="cd-status-label">
                  <span>💎 호기심</span>
                  <span>{curiosity}%</span>
                </div>
                <div className="cd-status-track">
                  <div className="cd-status-fill" style={{ width:`${curiosity}%`, background:'#60a5fa' }} />
                </div>
              </div>
            </div>

            <div className="cd-messages">
              <p style={{
                margin: '0 auto 12px', width: 'fit-content', borderRadius: '20px',
                background: 'rgba(251, 113, 133, 0.08)', border: '1px solid var(--border)',
                padding: '4px 16px', fontSize: 11, color: 'var(--rose)', fontWeight: 700, letterSpacing: '0.05em'
              }}>
                RELATIONSHIP LOG · 선택이 인연을 바꿉니다
              </p>
              {messages.map((m, i) => (
                <div key={m.msgId ?? i} className={`cd-msg ${m.role}`} style={{
                  alignSelf: m.role === 'npc' ? 'flex-start' : 'flex-end'
                }}>
                  {m.role === 'npc' && <p style={{fontSize:11, color:'var(--text-dim)', marginBottom:4, marginLeft:4}}>{persona.name}</p>}
                  <div className="cd-bubble">
                    {m.typedLen !== undefined
                      ? m.text.slice(0, m.typedLen)
                      : m.text
                    }
                  </div>
                  {m.role === 'npc' && m.affinityChange !== 0 && m.typedLen === m.text?.length && (
                    <p style={{fontSize:11, marginTop:4, marginLeft:4, fontWeight:700, color: m.affinityChange > 0 ? '#10b981' : '#ef4444'}}>
                      {m.affinityChange > 0 ? '↑' : '↓'} 호감도 {Math.abs(m.affinityChange)}
                    </p>
                  )}
                </div>
              ))}
              {busy && (
                <div style={{ display:'flex', gap:4, padding:'12px 16px', background:'#fff', border:'1.5px solid var(--border)', borderRadius:'20px 20px 20px 4px', width:'fit-content' }}>
                  <div className="cd-dot" style={{width:6, height:6, borderRadius:'50%', background:'var(--rose)', opacity:0.4}}></div>
                  <div className="cd-dot" style={{width:6, height:6, borderRadius:'50%', background:'var(--rose)', opacity:0.6}}></div>
                  <div className="cd-dot" style={{width:6, height:6, borderRadius:'50%', background:'var(--rose)', opacity:0.8}}></div>
                </div>
              )}
              <div ref={msgEnd} />
            </div>

            <div className="cd-input-area">
              <textarea
                className="cd-textarea"
                placeholder={`${persona.name}에게 전하고 싶은 말...`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                rows={1}
              />
              <button className="cd-send-btn" onClick={sendMsg} disabled={busy || !input.trim()}>
                ➤
              </button>
            </div>
          </div>
        )}

        {/* ══ SCENARIO OVERLAY ══ */}
        {scenario && (
          <div className="cd-overlay">
            <div className="cd-scenario-card">
              <div className="cd-scene-bg" style={{ background: scenarioAtmosphere?.bg }}>
                <div className="cd-scene-glow" />
                <span style={{ position:'relative', filter:'drop-shadow(0 0 20px rgba(200,169,110,0.6))' }}>
                  {scenario.backgroundEmoji}
                </span>
              </div>

              <div className="cd-scene-body">
                {scenPhase === 'event' && (
                  <>
                    <p className="cd-scene-type">✦ {scenario.type} ✦</p>
                    {scenarioAtmosphere && (
                      <div className="cd-atmo">
                        <span className="cd-atmo-chip">📍 {scenarioAtmosphere.visual}</span>
                        <span className="cd-atmo-chip">🎧 {scenarioAtmosphere.sound}</span>
                      </div>
                    )}
                    {/* 웹소설 지문 (narrative) */}
                    {scenario.narrative && (
                      <p className="cd-narrative">{scenario.narrative}</p>
                    )}
                    <p className="cd-scene-desc">{scenario.situationDescription}</p>
                    <div className="cd-scene-dialogue">
                      <span className="cd-scene-who">{persona.name} ·</span>
                      {typeof scenario.npcDialogue === 'function'
                        ? scenario.npcDialogue(persona.name)
                        : scenario.npcDialogue}
                    </div>

                    <div className="cd-choices">
                      {scenario.choices.map(c => {
                        const elClass = EL_CLASS[c.element] || 'wood';
                        return (
                          <button key={c.id} className={`cd-choice ${elClass}`} onClick={() => handleChoice(c)}>
                            <span className={`cd-el-badge ${elClass}`}>{c.element}</span>
                            {c.text}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {scenPhase === 'result' && scenResult && (
                  <div className="cd-result">
                    {scenResult.isHit && (
                      <p className="cd-critical">
                        ✨ 크리티컬 히트! 용신({persona.yongshin})과 공명했습니다 ✨
                      </p>
                    )}
                    <div className="cd-result-dialogue">
                      <span className="cd-scene-who">{persona.name} ·</span>
                      {scenResult.reaction}
                    </div>
                    <p className={`cd-aff-result ${(scenResult.baseScore || 0) >= 0 ? 'pos' : 'neg'}`}>
                      {(scenResult.baseScore || 0) >= 0 ? '+' : ''}{scenResult.baseScore || 0}
                    </p>
                    <p className="cd-aff-result-label">호감도 변화</p>
                    <button className="cd-close-btn" onClick={closeScenario}>
                      운명을 이어가다 →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ ENDING REPORT OVERLAY ══ */}
        {endingOpen && endingResult && (
          <div className="cd-overlay">
            <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-rose-200/20 bg-white shadow-[0_30px_120px_rgba(225,29,72,0.15)]">
              <div className="border-b border-rose-200/15 bg-var(--pink-soft) px-6 py-5">
                <p className="text-xs font-bold tracking-[0.2em] text-rose-500">LOVE STORY ENDING REPORT</p>
                <h3 className={`mt-2 text-2xl font-bold tracking-[0.06em] ${endingResult.color || 'text-rose-600'}`}>
                  {endingResult.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-var(--text-main) font-medium">{endingResult.line}</p>
              </div>

              <div className="grid gap-4 px-6 py-5 md:grid-cols-5">
                {[
                  { label: '서사 점수', val: endingResult.arcScore, color: 'text-rose-500' },
                  { label: '최종 호감도', val: endingResult.score, color: 'text-rose-600' },
                  { label: '크리티컬', val: endingResult.hitCount, color: 'text-amber-500' },
                  { label: '리스크 선택', val: endingResult.highRiskCount, color: 'text-slate-500' },
                  { label: '데이트 수', val: endingResult.placeCount, color: 'text-emerald-500' },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl border border-rose-100 bg-var(--pink-soft)/30 p-4 text-center">
                    <p className="text-[11px] font-bold text-var(--text-dim) opacity-70">{s.label}</p>
                    <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>

              <div className="px-6 pb-4">
                <p className="rounded-2xl border border-rose-100 bg-var(--peach)/50 p-5 text-sm leading-7 text-var(--text-main) font-medium italic shadow-sm">
                  {endingResult.fate}
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto border-t border-rose-100 px-6 py-4 bg-var(--cream)">
                <p className="mb-3 text-xs font-bold tracking-[0.1em] text-var(--text-dim)">EPISODE LOG</p>
                <div className="space-y-2">
                  {scenarioHistory.slice(-8).map((item, idx) => (
                    <div key={`${item.type}_${idx}`} className="rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm shadow-sm">
                      <p className="font-bold text-var(--text-main)">[{item.type}] {item.choiceText}</p>
                      <p className="mt-1 text-xs text-var(--text-dim) font-medium">
                        {item.element} 성향 · {item.risk} 리스크 · {item.isHit ? '✨ 용신 공명' : '일반 선택'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-rose-100 px-6 py-5 bg-white">
                <button
                  className="rounded-xl border border-rose-200 px-6 py-2.5 text-sm font-bold text-var(--text-dim) transition hover:bg-rose-50"
                  onClick={() => setEndingOpen(false)}
                >
                  기록 닫기
                </button>
                <button
                  className="rounded-xl bg-rose-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-rose-600 shadow-lg shadow-rose-200"
                  onClick={() => {
                    setEndingOpen(false);
                    setScreen('portal');
                  }}
                >
                  새로운 인연 시작하기
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
