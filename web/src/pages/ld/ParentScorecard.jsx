import React, { useState, useEffect } from 'react';
import analyticsApi from '../../services/analyticsApi';

// ─── Progress Ring ──────────────────────────────────────────────────
function ProgressRing({ value, size = 120, strokeWidth = 10, color = '#4F46E5' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{value}%</span>
        <span className="text-[10px] text-gray-400">improvement</span>
      </div>
    </div>
  );
}

// ─── Level Timeline ─────────────────────────────────────────────────
function LevelTimeline({ levels }) {
  return (
    <div className="flex items-center justify-between w-full">
      {levels.map((l, i) => (
        <React.Fragment key={l.level}>
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
              ${l.status === 'passed' ? 'bg-green-500 text-white' : l.status === 'current' ? 'bg-indigo-500 text-white ring-4 ring-indigo-200 animate-pulse' : 'bg-gray-200 text-gray-400'}
            `}>
              {l.status === 'passed' ? '✓' : l.status === 'current' ? l.level : '🔒'}
            </div>
            <span className="text-[10px] text-gray-400 mt-1">Lv{l.level}</span>
            {l.date && <span className="text-[9px] text-gray-300">{new Date(l.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>}
          </div>
          {i < levels.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${l.status === 'passed' ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function ParentScorecard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getParentView()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 bg-[#FFF8F0] min-h-screen">
      {/* Child Profile Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
            {data.child?.name?.charAt(0) || 'S'}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">{data.child?.name}</h1>
            <p className="text-sm text-gray-500">{data.child?.class} • {data.child?.school}</p>
          </div>
          <div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
              data.ldType === 'not_detected' ? 'bg-green-500' :
              data.ldType === 'dyslexia' ? 'bg-purple-500' :
              data.ldType === 'dyscalculia' ? 'bg-blue-500' :
              data.ldType === 'dysgraphia' ? 'bg-pink-500' : 'bg-amber-500'
            }`}>
              {data.ldType === 'not_detected' ? 'No LD' : data.ldType}
            </span>
          </div>
        </div>
      </div>

      {/* Overall Progress + Screening Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Improvement Gauge */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Overall Improvement</h3>
          <ProgressRing value={data.improvement} color="#10B981" />
          <p className="text-xs text-gray-400 mt-3">Since first screening</p>
        </div>

        {/* Screening Comparison */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Screening Progress</h3>
          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 mb-1">First ({data.firstScreening?.date?.slice(0, 7)})</p>
              <span className="text-xl font-bold text-red-500">{data.firstScreening?.riskScore}</span>
              <p className="text-[10px] text-gray-400">Level {data.firstScreening?.level}</p>
            </div>
            <div className="text-2xl text-green-500">→</div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 mb-1">Latest ({data.latestScreening?.date?.slice(0, 7)})</p>
              <span className="text-xl font-bold text-green-500">{data.latestScreening?.riskScore}</span>
              <p className="text-[10px] text-gray-400">Level {data.latestScreening?.level}</p>
            </div>
          </div>
          <div className="text-center">
            <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">
              ↓ {data.firstScreening?.riskScore - data.latestScreening?.riskScore} risk points reduced
            </span>
          </div>
        </div>
      </div>

      {/* Practice Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <div className="text-xl font-bold text-indigo-600">{data.practiceStats?.daysThisWeek}</div>
          <div className="text-[10px] text-gray-400">Days This Week</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <div className="text-xl font-bold text-orange-500">🔥 {data.practiceStats?.streak}</div>
          <div className="text-[10px] text-gray-400">Day Streak</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <div className="text-xl font-bold text-green-600">{data.practiceStats?.avgSessionMinutes}m</div>
          <div className="text-[10px] text-gray-400">Avg Session</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <div className="text-xl font-bold text-purple-600">{data.practiceStats?.totalSessions}</div>
          <div className="text-[10px] text-gray-400">Total Sessions</div>
        </div>
      </div>

      {/* Level Progression */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-4">📊 Level Progression</h3>
        <LevelTimeline levels={data.levelProgression || []} />
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
          <h3 className="text-sm font-semibold text-green-800 mb-3">💪 Strengths</h3>
          <div className="space-y-2">
            {data.strengths?.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-green-700">
                <span className="text-green-500">✓</span>
                <span className="capitalize">{s.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
          <h3 className="text-sm font-semibold text-red-800 mb-3">🎯 Needs Practice</h3>
          <div className="space-y-2">
            {data.weaknesses?.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-red-700">
                <span className="text-red-400">!</span>
                <span className="capitalize">{w.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Teacher Notes */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">📝 Teacher Notes</h3>
        {data.teacherNotes ? (
          <p className="text-sm text-gray-700">{data.teacherNotes}</p>
        ) : (
          <p className="text-xs text-gray-400 italic">No notes from teacher yet</p>
        )}
      </div>

      {/* Action Items */}
      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 mb-6">
        <h3 className="text-sm font-semibold text-blue-800 mb-3">✅ Suggested Actions for Parents</h3>
        <div className="space-y-2">
          {data.actionItems?.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-blue-700">
              <span className="text-blue-400 mt-0.5">→</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
