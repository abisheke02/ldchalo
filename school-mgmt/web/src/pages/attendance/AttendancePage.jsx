import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const STATUS_COLORS = { present: 'bg-green-100 text-green-700', absent: 'bg-red-100 text-red-700', late: 'bg-amber-100 text-amber-700', not_marked: 'bg-gray-100 text-gray-500' };

export default function AttendancePage() {
  const [overview, setOverview] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/attendance/overview').then(r => setOverview(r.data)).catch(() => {});
  }, []);

  async function loadClass() {
    if (!classId) return;
    const { data } = await api.get(`/attendance/class/${classId}`, { params: { date } });
    setStudents(data);
  }

  function toggleStatus(id, status) {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }

  async function saveAttendance() {
    setSaving(true);
    try {
      await api.post('/attendance/mark', {
        class_id: classId, date,
        attendance: students.map(s => ({ student_id: s.id, status: s.status === 'not_marked' ? 'present' : s.status })),
      });
      toast.success('Attendance saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Attendance Management</h2>

      {/* Today's overview */}
      {overview.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {overview.slice(0, 6).map(c => (
            <div key={c.class_name + c.section} className="bg-white rounded-xl shadow p-4 text-center">
              <p className="font-semibold text-gray-700">{c.name} {c.section}</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{c.pct ?? 0}%</p>
              <p className="text-xs text-gray-400">{c.present}/{c.total_students} present</p>
            </div>
          ))}
        </div>
      )}

      {/* Mark attendance */}
      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <p className="font-semibold text-gray-700">Mark Attendance</p>
        <div className="flex gap-3 flex-wrap">
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
            placeholder="Class ID" value={classId} onChange={e => setClassId(e.target.value)} />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <button onClick={loadClass} className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm">Load Class</button>
        </div>

        {students.length > 0 && (
          <>
            <div className="space-y-1 max-h-96 overflow-auto">
              {students.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium text-sm">{s.name}</span>
                    <span className="text-xs text-gray-400 ml-2">Roll {s.roll_number}</span>
                  </div>
                  <div className="flex gap-2">
                    {['present', 'absent', 'late'].map(st => (
                      <button key={st} onClick={() => toggleStatus(s.id, st)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${s.status === st ? STATUS_COLORS[st] + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={saveAttendance} disabled={saving}
              className="w-full py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-blue-900 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
