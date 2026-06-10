import React, { useState, useEffect } from 'react';
import analyticsApi from '../../services/analyticsApi';

// ─── SVG Pie Chart ──────────────────────────────────────────────────
function PieChart({ data, size = 180 }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  let currentAngle = 0;

  const slices = data.map(d => {
    const angle = (d.count / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (startAngle + angle - 90) * (Math.PI / 180);
    const largeArc = angle > 180 ? 1 : 0;
    const r = size / 2 - 10;
    const cx = size / 2, cy = size / 2;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { ...d, path };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2" />
        ))}
        <circle cx={size/2} cy={size/2} r={size/6} fill="white" />
        <text x={size/2} y={size/2} textAnchor="middle" dy="5" className="text-sm font-bold fill-gray-700">{total}</text>
      </svg>
      <div className="flex flex-wrap justify-center gap-2 mt-3">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-gray-600">{d.type} ({d.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bar Chart ──────────────────────────────────────────────────────
function LevelBarChart({ data }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end justify-around h-32 px-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-xs font-bold text-gray-600">{d.count}</span>
          <div
            className="w-8 rounded-t-md transition-all duration-500"
            style={{ height: `${(d.count / max) * 100}%`, backgroundColor: ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#EF4444'][i] }}
          />
          <span className="text-[10px] text-gray-400">Lv{d.level}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Trend Line ─────────────────────────────────────────────────────
function TrendLine({ data, width = 500, height = 120 }) {
  if (!data || data.length === 0) return null;
  const values = data.map(d => d.avgMastery);
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28">
        <polyline points={points} fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-[9px] text-gray-400 px-1">
        {data.filter((_, i) => i % 3 === 0).map((d, i) => <span key={i}>{d.month}</span>)}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getAdminOverview()
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
    <div className="max-w-5xl mx-auto px-4 py-6 bg-[#FFF8F0] min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">📊 School Analytics Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-indigo-600">{data.totalStudents}</div>
          <div className="text-xs text-gray-400 mt-1">Total Students</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-green-600">{Math.round((data.screenedCount / data.totalStudents) * 100)}%</div>
          <div className="text-xs text-gray-400 mt-1">Screened ({data.screenedCount}/{data.totalStudents})</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-amber-500">{data.averageRiskScore}</div>
          <div className="text-xs text-gray-400 mt-1">Avg Risk Score</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-purple-600">{data.activePractitioners}</div>
          <div className="text-xs text-gray-400 mt-1">Active This Week</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* LD Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">LD Type Distribution</h3>
          <PieChart data={data.ldDistribution} />
        </div>

        {/* Level Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Students per Level</h3>
          <LevelBarChart data={data.levelDistribution} />
          <p className="text-xs text-gray-400 text-center mt-3">Total: {data.levelDistribution.reduce((s, d) => s + d.count, 0)} students with levels</p>
        </div>
      </div>

      {/* Progress Trend */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 School-wide Mastery Trend</h3>
        <TrendLine data={data.progressTrend} />
      </div>

      {/* At-Risk Students */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">⚠️ At-Risk Students</h3>
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
            {data.atRiskStudents?.length || 0} students
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs text-gray-400 font-medium">Student</th>
                <th className="text-left py-2 text-xs text-gray-400 font-medium">LD Type</th>
                <th className="text-center py-2 text-xs text-gray-400 font-medium">Risk</th>
                <th className="text-center py-2 text-xs text-gray-400 font-medium">Level</th>
                <th className="text-right py-2 text-xs text-gray-400 font-medium">Last Practice</th>
              </tr>
            </thead>
            <tbody>
              {data.atRiskStudents?.map((s, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-red-50 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600">
                        {s.name.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-700">{s.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{s.ldType}</span>
                  </td>
                  <td className="text-center">
                    <span className="font-bold text-red-500">{s.riskScore}</span>
                  </td>
                  <td className="text-center text-gray-500">Lv{s.level}</td>
                  <td className="text-right text-xs text-red-500 font-medium">{s.lastPractice}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors">
          📩 Send Practice Reminders
        </button>
        <button className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors">
          📄 Export Report
        </button>
        <button className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
          🔍 Schedule Bulk Screening
        </button>
      </div>
    </div>
  );
}
