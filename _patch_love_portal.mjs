import { readFileSync, writeFileSync } from 'fs';

const path = 'C:\\Users\\Neo\\Desktop\\Code Destiny Main\\LoveSimulation.jsx';
let content = readFileSync(path, 'utf8');

// ── 문자열 존재 확인 ──
const marker1 = '✦ 남성 케이스 선택';
const marker2 = '✦ 이름·생년월일 직접 입력';
console.log('marker1 found:', content.includes(marker1));
console.log('marker2 found:', content.includes(marker2));

// ── 교체할 포털 구간 (탭~직접입력 끝) ──
// 시작 마커: '{/* 탭 */}' 이후
// 종료 마커: ')}' after the custom form

const startTag = '            {/* 탭 */}';
const endTag = `              </div>
            )}
          </div>
        )}

        {/* ══ AWAKENING ══ */}`;

const startIdx = content.indexOf(startTag);
const endIdx = content.indexOf(endTag);

if (startIdx === -1 || endIdx === -1) {
  console.error('Cannot find portal section! start:', startIdx, 'end:', endIdx);
  process.exit(1);
}

const before = content.slice(0, startIdx);
const after = content.slice(endIdx);

const newPortal = `            {/* 탭 */}
            <div className="lc-tabs" style={{ width:'100%', maxWidth:520 }}>
              <button className={\`lc-tab\${tab==='preset'?' active':''}\`} onClick={() => setTab('preset')}>
                💕 케이스 선택
              </button>
              <button className={\`lc-tab\${tab==='match'?' active':''}\`} onClick={() => { setTab('match'); setMatchResults(null); }}>
                🔮 사주 매칭
              </button>
              <button className={\`lc-tab\${tab==='custom'?' active':''}\`} onClick={() => setTab('custom')}>
                ✦ 직접 입력
              </button>
            </div>

            {/* ── 케이스 선택 탭 ── */}
            {tab === 'preset' && (
              <>
                <div className="lc-gender-toggle">
                  <button
                    className={\`lc-gender-btn\${npcGender==='남'?' active-m':''}\`}
                    onClick={() => setNpcGender('남')}>
                    💙 남성 NPC
                  </button>
                  <button
                    className={\`lc-gender-btn\${npcGender==='여'?' active-f':''}\`}
                    onClick={() => setNpcGender('여')}>
                    💕 여성 NPC
                  </button>
                </div>
                <div className="lc-preset-grid">
                  {(npcGender === '여' ? FEMALE_PRESETS : MALE_PRESETS).map((p) => (
                    <div key={p.name} className="lc-preset-card" onClick={() => selectPreset(p)}>
                      <div className="lc-preset-emoji">{p.emoji}</div>
                      <div className="lc-preset-name">{p.name}</div>
                      <div className="lc-preset-dm">{p.desc}</div>
                      <div style={{ marginTop: 8 }}>
                        {p.tags.map(t => <span key={t} className="lc-preset-tag">{t}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── 사주 매칭 탭 ── */}
            {tab === 'match' && (
              <div className="cd-form-card" style={{ maxWidth:500 }}>
                <p style={{ fontSize:13, color:'var(--rose)', marginBottom:18, textAlign:'center', letterSpacing:'0.08em' }}>
                  ✦ 내 생년월일을 입력하면 가장 잘 맞는 상대를 찾아드려요 ✦
                </p>
                <div className="lc-gender-toggle" style={{ marginBottom:16 }}>
                  <button className={\`lc-gender-btn\${npcGender==='남'?' active-m':''}\`} onClick={() => setNpcGender('남')}>
                    💙 남성에서 찾기
                  </button>
                  <button className={\`lc-gender-btn\${npcGender==='여'?' active-f':''}\`} onClick={() => setNpcGender('여')}>
                    💕 여성에서 찾기
                  </button>
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
                  disabled={!matchForm.year || !matchForm.month || !matchForm.day}
                  onClick={() => {
                    if (!matchForm.year || !matchForm.month || !matchForm.day) return;
                    const pool = npcGender === '여' ? FEMALE_PRESETS : MALE_PRESETS;
                    const results = findBestMatches(
                      Number(matchForm.year), Number(matchForm.month), Number(matchForm.day), 12, pool
                    );
                    setMatchResults(results);
                  }}>
                  💕 최고의 상대 찾기
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
                        <div key={m.name} className="lc-match-card" onClick={() => selectPreset(m)} style={{ marginBottom:10 }}>
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
                          <span className={\`lc-match-pct \${pctClass}\`}>{m.matchPct}%</span>
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
                <div className="lc-gender-toggle" style={{ marginBottom:16 }}>
                  <button className={\`lc-gender-btn\${npcGender==='남'?' active-m':''}\`} onClick={() => setNpcGender('남')}>
                    💙 남성
                  </button>
                  <button className={\`lc-gender-btn\${npcGender==='여'?' active-f':''}\`} onClick={() => setNpcGender('여')}>
                    💕 여성
                  </button>
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">상대방 이름</label>
                  <input className="cd-input" placeholder="이름을 입력하세요"
                    value={form.name} onChange={e => setForm({...form, name:e.target.value})} />
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">생년월일</label>
                  <div className="cd-input-row" style={{ marginBottom: 10 }}>
                    <input className="cd-input" placeholder="년도 (예: 1996)"
                      value={form.year} onChange={e => setForm({...form, year:e.target.value})} />
                    <input className="cd-input" placeholder="월 (1-12)"
                      value={form.month} onChange={e => setForm({...form, month:e.target.value})} />
                  </div>
                  <input className="cd-input" placeholder="일 (1-31)"
                    value={form.day} onChange={e => setForm({...form, day:e.target.value})} />
                </div>
                <div className="cd-form-group">
                  <label className="cd-form-label">태어난 시간</label>
                  <input className="cd-input" placeholder={form.noTime ? '시간 불명' : '시 (0~23)'}
                    disabled={form.noTime}
                    value={form.hour} onChange={e => setForm({...form, hour:e.target.value})}
                    style={{ opacity: form.noTime ? 0.4 : 1 }} />
                  <label className="cd-check-label">
                    <input type="checkbox" checked={form.noTime}
                      onChange={e => setForm({...form, noTime:e.target.checked, hour:''})} />
                    태어난 시간을 모릅니다
                  </label>
                </div>
                <button className="cd-fate-btn"
                  onClick={submitCustom}
                  disabled={!form.name || !form.year || !form.month || !form.day}>
                  ✦ 사주 분석 시작 ✦
                </button>
              </div>
            )}`;

content = before + newPortal + after;

writeFileSync(path, content, 'utf8');
console.log('Portal UI patched successfully!');
console.log('Total length:', content.length);
