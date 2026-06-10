import React from 'react';

const LD_COLORS = {
  dyslexia: { color: '#7C3AED', label: 'Dyslexia' },
  dyscalculia: { color: '#2563EB', label: 'Dyscalculia' },
  dysgraphia: { color: '#EC4899', label: 'Dysgraphia' },
  mixed: { color: '#F59E0B', label: 'Mixed' },
  not_detected: { color: '#10B981', label: 'No LD' },
};

export default function ClassDistributionChart({ distribution, total }) {
  if (!distribution || total === 0) return null;

  const entries = Object.entries(distribution).filter(([_, count]) => count > 0);

  return (
    <div>
      {/* Stacked bar */}
      <div className="w-full h-8 rounded-lg overflow-hidden flex">
        {entries.map(([key, count]) => (
          <div
            key={key}
            style={{ width: `${(count / total) * 100}%`, backgroundColor: LD_COLORS[key]?.color || '#9CA3AF' }}
            className="h-full flex items-center justify-center text-[10px] text-white font-bold transition-all"
            title={`${LD_COLORS[key]?.label}: ${count}`}
          >
            {count >= 2 && count}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {entries.map(([key, count]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: LD_COLORS[key]?.color }} />
            <span className="text-xs text-gray-600">{LD_COLORS[key]?.label} ({count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
