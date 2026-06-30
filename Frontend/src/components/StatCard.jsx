import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export default function StatCard({ title, value, trend, trendLabel, sparklineData, icon }) {
  const isPositive = trend && trend > 0;

  return (
    <div className="insight-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="insight-card-title">{title}</span>
        {icon && <span style={{ fontSize: 20, opacity: 0.6 }}>{icon}</span>}
      </div>
      <div className="insight-card-value">{value}</div>
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
