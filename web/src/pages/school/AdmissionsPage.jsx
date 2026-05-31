import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const STATUS_COLOR = { new: 'bg-blue-50 text-blue-700', contacted: 'bg-yellow-50 text-yellow-700', visited: 'bg-purple-50 text-purple-700', enrolled: 'bg-green-50 text-green-700', rejected: 'bg-red-50 text-red-700' };

export default function AdmissionsPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [funnel, setFunnel]       = useState([]);
  const [filter, setFilter]       = useState('');

  const load = () => {
    const params = filter ? { status: filter } : {};
    api.get('/school/admissions', { params }).then((r) => setEnquiries(r.data)).catch(() => {});
    api.get('/school/admissions/funnel').then((r) => setFunnel(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id, status) => {
    await api.patch(`/school/admissions/${id}/status`, { status });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admissions</h1>

      {/* Funnel */}
      <div className="grid grid-cols-5 gap-3">
        {funnel.map((f) => (
          <button key={f.status} onClick={() => setFilter(filter === f.status ? '' : f.status)}
            className={`card text-center transition-shadow hover:shadow-md ${filter === f.status ? 'ring-2 ring-indigo-500' : ''}`}
          >
            <p className="text-xl font-bold text-gray-900">{f.count}</p>
            <p className={`text-xs mt-1 badge ${STATUS_COLOR[f.status] || 'bg-gray-100 text-gray-600'}`}>{f.status}</p>
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-3 font-medium">Student</th>
              <th className="pb-3 font-medium">Parent</th>
              <th className="pb-3 font-medium">Phone</th>
              <th className="pb-3 font-medium">Grade</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {enquiries.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="py-3 font-medium text-gray-900">{e.student_name}</td>
                <td className="py-3 text-gray-600">{e.parent_name || '—'}</td>
                <td className="py-3 text-gray-600">{e.parent_phone || '—'}</td>
                <td className="py-3 text-gray-600">{e.grade || '—'}</td>
                <td className="py-3"><span className={`badge ${STATUS_COLOR[e.status] || 'bg-gray-100 text-gray-600'}`}>{e.status}</span></td>
                <td className="py-3">
                  <select className="input text-xs py-1 w-32" value={e.status} onChange={(ev) => updateStatus(e.id, ev.target.value)}>
                    {['new','contacted','visited','enrolled','rejected'].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
