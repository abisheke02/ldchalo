import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const Tab = ({ id, label, icon, active, onClick }) => (
  <button onClick={() => onClick(id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${active ? 'border-[#0891B2] text-[#0891B2]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
    <span>{icon}</span>{label}
  </button>
);

function SchoolInfo() {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => { api.get('/schools/info').then((r) => setForm(r.data || {})).catch(() => {}); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/schools/info', form);
      alert('School info updated!');
    } catch { alert('Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-gray-900">School Information</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {[
          ['name',          'School Name',          'text'],
          ['address',       'Address',              'text'],
          ['affiliation_no','Affiliation No.',      'text'],
          ['board_type',    'Board Type',           'select', ['CBSE','ICSE','State Board','IGCSE']],
          ['phone',         'School Phone',         'text'],
          ['email',         'School Email',         'email'],
          ['principal_name','Principal Name',       'text'],
          ['established',   'Year Established',     'number'],
        ].map(([k, label, type, options]) => (
          <div key={k} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
            {type === 'select' ? (
              <select className={inputCls} value={form[k] || ''} onChange={set(k)}>
                <option value="">Select…</option>
                {options.map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input className={inputCls} type={type} value={form[k] || ''} onChange={set(k)} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="px-6 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg hover:bg-[#0e7490] disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function ClassManager() {
  const [classes, setClasses] = useState([]);
  const [form, setForm]       = useState({ name: '', grade: '', section: '' });
  const [saving, setSaving]   = useState(false);

  useEffect(() => { api.get('/schools/classes').then((r) => setClasses(r.data)).catch(() => {}); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/schools/classes', form);
      setClasses((p) => [...p, data]);
      setForm({ name: '', grade: '', section: '' });
    } catch { alert('Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-gray-900">Manage Classes</h3>
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex flex-wrap gap-3 items-end">
        {[
          ['name',    'Class Name (e.g. Grade 5-A)', 'text'],
          ['grade',   'Grade / Standard',            'number'],
          ['section', 'Section (A/B/C)',             'text'],
        ].map(([k, placeholder, type]) => (
          <div key={k} className="flex flex-col gap-1 flex-1 min-w-36">
            <label className="text-xs font-medium text-gray-600">{placeholder}</label>
            <input className={inputCls} type={type} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
          </div>
        ))}
        <button onClick={save} disabled={saving || !form.name} className="px-4 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg disabled:opacity-50">
          {saving ? '…' : '+ Add Class'}
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
            <th className="px-4 py-3 text-left">Class Name</th>
            <th className="px-4 py-3 text-left">Grade</th>
            <th className="px-4 py-3 text-left">Section</th>
            <th className="px-4 py-3 text-left">Teacher</th>
            <th className="px-4 py-3 text-left">Students</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {classes.length === 0
              ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">No classes yet</td></tr>
              : classes.map((c) => (
                <tr key={c.id} className="hover:bg-blue-50/30">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.grade || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.section || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.teacher_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.student_count ?? 0}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserManager() {
  const [users, setUsers]   = useState([]);
  const [form, setForm]     = useState({ name: '', email: '', password: '', role: 'teacher' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => { api.get('/admin/users', { params: { limit: 50 } }).then((r) => setUsers(r.data)).catch(() => {}); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/auth/register', form);
      setForm({ name: '', email: '', password: '', role: 'teacher' });
      api.get('/admin/users', { params: { limit: 50 } }).then((r) => setUsers(r.data)).catch(() => {});
    } catch (err) { alert(err?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const ROLE_COLORS = { super_admin: 'text-purple-700 bg-purple-50', school_admin: 'text-red-700 bg-red-50', teacher: 'text-blue-700 bg-blue-50', student: 'text-green-700 bg-green-50', parent: 'text-orange-700 bg-orange-50' };

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-gray-900">User Management</h3>
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Full Name</label>
          <input className={inputCls} placeholder="User name" value={form.name} onChange={set('name')} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Email</label>
          <input className={inputCls} type="email" placeholder="Email" value={form.email} onChange={set('email')} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Password</label>
          <input className={inputCls} type="password" placeholder="Temp password" value={form.password} onChange={set('password')} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Role</label>
          <select className={inputCls} value={form.role} onChange={set('role')}>
            <option value="teacher">Teacher</option>
            <option value="school_admin">School Admin</option>
            <option value="parent">Parent</option>
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
          <button onClick={save} disabled={saving || !form.email || !form.name} className="px-5 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg disabled:opacity-50">
            {saving ? 'Creating…' : '+ Create User'}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
            <th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Email</th><th className="px-4 py-3 text-left">Role</th><th className="px-4 py-3 text-left">Joined</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-blue-50/30">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role] || 'text-gray-600 bg-gray-100'}`}>{u.role}</span></td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState('school');
  const TABS = [
    { id: 'school',  label: 'School Info',  icon: '🏫' },
    { id: 'classes', label: 'Classes',      icon: '📚' },
    { id: 'users',   label: 'Users',        icon: '👥' },
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Administration & Settings</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map((t) => <Tab key={t.id} {...t} active={tab === t.id} onClick={setTab} />)}
        </div>
        <div className="p-5">
          {tab === 'school'  && <SchoolInfo />}
          {tab === 'classes' && <ClassManager />}
          {tab === 'users'   && <UserManager />}
        </div>
      </div>
    </div>
  );
}
