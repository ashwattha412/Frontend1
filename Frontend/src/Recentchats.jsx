import React, { useState, useEffect, useMemo, useRef } from 'react';
import './Recentchats-theme.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const DATE_FILTERS = [
  { id: 'all',   label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'older', label: 'Older' },
];

// Sessions can come back from different endpoints with different date field
// names depending on how the backend serialized them — try the common ones
// before giving up and treating the chat as "undated".
function getSessionDate(sess) {
  const candidates = [
    sess.created_at, sess.createdAt, sess.updated_at, sess.updatedAt,
    sess.date, sess.inserted_at, sess.timestamp,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const d = new Date(c);
    if (!isNaN(d.getTime())) return d;
  }
  // Some ID schemes are literally an epoch-ms timestamp — worth a shot.
  if (typeof sess.id === 'number' && sess.id > 1e12) return new Date(sess.id);
  return null;
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayDiff(date) {
  if (!date) return null;
  return Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
}

function formatFriendlyDate(date) {
  if (!date) return 'No date yet';
  const diff = dayDiff(date);
  if (diff === 0) {
    return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (diff === 1) return 'Yesterday';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-US', sameYear
    ? { weekday: 'short', month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
}

function matchesDateFilter(date, filterId) {
  if (filterId === 'all') return true;
  const diff = dayDiff(date);
  // Undated chats have nowhere honest to live except "Older" — that way
  // they're still reachable instead of silently vanishing from every filter.
  if (diff === null) return filterId === 'older';
  if (filterId === 'today') return diff === 0;
  if (filterId === 'week')  return diff >= 0 && diff <= 6;
  if (filterId === 'month') return diff >= 0 && diff <= 29;
  if (filterId === 'older') return diff >= 30;
  return true;
}

/**
 * Full-page "Recent Chats" view.
 *
 * Usage from Dashboard.jsx:
 *   <RecentChats
 *     user={user}
 *     sessions={sessions}                          // optional — pass Dashboard's
 *                                                   // already-loaded list to skip a refetch
 *     onBack={() => setView('chat')}
 *     onSelectSession={(id) => { setActiveSessionId(id); setView('chat'); }}
 *   />
 */
export default function RecentChats({ user, sessions: sessionsProp, onSelectSession, onBack }) {
  const [sessions, setSessions] = useState(sessionsProp || []);
  const [loading,  setLoading]  = useState(!sessionsProp);
  const [error,    setError]    = useState('');
  const [query,      setQuery]      = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const searchRef = useRef(null);

  useEffect(() => {
    if (sessionsProp) { setSessions(sessionsProp); return; }
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${BACKEND_URL}/sessions/user/${user.id}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.sessions) {
          setSessions(data.sessions);
        } else {
          setError(typeof data.detail === 'string' ? data.detail : 'Could not load your chats.');
        }
      } catch (err) {
        if (!cancelled) setError('Network error — could not reach the server.');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id, sessionsProp]);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const decorated = useMemo(() => sessions.map(s => ({
    ...s,
    _date:  getSessionDate(s),
    _title: (s.title || '').trim() || `Session ${s.id}`,
  })), [sessions]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return decorated;
    return decorated.filter(s => s._title.toLowerCase().includes(q));
  }, [decorated, query]);

  const counts = useMemo(() => {
    const c = { all: searched.length, today: 0, week: 0, month: 0, older: 0 };
    searched.forEach(s => {
      if (matchesDateFilter(s._date, 'today')) c.today++;
      if (matchesDateFilter(s._date, 'week'))  c.week++;
      if (matchesDateFilter(s._date, 'month')) c.month++;
      if (matchesDateFilter(s._date, 'older')) c.older++;
    });
    return c;
  }, [searched]);

  const filtered = useMemo(() => {
    return searched
      .filter(s => matchesDateFilter(s._date, dateFilter))
      .sort((a, b) => {
        if (a._date && b._date) return b._date - a._date;
        if (a._date) return -1;
        if (b._date) return 1;
        return (b.id ?? 0) - (a.id ?? 0);
      });
  }, [searched, dateFilter]);

  const activeFilterLabel = DATE_FILTERS.find(f => f.id === dateFilter)?.label.toLowerCase();

  return (
    <div className="dori-recent-chats flex-1 flex flex-col h-full overflow-hidden relative" style={{ background: 'var(--rc-bg)' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 md:px-8 pt-6 pb-4 relative z-10" style={{ borderBottom: '1px solid var(--rc-divider)' }}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-4 transition-opacity hover:opacity-70"
          style={{ color: 'var(--rc-text-secondary)' }}
        >
          <span className="text-sm">‹</span> Back to chat
        </button>

        <h2 className="font-serif text-2xl font-semibold" style={{ color: 'var(--rc-text-primary)' }}>Recent Chats</h2>
        <p className="text-xs font-medium mt-1" style={{ color: 'var(--rc-text-secondary)' }}>
          {decorated.length} conversation{decorated.length !== 1 ? 's' : ''} with Dori
        </p>

        {/* Search */}
        <div className="dori-rc-search mt-5 flex items-center gap-2.5 rounded-2xl px-4 py-3">
          <span style={{ color: 'var(--rc-search-icon)' }}>🔍</span>
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by chat title..."
            className="flex-1 bg-transparent outline-none text-sm font-medium"
            style={{ color: 'var(--rc-text-primary)' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
              style={{ color: 'var(--rc-text-secondary)' }}
              aria-label="Clear search"
            >✕</button>
          )}
        </div>

        {/* Date filter pills */}
        <div className="flex items-center gap-2 mt-3.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {DATE_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all active:scale-95"
              style={dateFilter === f.id
                ? { background: 'var(--rc-accent)', color: 'var(--rc-accent-text)' }
                : { background: 'var(--rc-pill-bg)', color: 'var(--rc-text-secondary)' }}
            >
              {f.label}
              <span className="opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── List ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 md:px-8 py-5 relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <p className="text-sm animate-pulse font-medium" style={{ color: 'var(--rc-text-secondary)' }}>Gathering your conversations…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-2xl">⚠️</p>
            <p className="text-sm font-medium" style={{ color: 'var(--rc-text-secondary)' }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-2xl">🌙</p>
            <p className="text-sm font-medium max-w-xs" style={{ color: 'var(--rc-text-secondary)' }}>
              {decorated.length === 0
                ? "You haven't started a chat yet."
                : query
                  ? `Nothing titled "${query}" in ${activeFilterLabel}.`
                  : `No chats in ${activeFilterLabel}.`}
            </p>
            {(query || dateFilter !== 'all') && decorated.length > 0 && (
              <button
                onClick={() => { setQuery(''); setDateFilter('all'); }}
                className="text-xs font-bold uppercase tracking-wide underline underline-offset-2"
                style={{ color: 'var(--rc-accent)' }}
              >
                Clear search &amp; filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl mx-auto">
            {filtered.map(sess => (
              <button
                key={sess.id}
                onClick={() => onSelectSession?.(sess.id)}
                className="dori-rc-card w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.99]"
              >
                <span className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: 'var(--rc-icon-bg)' }}>💬</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate" style={{ color: 'var(--rc-text-primary)' }}>{sess._title}</span>
                  <span className="block text-[11px] font-medium mt-0.5" style={{ color: 'var(--rc-text-secondary)' }}>{formatFriendlyDate(sess._date)}</span>
                </span>
                <span className="flex-shrink-0 text-sm" style={{ color: 'var(--rc-text-secondary)' }}>›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}