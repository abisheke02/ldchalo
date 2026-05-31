import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const Stat = ({ label, value, color, icon }) => (
  <div className="card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>{icon}</div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

export default function SchoolDashboard() {
  const [stats, setStats] = useState(null);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    api.get('/analytics/dashboard').then((r) => setStats(r.data)).catch(() => {});
    api.get('/schools/classes').then((r) => setClasses(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">School Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total Students"   value={stats?.students}                    icon="👨‍🎓" color="bg-blue-50" />
        <Stat label="Present Today"    value={stats?.attendance?.present}          icon="✅"   color="bg-green-50" />
        <Stat label="Fees Today"       value={`₹${stats?.fees?.collected_today || 0}`} icon="💰" color="bg-yellow-50" />
        <Stat label="Classes"          value={classes.length}                     icon="🏫"  color="bg-purple-50" />
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Classes</h2>
        {classes.length === 0 ? (
          <p className="text-gray-400 text-sm">No classes yet. Go to Settings to create one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Class</th>
                  <th className="pb-3 font-medium">Teacher</th>
                  <th className="pb-3 font-medium">Students</th>
                  <th className="pb-3 font-medium">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {classes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="py-3 text-gray-600">{c.teacher_name || '—'}</td>
                    <td className="py-3 text-gray-600">{c.student_count}</td>
                    <td className="py-3 text-gray-600">{c.grade || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
