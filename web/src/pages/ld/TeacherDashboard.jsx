import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const RISK_COLOR = (score) => score >= 70 ? 'text-red-600' : score >= 40 ? 'text-yellow-600' : 'text-green-600';

export default function TeacherDashboard() {
  const [classes, setClasses]   = useState([]);
  const [classId, setClassId]   = useState('');
  const [students, setStudents] = useState([]);
  const [atRisk, setAtRisk]     = useState([]);

  useEffect(() => {
    api.get('/schools/classes').then((r) => setClasses(r.data)).catch(() => {});
    api.get('/students/at-risk').then((r) => setAtRisk(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classId) return;
    api.get(`/schools/classes/${classId}/students`).then((r) => setStudents(r.data)).catch(() => {});
  }, [classId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Class Dashboard</h1>

      {/* At-risk students */}
      {atRisk.length > 0 && (
        <div className="card border-l-4 border-red-400">
          <h2 className="text-base font-semibold text-gray-900 mb-3">⚠️ Needs Attention ({atRisk.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b text-xs">
                  <th className="pb-2">Name</th><th className="pb-2">LD Type</th><th className="pb-2">Risk</th><th className="pb-2">Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {atRisk.slice(0, 8).map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-900">{s.name}</td>
                    <td className="py-2 text-gray-600 capitalize">{s.ld_type?.replace('_', ' ') || '—'}</td>
                    <td className={`py-2 font-semibold ${RISK_COLOR(s.ld_risk_score)}`}>{s.ld_risk_score}/100</td>
                    <td className="py-2 text-gray-600">{s.current_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Class selector */}
      <div className="flex items-center gap-4">
        <select className="input w-52" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Select class…</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-sm text-gray-500">{students.length} students</span>
      </div>

      {students.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b text-xs">
                <th className="pb-3">Name</th><th className="pb-3">Email</th><th className="pb-3">Grade</th><th className="pb-3">LD Type</th><th className="pb-3">Risk</th><th className="pb-3">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="py-2.5 font-medium text-gray-900">{s.name}</td>
                  <td className="py-2.5 text-gray-500">{s.email}</td>
                  <td className="py-2.5 text-gray-600">{s.class_grade || '—'}</td>
                  <td className="py-2.5 text-gray-600 capitalize">{s.ld_type?.replace('_', ' ') || '—'}</td>
                  <td className={`py-2.5 font-semibold ${s.ld_risk_score ? RISK_COLOR(s.ld_risk_score) : 'text-gray-400'}`}>
                    {s.ld_risk_score != null ? `${s.ld_risk_score}/100` : '—'}
                  </td>
                  <td className="py-2.5 text-gray-600">{s.current_level ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
