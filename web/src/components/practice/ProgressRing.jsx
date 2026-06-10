import React, { useEffect, useState } from 'react';

/**
 * Circular progress gauge (SVG) — animated fill on load.
 * @param {number} percent - 0 to 100
 * @param {string} color - stroke color
 * @param {number} size - diameter in px (default 100)
 * @param {string} label - center text (e.g. "72%")
 */
export default function ProgressRing({ percent = 0, color = '#4F46E5', size = 100, label, sublabel }) {
  const [animPercent, setAnimPercent] = useState(0);
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animPercent / 100) * circumference;

  useEffect(() => {
    const timeout = setTimeout(() => setAnimPercent(percent), 100);
    return () => clearTimeout(timeout);
  }, [percent]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{label || `${percent}%`}</span>
        {sublabel && <span className="text-[10px] text-gray-400">{sublabel}</span>}
      </div>
    </div>
  );
}
