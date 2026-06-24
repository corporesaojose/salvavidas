"use client";

import type { HabitoScore } from "@/lib/missao/types";

export default function RadarChart({
  habitos,
  size = 240,
}: {
  habitos: HabitoScore[];
  size?: number;
}) {
  const N = habitos.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.36;
  const labelR = size * 0.48;

  function getPoint(angle: number, r: number) {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  function getPolygonPoints(scores: number[]) {
    return scores
      .map((score, i) => {
        const angle = (2 * Math.PI * i) / N - Math.PI / 2;
        const r = (score / 100) * R;
        const p = getPoint(angle, r);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  }

  const gridLevels = [20, 40, 60, 80, 100];
  const scores = habitos.map((h) => h.score);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Radar de hábitos">
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={Array(N)
            .fill(0)
            .map((_, i) => {
              const angle = (2 * Math.PI * i) / N - Math.PI / 2;
              const r = (level / 100) * R;
              const p = getPoint(angle, r);
              return `${p.x},${p.y}`;
            })
            .join(" ")}
          fill="none"
          stroke="rgba(250,248,240,0.08)"
          strokeWidth="1"
        />
      ))}

      {Array(N)
        .fill(0)
        .map((_, i) => {
          const angle = (2 * Math.PI * i) / N - Math.PI / 2;
          const p = getPoint(angle, R);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="rgba(250,248,240,0.1)"
              strokeWidth="1"
            />
          );
        })}

      <polygon points={getPolygonPoints(scores)} className="radar-line" strokeLinejoin="round" />

      {scores.map((score, i) => {
        const angle = (2 * Math.PI * i) / N - Math.PI / 2;
        const r = (score / 100) * R;
        const p = getPoint(angle, r);
        return <circle key={i} cx={p.x} cy={p.y} r="4" fill="#d6e04d" stroke="#1a1a1a" strokeWidth="1.5" />;
      })}

      <circle cx={cx} cy={cy} r="3" fill="rgba(250,248,240,0.2)" />

      {habitos.map((h, i) => {
        const angle = (2 * Math.PI * i) / N - Math.PI / 2;
        const p = getPoint(angle, labelR);
        return (
          <text
            key={h.key}
            x={p.x}
            y={p.y + 4}
            textAnchor="middle"
            fill="#faf8f0"
            fontSize="11"
            fontWeight="600"
          >
            {h.emoji} {h.label}
          </text>
        );
      })}
    </svg>
  );
}
