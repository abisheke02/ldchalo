import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../services/api';

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = { blue: 'bg-blue-600', green: 'bg-green-600', amber: 'bg-amber-500', purple: 'bg-purple-600' };
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 text-${color}-600`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading dashboard...</div>;

  const feePct = data?.fees?.collection_pct ?? 0;
  const staffPct = data?.staff?.attendance_pct ?? 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Live Dashboard — {data?.as_of}</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={data?.students?.total?.toLocaleString()} sub={`+${data?.students?.new_this_term} new this term`} color="blue" />
        <StatCard label="Fees Collected" value={`₹${(data?.fees?.collected / 100000).toFixed(1)}L`} sub={`${feePct}% of total dues`} color="green" />
        <StatCard label="Outstanding" value={`₹${(data?.fees?.outstanding / 100000).toFixed(1)}L`} sub={`${100 - feePct}% pending`} color="amber" />
        <StatCard label="Staff Present" value={`${data?.staff?.present}/${data?.staff?.total}`} sub={`${staffPct}% today`} color="purple" />
      </div>

      {/* Fee progress bar */}
      <div className="bg-white rounded-xl shadow p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Fee Collection Progress</p>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div className="bg-green-500 h-4 rounded-full transition-all" style={{ width: `${feePct}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{feePct}% collected</p>
      </div>

      {/* Class-wise attendance bar chart */}
      {data?.class_attendance?.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Class-wise Student Attendance — Today</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.class_attendance} layout="vertical" barCategoryGap="20%">
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="class_name" width={70} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => `${v}%`} />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                {data.class_attendance.map((_, i) => (
                  <Cell key={i} fill={_ .pct >= 90 ? '#22c55e' : _.pct >= 75 ? '#3b82f6' : '#f59e0b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
