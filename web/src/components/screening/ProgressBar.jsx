import React from 'react';

const CATEGORY_COLORS = {
  letter_recognition: '#8B5CF6',
  rhyme_detection: '#EC4899',
  phoneme_blending: '#F59E0B',
  number_sense: '#10B981',
  sequencing: '#3B82F6',
};

const CATEGORY_LABELS = {
  letter_recognition: '🔤 Letters',
  rhyme_detection: '🎵 Rhymes',
  phoneme_blending: '🗣️ Sounds',
  number_sense: '🔢 Numbers',
  sequencing: '📋 Order',
};

export default function ProgressBar({ current, total, timeRemaining, category }) {
  const progress = ((current) / total) * 100;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const timerColor = timeRemaining < 60 ? 'text-red-500' : timeRemaining < 180 ? 'text-amber-500' : 'text-gray-600';

  return (
    <div className="w-full px-4 py-3">
      {/* Top row: question count + timer */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">
            Question {current + 1} of {total}
          </span>
          {category && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: CATEGORY_COLORS[category] || '#6B7280' }}
            >
              {CATEGORY_LABELS[category] || category}
            </span>
          )}
        </div>
        <div className={`text-sm font-mono font-bold ${timerColor}`}>
          ⏱️ {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, #4F46E5, #7C3AED)`,
          }}
        />
      </div>

      {/* Category dots */}
      <div className="flex justify-center gap-1 mt-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              i < current ? 'bg-green-400' : i === current ? 'bg-indigo-500 scale-125' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
