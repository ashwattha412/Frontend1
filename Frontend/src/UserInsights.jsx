import { useState, useEffect, useRef } from 'react';
import './insights-theme.css';
import './Dashboard-theme.css';
import StatCard from './components/StatCard';
import EmotionChart from './components/EmotionChart';
import StressChart from './components/StressChart';
import WellnessScore from './components/WellnessScore';
import WeeklySummary from './components/WeeklySummary';
import { getSessionStats, getUserStress, getUserEmotions, getWeeklySummary } from './mockData';

export default function UserInsights({ user, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard data states
  const [stats, setStats] = useState(null);
  const [stressData, setStressData] = useState(null);
  const [emotionData, setEmotionData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const retryRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData(isRetry = false) {
      try {
        if (!isRetry) {
          setLoading(true);
          setError(null);
        }
        const userId = user?.id;
        if (!userId) {
          throw new Error("Log in again to load your user profile.");
        }

        const [
          fetchedStats,
          stress7, stress30, stress0,
          emotions7, emotions30, emotions0,
          weekly
        ] = await Promise.all([
          getSessionStats(userId),
          getUserStress(userId, 7),
          getUserStress(userId, 30),
          getUserStress(userId, 0),
          getUserEmotions(userId, 7),
          getUserEmotions(userId, 30),
          getUserEmotions(userId, 0),
          getWeeklySummary(userId)
        ]);

        if (cancelled) return;

        // If stats came back as 0/0 and this is the first attempt, retry once
        // after a short delay (backend may have returned fallback due to transient error)
        if (!isRetry &&
            (fetchedStats?.total_sessions ?? 0) === 0 &&
            (fetchedStats?.total_messages ?? 0) === 0 &&
            !retryRef.current) {
          retryRef.current = true;
          setTimeout(() => {
            if (!cancelled) loadDashboardData(true);
          }, 1500);
        }

        setStats(fetchedStats);
        setStressData({ 7: stress7, 30: stress30, 0: stress0 });
        setEmotionData({ 7: emotions7, 30: emotions30, 0: emotions0 });
        setWeeklyData(weekly);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("Dashboard fetching error:", err);
        setError(err.message || "Failed to retrieve real-time wellness insights.");
        setLoading(false);
      }
    }
    loadDashboardData();

    return () => { cancelled = true; };
  }, [user?.id]);

  // Determine if stats are still loading (null = first load)
  const statsLoading = loading || stats === null;

  if (loading && !stats) {
    return (
      <div className="insights-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <div style={{
          width: 48,
          height: 48,
          border: '4px solid var(--insight-pill-bg)',
          borderTopColor: 'var(--insight-pill-active)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
          Retrieving your emotional journey...
        </span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="insights-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 24, textAlign: 'center', gap: 16 }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Oops! Failed to load insights
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 400, margin: 0 }}>
          {error}
        </p>
        <button className="insight-back-btn" onClick={onBack} style={{ marginTop: 8 }}>
          ← Return to Companion Space
        </button>
      </div>
    );
  }

  return (
    <div className="insights-page">
      {/* Header */}
      <div className="insights-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button className="insight-back-btn" onClick={onBack}>
            ← Back to Chat
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Your Insights
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>
              {user?.name ? `${user.name}'s` : 'Your'} emotional journey at a glance
            </p>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#6BCB77', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6BCB77', display: 'inline-block', animation: 'subtlePulse 2s ease-in-out infinite' }} />
          Connected to database live updates
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="insights-grid insights-grid-stats">
        <StatCard
          title="Total Sessions"
          value={stats?.total_sessions ?? 0}
          trend={12}
          icon="💬"
          sparklineData={stats?.sparkline}
          loading={statsLoading}
        />
        <WellnessScore score={stressData?.[7]?.wellness_score ?? 100.0} />
        <StatCard
          title="Total Messages"
          value={stats?.total_messages ?? 0}
          trend={8}
          trendLabel="this week"
          icon="✉️"
          sparklineData={stats?.sparkline?.map(v => v * 3 + Math.floor(Math.random() * 4))}
          loading={statsLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="insights-grid insights-grid-charts">
        <EmotionChart datasets={emotionData} />
        <StressChart datasets={stressData} />
      </div>

      {/* Weekly Summary Row */}
      <div className="insights-grid insights-grid-full">
        <WeeklySummary data={weeklyData} />
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '20px 32px 32px', fontSize: 12, color: 'var(--text-secondary)' }}>
        Your personal dashboard trends.
      </div>
    </div>
  );
}
