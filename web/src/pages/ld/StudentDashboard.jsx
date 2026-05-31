import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

const LD_LABELS = { dyslexia: 'Dyslexia', dysgraphia: 'Dysgraphia', dyscalculia: 'Dyscalculia', mixed: 'Mixed LD', not_detected: 'No LD Detected' };
const LEVEL_LABELS = ['', 'Starter', 'Basic', 'Intermediate', 'Advanced', 'Mastery'];

export default function StudentDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/analytics/student/me').then((r) => setData(r.data)).catch(() => {});
  }, []);

  const profile   = data?.profile || {};
  const trend     = data?.trend || [];
  const weakAreas = data?.weakAreas || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-orange-500">{profile.streak_count ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">🔥 Day Streak</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-indigo-600">Level {profile.current_level ?? 1}</p>
          <p className="text-sm text-gray-500 mt-1">{LEVEL_LABELS[profile.current_level ?? 1]}</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{profile.total_minutes_today ?? 0} min</p>
          <p className="text-sm text-gray-500 mt-1">📚 Today</p>
        </div>
      </div>

      {/* LD Profile or Screening CTA */}
      {profile.ld_type ? (
        <div className="card border-l-4 border-purple-500">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Learning Profile</p>
          <p className="text-xl font-bold text-purple-700">{LD_LABELS[profile.ld_type]}</p>
          <div className="flex items-center gap-3 mt-3">
            <p className="text-sm text-gray-500">Risk Score</p>
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-purple-500" style={{ width: `${profile.ld_risk_score || 0}%` }} />
            </div>
            <p className="text-sm font-semibold text-gray-700">{profile.ld_risk_score ?? 0}/100</p>
          </div>
        </div>
      ) : (
        <Link to="/ld/screening" className="card border-l-4 border-indigo-500 block hover:shadow-md transition-shadow">
          <p className="text-lg font-bold text-indigo-700">Complete your LD Screening →</p>
          <p className="text-sm text-gray-500 mt-1">Take the 10-minute quiz to personalise your learning.</p>
        </Link>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { to: '/ld/practice', label: 'Practice', icon: '📚', color: 'bg-blue-50 text-blue-700' },
          { to: '/ld/tests',    label: 'Tests',    icon: '📝', color: 'bg-green-50 text-green-700' },
          { to: '/ld/recommendations', label: 'Tips', icon: '💡', color: 'bg-yellow-50 text-yellow-700' },
        ].map((a) => (
          <Link key={a.to} to={a.to} className={`card flex flex-col items-center py-6 hover:shadow-md transition-shadow ${a.color}`}>
            <span className="text-3xl mb-2">{a.icon}</span>
            <span className="font-semibold">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Score trend */}
      {trend.length > 2 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">14-Day Score Trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trend}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="avg_score" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weak areas */}
      {weakAreas.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Needs Practice</h2>
          {weakAreas.map((a) => (
            <div key={a.error_type} className="flex items-center gap-3 mb-3">
              <span className="text-sm text-gray-600 w-24 capitalize">{a.error_type?.replace('_', ' ')}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min((a.count / 20) * 100, 100)}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-6">{a.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
