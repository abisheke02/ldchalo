import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function StaffPage() {
  const [staff, setStaff]       = useState([]);
  const [adding, setAdding]     = useState(false);
  const [form, setForm]         = useState({});

  useEffect(() => {
    api.get('/school/staff').then((r) => setStaff(r.data)).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addStaff = async () => {
    try {
      await api.post('/school/staff', form);
      alert('Staff added!');
      setAdding(false);
      setForm({});
      api.get('/school/staff').then((r) => setStaff(r.data)).catch(() => {});
    } catch {
      alert('Failed to add staff');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
        <button className="btn-school" onClick={() => setAdding(true)}>+ Add Staff</button>
      </div>

      <div className="card">
        {staff.length === 0 ? (
          <p className="text-gray-400 text-sm">No staff added yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Dept</th>
                  <th className="pb-3 font-medium">Designation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="py-3 text-gray-600">{s.email}</td>
                    <td className="py-3"><span className="badge bg-blue-50 text-blue-700">{s.role}</span></td>
                    <td className="py-3 text-gray-600">{s.department_name || '—'}</td>
                    <td className="py-3 text-gray-600">{s.designation || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adding && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Add Staff Member</h3>
            <input className="input" placeholder="Full name" onChange={set('name')} />
            <input className="input" type="email" placeholder="Email" onChange={set('email')} />
            <input className="input" placeholder="Phone (optional)" onChange={set('phone')} />
            <select className="input" onChange={set('role')} defaultValue="teacher">
              <option value="teacher">Teacher</option>
              <option value="school_admin">Admin</option>
            </select>
            <input className="input" placeholder="Designation" onChange={set('designation')} />
            <div className="flex gap-3 justify-end">
              <button className="btn-outline" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn-school" onClick={addStaff}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
