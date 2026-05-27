import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const STATUSES = ['enquiry', 'application', 'interview', 'admitted', 'rejected'];
const STATUS_COLORS = { enquiry: 'bg-blue-100 text-blue-700', application: 'bg-purple-100 text-purple-700', interview: 'bg-amber-100 text-amber-700', admitted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };

export default function AdmissionsPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [eq, fn] = await Promise.all([
        api.get('/admissions', { params: { status: filter || undefined } }),
        api.get('/admissions/funnel'),
      ]);
      setEnquiries(eq.data);
      setFunnel(fn.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter]);

  async function advance(id, status) {
    try {
      await api.patch(`/admissions/${id}/status`, { status });
      toast.success(`Moved to ${status}`);
      load();
    } catch { toast.error('Failed to update'); }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Admission Management</h2>

      {/* Funnel */}
      <div className="flex gap-3 flex-wrap">
        {STATUSES.map(s => {
          const count = funnel.find(f => f.status === s)?.count || 0;
          return (
            <div key={s} className={`px-4 py-3 rounded-xl shadow text-center min-w-24 cursor-pointer ${filter === s ? 'ring-2 ring-primary' : 'bg-white'}`}
              onClick={() => setFilter(filter === s ? '' : s)}>
              <p className="text-2xl font-bold text-gray-800">{count}</p>
              <p className={`text-xs font-medium mt-1 px-2 py-0.5 rounded-full ${STATUS_COLORS[s]}`}>{s}</p>
            </div>
          );
        })}
      </div>

      {loading ? <p className="text-center py-10 text-gray-400">Loading...</p> : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>{['Student', 'Class', 'Parent', 'Phone', 'Date', 'Quota', 'Status', 'Action'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {enquiries.map((e, i) => (
                <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 font-medium">{e.student_name}</td>
                  <td className="px-4 py-2.5">{e.applying_for_class}</td>
                  <td className="px-4 py-2.5">{e.parent_name}</td>
                  <td className="px-4 py-2.5 text-gray-500">{e.parent_phone}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{e.enquiry_date?.slice(0, 10)}</td>
                  <td className="px-4 py-2.5 text-xs">{e.quota || 'General'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status]}`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <select className="text-xs border border-gray-200 rounded px-2 py-1"
                      onChange={ev => advance(e.id, ev.target.value)} defaultValue="">
                      <option value="" disabled>Move to...</option>
                      {STATUSES.filter(s => s !== e.status).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {!enquiries.length && <tr><td colSpan={8} className="text-center py-10 text-gray-400">No enquiries found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
