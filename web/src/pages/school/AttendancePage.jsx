import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const STATUS_COLOR = { present: 'bg-green-100 text-green-700', absent: 'bg-red-100 text-red-700', late: 'bg-yellow-100 text-yellow-700', holiday: 'bg-gray-100 text-gray-600' };

export default function AttendancePage() {
  const [classes, setClasses]     = useState([]);
  const [classId, setClassId]     = useState('');
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10));
  const [records, setRecords]     = useState([]);
  const [saving, setSaving]       = useState(false);
  const [overview, setOverview]   = useState(null);

  useEffect(() => {
    api.get('/schools/classes').then((r) => setClasses(r.data)).catch(() => {});
    api.get('/school/attendance/overview').then((r) => setOverview(r.data)).catch(() => {});
  }, []);

  const loadAttendance = () => {
    if (!classId) return;
    api.get(`/school/attendance/class/${classId}`, { params: { date } })
      .then((r) => setRecords(r.data))
      .catch(() => {});
  };

  useEffect(() => { loadAttendance(); }, [classId, date]);

  const mark = (id, status) =>
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/school/attendance/mark', {
        class_id: classId, date,
        attendance: records.map((r) => ({ student_id: r.id, status: r.status || 'present' })),
      });
      alert('Attendance saved!');
    } catch {
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const summary = overview?.summary || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>

      {/* Overview */}
      {summary.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {summary.map((s) => (
            <div key={s.status} className="card text-center">
              <p className="text-2xl font-bold text-gray-900">{s.count}</p>
              <p className={`text-sm font-medium mt-1 badge ${STATUS_COLOR[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status}</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="card flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
          <select className="input w-52" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select class…</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {/* Records */}
      {records.length > 0 && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Student</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="py-3">
                      <span className={`badge ${STATUS_COLOR[r.status] || 'bg-gray-100 text-gray-600'}`}>
                        {r.status || 'unmarked'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {['present', 'absent', 'late'].map((s) => (
                          <button key={s} onClick={() => mark(r.id, s)}
                            className={`text-xs px-2 py-1 rounded font-medium border transition-colors ${
                              r.status === s
                                ? s === 'present' ? 'bg-green-600 text-white border-green-600'
                                  : s === 'absent' ? 'bg-red-600 text-white border-red-600'
                                  : 'bg-yellow-500 text-white border-yellow-500'
                                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={save} disabled={saving || !classId} className="btn-school">
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
