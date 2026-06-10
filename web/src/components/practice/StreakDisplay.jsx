import React from 'react';

/**
 * Streak counter with fire emoji + last 7 days calendar dots
 * @param {number} count - current streak count
 * @param {boolean[]} lastSevenDays - [true, false, true, ...] (today first)
 */
export default function StreakDisplay({ count = 0, lastSevenDays = [] }) {
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = new Date().getDay();

  // Fill to 7 days
  const days = [...lastSevenDays];
  while (days.length < 7) days.push(false);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Streak number */}
      <div className="flex items-center gap-2">
        <span className={`text-3xl ${count > 0 ? 'animate-pulse' : ''}`}>🔥</span>
        <div>
          <span className="text-2xl font-black text-gray-800">{count}</span>
          <span className="text-sm text-gray-500 ml-1">day streak</span>
        </div>
      </div>

      {/* 7-day dots */}
      <div className="flex gap-1.5 mt-1">
        {days.map((practiced, i) => {
          const dayIdx = (today - 6 + i + 7) % 7;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all
                  ${practiced
                    ? 'bg-green-400 text-white shadow-sm scale-110'
                    : 'bg-gray-200 text-gray-400'
                  }
                  ${i === 6 ? 'ring-2 ring-indigo-300' : ''}
                `}
              >
                {practiced ? '✓' : ''}
              </div>
              <span className="text-[9px] text-gray-400">{DAY_LABELS[dayIdx]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
