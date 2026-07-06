export default function WellnessScore({ score = 0, size = 140 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const remaining = circumference - progress;

  const getColor = (s) => {
    if (s >= 80) return '#6BCB77';
    if (s >= 60) return '#FFD93D';
    if (s >= 40) return '#FF8C32';
    return '#EF4444';
  };

  const color = getColor(score);

  return (
    <div className="insight-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <span className="insight-card-title">Wellness Score</span>

      <div className="wellness-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--insight-chart-grid)"
            strokeWidth={10}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeDasharray={`${progress} ${remaining}`}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dasharray 1s ease-out',
              filter: `drop-shadow(0 0 6px ${color}50)`,
            }}
          />
        </svg>
        <div className="wellness-ring-text">
          <div className="wellness-ring-value" style={{ color, textShadow: `0 0 12px ${color}40`, animation: 'subtlePulse 3s ease-in-out infinite' }}>{score}</div>
          <div className="wellness-ring-label">out of 100</div>
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
        {score >= 80 ? '🌟 You\'re doing great!' :
         score >= 60 ? '🌿 Room for growth' :
         score >= 40 ? '💛 Let\'s take it easy' :
         '🤗 We\'re here for you'}
      </div>
    </div>
  );
}
