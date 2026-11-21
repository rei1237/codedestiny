#!/usr/bin/env node
// 달빛 연화당 효과음 4종(범종·풍경·향 불붙기·연등 떠오름)을 순수 JS DSP 로 직접 합성한다.
// 외부 음원·유료 API 없음. 같은 시드 → 같은 PCM(결정적).
//
// 사용:
//   node scripts/synth-moonlit-sfx.mjs                # WAV 만 .tmp/moonlit-sfx/ 에 쓴다
//   node scripts/synth-moonlit-sfx.mjs --ffmpeg=<path> # + MP3 인코딩 → public/assets/moonlit-lotus/audio-v3/ + manifest
// --ffmpeg 를 생략하면 FFMPEG_PATH 환경변수, 그다음 PATH 의 ffmpeg 를 시도한다.
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP_DIR = path.join(ROOT, '.tmp', 'moonlit-sfx');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'moonlit-lotus', 'audio-v3');
const SR = 44100;
const BITRATE = 96;
const PEAK_DBFS = -3;
const GENERATED = '2026-11-22';

// ---------- 공용 DSP ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const TAU = Math.PI * 2;
const buf = (sec) => new Float64Array(Math.round(sec * SR));

// RBJ biquad. type: 'lp' | 'hp' | 'bp'
function biquadCoefs(type, f, q) {
  const w = (TAU * Math.min(f, SR * 0.45)) / SR;
  const cs = Math.cos(w);
  const al = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
  else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
  else { b0 = al; b1 = 0; b2 = -al; }
  const a0 = 1 + al;
  return [b0 / a0, b1 / a0, b2 / a0, (-2 * cs) / a0, (1 - al) / a0];
}
// freqAt(i) 로 시간에 따라 컷오프를 바꿀 수 있다(32샘플마다 갱신).
function biquad(x, type, freqAt, q = 0.707) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, c = null;
  for (let i = 0; i < x.length; i++) {
    if (i % 32 === 0) c = biquadCoefs(type, typeof freqAt === 'function' ? freqAt(i / SR) : freqAt, q);
    const v = c[0] * x[i] + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
function mixInto(dst, src, gain = 1, offset = 0) {
  for (let i = 0; i < src.length && i + offset < dst.length; i++) dst[i + offset] += src[i] * gain;
}
// 감쇠 사인 부분음. det 가 있으면 살짝 어긋난 쌍으로 맥놀이(beating)를 만든다.
function partial(out, { f, amp, decay, start = 0, attack = 0.004, det = 0, phase = 0 }) {
  const s0 = Math.round(start * SR);
  for (let i = s0; i < out.length; i++) {
    const t = (i - s0) / SR;
    const env = (t < attack ? 0.5 - 0.5 * Math.cos((Math.PI * t) / attack) : 1) * Math.exp(-t / decay);
    if (env < 1e-6 && t > attack) break;
    let v = Math.sin(TAU * f * t + phase);
    if (det) v = 0.5 * (v + Math.sin(TAU * (f + det) * t + phase * 1.7));
    out[i] += amp * env * v;
  }
}
function finish(x, { fadeIn = 0.005, fadeOut = 0.4 } = {}) {
  // DC 제거 → 가장자리 페이드(클릭 방지) → 피크 정규화
  const y = biquad(x, 'hp', 25, 0.707);
  const ni = Math.round(fadeIn * SR), no = Math.round(fadeOut * SR);
  for (let i = 0; i < ni; i++) y[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / ni);
  for (let i = 0; i < no; i++) y[y.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / no);
  y[0] = 0; y[y.length - 1] = 0;
  let peak = 0;
  for (const v of y) peak = Math.max(peak, Math.abs(v));
  const g = 10 ** (PEAK_DBFS / 20) / (peak || 1);
  for (let i = 0; i < y.length; i++) y[i] *= g;
  return y;
}

// ---------- 효과음 ----------
// 범종: 깊은 타종 1회. 비조화 부분음 + 쌍 맥놀이 + 부드러운 당목 타격음.
function bell() {
  const out = buf(7.5);
  const rnd = mulberry32(0xb311);
  const f0 = 96;
  const parts = [
    // [비율, 진폭, 감쇠(s), 맥놀이 Hz]
    [0.5, 0.55, 5.5, 0.32],
    [1.0, 1.0, 4.2, 0.55],
    [1.183, 0.42, 3.0, 0.9],
    [1.506, 0.34, 2.4, 1.3],
    [2.0, 0.3, 2.0, 1.1],
    [2.514, 0.2, 1.5, 1.7],
    [3.01, 0.13, 1.1, 2.1],
    [4.17, 0.08, 0.75, 2.6],
    [5.43, 0.045, 0.5, 3.0],
  ];
  for (const [r, a, d, det] of parts) {
    partial(out, { f: f0 * r, amp: a, decay: d, attack: 0.012, det, phase: rnd() * TAU });
  }
  // 당목(나무 막대)이 닿는 둔탁한 소리: 짧은 저역 잡음
  const thump = buf(0.25);
  for (let i = 0; i < thump.length; i++) thump[i] = (rnd() * 2 - 1) * Math.exp(-i / SR / 0.03);
  mixInto(out, biquad(thump, 'lp', 420, 0.8), 0.5);
  return finish(out, { fadeIn: 0.006, fadeOut: 1.6 });
}

// 풍경: 작은 처마 풍경 3회 딸랑. 시드 고정 랜덤 시각·음높이.
function windchime() {
  const out = buf(2.8);
  const rnd = mulberry32(0x9e1c);
  const base = [1760, 2093, 2349, 2637];
  let t = 0.02;
  for (let k = 0; k < 3; k++) {
    const f = base[Math.floor(rnd() * base.length)] * (1 + (rnd() - 0.5) * 0.01);
    const amp = 0.6 + rnd() * 0.4;
    // 작은 금속 종: 비조화 부분음, 높은 음일수록 빨리 사라짐
    for (const [r, a, d] of [[1, 1, 0.9], [2.32, 0.35, 0.45], [4.25, 0.16, 0.22], [6.8, 0.07, 0.12]]) {
      partial(out, { f: f * r, amp: amp * a, decay: d * (0.85 + rnd() * 0.3), start: t, attack: 0.0015, det: 1.5 + rnd() * 2, phase: rnd() * TAU });
    }
    t += 0.28 + rnd() * 0.45;
  }
  return finish(out, { fadeIn: 0.003, fadeOut: 0.5 });
}

// 향 불붙기: 성냥 긁는 작은 탁탁 + 따뜻한 쉬익. 조용한 성격.
function ignite() {
  const out = buf(1.3);
  const rnd = mulberry32(0x1617);
  // 쉬익: 대역이 열렸다 닫히는 저역 잡음
  const noise = buf(1.3);
  for (let i = 0; i < noise.length; i++) noise[i] = rnd() * 2 - 1;
  const swept = biquad(noise, 'lp', (t) => 350 + 1500 * Math.sin(Math.PI * Math.min(t / 0.9, 1)) ** 2, 0.9);
  for (let i = 0; i < swept.length; i++) {
    const t = i / SR;
    const env = Math.min(t / 0.12, 1) * Math.exp(-Math.max(t - 0.12, 0) / 0.35);
    out[i] += swept[i] * env * 0.55;
  }
  // 탁탁: 앞쪽에 몰린 드문 임펄스를 대역통과로 다듬는다
  const crack = buf(1.3);
  for (let i = 0; i < crack.length; i++) {
    const t = i / SR;
    const density = 0.0028 * Math.exp(-t / 0.22);
    if (rnd() < density) {
      const a = (0.4 + rnd() * 0.6) * (rnd() < 0.5 ? -1 : 1);
      const len = Math.round(SR * (0.002 + rnd() * 0.004));
      for (let j = 0; j < len && i + j < crack.length; j++) crack[i + j] += a * Math.exp(-j / (len / 4)) * (rnd() * 2 - 1);
    }
  }
  mixInto(out, biquad(crack, 'bp', 2600, 1.1), 1.0);
  // 불꽃이 자리 잡는 낮고 따뜻한 숨
  partial(out, { f: 140, amp: 0.05, decay: 0.4, start: 0.08, attack: 0.08 });
  return finish(out, { fadeIn: 0.004, fadeOut: 0.35 });
}

// 연등 떠오름: 위로 천천히 미끄러지는 공기 같은 패드 + 오르는 반짝임.
function lantern() {
  const dur = 2.7;
  const out = buf(dur);
  const rnd = mulberry32(0x1a77);
  const chord = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  const glide = (t) => 2 ** ((3 / 12) * (t / dur)); // 3반음 상승
  for (let k = 0; k < chord.length; k++) {
    let ph = rnd() * TAU;
    const amp = [0.32, 0.22, 0.2, 0.1][k];
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      const vib = 1 + 0.003 * Math.sin(TAU * 4.6 * t + k);
      ph += (TAU * chord[k] * glide(t) * vib) / SR;
      const env = Math.min(t / 0.45, 1) ** 2 * (0.75 + 0.25 * Math.cos(TAU * 0.4 * t));
      out[i] += amp * env * (Math.sin(ph) + 0.18 * Math.sin(2 * ph));
    }
  }
  // 공기감: 고역 잡음 숨결
  const air = buf(dur);
  for (let i = 0; i < air.length; i++) air[i] = rnd() * 2 - 1;
  const airF = biquad(biquad(air, 'hp', 3500), 'lp', (t) => 6000 + 3000 * (t / dur));
  for (let i = 0; i < airF.length; i++) {
    const t = i / SR;
    out[i] += airF[i] * 0.05 * Math.sin(Math.PI * Math.min(t / dur, 1));
  }
  // 반짝임: 오음음계로 오르는 작은 핑
  const penta = [1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2349.32, 2637.02];
  for (let k = 0; k < penta.length; k++) {
    const start = 0.25 + k * 0.24 + rnd() * 0.06;
    partial(out, { f: penta[k], amp: 0.16 + rnd() * 0.06, decay: 0.28, start, attack: 0.006, det: 2.5, phase: rnd() * TAU });
  }
  return finish(out, { fadeIn: 0.01, fadeOut: 0.8 });
}

const SOUNDS = [
  { name: 'bell', title: '범종', fn: bell, description: 'Deep temple bell strike: inharmonic partials from 48 Hz hum, detuned-pair beating, soft wooden-beam thump, long fade.' },
  { name: 'windchime', title: '풍경', fn: windchime, description: 'Small eave wind-bell: three light metallic strikes at seeded times and pitches.' },
  { name: 'ignite', title: '향 불붙기', fn: ignite, description: 'Soft incense ignition: sparse band-passed crackle and a warm low-passed whoosh.' },
  { name: 'lantern', title: '연등 떠오름', fn: lantern, description: 'Lantern rising: airy C-major pad gliding up three semitones with ascending pentatonic sparkles.' },
];

// ---------- 입출력 ----------
function wav16(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
function findFfmpeg() {
  const arg = process.argv.find((a) => a.startsWith('--ffmpeg='));
  const cands = [arg && arg.slice(9), process.env.FFMPEG_PATH, 'ffmpeg'].filter(Boolean);
  for (const c of cands) {
    const r = spawnSync(c, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
    if (r.status === 0 && /libmp3lame/.test(r.stdout)) return c;
  }
  return null;
}
function decodeStats(ffmpeg, file) {
  const r = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-f', 's16le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`decode failed: ${file}`);
  const n = r.stdout.length / 2;
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(r.stdout.readInt16LE(i * 2)));
  return { durationSec: +(n / SR).toFixed(3), peakDbfs: +(20 * Math.log10(peak / 32768)).toFixed(2), first: r.stdout.readInt16LE(0), last: r.stdout.readInt16LE((n - 1) * 2) };
}

mkdirSync(TMP_DIR, { recursive: true });
const ffmpeg = findFfmpeg();
const entries = [];
for (const s of SOUNDS) {
  const pcm = s.fn();
  const wavPath = path.join(TMP_DIR, `${s.name}.wav`);
  writeFileSync(wavPath, wav16(pcm));
  const head = Math.round(pcm[0] * 32767), tail = Math.round(pcm[pcm.length - 1] * 32767);
  console.log(`[wav] ${s.name}: ${(pcm.length / SR).toFixed(3)}s first=${head} last=${tail}`);
  if (!ffmpeg) continue;
  mkdirSync(OUT_DIR, { recursive: true });
  const mp3Path = path.join(OUT_DIR, `${s.name}.mp3`);
  const enc = spawnSync(ffmpeg, ['-v', 'error', '-y', '-i', wavPath, '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact',
    '-codec:a', 'libmp3lame', '-b:a', `${BITRATE}k`, '-ac', '1', '-ar', String(SR), mp3Path], { encoding: 'utf8' });
  if (enc.status !== 0) throw new Error(`encode failed: ${s.name}\n${enc.stderr}`);
  const bytes = readFileSync(mp3Path);
  const st = decodeStats(ffmpeg, mp3Path);
  console.log(`[mp3] ${s.name}: ${bytes.length}B ${st.durationSec}s peak=${st.peakDbfs}dBFS first=${st.first} last=${st.last}`);
  entries.push({ name: s.name, title: s.title, file: `${s.name}.mp3`, description: s.description, durationSec: st.durationSec, peakDbfs: st.peakDbfs,
    bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
if (ffmpeg) {
  const manifest = {
    version: 3,
    creator: 'Code Destiny (self-synthesized)',
    generator: 'scripts/synth-moonlit-sfx.mjs',
    license: 'CC0-1.0 (self-synthesized by scripts/synth-moonlit-sfx.mjs)',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    generated: GENERATED,
    description: 'Original sound effects synthesized from pure JS DSP (no external recordings, no paid APIs). Deterministic seeds.',
    format: { codec: 'MP3', channels: 1, sampleRate: SR, bitrate: BITRATE * 1000 },
    files: entries,
  };
  writeFileSync(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[manifest] ${path.relative(ROOT, path.join(OUT_DIR, 'manifest.json'))}`);
} else if (!existsSync(OUT_DIR)) {
  console.log('[skip] ffmpeg(libmp3lame) 없음: WAV 만 .tmp/moonlit-sfx/ 에 썼다. --ffmpeg=<path> 로 다시 실행.');
}
