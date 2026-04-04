import { writeFileSync } from 'fs';
import { readFileSync } from 'fs';

// 기존 파일 읽기 & 탭/기능 추가
const original = readFileSync('app/admin/page.tsx', 'utf8');

// Main Page 부분만 교체
const newMainPage = `
// ─── Service Access Tab ───────────────────────────────────────
const SERVICE_LIST = [
  { name: "사주 풀이 (메인)", path: "/", icon: "🔮" },
  { name: "운명의 꽃 아틀리에", path: "/?openDestinyFlower=1", icon: "🌸" },
  { name: "타로 — 연애/이별", path: "/?openTarot=love", icon: "🃏" },
  { name: "타로 — 힐링 새벽", path: "/?openTarot=healing", icon: "🌙" },
  { name: "타로 — 만남/재회", path: "/?openTarot=reunion", icon: "💌" },
  { name: "타로 — 올해 운세", path: "/?openTarot=year", icon: "📅" },
  { name: "타로 — 자존감 레벨업", path: "/?openTarot=selfesteem", icon: "⭐" },
  { name: "AI 관상 (동물)", path: "/saju-animal", icon: "🐯" },
  { name: "AI 동물 MBTI 궁합", path: "/?openMBTI=1", icon: "🦊" },
  { name: "주역 64괘 거북점", path: "/?openYiching=1", icon: "🐢" },
  { name: "이집트 케멧 신탁", path: "/?openKemet=1", icon: "🏺" },
  { name: "화투점", path: "/?openHwatu=1", icon: "🎴" },
  { name: "자미두수", path: "/?openZiwei=1", icon: "⭐" },
  { name: "점성술 (서양)", path: "/?openAstrology=1", icon: "♑" },
  { name: "숙요점 (27수)", path: "/?openSukuyo=1", icon: "🌕" },
  { name: "인생책 (생명 수비학)", path: "/?openLifeBook=1", icon: "📖" },
  { name: "역사 속 나의 전생", path: "/?openPastLife=1", icon: "🏛️" },
  { name: "요가 가루다 신탁", path: "/yoga-guru", icon: "🧘" },
  { name: "럭키-싱크 일기", path: "/?openLuckSync=1", icon: "🍀" },
  { name: "코드 데스티니 회원가입", path: "/signup", icon: "✨" },
  { name: "로그인", path: "/login", icon: "🔐" },
  { name: "코인 결제", path: "/?openCoinCharge=1", icon: "🐷" },
  { name: "FAQ", path: "/faq", icon: "❓" },
  { name: "개인정보처리방침", path: "/privacy-policy", icon: "📜" },
  { name: "이용약관", path: "/terms-of-service", icon: "📋" },
];

function ServiceAccessTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-400/20 bg-violet-500/8 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-300 mb-1">🔓 관리자 무제한 접근 모드</p>
        <p className="text-xs text-slate-400">아래 서비스 링크는 관리자 세션으로 열려 코인 게이트가 자동으로 해제됩니다. 링크를 클릭하면 해당 서비스가 새 탭에서 열립니다.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {SERVICE_LIST.map(s => (
          <a key={s.path} href={s.path} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-3 text-sm text-slate-200 hover:bg-violet-900/40 hover:border-violet-400/40 transition group">
            <span className="text-xl flex-shrink-0">{s.icon}</span>
            <span className="font-medium leading-tight group-hover:text-violet-200 text-xs">{s.name}</span>
          </a>
        ))}
      </div>
      <div className="rounded-xl border border-amber-400/20 bg-amber-500/8 px-5 py-4 mt-4">
        <p className="text-xs font-semibold text-amber-300 mb-2">💡 관리자 직접 진입 방법</p>
        <ol className="list-decimal list-inside space-y-1 text-xs text-slate-400">
          <li>위 링크 클릭 시 새 탭에서 서비스 페이지가 열림</li>
          <li>이 탭의 sessionStorage에 <code className="bg-slate-800 px-1 rounded text-amber-200 text-[10px]">flower_admin_token</code>이 저장되어 있어야 코인 게이트가 해제됨</li>
          <li>새 탭에서 flower_admin_token이 없으면: 메인화면 하단 🌸 버튼 → 비밀번호 입력 후 진입</li>
        </ol>
      </div>
    </div>
  );
}

// ─── Banned Users Tab ──────────────────────────────────────────
function BannedUsersTab({ token, toast }: { token: string; toast: (msg: string, type?: "success" | "error") => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchKw, setSearchKw] = useState("");

  const fetchBanned = useCallback(async (kw: string) => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (kw) params.set("search", kw);
      const r = await fetch(\`/api/admin/members?\${params}\`, { headers: { Authorization: \`Bearer \${token}\` } });
      if (!r.ok) { const t = await r.text(); throw new Error(\`[\${r.status}] \${t.slice(0,150)}\`); }
      const d = await r.json() as { users?: AdminUser[] };
      const banned = (d.users ?? []).filter(u => u.status === "banned");
      setUsers(banned);
    } catch (e) { setErr(e instanceof Error ? e.message : "오류"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchBanned(searchKw); }, [fetchBanned, searchKw]);

  const handleUnban = async (u: AdminUser) => {
    if (!confirm(\`\${u.name} (\${u.email}) 의 정지를 해제하시겠습니까?\`)) return;
    try {
      const r = await fetch(\`/api/admin/members/\${encodeURIComponent(u._id)}/ban\`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: \`Bearer \${token}\` },
        body: JSON.stringify({ action: "unban" }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message || \`[\${r.status}]\`); }
      toast(\`\${u.name} 정지 해제 완료\`, "success");
      fetchBanned(searchKw);
    } catch (e) { toast(e instanceof Error ? e.message : "처리 실패", "error"); }
  };

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(\`\${u.name} 계정을 완전 삭제하시겠습니까? 되돌릴 수 없습니다.\`)) return;
    try {
      const r = await fetch(\`/api/admin/members/\${encodeURIComponent(u._id)}\`, {
        method: "DELETE", headers: { Authorization: \`Bearer \${token}\` },
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message || \`[\${r.status}]\`); }
      toast(\`\${u.name} 계정 삭제 완료\`, "success");
      fetchBanned(searchKw);
    } catch (e) { toast(e instanceof Error ? e.message : "삭제 실패", "error"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <form onSubmit={e => { e.preventDefault(); setSearchKw(searchInput.trim()); }} className="flex gap-2 flex-1">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} type="search" placeholder="이름/이메일 검색"
            className="flex-1 rounded-xl border border-rose-400/25 bg-slate-900/70 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-rose-400/50" />
          <button type="submit" className="rounded-xl border border-rose-400/40 bg-rose-600/30 px-4 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-600/50">검색</button>
          {searchKw && <button type="button" onClick={() => { setSearchInput(""); setSearchKw(""); }} className="rounded-xl border border-slate-600/40 bg-slate-700/50 px-3 py-2.5 text-sm text-slate-300">초기화</button>}
        </form>
        <span className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">제재 <b className="text-white">{users.length}</b>명</span>
      </div>

      {err && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"><b>⚠️ </b>{err}</div>}

      {!loading && users.length === 0 && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-5 py-10 text-center text-slate-500 text-sm">
          {searchKw ? "검색 결과가 없습니다." : "🎉 제재된 회원이 없습니다."}
        </div>
      )}

      {users.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-rose-400/20 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-rose-900/40 text-xs uppercase tracking-wider text-rose-300">
                <tr>
                  <th className="px-4 py-3 text-left">이름</th>
                  <th className="px-4 py-3 text-left">이메일</th>
                  <th className="px-4 py-3 text-left">정지일</th>
                  <th className="px-4 py-3 text-left">정지 사유</th>
                  <th className="px-4 py-3 text-right">코인</th>
                  <th className="px-4 py-3 text-center">조치</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className="border-t border-slate-700/40 bg-rose-950/10 hover:bg-rose-950/25">
                    <td className="px-4 py-3 font-medium text-slate-100">{u.name}</td>
                    <td className="px-4 py-3 text-slate-300">{u.email}</td>
                    <td className="px-4 py-3 text-slate-400">{fmtDate(u.bannedAt)}</td>
                    <td className="px-4 py-3 text-rose-300 text-xs max-w-[200px]">
                      <span title={u.banReason || "-"} className="line-clamp-2">{u.banReason || "-"}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-300">{fmtNum(u.points)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => handleUnban(u)}
                          className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20">
                          ✅ 해제
                        </button>
                        <button onClick={() => handleDelete(u)}
                          className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/20">
                          🗑️ 삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && <p className="px-4 py-2 text-right text-xs text-slate-500">로드 중</p>}
        </div>
      )}
    </div>
  );
}

//  Main Page 

type Tab = "dashboard" | "members" | "services" | "banned";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [isBooting, setIsBooting] = useState(true);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setToken(getStoredToken());
    setIsBooting(false);
  }, []);

  const addToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const logout = () => {
    try { sessionStorage.removeItem(FLOWER_TOKEN_KEY); } catch { /* ignore */ }
    setToken("");
  };

  if (isBooting) return (
    <main className="flex min-h-screen items-center justify-center bg-[#070b18]">
      <span className="text-slate-400 text-sm">로딩 중</span>
    </main>
  );
  if (!token) return <PasswordGate onAuth={setToken} />;

  const TAB_CONFIG: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "📊 대시보드" },
    { id: "members", label: "👥 회원관리" },
    { id: "services", label: "🔓 서비스 접근" },
    { id: "banned", label: "🚫 악성 유저" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#070b18] via-[#0d1325] to-[#141130] text-slate-100">
      <ToastContainer toasts={toasts} remove={id => setToasts(prev => prev.filter(t => t.id !== id))} />
      <header className="sticky top-0 z-30 border-b border-violet-500/20 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌸</span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-violet-400">CODE DESTINY</p>
              <h1 className="text-base font-bold text-white leading-tight">관리자 패널</h1>
            </div>
          </div>
          <nav className="flex items-center gap-1 flex-wrap">
            {TAB_CONFIG.map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={\`rounded-lg px-3 py-1.5 text-sm font-semibold transition \${tab === id ? "bg-violet-600/70 text-white border border-violet-400/50" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"}\`}>
                {label}
              </button>
            ))}
            <button onClick={logout} className="ml-2 rounded-lg border border-slate-600/40 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/50">로그아웃</button>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">
        {tab === "dashboard" && <DashboardTab token={token} />}
        {tab === "members" && <MembersTab token={token} toast={addToast} />}
        {tab === "services" && <ServiceAccessTab />}
        {tab === "banned" && <BannedUsersTab token={token} toast={addToast} />}
      </div>
    </main>
  );
}
`;

// 기존 파일에서 "//  Main Page " 섹션 이후를 전부 교체
const splitMark = '//  Main Page \n';
const splitIdx = original.lastIndexOf('//  Main Page ');
if (splitIdx < 0) {
  console.error('splitMark not found');
  process.exit(1);
}
const before = original.slice(0, splitIdx);
const updated = before + newMainPage;
writeFileSync('app/admin/page.tsx', updated, 'utf8');
console.log('page.tsx updated, length=' + updated.length);
