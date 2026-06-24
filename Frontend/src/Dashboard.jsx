import React, { useState, useEffect, useRef, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

function normalizeDate(value) {
  if (!value) return value;
  return String(value).slice(0, 10);
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGreeting(name, hasHistory) {
  const firstName = name?.trim()?.split(/\s+/)[0] || '';
  if (!hasHistory) {
    return firstName ? `Hi there, ${firstName}` : 'Hi there';
  }
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
}

const REACTION_OPTIONS = [
  { emoji: "🫂", label: "Comforting", mood: "Grounding" },
  { emoji: "🌱", label: "Helpful",    mood: "Encouraging" },
  { emoji: "❤️", label: "Relatable",  mood: "Reflective" },
  { emoji: "✨", label: "Insightful", mood: "Reflective" },
  { emoji: "😊", label: "Made me smile", mood: "Calm" },
];

const MOOD_GLOW = {
  Calm:        "#FFE888",
  Reflective:  "#E5D6FF",
  Encouraging: "#FFD6C7",
  Grounding:   "#D9E8DB",
};

const CHAT_MOOD_BG = {
  calm:       { from: '#FAF7F2', to: '#FAF7F2' },
  neutral:    { from: '#FAF7F2', to: '#FAF7F2' },
  anxious:    { from: '#FAF7F2', to: '#EAE2F7' },
  stressed:   { from: '#FAF7F2', to: '#E3EEE6' },
  overwhelmed:{ from: '#FAF7F2', to: '#E3EEE6' },
  sad:        { from: '#FAF7F2', to: '#F5E9E6' },
  lonely:     { from: '#FAF7F2', to: '#F5E9E6' },
  angry:      { from: '#FAF7F2', to: '#F1E7DC' },
  happy:      { from: '#FAF7F2', to: '#FFF6DA' },
  excited:    { from: '#FAF7F2', to: '#FFF6DA' },
};

function resolveEmotion(source) {
  const raw = source?.emotion ?? source?.detected_emotion ?? source?.mood ?? null;
  return raw ? String(raw).toLowerCase() : null;
}

const DEFAULT_TITLES = ['', 'New Chat', 'Wellness Chat Session'];

const GREETING_RE = /^(hi+|hello+|hey+|yo+|sup|howdy|hola)[.!?\s]*$/i;
const STOPWORDS = new Set([
  'i', "i'm", 'im', 'a', 'an', 'the', 'to', 'of', 'and', 'is', 'it', 'its',
  'my', 'me', 'that', 'this', 'so', 'just', 'really', 'very', 'feel',
  'feeling', 'feelings', 'like', 'am', 'was', 'were', 'about', 'today',
  'have', 'has', 'had', 'been', 'do', 'does', 'did', 'you', 'your', 'be',
  'with', 'for', 'on', 'in', 'at', 'but', 'or', 'as', 'if', 'all', 'not',
  'no', 'are', 'can', "can't", 'cant', 'dont', "don't", 'will', 'would',
]);

function deriveChatTitle(messages) {
  if (!messages || messages.length === 0) return null;

  const userMsgs = messages
    .filter(m => {
      const sender = m.sender ?? (m.isBot ? 'bot' : 'user');
      return sender !== 'bot';
    })
    .map(m => (m.content || m.text || '').trim())
    .filter(Boolean);

  if (userMsgs.length === 0) return null;

  if (userMsgs.length === 1 && GREETING_RE.test(userMsgs[0])) {
    const stripped = userMsgs[0].replace(/[.!?]+$/, '');
    return stripped.charAt(0).toUpperCase() + stripped.slice(1).slice(0, 58);
  }

  const combined = userMsgs.join(' ').replace(/\s+/g, ' ').trim();
  const words = combined.split(' ');

  const seen = new Set();
  const keyWords = [];
  for (const raw of words) {
    const w = raw.replace(/[^a-zA-Z']/g, '');
    if (!w) continue;
    const lower = w.toLowerCase();
    if (STOPWORDS.has(lower)) continue;
    if (GREETING_RE.test(lower)) continue;
    if (seen.has(lower)) continue;
    seen.add(lower);
    keyWords.push(w);
    if (keyWords.length >= 5) break;
  }

  if (keyWords.length === 0) {
    const stripped = userMsgs[0].replace(/[.!?]+$/, '');
    return (stripped.charAt(0).toUpperCase() + stripped.slice(1)).slice(0, 50);
  }

  const titled = keyWords
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return titled.slice(0, 50);
}

function commitAutoTitle(sessionId, newTitle, sessionsRef, setSessions, manualRef) {
  if (!newTitle) return;
  if (manualRef.current.has(sessionId)) return;

  const existing = sessionsRef.current.find(s => s.id === sessionId);
  if (existing && existing.title === newTitle) return;

  setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s));
  sessionsRef.current = sessionsRef.current.map(s => s.id === sessionId ? { ...s, title: newTitle } : s);

  fetch(`${BACKEND_URL}/sessions/${sessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: newTitle })
  }).then(res => {
    if (!res.ok) console.error("Auto-title PUT failed:", res.status);
    else console.log("Auto-title persisted:", newTitle);
  }).catch(err => console.error("Auto-title network error:", err));
}

const Lantern = ({ mood = "Calm", size = 34 }) => {
  const glow = MOOD_GLOW[mood] || MOOD_GLOW.Calm;
  return (
    <div className="flex flex-col items-center select-none" title={`Mood glow: ${mood}`}>
      <div className="w-px h-4 bg-[#5F554D]/25" />
      <div className="rounded-t-full" style={{ width: size * 0.32, height: size * 0.18, background: '#5F554D', opacity: 0.5 }} />
      <div
        className="rounded-2xl flex items-center justify-center transition-all duration-700 ease-out"
        style={{ width: size, height: size * 1.15, background: glow, boxShadow: `0 0 ${size * 0.9}px ${glow}99, 0 0 ${size * 0.25}px ${glow}`, border: '1px solid rgba(95,85,77,0.25)' }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
      </div>
      <div className="rounded-b-full" style={{ width: size * 0.32, height: size * 0.12, background: '#5F554D', opacity: 0.5 }} />
    </div>
  );
};

const RabbitSVG = ({ phase, size = 144 }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
    <ellipse cx="72"  cy="40"  rx="15" ry="38" fill="#fcd3c1" />
    <ellipse cx="72"  cy="44"  rx="8"  ry="24" fill="#ffb499" />
    <ellipse cx="128" cy="40"  rx="15" ry="38" fill="#fcd3c1" />
    <ellipse cx="128" cy="44"  rx="8"  ry="24" fill="#ffb499" />
    <circle  cx="100" cy="110" r="44"           fill="#fcd3c1" />
    <circle  cx="100" cy="116" r="26"           fill="#fff9f6" />
    <circle  cx="73"  cy="105" r="8"  fill="#ffa280" opacity="0.5" />
    <circle  cx="127" cy="105" r="8"  fill="#ffa280" opacity="0.5" />
    <circle  cx="82"  cy="102" r="5"            fill="#4a332d" />
    <circle  cx="118" cy="102" r="5"            fill="#4a332d" />
    <circle  cx="84"  cy="100" r="1.5"          fill="white"   />
    <circle  cx="120" cy="100" r="1.5"          fill="white"   />
    {phase === 'Inhale' && <circle cx="100" cy="116" r="5" fill="#4a332d" />}
    {phase === 'Hold'   && <line x1="93" y1="116" x2="107" y2="116" stroke="#4a332d" strokeWidth="3" strokeLinecap="round" />}
    {phase === 'Exhale' && <path d="M 94 113 Q 100 123 106 113" stroke="#4a332d" strokeWidth="3" strokeLinecap="round" fill="none" />}
  </svg>
);

const BuddyAvatar = ({ size = 36 }) => (
  <div className="flex-shrink-0 flex items-end justify-center select-none" style={{ width: size, height: size }} title="Dori" aria-label="Dori">
    <RabbitSVG phase="Exhale" size={size} />
  </div>
);

const ColorWash = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
    <div className="absolute rounded-full" style={{ width: '60vw', height: '60vw', left: '-15%', top: '-20%', background: 'radial-gradient(circle, #F5D6C666, transparent 70%)', filter: 'blur(50px)', animation: 'washA 26s ease-in-out infinite' }} />
    <div className="absolute rounded-full" style={{ width: '55vw', height: '55vw', right: '-18%', top: '10%', background: 'radial-gradient(circle, #E5D6FF5c, transparent 70%)', filter: 'blur(50px)', animation: 'washB 32s ease-in-out infinite' }} />
    <div className="absolute rounded-full" style={{ width: '50vw', height: '50vw', left: '15%', bottom: '-25%', background: 'radial-gradient(circle, #B7C9BB5c, transparent 70%)', filter: 'blur(50px)', animation: 'washC 29s ease-in-out infinite' }} />
    <style>{`
      @keyframes washA { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(8%, 10%) scale(1.2); } }
      @keyframes washB { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-10%, 8%) scale(1.15); } }
      @keyframes washC { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(6%, -8%) scale(1.18); } }
    `}</style>
  </div>
);

const FloatingDecor = () => {
  const items = [
    { glyph: '🍃', left: '6%',  size: 20, duration: 19, delay: 0  },
    { glyph: '✨', left: '18%', size: 11, duration: 13, delay: 2  },
    { glyph: '🌿', left: '34%', size: 16, duration: 23, delay: 5  },
    { glyph: '✨', left: '52%', size: 10, duration: 15, delay: 1  },
    { glyph: '🍃', left: '68%', size: 18, duration: 21, delay: 8  },
    { glyph: '🌿', left: '83%', size: 14, duration: 25, delay: 3  },
    { glyph: '✨', left: '94%', size: 12, duration: 17, delay: 6  },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {items.map((it, i) => (
        <span key={i} className="absolute bottom-0" style={{ left: it.left, fontSize: it.size, opacity: 0, animation: `floatDrift ${it.duration}s ease-in-out ${it.delay}s infinite` }}>{it.glyph}</span>
      ))}
      <style>{`
        @keyframes floatDrift {
          0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          12%  { opacity: 0.3; }
          50%  { transform: translateY(-45vh) translateX(14px) rotate(10deg); opacity: 0.22; }
          88%  { opacity: 0.08; }
          100% { transform: translateY(-92vh) translateX(-10px) rotate(-8deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// ─── SESSION CONTEXT MENU ─────────────────────────────────────────────────────
function SessionMenu({ onRename, onDelete, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-9 w-36 bg-white rounded-xl shadow-lg z-50 overflow-hidden border border-[#EEF2EC]"
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={() => { onRename(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-[#5F554D] hover:bg-[#EEF2EC] transition-colors text-left"
      >
        <span>✏️</span> Rename
      </button>
      <div className="border-t border-[#EEF2EC]" />
      <button
        onClick={() => { onDelete(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors text-left"
      >
        <span>🗑️</span> Delete
      </button>
    </div>
  );
}

// ─── SPIRAL RINGS component ───────────────────────────────────────────────────
function SpiralRings({ count = 13 }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-around px-3"
      style={{
        height: 30,
        background: 'linear-gradient(to bottom, #E2DDD7, #EAE6E1)',
        borderBottom: '1px solid rgba(95,85,77,0.12)',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 13,
            height: 19,
            borderRadius: '45%',
            border: '1.5px solid rgba(95,85,77,0.22)',
            background: 'white',
            boxShadow: 'inset 0 1px 3px rgba(95,85,77,0.14), 0 1px 2px rgba(95,85,77,0.08)',
          }}
        />
      ))}
    </div>
  );
}

// ─── CHANGE PASSWORD MODAL ────────────────────────────────────────────────────
function ChangePasswordModal({ user, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!currentPassword.trim()) { setError('Please enter your current password.'); return; }
    if (newPassword.length < 6)  { setError('New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
    if (currentPassword === newPassword) { setError('New password must be different from current.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => onClose(), 1800);
      } else {
        setError(typeof data.detail === 'string' ? data.detail : 'Could not update password. Please check your current password.');
      }
    } catch (err) {
      setError('Network error — could not reach the server.');
    }
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-6"
      style={{ background: 'rgba(95,85,77,0.28)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ border: '1px solid rgba(183,201,187,0.35)', animation: 'pwOpen 0.32s cubic-bezier(0.34,1.45,0.64,1) forwards' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-4 bg-[#EEF2EC]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#5F554D]/50 uppercase tracking-widest mb-0.5">Account</p>
              <h3 className="font-serif font-semibold text-lg text-[#5F554D]">Change Password</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-[#5F554D]/50 hover:text-[#5F554D] transition-all text-sm"
            >✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-4">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-[#D9E8DB] flex items-center justify-center text-2xl">✓</div>
              <p className="font-medium text-[#5F554D] text-sm">Password updated!</p>
            </div>
          ) : (
            <>
              {/* Current password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#5F554D]/60 uppercase tracking-wider">Current Password</label>
                <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EEF2EC] rounded-2xl px-4 py-2.5">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="flex-1 bg-transparent outline-none text-sm text-[#5F554D] placeholder-[#5F554D]/30"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(v => !v)}
                    className="text-[#5F554D]/40 hover:text-[#5F554D] text-xs transition-colors flex-shrink-0"
                  >{showCurrent ? '🙈' : '👁️'}</button>
                </div>
              </div>

              {/* New password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#5F554D]/60 uppercase tracking-wider">New Password</label>
                <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EEF2EC] rounded-2xl px-4 py-2.5">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="flex-1 bg-transparent outline-none text-sm text-[#5F554D] placeholder-[#5F554D]/30"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="text-[#5F554D]/40 hover:text-[#5F554D] text-xs transition-colors flex-shrink-0"
                  >{showNew ? '🙈' : '👁️'}</button>
                </div>
                {/* Strength bar */}
                {newPassword.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-colors duration-300" style={{ background: newPassword.length >= i * 3 ? (newPassword.length >= 10 ? '#B7C9BB' : newPassword.length >= 7 ? '#F5D6C6' : '#f8b4b4') : '#EEF2EC' }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#5F554D]/60 uppercase tracking-wider">Confirm New Password</label>
                <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#EEF2EC] rounded-2xl px-4 py-2.5">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                    className="flex-1 bg-transparent outline-none text-sm text-[#5F554D] placeholder-[#5F554D]/30"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="text-[#5F554D]/40 hover:text-[#5F554D] text-xs transition-colors flex-shrink-0"
                  >{showConfirm ? '🙈' : '👁️'}</button>
                </div>
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="text-[10px] text-red-400 font-medium">Passwords don't match yet</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  <p className="text-[11px] text-red-500 font-medium">⚠ {error}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="w-full py-3 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-40"
                style={{ background: '#5F554D', color: 'white' }}
              >
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </>
          )}
        </div>

        <style>{`
          @keyframes pwOpen {
            0%   { transform: scale(0.88) translateY(12px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

// ─── CALENDAR + DIARY JOURNAL ────────────────────────────────────────────────
function JournalView({ user, sessionId }) {
  const today = new Date();

  function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  const [calYear,    setCalYear]    = useState(today.getFullYear());
  const [calMonth,   setCalMonth]   = useState(today.getMonth());
  const [entries,    setEntries]    = useState({});
  const [selected,   setSelected]   = useState(toDateStr(today));
  const [draft,      setDraft]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError,  setSaveError]  = useState('');
  const [loading,    setLoading]    = useState(true);
  const textRef = useRef(null);

  const [viewingEntry, setViewingEntry] = useState(null);
  const [isClosing,    setIsClosing]    = useState(false);
  const [pastIsEditing,   setPastIsEditing]   = useState(false);
  const [pastEditText,    setPastEditText]    = useState('');
  const [pastSaving,      setPastSaving]      = useState(false);
  const [pastSavedFlash,  setPastSavedFlash]  = useState(false);
  const [pastSaveError,   setPastSaveError]   = useState('');
  const pastEditRef = useRef(null);

  const [showPastPanel,  setShowPastPanel]  = useState(false);
  const [closingPanel,   setClosingPanel]   = useState(false);

  const openPastEntry = (date, text) => {
    setIsClosing(false);
    setPastSavedFlash(false);
    setPastSaveError('');
    setPastIsEditing(false);
    setViewingEntry({ date, text });
    setPastEditText(text);
  };
  const startEditingPastEntry = () => {
    setPastIsEditing(true);
    setTimeout(() => pastEditRef.current?.focus(), 80);
  };
  const closePastEntry = () => {
    setIsClosing(true);
    setTimeout(() => { setViewingEntry(null); setIsClosing(false); setPastIsEditing(false); }, 260);
  };

  const openPastPanel = () => { setClosingPanel(false); setShowPastPanel(true); };
  const closePastPanel = () => {
    setClosingPanel(true);
    setTimeout(() => { setShowPastPanel(false); setClosingPanel(false); }, 260);
  };

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/journals/user/${user.id}`);
        const data = await response.json();
        if (response.ok && data.journals) {
          const map = {};
          data.journals.forEach(row => {
            const dateKey = normalizeDate(row.entry_date);
            map[dateKey] = { id: row.id, text: row.content };
          });
          setEntries(map);
          const todayKey = toDateStr(today);
          if (map[todayKey]) {
            setDraft(map[todayKey].text);
          }
        } else {
          console.error("Failed to load journals:", data.detail);
        }
      } catch (err) {
        console.error("Journal load error:", err);
      }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    setDraft(entries[selected]?.text ?? '');
    setSaveError('');
    setTimeout(() => textRef.current?.focus(), 80);
  }, [selected, entries]);

  const saveEntryForDate = async (date, text) => {
    if (!text.trim()) return { ok: false, error: 'Nothing to save yet.' };
    const existing = entries[date];
    try {
      let response;
      if (existing?.id) {
        response = await fetch(`${BACKEND_URL}/journals/${existing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user?.id, content: text })
        });
      } else {
        response = await fetch(`${BACKEND_URL}/journals/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user?.id, session_id: sessionId ?? null, entry_date: date, content: text })
        });
      }
      const resData = await response.json().catch(() => ({}));
      if (response.ok) {
        const savedItem = resData.data;
        setEntries(prev => ({ ...prev, [date]: { id: savedItem?.id ?? existing?.id, text } }));
        return { ok: true, error: '' };
      } else {
        const msg = typeof resData.detail === 'string' ? resData.detail : `Save failed (status ${response.status}).`;
        console.error("Journal save failed:", resData.detail || response.status);
        return { ok: false, error: msg };
      }
    } catch (err) {
      console.error("Journal save error:", err);
      return { ok: false, error: 'Network error — could not reach the server.' };
    }
  };

  const handleSave = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    setSaveError('');
    const { ok, error } = await saveEntryForDate(selected, draft);
    if (ok) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    } else {
      setSaveError(error);
    }
    setSaving(false);
  };

  const handleSavePastEntry = async () => {
    if (!viewingEntry || !pastEditText.trim()) return;
    setPastSaving(true);
    setPastSaveError('');
    const { ok, error } = await saveEntryForDate(viewingEntry.date, pastEditText);
    if (ok) {
      setViewingEntry(prev => prev ? { ...prev, text: pastEditText } : prev);
      setPastIsEditing(false);
      setPastSavedFlash(true);
      setTimeout(() => setPastSavedFlash(false), 2000);
    } else {
      setPastSaveError(error);
    }
    setPastSaving(false);
  };

  const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate();
  const firstWeekday = new Date(calYear, calMonth, 1).getDay();
  const CAL_DAYS     = ['S','M','T','W','T','F','S'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); };

  const cellDate   = (day) => `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const isToday    = (d)   => cellDate(d) === toDateStr(today);
  const isSelected = (d)   => cellDate(d) === selected;
  const hasEntry   = (d)   => !!entries[cellDate(d)]?.text;

  const todayStr     = toDateStr(today);
  const yesterdayStr = toDateStr(new Date(today - 86400000));
  const isFuture     = selected > todayStr;
  const wordCount    = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  const selectedDateObj = new Date(selected + 'T12:00:00');
  const friendlyDate    = selectedDateObj.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

  const pastEntries = Object.entries(entries)
    .filter(([d, v]) => v?.text && d < todayStr)
    .sort(([a], [b]) => b.localeCompare(a));

  function entryLabelFull(date) {
    if (date === todayStr)     return 'Today';
    if (date === yesterdayStr) return 'Yesterday';
    return new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  const nbStyle = `
    @keyframes nbOpen {
      0%   { transform: perspective(900px) rotateX(-18deg) scale(0.86) translateY(14px); opacity: 0; }
      55%  { opacity: 1; }
      100% { transform: perspective(900px) rotateX(0deg) scale(1) translateY(0); opacity: 1; }
    }
    @keyframes nbClose {
      0%   { transform: perspective(900px) rotateX(0deg) scale(1) translateY(0); opacity: 1; }
      100% { transform: perspective(900px) rotateX(-12deg) scale(0.9) translateY(10px); opacity: 0; }
    }
  `;

  const dustyPaperBg = `
    radial-gradient(circle at 12% 18%, rgba(120,98,66,0.08), transparent 9%),
    radial-gradient(circle at 82% 24%, rgba(120,98,66,0.07), transparent 11%),
    radial-gradient(circle at 64% 78%, rgba(120,98,66,0.08), transparent 13%),
    radial-gradient(circle at 26% 66%, rgba(120,98,66,0.06), transparent 10%),
    radial-gradient(circle at 46% 42%, rgba(120,98,66,0.05), transparent 15%),
    radial-gradient(circle at 90% 88%, rgba(120,98,66,0.06), transparent 9%),
    linear-gradient(135deg, #F4ECDC 0%, #EEE3CC 100%)
  `;
  const dustyRuleLines = 'repeating-linear-gradient(transparent, transparent 31px, #E2D6B8 31px, #E2D6B8 32px)';
  const dustyMargin = 'rgba(176,92,78,0.28)';

  return (
    <div className="flex-1 flex overflow-hidden bg-[#FAF7F2]">
      <div
        className="hidden md:flex flex-col flex-shrink-0 p-3 border-r border-[#EEF2EC]"
        style={{ width: 210 }}
      >
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{
            boxShadow: '0 2px 12px rgba(95,85,77,0.08)',
            border: '1px solid rgba(183,201,187,0.3)',
          }}
        >
          <div className="flex items-center justify-between px-2.5 py-2 bg-[#EEF2EC]">
            <button onClick={prevMonth} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/70 text-[#5F554D]/60 hover:text-[#5F554D] transition-all text-xs font-bold">‹</button>
            <div className="text-center leading-tight">
              <p className="text-[10px] font-bold text-[#5F554D] tracking-wide uppercase">{MONTHS_SHORT[calMonth]}</p>
              <p className="text-[9px] text-[#5F554D]/40 font-medium">{calYear}</p>
            </div>
            <button onClick={nextMonth} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/70 text-[#5F554D]/60 hover:text-[#5F554D] transition-all text-xs font-bold">›</button>
          </div>
          <div className="grid grid-cols-7 px-2 pt-2 pb-0.5">
            {CAL_DAYS.map((d, i) => <div key={i} className="text-center text-[8px] font-bold text-[#5F554D]/30 uppercase">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-x-1.5 gap-y-px px-2 pb-2">
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const ds     = cellDate(day);
              const future = ds > todayStr;
              const hasE   = hasEntry(day);
              const sel    = isSelected(day);
              const tod    = isToday(day);
              return (
                <button
                  key={day}
                  disabled={future}
                  onClick={() => setSelected(ds)}
                  title={hasE ? 'Has entry' : undefined}
                  className={`relative flex flex-col items-center justify-center h-[22px] w-full rounded-lg text-[9px] font-medium transition-all ${
                    future ? 'opacity-20 cursor-not-allowed text-[#5F554D]/30' :
                    sel    ? 'bg-[#B7C9BB] text-[#5F554D] font-bold shadow-sm' :
                    tod    ? 'bg-[#F5D6C6] text-[#5F554D] font-bold' :
                    hasE   ? 'text-[#5F554D] font-bold hover:bg-[#EEF2EC]' :
                             'text-[#5F554D]/50 hover:bg-[#EEF2EC]'
                  }`}
                >
                  {day}
                  {hasE && !sel && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-[#B7C9BB]" />}
                </button>
              );
            })}
          </div>
          <div className="border-t border-[#EEF2EC] px-2.5 py-2 space-y-1">
            {[['#F5D6C6','Today'],['#B7C9BB','Selected']].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-md flex-shrink-0 inline-block" style={{ background: color }} />
                <span className="text-[8px] text-[#5F554D]/40 font-medium">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="w-[5px] h-[5px] rounded-full bg-[#B7C9BB] flex-shrink-0 inline-block ml-[2px]" />
              <span className="text-[8px] text-[#5F554D]/40 font-medium">Has entry</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 p-4 overflow-hidden">
        <div
          className="flex-1 flex flex-col overflow-hidden rounded-2xl"
          style={{
            background: '#FEFDF7',
            boxShadow: '0 6px 28px rgba(95,85,77,0.11), 0 1px 4px rgba(95,85,77,0.07)',
            border: '1px solid rgba(183,201,187,0.25)',
          }}
        >
          <SpiralRings count={13} />

          <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-[#EEF2EC]/80">
            <div>
              <p className="text-[10px] font-bold text-[#5F554D]/40 uppercase tracking-widest mb-0.5">
                {isFuture ? 'Future page' : entries[selected] ? 'Editing entry' : 'New entry'}
              </p>
              <p className="font-serif text-sm font-semibold text-[#5F554D]">{friendlyDate}</p>
            </div>

            <div className="flex items-center gap-2">
              {loading && <span className="text-[10px] text-[#5F554D]/40 animate-pulse">Loading…</span>}

              <button
                onClick={openPastPanel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EEF2EC] hover:bg-[#D9E8DB] text-[#5F554D] text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
              >
                <span className="text-xs">📋</span>
                Past Entries
                {pastEntries.length > 0 && (
                  <span className="bg-[#5F554D] text-white rounded-full px-1.5 py-0 text-[8px] font-bold leading-4">
                    {pastEntries.length}
                  </span>
                )}
              </button>

              {!isFuture && (
                <button
                  onClick={handleSave}
                  disabled={!draft.trim() || saving}
                  className={`px-4 py-1.5 font-bold text-[10px] uppercase tracking-wider rounded-full transition-all active:scale-95 disabled:opacity-40 ${
                    savedFlash ? 'bg-[#D9E8DB] text-[#5F554D]' : 'bg-[#5F554D] text-white shadow-sm hover:bg-[#4A4340]'
                  }`}
                >
                  {saving ? '…' : savedFlash ? '✓ Saved' : entries[selected] ? 'Update' : 'Save'}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto relative">
            <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: 64, width: 1, background: 'rgba(255,150,150,0.28)' }} />
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #E6EBE3 31px, #E6EBE3 32px)', backgroundPosition: '0 8px' }} />
            <textarea
              ref={textRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              disabled={isFuture}
              placeholder={isFuture ? '' : "What's stirring inside you today…"}
              className="relative z-10 w-full h-full min-h-[300px] bg-transparent outline-none text-sm leading-8 resize-none text-[#5F554D] placeholder-[#5F554D]/22"
              style={{ lineHeight: '32px', fontFamily: "'Georgia','Times New Roman',serif", paddingLeft: 76, paddingRight: 28, paddingTop: 8, paddingBottom: 20 }}
            />
          </div>

          <div className="flex-shrink-0 border-t border-[#EEF2EC]/80 px-6 py-2">
            <p className="text-[10px] text-[#5F554D]/35 font-medium">
              {isFuture ? '🌙 Future pages are still blank' : wordCount > 0 ? `${wordCount} word${wordCount !== 1 ? 's' : ''}` : 'Start writing — it gets easier…'}
            </p>
            {saveError && (
              <p className="text-[10px] text-red-500 font-semibold mt-1">⚠ {saveError}</p>
            )}
          </div>
        </div>
      </div>

      {showPastPanel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(95,85,77,0.22)', backdropFilter: 'blur(7px)' }}
          onClick={closePastPanel}
        >
          <div
            className="relative flex flex-col overflow-hidden rounded-2xl w-full max-w-lg"
            style={{
              maxHeight: '82vh',
              background: dustyPaperBg,
              boxShadow: '0 28px 64px rgba(95,85,77,0.22), 0 4px 12px rgba(95,85,77,0.10)',
              border: '1px solid rgba(120,98,66,0.18)',
              animation: closingPanel
                ? 'nbClose 0.24s cubic-bezier(0.4,0,1,1) forwards'
                : 'nbOpen 0.38s cubic-bezier(0.34,1.45,0.64,1) forwards',
            }}
            onClick={e => e.stopPropagation()}
          >
            <SpiralRings count={13} />

            <div className="flex-shrink-0 flex items-center justify-between px-7 py-4 border-b border-[rgba(120,98,66,0.15)]">
              <div>
                <p className="text-[10px] font-bold text-[#7A6A4F]/60 uppercase tracking-widest mb-0.5">Old Pages</p>
                <p className="font-serif font-semibold text-sm text-[#5F4F3A]">
                  {pastEntries.length === 0
                    ? 'No old pages yet'
                    : `${pastEntries.length} page${pastEntries.length !== 1 ? 's' : ''} from before today`}
                </p>
              </div>
              <button
                onClick={closePastPanel}
                className="w-7 h-7 flex-shrink-0 rounded-full bg-[#E6DAC0] hover:bg-[#D9C9A4] flex items-center justify-center text-[#5F4F3A]/60 hover:text-[#5F4F3A] transition-all text-xs"
              >✕</button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {pastEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16">
                  <p className="text-2xl">🕊️</p>
                  <p className="text-sm text-[#5F4F3A]/45 italic">Pages you wrote before today will settle in here.</p>
                </div>
              ) : (
                pastEntries.map(([date, entry], i) => {
                  const wc = entry.text.trim().split(/\s+/).length;
                  const dateObj = new Date(date + 'T12:00:00');
                  const dayNum  = dateObj.toLocaleDateString('en-US', { day: 'numeric' });
                  const dayName = date === yesterdayStr ? 'Yesterday'
                    : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const monthYr = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

                  return (
                    <button
                      key={date}
                      onClick={() => { closePastPanel(); setTimeout(() => openPastEntry(date, entry.text), 160); }}
                      className="w-full text-left relative border-b border-[rgba(120,98,66,0.13)] hover:bg-[rgba(120,98,66,0.05)] transition-colors group"
                      style={{ transform: `rotate(${i % 2 === 0 ? '-0.25deg' : '0.25deg'})` }}
                    >
                      <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: 54, width: 1, background: dustyMargin }} />
                      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: dustyRuleLines, backgroundPosition: '0 0' }} />

                      <div className="relative z-10 flex gap-3 px-4 py-3">
                        <div className="flex-shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-[#E6DAC0] group-hover:bg-[#D9C9A4] transition-colors mt-0.5">
                          <span className="text-[15px] font-bold leading-none text-[#5F4F3A]">{dayNum}</span>
                          <span className="text-[8px] font-bold text-[#5F4F3A]/55 uppercase leading-tight">{dayName.slice(0,3)}</span>
                        </div>

                        <div className="flex-1 min-w-0 pl-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[11px] font-bold text-[#5F4F3A]/65 group-hover:text-[#5F4F3A] transition-colors">{monthYr}</p>
                            <span className="text-[9px] text-[#5F4F3A]/35 font-medium">{wc} words</span>
                          </div>
                          <p className="text-[12px] text-[#5F4F3A]/70 leading-relaxed line-clamp-2" style={{ fontFamily: "'Georgia','Times New Roman',serif" }}>
                            {entry.text}
                          </p>
                        </div>

                        <div className="flex-shrink-0 self-center text-[#5F4F3A]/25 group-hover:text-[#5F4F3A]/55 transition-colors text-sm pr-1">›</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <style>{nbStyle}</style>
          </div>
        </div>
      )}

      {viewingEntry && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6"
          style={{ background: 'rgba(95,85,77,0.28)', backdropFilter: 'blur(8px)' }}
          onClick={closePastEntry}
        >
          <div
            className="relative flex flex-col overflow-hidden rounded-2xl max-w-md w-full"
            style={{
              maxHeight: '80vh',
              background: dustyPaperBg,
              boxShadow: '0 32px 72px rgba(95,85,77,0.26), 0 4px 12px rgba(95,85,77,0.10)',
              border: '1px solid rgba(120,98,66,0.18)',
              animation: isClosing
                ? 'nbClose 0.24s cubic-bezier(0.4,0,1,1) forwards'
                : 'nbOpen 0.38s cubic-bezier(0.34,1.45,0.64,1) forwards',
            }}
            onClick={e => e.stopPropagation()}
          >
            <SpiralRings count={11} />

            <div className="flex-shrink-0 flex items-start justify-between px-7 py-4">
              <div>
                <p className="text-[10px] font-bold text-[#7A6A4F]/60 uppercase tracking-widest mb-0.5">Old Page</p>
                <p className="font-serif font-semibold text-sm text-[#5F4F3A]">{entryLabelFull(viewingEntry.date)}</p>
              </div>
              <button onClick={closePastEntry} className="w-7 h-7 flex-shrink-0 rounded-full bg-[#E6DAC0] hover:bg-[#D9C9A4] flex items-center justify-center text-[#5F4F3A]/60 hover:text-[#5F4F3A] transition-all text-xs mt-0.5">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto relative px-7 pb-4" style={{ minHeight: 200 }}>
              <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: 48, width: 1, background: dustyMargin }} />
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: dustyRuleLines, backgroundPosition: '0 0' }} />
              {pastIsEditing ? (
                <textarea
                  ref={pastEditRef}
                  value={pastEditText}
                  onChange={e => setPastEditText(e.target.value)}
                  className="relative z-10 w-full h-full min-h-[180px] bg-transparent outline-none text-sm leading-8 resize-none text-[#5F4F3A]"
                  style={{ lineHeight: '32px', fontFamily: "'Georgia','Times New Roman',serif", paddingLeft: 60 }}
                />
              ) : (
                <p
                  className="relative z-10 text-sm text-[#5F4F3A] leading-8 whitespace-pre-wrap"
                  style={{ lineHeight: '32px', fontFamily: "'Georgia','Times New Roman',serif", paddingLeft: 60 }}
                >
                  {viewingEntry.text}
                </p>
              )}
            </div>

            <div className="flex-shrink-0 border-t border-[rgba(120,98,66,0.15)] px-7 py-3 flex items-center justify-between gap-3">
              <p className="text-[10px] text-[#5F4F3A]/45">{(pastIsEditing ? pastEditText : viewingEntry.text).trim() ? (pastIsEditing ? pastEditText : viewingEntry.text).trim().split(/\s+/).length : 0} words</p>
              {pastIsEditing ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setPastIsEditing(false); setPastEditText(viewingEntry.text); setPastSaveError(''); }}
                    className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider rounded-full bg-[#E6DAC0] text-[#5F4F3A]/70 hover:bg-[#D9C9A4] transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePastEntry}
                    disabled={!pastEditText.trim() || pastSaving}
                    className={`px-4 py-1.5 font-bold text-[10px] uppercase tracking-wider rounded-full transition-all active:scale-95 disabled:opacity-40 ${
                      pastSavedFlash ? 'bg-[#D9C9A4] text-[#5F4F3A]' : 'bg-[#5F4F3A] text-white shadow-sm hover:bg-[#4A3D2E]'
                    }`}
                  >
                    {pastSaving ? '…' : pastSavedFlash ? '✓ Saved' : 'Update Page'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={startEditingPastEntry}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 font-bold text-[10px] uppercase tracking-wider rounded-full bg-[#E6DAC0] text-[#5F4F3A] hover:bg-[#D9C9A4] transition-all active:scale-95"
                >
                  ✏️ Edit this page
                </button>
              )}
            </div>
            {pastSaveError && (
              <div className="flex-shrink-0 px-7 pb-3 -mt-1">
                <p className="text-[10px] text-red-500 font-semibold">⚠ {pastSaveError}</p>
              </div>
            )}

            <style>{nbStyle}</style>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ─────────────────────────────────────────────────────────
export default function Dashboard({ user, onLogout }) {
  const [view,        setView]        = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth,setSidebarWidth]= useState(280);

  const isResizing   = useRef(false);
  const startX       = useRef(0);
  const startWidth   = useRef(0);
  const MIN_WIDTH    = 200;
  const MAX_WIDTH    = 420;

  const onMouseDownResize = useCallback((e) => {
    isResizing.current = true;
    startX.current     = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor     = 'col-resize';
  }, [sidebarWidth]);

  useEffect(() => {
    const onMove = (e) => {
      if (!isResizing.current) return;
      const delta = e.clientX - startX.current;
      setSidebarWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta)));
    };
    const onUp = () => {
      isResizing.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor     = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState('');
  const [isTyping,        setIsTyping]        = useState(false);
  const [sessions,        setSessions]        = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [lanternMood,     setLanternMood]     = useState('Calm');
  const [chatMood,        setChatMood]        = useState('calm');
  const messagesEndRef = useRef(null);
  const justCreatedSessionRef = useRef(false);
  const sessionsRef = useRef([]);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  const manualRenameRef = useRef(new Set());
  const sessionConvoRef = useRef({});

  const [hoveredSession,  setHoveredSession]  = useState(null);
  const [openMenuSession, setOpenMenuSession] = useState(null);
  const [renamingSession, setRenamingSession] = useState(null);
  const [renameValue,     setRenameValue]     = useState('');
  const renameInputRef = useRef(null);

  const [doorOpen,       setDoorOpen]       = useState(false);
  const [welcomeComplete,setWelcomeComplete]= useState(false);
  const [rabbitWaving,   setRabbitWaving]   = useState(false);

  const [profileOpen,  setProfileOpen]  = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, []);

  const [breathPhase,  setBreathPhase]  = useState('Inhale');
  const [counter,      setCounter]      = useState(4);
  const [breathScale,  setBreathScale]  = useState(1.0);
  const [breathActive, setBreathActive] = useState(false);
  const [cycleCount,   setCycleCount]   = useState(0);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, isTyping]);

  useEffect(() => {
    const t1 = setTimeout(() => setDoorOpen(true),       500);
    const t2 = setTimeout(() => setRabbitWaving(true),  1800);
    const t3 = setTimeout(() => setWelcomeComplete(true),3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    if (view !== 'breathing' || !breathActive) return;
    let lp = 'Inhale', lc = 4;
    setBreathPhase('Inhale'); setCounter(4); setBreathScale(1.35);
    const iv = setInterval(() => {
      lc -= 1;
      if (lc <= 0) {
        if (lp === 'Inhale')    { lp = 'Hold';   setBreathPhase('Hold'); }
        else if (lp === 'Hold') { lp = 'Exhale'; setBreathPhase('Exhale'); setBreathScale(1.0); }
        else                    { lp = 'Inhale'; setBreathPhase('Inhale'); setBreathScale(1.35); setCycleCount(p=>p+1); }
        lc = 4;
      }
      setCounter(lc);
    }, 1000);
    return () => clearInterval(iv);
  }, [view, breathActive]);

  useEffect(() => {
    if (view !== 'breathing') { setBreathActive(false); setBreathPhase('Inhale'); setBreathScale(1.0); setCounter(4); setCycleCount(0); }
  }, [view]);

  useEffect(() => {
    if (renamingSession && renameInputRef.current) renameInputRef.current.focus();
  }, [renamingSession]);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/sessions/user/${user.id}`);
        const data = await res.json();
        if (res.ok && data.sessions) {
          const sorted = [...data.sessions].sort((a, b) => b.id - a.id);
          setSessions(sorted);
          if (sorted.length > 0) setActiveSessionId(sorted[0].id);
        }
      } catch (err) {
        console.error("Failed to load sessions:", err);
      }
    };
    if (user?.id) loadSessions();
  }, [user?.id]);

  useEffect(() => {
    if (!activeSessionId) return;
    if (justCreatedSessionRef.current) { justCreatedSessionRef.current = false; return; }
    const loadHistory = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/history/${activeSessionId}`);
        const data = await res.json();
        if (res.ok && data.messages) {
          const formatted = data.messages
            .filter(m => m.content)
            .map(m => ({ id: m.id, text: m.content, isBot: m.sender === 'bot', reaction: null, emotion: resolveEmotion(m) }));
          setMessages(formatted);
          sessionConvoRef.current[activeSessionId] = formatted.map(m => ({
            sender: m.isBot ? 'bot' : 'user',
            content: m.text,
          }));
          const lastFeeling = [...formatted].reverse().find(m => m.emotion && CHAT_MOOD_BG[m.emotion]);
          setChatMood(lastFeeling ? lastFeeling.emotion : 'calm');

          const sess = sessions.find(s => s.id === activeSessionId);
          const msgCount = data.messages.length;
          if (sess && !manualRenameRef.current.has(activeSessionId) && (msgCount === 2 || msgCount === 6)) {
            const newTitle = deriveChatTitle(data.messages.map(m => ({
              sender: m.sender === 'bot' ? 'bot' : 'user',
              content: m.content,
            })));
            commitAutoTitle(activeSessionId, newTitle, sessionsRef, setSessions, manualRenameRef);
          }
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    };
    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  const handleStartNewChat = () => { setActiveSessionId(null); setMessages([]); setChatMood('calm'); };

  const sendChatMessage = useCallback(async (messageText) => {
    if (!messageText.trim()) return;
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      try {
        const sessRes = await fetch(`${BACKEND_URL}/sessions/newchat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id, title: "New Chat" })
        });
        const sessData = await sessRes.json();
        if (sessRes.ok && sessData.session?.length > 0) {
          currentSessionId = sessData.session[0].id;
          justCreatedSessionRef.current = true;
          setActiveSessionId(currentSessionId);
          setSessions(prev => [sessData.session[0], ...prev]);
          sessionsRef.current = [sessData.session[0], ...sessionsRef.current];
        } else { console.error("Could not create chat session"); return; }
      } catch (err) { console.error("Session creation failed:", err); return; }
    }

    if (!sessionConvoRef.current[currentSessionId]) sessionConvoRef.current[currentSessionId] = [];
    sessionConvoRef.current[currentSessionId].push({ sender: 'user', content: messageText });

    const userMsgId = Date.now();
    setMessages(prev => [...prev, { id: userMsgId, text: messageText, isBot: false, reaction: null }]);
    setIsTyping(true);
    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: currentSessionId, user_id: user.id, content: messageText })
      });
      const data = await response.json();
      if (response.ok && data.reply?.response) {
        setMessages(prev => [...prev, { id: Date.now() + 1, text: data.reply.response, isBot: true, reaction: null }]);
        const feeling = resolveEmotion(data.reply) || resolveEmotion(data);
        if (feeling && CHAT_MOOD_BG[feeling]) setChatMood(feeling);

        sessionConvoRef.current[currentSessionId].push({ sender: 'bot', content: data.reply.response });
        const convo = sessionConvoRef.current[currentSessionId];
        if (convo.length === 2 || convo.length === 6) {
          const newTitle = deriveChatTitle(convo);
          commitAutoTitle(currentSessionId, newTitle, sessionsRef, setSessions, manualRenameRef);
        }
      } else {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Chat failure');
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => prev.filter(m => m.id !== userMsgId));
      setMessages(prev => [...prev, { id: Date.now() + 1, text: "I'm here with you, even when the connection feels shaky. What's on your mind?", isBot: true, reaction: null }]);
    } finally {
      setIsTyping(false);
    }
  }, [activeSessionId, user.id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    const text = input;
    setInput("");
    await sendChatMessage(text);
  };

  const handleReaction = (msgId, emoji) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reaction: m.reaction === emoji ? null : emoji } : m));
    const opt = REACTION_OPTIONS.find(o => o.emoji === emoji);
    if (opt) setLanternMood(opt.mood);
  };

  const handleDeleteSession = async (sessId) => {
    try {
      await fetch(`${BACKEND_URL}/sessions/${sessId}`, { method: "DELETE" });
    } catch (_) {}
    setSessions(prev => prev.filter(s => s.id !== sessId));
    if (activeSessionId === sessId) handleStartNewChat();
  };

  const handleStartRename = (sess) => {
    setRenamingSession(sess.id);
    setRenameValue(sess.title || '');
  };

  const handleConfirmRename = async (sessId) => {
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenamingSession(null); return; }
    manualRenameRef.current.add(sessId);
    setSessions(prev => prev.map(s => s.id === sessId ? { ...s, title: trimmed } : s));
    sessionsRef.current = sessionsRef.current.map(s => s.id === sessId ? { ...s, title: trimmed } : s);
    setRenamingSession(null);
    try {
      const res = await fetch(`${BACKEND_URL}/sessions/${sessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed })
      });
      if (!res.ok) {
        console.error(`Rename PATCH failed with status ${res.status}.`);
      } else {
        const data = await res.json().catch(() => null);
        console.log("Rename persisted:", data);
      }
    } catch (err) {
      console.error("Rename network error:", err);
    }
  };

  const handleLogout = async () => {
    if (user?.logId) {
      try { await fetch(`${BACKEND_URL}/auth/signout/${user.logId}`, { method: "POST" }); } catch (_) {}
    }
    onLogout();
  };

  const phaseColors = {
    Inhale: { bg: '#EEF2EC', text: '#5F554D', label: 'Breathe in slowly...' },
    Hold:   { bg: '#E5D6FF', text: '#5F554D', label: 'Hold and be still...' },
    Exhale: { bg: '#F5D6C6', text: '#5F554D', label: 'Let it all go...' },
  };

  const NavItem = ({ id, icon, label }) => (
    <button
      onClick={() => { setView(id); if (window.innerWidth < 768) setSidebarOpen(false); }}
      className={`w-full py-3 px-4 rounded-2xl font-medium text-sm transition-all flex items-center gap-3 ${view === id ? "bg-[#F5D6C6] text-[#5F554D] shadow-sm" : "text-[#5F554D]/70 hover:bg-white/70 active:scale-[0.98]"}`}
    >
      <span>{icon}</span>
      {sidebarOpen && <span>{label}</span>}
    </button>
  );

  return (
    <div className="flex h-screen w-full bg-[#FAF7F2] overflow-hidden text-[#5F554D] font-sans">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-[#5F554D]/20 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <div
        className={`fixed md:relative top-0 left-0 h-full z-30 md:z-10 bg-[#EEF2EC] flex flex-col justify-between transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ width: sidebarOpen ? (window.innerWidth < 768 ? 288 : sidebarWidth) : (window.innerWidth >= 768 ? 0 : 0), padding: sidebarOpen ? undefined : 0 }}
      >
        {sidebarOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* ── Fixed top: logo + nav ── */}
            <div className="flex-shrink-0 px-5 pt-5 space-y-5">
              <div className="flex flex-col items-center gap-1.5 px-1 pt-3 pb-2">
                <div
                  className="flex items-end justify-center rounded-2xl bg-white/60 shadow-sm"
                  style={{ width: 88, height: 88, padding: 4 }}
                >
                  <RabbitSVG phase="Exhale" size={80} />
                </div>
                <div className="text-center leading-tight">
                  <h1 className="font-serif text-xl font-semibold text-[#5F554D]">Dori</h1>
                  <p className="text-[10px] text-[#5F554D]/50 font-medium tracking-wide">your wellness buddy</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <NavItem id="chat"      icon="💬" label="Companion Chat"    />
                <NavItem id="breathing" icon="🌬️" label="Breathing Exercise" />
                <NavItem id="journal"   icon="📓" label="Mood Journal"       />
                <button
                  onClick={() => { handleStartNewChat(); setView('chat'); if (window.innerWidth < 768) setSidebarOpen(false); }}
                  className="w-full py-3 px-4 rounded-2xl font-medium text-sm transition-all flex items-center gap-3 text-[#5F554D]/70 hover:bg-white/70 active:scale-[0.98]"
                >
                  <span>＋</span>
                  {sidebarOpen && <span>New Chat</span>}
                </button>
              </div>
            </div>

            {/* ── Scrollable middle: recent chats + mood widget ── */}
            <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
              {/* ── RECENT JOURNEYS ── */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5F554D]/40 mb-2.5 px-1">Recent Journeys</h4>
                <div className="space-y-1.5">
                  {sessions.length === 0 ? (
                    <p className="text-xs text-[#5F554D]/50 px-1">No past sessions yet</p>
                  ) : sessions.map(sess => (
                    <div
                      key={sess.id}
                      className="relative"
                      onMouseEnter={() => setHoveredSession(sess.id)}
                      onMouseLeave={() => { if (openMenuSession !== sess.id) setHoveredSession(null); }}
                    >
                      {renamingSession === sess.id ? (
                        <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2.5 shadow-sm ring-1 ring-[#B7C9BB]">
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter')  handleConfirmRename(sess.id);
                              if (e.key === 'Escape') setRenamingSession(null);
                            }}
                            className="flex-1 bg-transparent outline-none text-xs text-[#5F554D] font-medium min-w-0"
                            placeholder="Chat name..."
                          />
                          <button onClick={() => handleConfirmRename(sess.id)} className="text-[#5F554D]/60 hover:text-[#5F554D] text-xs font-bold px-0.5 flex-shrink-0">✓</button>
                          <button onClick={() => setRenamingSession(null)}      className="text-[#5F554D]/40 hover:text-[#5F554D] text-xs px-0.5 flex-shrink-0">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setView('chat'); setActiveSessionId(sess.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
                          className={`w-full p-3 bg-white rounded-xl text-xs font-medium cursor-pointer hover:bg-white/90 transition-all flex items-center gap-2 text-[#5F554D] text-left pr-9 ${activeSessionId === sess.id ? 'shadow-sm ring-1 ring-[#B7C9BB]' : ''}`}
                        >
                          <span className="flex-shrink-0 text-base">💬</span>
                          <span className="truncate flex-1 min-w-0 leading-snug">{sess.title || `Session ${sess.id}`}</span>
                        </button>
                      )}

                      {renamingSession !== sess.id && (hoveredSession === sess.id || openMenuSession === sess.id) && (
                        <button
                          onClick={e => { e.stopPropagation(); setOpenMenuSession(p => p === sess.id ? null : sess.id); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg bg-[#EEF2EC] hover:bg-[#D9E8DB] text-[#5F554D]/50 hover:text-[#5F554D] transition-all z-10"
                          title="More options"
                        >
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
                            <circle cx="6.5" cy="2"   r="1.2" />
                            <circle cx="6.5" cy="6.5" r="1.2" />
                            <circle cx="6.5" cy="11"  r="1.2" />
                          </svg>
                        </button>
                      )}

                      {openMenuSession === sess.id && (
                        <SessionMenu
                          onRename={() => handleStartRename(sess)}
                          onDelete={() => handleDeleteSession(sess.id)}
                          onClose={() => { setOpenMenuSession(null); setHoveredSession(null); }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4">
                <p className="text-xs font-semibold text-[#5F554D]/70 uppercase tracking-wide mb-2">How are you feeling?</p>
                <div className="flex justify-between">
                  {['😞','😐','🙂','😊','🌟'].map((emoji, i) => (
                    <button key={i} className="text-xl hover:scale-125 active:scale-110 transition-transform p-1"
                      onClick={() => {
                        setView('chat');
                        if (window.innerWidth < 768) setSidebarOpen(false);
                        sendChatMessage(`I'm feeling ${['really low','okay','alright','good','great'][i]} today ${emoji}`);
                      }}
                    >{emoji}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Pinned bottom: Leave Space ── */}
            <div className="flex-shrink-0 px-5 pb-5 pt-2">
              <button
                onClick={handleLogout}
                className="w-full py-4 bg-white hover:bg-[#F5D6C6]/30 active:scale-[0.98] text-left text-[#5F554D] font-medium text-sm rounded-2xl shadow-sm transition-all px-4"
              >
                <span className="block">🚪 Leave Space</span>
                <span className="block text-xs text-[#5F554D]/50 mt-0.5">Take a break, breathe, reset.</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── RESIZE HANDLE ── */}
      {sidebarOpen && (
        <div onMouseDown={onMouseDownResize} className="hidden md:flex w-2 cursor-col-resize items-center justify-center z-10 group flex-shrink-0" style={{ background: 'transparent' }}>
          <div className="w-0.5 h-12 bg-[#B7C9BB]/50 group-hover:bg-[#B7C9BB] rounded-full transition-colors" />
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#FAF7F2] border-b border-[#EEF2EC]">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-2 rounded-xl bg-white shadow-sm active:scale-95 transition-transform flex-shrink-0"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1" y="3"  width="16" height="2" rx="1" fill="#5F554D"/>
              <rect x="1" y="8"  width="12" height="2" rx="1" fill="#5F554D"/>
              <rect x="1" y="13" width="16" height="2" rx="1" fill="#5F554D"/>
            </svg>
          </button>
          <span className="font-serif text-base text-[#5F554D]">
            {view === "chat" ? "Companion Chat" : view === "breathing" ? "Breathing Exercise" : "Mood Journal"}
          </span>
          <div className="flex items-center gap-3">
            <Lantern mood={lanternMood} size={30} />
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className={`w-10 h-10 rounded-full bg-[#D8D0F0] flex items-center justify-center font-semibold text-xs tracking-tight text-[#5F554D] transition-all shadow-sm active:scale-95 ${profileOpen ? 'ring-2 ring-[#B7C9BB] ring-offset-1' : ''}`}
                aria-label="Profile menu"
              >
                {getInitials(user?.name)}
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-md z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-[#EEF2EC]">
                    <p className="font-serif font-semibold text-sm text-[#5F554D] truncate">{user?.name || 'Explorer'}</p>
                    <p className="text-[10px] text-[#5F554D]/50 font-medium mt-0.5">Mind Space Active ✦</p>
                  </div>
                  <div className="py-1.5">
                    <button
                      onClick={() => { setProfileOpen(false); setChangePasswordOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-[#5F554D] hover:bg-[#FAF7F2] transition-colors text-left"
                    >
                      <span className="text-base">🔑</span> Change Password
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); setView('journal'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-[#5F554D] hover:bg-[#FAF7F2] transition-colors text-left"
                    >
                      <span className="text-base">📓</span> Mood Journal
                    </button>
                  </div>
                  <div className="border-t border-[#EEF2EC] py-1.5">
                    <button onClick={() => { setProfileOpen(false); handleLogout(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-[#a04040] hover:bg-[#fff0ee] transition-colors text-left"><span className="text-base">🚪</span> Leave Space</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── VIEW: CHAT ── */}
        {view === "chat" && (
          <div
            className="flex-1 flex flex-col h-full overflow-hidden relative transition-colors duration-[1500ms]"
            style={{ background: `linear-gradient(to bottom, ${CHAT_MOOD_BG[chatMood]?.from || '#FAF7F2'}, ${CHAT_MOOD_BG[chatMood]?.to || '#FAF7F2'})` }}
          >
            <ColorWash />
            <FloatingDecor />
            {!welcomeComplete && (
              <div className="absolute inset-0 bg-[#FAF7F2] z-50 flex flex-col items-center justify-center gap-6 p-6">
                <h2 className="text-xl font-serif font-semibold text-[#5F554D] tracking-tight">Opening your space...</h2>
                <div className="relative overflow-hidden rounded-t-full shadow-sm" style={{ width:160, height:200, background:'#EEF2EC', perspective:'600px' }}>
                  <div className="absolute inset-0 flex items-end justify-center bg-[#EEF2EC] pb-3">
                    <div style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center' }}>
                      <div style={{ width:48, height:10, borderRadius:'50%', background:'#5F554D', opacity:0.15, position:'absolute', bottom:-4, left:'50%', transform:'translateX(-50%)', animation: rabbitWaving ? 'shadowPulse 0.7s ease-in-out infinite' : 'none' }} />
                      <div style={{ animation: rabbitWaving ? 'rabbitJump 0.7s ease-in-out infinite' : 'none', transformOrigin:'bottom center' }}>
                        <svg width="88" height="108" viewBox="0 0 200 220" fill="none">
                          <ellipse cx="72"  cy="40"  rx="15" ry="38" fill="#fcd3c1" />
                          <ellipse cx="72"  cy="44"  rx="8"  ry="24" fill="#ffb499" />
                          <ellipse cx="128" cy="40"  rx="15" ry="38" fill="#fcd3c1" />
                          <ellipse cx="128" cy="44"  rx="8"  ry="24" fill="#ffb499" />
                          <circle  cx="100" cy="115" r="44"           fill="#fcd3c1" />
                          <circle  cx="100" cy="122" r="26"           fill="#fff9f6" />
                          <circle  cx="73"  cy="110" r="8"  fill="#ffa280" opacity="0.5" />
                          <circle  cx="127" cy="110" r="8"  fill="#ffa280" opacity="0.5" />
                          <circle  cx="82"  cy="107" r="5"            fill="#4a332d" />
                          <circle  cx="118" cy="107" r="5"            fill="#4a332d" />
                          <circle  cx="84"  cy="105" r="1.5"          fill="white"   />
                          <circle  cx="120" cy="105" r="1.5"          fill="white"   />
                          <path d="M 93 120 Q 100 128 107 120" stroke="#4a332d" strokeWidth="3" strokeLinecap="round" fill="none" />
                          <g style={{ transformOrigin:'142px 112px', animation: rabbitWaving ? 'wave 0.6s ease-in-out infinite' : 'none' }}>
                            <ellipse cx="148" cy="118" rx="10" ry="19" fill="#fcd3c1" transform="rotate(-25 148 118)" />
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div style={{ position:'absolute', inset:0, background:'#F5D6C6', transformOrigin:'left center', transform: doorOpen ? 'perspective(600px) rotateY(-115deg)' : 'perspective(600px) rotateY(0deg)', transition:'transform 1.6s cubic-bezier(0.4,0,0.2,1)', zIndex:10, display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:12 }}>
                    <div style={{ width:14, height:14, borderRadius:'50%', background:'#5F554D', opacity: 0.5 }} />
                  </div>
                </div>
                <p className="text-sm font-medium text-[#5F554D]/60 animate-pulse">Dori is stepping in!</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative z-10">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
                  <RabbitSVG phase="Exhale" size={88} />
                  <h2 className="text-2xl md:text-3xl font-serif font-semibold text-[#5F554D]">{getGreeting(user?.name, sessions.length > 0)}</h2>
                  <p className="text-sm text-[#5F554D]/60 font-medium max-w-xs">How is your mind feeling today? Dori's here whenever you're ready.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'} items-end gap-2`}>
                    {msg.isBot && <BuddyAvatar size={38} />}
                    <div className={`flex flex-col gap-2 max-w-[78%] md:max-w-[65%] ${msg.isBot ? 'items-start' : 'items-end'}`}>
                      <div className={`p-4 rounded-3xl text-sm font-normal leading-relaxed shadow-sm ${msg.isBot ? "bg-white text-[#5F554D] rounded-bl-md" : "bg-[#F5D6C6] text-[#5F554D] rounded-br-md"}`}>
                        {msg.text}
                      </div>
                      {msg.isBot && (
                        <div className="flex flex-wrap gap-1.5 pl-1">
                          {REACTION_OPTIONS.map(({ emoji, label }) => (
                            <button key={emoji} onClick={() => handleReaction(msg.id, emoji)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-95 ${msg.reaction === emoji ? 'bg-[#B7C9BB] text-[#5F554D]' : 'bg-white text-[#5F554D]/60 hover:bg-[#EEF2EC] border border-[#EEF2EC]'}`}
                            ><span>{emoji}</span> {label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isTyping && (
                <div className="flex justify-start items-end gap-2">
                  <BuddyAvatar size={38} />
                  <div className="bg-white rounded-3xl rounded-bl-md px-4 py-3 shadow-sm flex gap-1.5 items-center">
                    {[0,1,2].map(i => (<div key={i} className="w-2 h-2 rounded-full bg-[#B7C9BB] animate-bounce" style={{ animationDelay:`${i*0.15}s` }} />))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {messages.length === 0 && (
              <div className="px-4 md:px-6 pb-2 flex gap-2 overflow-x-auto scrollbar-hide relative z-10">
                {["I'm feeling anxious today","I need to vent","Help me calm down","I'm having a hard week"].map(prompt => (
                  <button key={prompt} onClick={() => setInput(prompt)} className="flex-shrink-0 px-3.5 py-2 bg-white hover:bg-[#EEF2EC] rounded-full text-xs font-medium text-[#5F554D] transition-all active:scale-95 shadow-sm">{prompt}</button>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="p-3 md:p-4 bg-[#FAF7F2] flex gap-2.5 items-end relative z-10">
              <div className="flex-1 flex items-end gap-2 bg-white border border-[#F5D6C6] rounded-3xl px-4 py-2.5 shadow-sm">
                <textarea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'; }}
                  onKeyDown={(e) => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                  placeholder="Tell Dori what's on your mind..."
                  rows={1}
                  className="flex-1 bg-transparent outline-none font-normal text-sm transition-colors resize-none leading-relaxed text-[#5F554D] placeholder-[#5F554D]/40"
                  style={{ minHeight:'24px', maxHeight:'120px' }}
                />
              </div>
              <button type="submit" disabled={!input.trim() || isTyping} className="w-11 h-11 flex items-center justify-center bg-[#F5D6C6] disabled:opacity-40 text-[#5F554D] font-semibold rounded-full shadow-sm active:scale-95 transition-all flex-shrink-0" aria-label="Send">➤</button>
            </form>
          </div>
        )}

        {/* ── VIEW: BREATHING ── */}
        {view === "breathing" && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center transition-colors duration-1000" style={{ background:`linear-gradient(to bottom, #FAF7F2, ${phaseColors[breathPhase]?.bg || '#FAF7F2'})` }}>
            <div className="max-w-sm w-full space-y-6 flex flex-col items-center">
              <div>
                <span className="px-4 py-1.5 bg-[#B7C9BB] text-[#5F554D] text-xs font-semibold uppercase tracking-widest rounded-full">Guided Grounding</span>
                <h2 className="text-2xl md:text-3xl font-serif font-semibold text-[#5F554D] mt-3">Box Breathing</h2>
                <p className="text-sm text-[#5F554D]/60 mt-1 font-medium">Follow the rabbit. 4 counts each phase.</p>
              </div>
              <div className="relative flex items-center justify-center" style={{ width:240, height:240 }}>
                <div style={{ position:'absolute', width:220, height:220, borderRadius:'50%', border:'3px solid', borderColor: phaseColors[breathPhase]?.text || '#5F554D', opacity: breathActive ? (breathPhase === 'Hold' ? 0.4 : 0.15) : 0.1, transform: `scale(${breathActive ? breathScale*1.2 : 1})`, transition: breathPhase === 'Hold' ? 'opacity 0.5s ease' : 'transform 4s linear, opacity 0.5s ease' }} />
                <div style={{ width:180, height:180, borderRadius:'50%', background:'white', boxShadow:'0 8px 24px rgba(95,85,77,0.12)', display:'flex', alignItems:'center', justifyContent:'center', transform:`scale(${breathActive ? breathScale : 1})`, transition: breathPhase === 'Hold' ? 'none' : 'transform 4s linear', position:'relative', zIndex:10 }}>
                  <RabbitSVG phase={breathActive ? breathPhase : 'Hold'} size={130} />
                </div>
              </div>
              {breathActive ? (
                <div className="space-y-3 w-full">
                  <p className="text-xl md:text-2xl font-serif font-semibold transition-colors duration-700" style={{ color: phaseColors[breathPhase]?.text }}>{phaseColors[breathPhase]?.label}</p>
                  <div className="w-full bg-[#EEF2EC] rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width:`${((4-counter+1)/4)*100}%`, background: phaseColors[breathPhase]?.text }} />
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-xl shadow-sm" style={{ background: phaseColors[breathPhase]?.bg, color: phaseColors[breathPhase]?.text }}>{counter}</div>
                    {cycleCount > 0 && <p className="text-xs text-[#5F554D]/60 font-medium">{cycleCount} cycle{cycleCount>1?'s':''} complete ✦</p>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#5F554D]/60 font-medium">Tap start when you're ready. Sit comfortably and breathe normally.</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setBreathActive(p => !p)} className="px-7 py-3 font-semibold text-sm uppercase tracking-wider rounded-full shadow-sm active:scale-95 transition-all" style={{ background: breathActive ? '#EEF2EC' : '#5F554D', color: breathActive ? '#5F554D' : 'white' }}>
                  {breathActive ? "Pause" : "Start"}
                </button>
                {breathActive && (
                  <button onClick={() => { setBreathActive(false); setBreathPhase('Inhale'); setBreathScale(1.0); setCounter(4); setCycleCount(0); }} className="px-5 py-3 font-semibold text-xs uppercase tracking-wider rounded-full bg-white text-[#5F554D]/70 shadow-sm transition-all active:scale-95">Reset</button>
                )}
              </div>
              <button onClick={() => setView('chat')} className="text-xs font-medium text-[#5F554D]/60 underline underline-offset-2 hover:text-[#5F554D] transition-colors">Return to chat</button>
            </div>
          </div>
        )}

        {/* ── VIEW: JOURNAL ── */}
        {view === 'journal' && <JournalView user={user} sessionId={activeSessionId} />}
      </div>

      {/* ── CHANGE PASSWORD MODAL ── */}
      {changePasswordOpen && (
        <ChangePasswordModal user={user} onClose={() => setChangePasswordOpen(false)} />
      )}
    </div>
  );
}