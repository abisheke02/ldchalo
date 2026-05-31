import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ParentScorecard() {
  const [data, setData] = useState(null);
  const [tips, setTips] = useState([]);

  useEffect(() => {
    api.get('/analytics/student/me').then((r) => setData(r.data)).catch(() => {});
    api.get('/ld/recommendations/me').then((r) => setTips(r.data?.tips || [])).catch(() => {});
  }, []);

  const p = data?.profile || {};
  const trend = data?.trend || [];
  const weekly = trend.slice(-7);
  const weeklyAvg = weekly.length
    ? Math.round(weekly.reduce((s, r) => s + Number(r.avg_score), 0) / weekly.length)
    : null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Child's Progress</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-orange-500">{p.streak_count ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">🔥 Day Streak</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-indigo-600">Level {p.current_level ?? 1}</p>
          <p className="text-sm text-gray-500 mt-1">Current Level</p>
        </div>
        {weeklyAvg != null && (
          <div className="card text-center col-span-2">
            <p className="text-3xl font-bold text-green-600">{weeklyAvg}%</p>
            <p className="text-sm text-gray-500 mt-1">📊 This Week's Average</p>
          </div>
        )}
      </div>

      {tips.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900">Tips to Support Your Child</h2>
          {tips.slice(0, 3).map((tip, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-indigo-500 font-bold text-sm">{i + 1}.</span>
              <p className="text-sm text-gray-700">{tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
