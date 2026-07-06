import { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

function AnimatedCounter({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = typeof value === 'number' ? value : parseInt(value) || 0;
    if (start === end) { setDisplay(end); return; }

    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
      else prevValue.current = end;
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <>{display}</>;
}

export default function StatCard({ title, value, trend, trendLabel, sparklineData, icon, loading }) {
  const isPositive = trend && trend > 0;

  if (loading) {
    return (
      <div className="insight-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            width: 80, height: 14, borderRadius: 6,
            background: 'linear-gradient(90deg, var(--insight-pill-bg) 25%, var(--insight-card-hover) 50%, var(--insight-pill-bg) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.8s infinite',
          }} />
          {icon && <span style={{ fontSize: 20, opacity: 0.3 }}>{icon}</span>}
        </div>
        <div style={{
          width: 64, height: 32, borderRadius: 8, marginTop: 12,
          background: 'linear-gradient(90deg, var(--insight-pill-bg) 25%, var(--insight-card-hover) 50%, var(--insight-pill-bg) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.8s infinite',
        }} />
        <div style={{
          width: 120, height: 10, borderRadius: 5, marginTop: 10,
          background: 'linear-gradient(90deg, var(--insight-pill-bg) 25%, var(--insight-card-hover) 50%, var(--insight-pill-bg) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.8s infinite',
        }} />
      </div>
    );
  }

  return (
    <div className="insight-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="insight-card-title">{title}</span>
        {icon && <span style={{ fontSize: 20, opacity: 0.6, transition: 'transform 0.3s ease' }} className="stat-icon">{icon}</span>}
      </div>
      <div className="insight-card-value">
        <AnimatedCounter value={value} />
      </div>
      {trend !== undefined && (
        <div className={`insight-card-trend ${isPositive ? 'trend-up' : 'trend-down'}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(trend)}% {trendLabel || 'vs last week'}
        </div>
      )}
      {sparklineData && sparklineData.length > 0 && (
        <div className="sparkline-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData.map((v, i) => ({ i, v }))}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--insight-accent-3)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--insight-accent-3)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--insight-accent-3)"
                strokeWidth={1.5}
                fill="url(#sparkGrad)"
                dot={false}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
