import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

const STRESS_CONFIG = {
  Normal:     { color: '#6BCB77', label: 'Normal' },
  Anxiety:    { color: '#FFD93D', label: 'Anxiety' },
  Depression: { color: '#FF8C32', label: 'Depression' },
  Suicidal:   { color: '#EF4444', label: 'Suicidal' },
};

export default function StressChart({ datasets }) {
  const [days, setDays] = useState(7);
  const data = datasets?.[days] || { stress: { Normal: 0, Anxiety: 0, Depression: 0, Suicidal: 0 }, wellness_score: 100.0, total: 0 };

  const chartData = Object.entries(data.stress).map(([key, value]) => ({
    name: key,
    value,
    pct: data.total > 0 ? ((value / data.total) * 100).toFixed(1) : 0,
    color: STRESS_CONFIG[key]?.color || '#94A3B8',
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { name, value, pct } = payload[0].payload;
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
        <strong>{name}</strong>: {value} messages ({pct}%)
      </div>
    );
  };

  return (
    <div className="insight-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="insight-card-title">Stress Distribution</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Wellness: <strong style={{ color: data.wellness_score >= 75 ? '#6BCB77' : data.wellness_score >= 50 ? '#FFD93D' : '#EF4444' }}>
            {data.wellness_score}
          </strong>/100
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

      {/* Stacked horizontal bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', height: 28 }}>
          {chartData.map(d => {
            const width = data.total > 0 ? (d.value / data.total) * 100 : 0;
            if (width === 0) return null;
            return (
              <div
                key={d.name}
                title={`${d.name}: ${d.pct}%`}
                style={{
                  width: `${width}%`,
                  background: d.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#fff',
                  transition: 'width 0.5s ease',
                  minWidth: width > 5 ? undefined : 0,
                }}
              >
                {width > 8 ? `${d.pct}%` : ''}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bar chart breakdown */}
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" barCategoryGap={8}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={85}
              tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={800} barSize={18}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {chartData.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
