import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

const TREND_COLORS = ['#FFD93D', '#60A5FA', '#6BCB77', '#F472B6', '#A78BFA'];

export default function WeeklySummary({ data }) {
  if (!data || !data.weeks) return null;

  // Build line chart data — top 3 emotions trend over weeks
  const allEmotions = new Set();
  data.weeks.forEach(w => Object.keys(w.top_emotions).forEach(e => allEmotions.add(e)));
  const topEmotions = [...allEmotions].slice(0, 3);

  const lineData = data.weeks.map(w => {
    const point = { week: w.week_start.slice(5) }; // "06-22"
    topEmotions.forEach(e => { point[e] = w.top_emotions[e] || 0; });
    point.wellness = w.wellness_score;
    return point;
  });

  const { insight } = data;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--insight-card)',
        border: '1px solid var(--insight-card-border)',
        borderRadius: 12,
        padding: '8px 14px',
        backdropFilter: 'blur(12px)',
        fontSize: 12,
        color: 'var(--text-primary)',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Week of {label}</div>
        {payload.map(p => (
          <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
            {p.dataKey}: {p.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="insight-card">
      <span className="insight-card-title">Weekly Summary</span>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginTop: 12 }}>
        {/* Emotion Trends Line Chart */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Emotion Trends (8 weeks)
          </div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--insight-chart-grid)" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                {topEmotions.map((e, i) => (
                  <Line
                    key={e}
                    type="monotone"
                    dataKey={e}
                    stroke={TREND_COLORS[i]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: TREND_COLORS[i] }}
                    activeDot={{ r: 5 }}
                    animationDuration={1000}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            {topEmotions.map((e, i) => (
              <div key={e} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                <div style={{ width: 8, height: 3, borderRadius: 2, background: TREND_COLORS[i] }} />
                <span style={{ color: 'var(--text-secondary)' }}>{e}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Insight */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 0 }}>
            This Week's Insight
          </div>
          <div className="insight-text-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h4>✨ Your Emotional Check-in</h4>
            <p>
              This week you felt primarily <strong>{insight.emotion_label}</strong>, with a <strong>{insight.emotion_change}</strong> change in chat check-ins.
              Your stress levels {insight.stress_direction} by <strong>{insight.stress_change}</strong>.
              Keep going — you're making progress! 🌱
            </p>
          </div>

          {/* Wellness trend mini chart */}
          <div style={{ height: 48 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <Line
                  type="monotone"
                  dataKey="wellness"
                  stroke="#6BCB77"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center' }}>
            Wellness trend ↑
          </div>
        </div>
      </div>
    </div>
  );
}
