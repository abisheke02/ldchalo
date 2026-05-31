import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [schools, setSchools]   = useState([]);

  useEffect(() => {
    api.get('/admin/overview').then((r) => setOverview(r.data)).catch(() => {});
    api.get('/admin/schools').then((r) => setSchools(r.data)).catch(() => {});
  }, []);

  const triggerCron = async (job) => {
    try {
      await api.post(`/admin/cron/trigger/${job}`);
      alert(`${job} triggered`);
    } catch { alert('Failed'); }
  };

  const roleMap = overview?.users?.reduce((m, u) => ({ ...m, [u.role]: u.count }), {}) || {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Schools',   value: overview?.schools,        icon: '🏫', color: 'bg-blue-50'   },
          { label: 'Students',  value: roleMap.student,          icon: '👨‍🎓', color: 'bg-green-50' },
          { label: 'Teachers',  value: roleMap.teacher,          icon: '👩‍🏫', color: 'bg-purple-50'},
          { label: 'Sessions (7d)', value: overview?.sessions_7d, icon: '📚', color: 'bg-orange-50'},
        ].map((s) => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value ?? '—'}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Cron Jobs</h2>
        <div className="flex gap-3 flex-wrap">
          {['resetInactiveStreaks', 'flagRescreening', 'generateWeeklyRecommendations'].map((job) => (
            <button key={job} onClick={() => triggerCron(job)} className="btn-outline text-xs">
              ▶ {job}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Schools ({schools.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b text-xs">
                <th className="pb-2">Name</th>
                <th className="pb-2">Location</th>
                <th className="pb-2">Plan</th>
                <th className="pb-2">Users</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {schools.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="py-2.5 font-medium text-gray-900">{s.name}</td>
                  <td className="py-2.5 text-gray-500">{s.location || '—'}</td>
                  <td className="py-2.5"><span className="badge bg-indigo-50 text-indigo-700">{s.plan_type}</span></td>
                  <td className="py-2.5 text-gray-600">{s.user_count}</td>
                  <td className="py-2.5 text-gray-400">{new Date(s.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
