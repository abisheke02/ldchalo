import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const TYPE_COLORS = { teaching: 'bg-blue-100 text-blue-700', non_teaching: 'bg-gray-100 text-gray-600', administration: 'bg-purple-100 text-purple-700', outsource: 'bg-amber-100 text-amber-700' };

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/staff', { params: { staff_type: filter || undefined } }),
      api.get('/staff/attendance/today'),
    ]).then(([s, a]) => { setStaff(s.data); setAttendance(a.data); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>

      {/* Today's attendance summary */}
      {attendance.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="bg-primary text-white px-5 py-3 text-sm font-semibold">Staff Attendance — Today</div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['Type', 'Total', 'Absent', 'Half Day', 'On Duty', 'Late', 'Leave'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {attendance.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 capitalize">{r.staff_type?.replace('_', ' ')}</td>
                  <td className="px-4 py-2 font-semibold">{r.total}</td>
                  <td className="px-4 py-2 text-red-600">{r.absent}</td>
                  <td className="px-4 py-2">{r.half_day}</td>
                  <td className="px-4 py-2">{r.on_duty}</td>
                  <td className="px-4 py-2 text-amber-600">{r.late}</td>
                  <td className="px-4 py-2">{r.leave}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Staff list */}
      <div className="flex gap-2 flex-wrap">
        {['', 'teaching', 'non_teaching', 'administration', 'outsource'].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${filter === t ? 'bg-primary text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            {t || 'All'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-center py-10 text-gray-400">Loading...</p> : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>{['Name', 'Phone', 'Type', 'Department', 'Employee Code'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {staff.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 font-medium">{s.name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{s.phone || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[s.staff_type] || 'bg-gray-100'}`}>
                      {s.staff_type?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{s.department || '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{s.employee_code || '—'}</td>
                </tr>
              ))}
              {!staff.length && <tr><td colSpan={5} className="text-center py-10 text-gray-400">No staff found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
