import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const EMOTION_COLORS = {
  joy: '#FFD93D',
  neutral: '#94A3B8',
  curiosity: '#60A5FA',
  gratitude: '#6BCB77',
  sadness: '#818CF8',
  optimism: '#F472B6',
  love: '#FB7185',
  caring: '#2DD4BF',
  anger: '#EF4444',
  fear: '#A78BFA',
  surprise: '#FBBF24',
  amusement: '#34D399',
  Other: '#CBD5E1',
};

function getColor(label) {
  return EMOTION_COLORS[label] || EMOTION_COLORS.Other;
}

export default function EmotionChart({ datasets }) {
  const [days, setDays] = useState(7);
  const data = datasets?.[days] || { emotions: {}, dominant: 'neutral', total: 0 };

  // Top 6 emotions + group the rest as "Other"
  const sorted = Object.entries(data.emotions).sort((a, b) => b[1] - a[1]);
  const top6 = sorted.slice(0, 6);
  const otherCount = sorted.slice(6).reduce((sum, [, v]) => sum + v, 0);
  const chartData = [
    ...top6.map(([name, value]) => ({ name, value })),
    ...(otherCount > 0 ? [{ name: 'Other', value: otherCount }] : []),
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0].payload;
    const pct = ((value / data.total) * 100).toFixed(1);
    return (
      <div style={{
        background: 'var(--insight-card)',
        border: '1px solid var(--insight-card-border)',
        borderRadius: 12,
        padding: '8px 14px',
        backdropFilter: 'blur(12px)',
        fontSize: 13,
        color: 'var(--text-primary)',
      }}>
        <strong>{name}</strong>: {value} ({pct}%)
      </div>
    );
  };

  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) => {
    const pct = ((value / data.total) * 100).toFixed(0);
    if (pct < 5) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
        {pct}%
      </text>
    );
  };

  return (
    <div className="insight-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="insight-card-title">Emotion Distribution</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Dominant: <strong style={{ color: getColor(data.dominant) }}>{data.dominant}</strong>
        </span>
      </div>

      <div className="time-pills">
        {[{ label: '7 days', val: 7 }, { label: '30 days', val: 30 }, { label: 'All time', val: 0 }].map(opt => (
          <button
            key={opt.val}
            className={`time-pill ${days === opt.val ? 'active' : ''}`}
            onClick={() => setDays(opt.val)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 200, height: 200 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
                label={renderLabel}
                labelLine={false}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={getColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          {chartData.map((entry) => (
            <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: getColor(entry.name), flexShrink: 0 }} />
              <span style={{ color: 'var(--text-primary)', flex: 1 }}>{entry.name}</span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
