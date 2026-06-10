import React from 'react';
import { useNavigate } from 'react-router-dom';

const LD_BADGES = {
  dyslexia: { label: 'Dyslexia', bg: 'bg-purple-100', text: 'text-purple-700' },
  dyscalculia: { label: 'Dyscalculia', bg: 'bg-blue-100', text: 'text-blue-700' },
  dysgraphia: { label: 'Dysgraphia', bg: 'bg-pink-100', text: 'text-pink-700' },
  mixed: { label: 'Mixed', bg: 'bg-orange-100', text: 'text-orange-700' },
  not_detected: { label: 'No LD', bg: 'bg-green-100', text: 'text-green-700' },
};

const AVATAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-violet-500'];

export default function StudentCard({ student, compact = false }) {
  const navigate = useNavigate();
  const badge = LD_BADGES[student.ldType] || LD_BADGES.not_detected;
  const avatarColor = AVATAR_COLORS[student.name.charCodeAt(0) % AVATAR_COLORS.length];

  const practiceStatus = student.lastPractice === 0 ? 'today'
    : student.lastPractice <= 2 ? 'recent'
    : student.lastPractice <= 4 ? 'warning' : 'danger';

  const rowBg = practiceStatus === 'today' ? 'bg-green-50/50'
    : practiceStatus === 'danger' ? 'bg-red-50/50'
    : practiceStatus === 'warning' ? 'bg-amber-50/50' : '';

  const practiceText = student.lastPractice === 0 ? 'Today'
    : student.lastPractice === 1 ? 'Yesterday'
    : `${student.lastPractice}d ago`;

  return (
    <div
      onClick={() => navigate(`/ld/teacher/student/${student.id}`)}
      className={`flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer ${rowBg}`}
    >
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
        {student.initials || student.name.split(' ').map(n => n[0]).join('')}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 truncate">{student.name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-400">Lv{student.level}</span>
          <span className="text-xs text-gray-400">Risk: {student.riskScore}</span>
          {student.streak > 0 && <span className="text-xs text-orange-500">🔥{student.streak}</span>}
        </div>
      </div>

      {/* Last practice */}
      <div className="text-right flex-shrink-0">
        <span className={`text-xs font-medium ${
          practiceStatus === 'today' ? 'text-green-600' :
          practiceStatus === 'danger' ? 'text-red-500' :
          practiceStatus === 'warning' ? 'text-amber-500' : 'text-gray-500'
        }`}>
          {practiceText}
        </span>
        <div className="text-[10px] text-gray-300">last practice</div>
      </div>

      {/* Arrow */}
      <span className="text-gray-300 text-sm">›</span>
    </div>
  );
}
