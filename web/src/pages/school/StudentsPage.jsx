import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

const Badge = ({ text, color = 'blue' }) => {
  const colors = { blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', red: 'bg-red-50 text-red-700', purple: 'bg-purple-50 text-purple-700', gray: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>{text}</span>;
};

const FieldRow = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const selectCls = inputCls;

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [view, setView]         = useState('list');   // list | add | profile
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
      if (search)      params.search   = search;
      if (classFilter) params.class_id = classFilter;
      const [studRes, classRes] = await Promise.all([
        api.get('/students', { params }),
        api.get('/schools/classes'),
      ]);
      setStudents(studRes.data.students || studRes.data);
      setTotal(studRes.data.total || studRes.data.length);
      setClasses(classRes.data);
    } catch { setStudents([]); }
    finally { setLoading(false); }
  }, [search, classFilter, page]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveStudent = async () => {
    setSaving(true);
    try {
      if (selected) {
        await api.patch(`/students/${selected.id}`, form);
      } else {
        await api.post('/students/invite', { email: form.email, classId: form.class_id });
      }
      setView('list');
      setForm({});
      setSelected(null);
      load();
    } catch (err) { alert(err?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const openProfile = async (s) => {
    try {
      const { data } = await api.get(`/students/${s.id || s.user_id}`);
      setSelected(data);
      setForm(data);
      setView('profile');
    } catch { setSelected(s); setForm(s); setView('profile'); }
  };

  if (view === 'add' || (view === 'profile' && selected)) {
    const isEdit = view === 'profile';
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => { setView('list'); setSelected(null); setForm({}); }}
            className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm font-medium"
          >
            ← Back to Students
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Student Profile' : 'Add New Student'}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Photo & Quick Info */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3">
                {(form.name || 'S')[0]}
              </div>
              <p className="font-bold text-gray-900">{form.name || 'New Student'}</p>
              <p className="text-sm text-gray-500 mt-1">{form.admission_no || 'No Admission No.'}</p>
              {isEdit && form.class_grade && <Badge text={`Class ${form.class_grade}`} color="blue" />}
            </div>

            {isEdit && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                <h3 className="font-semibold text-gray-700 text-sm">Quick Info</h3>
                {[
                  { l: 'LD Type',     v: form.ld_type?.replace('_',' ') || '—' },
                  { l: 'Risk Score',  v: form.ld_risk_score != null ? `${form.ld_risk_score}/100` : '—' },
                  { l: 'Level',       v: form.current_level ? `Level ${form.current_level}` : '—' },
                  { l: 'Streak',      v: form.streak_count != null ? `${form.streak_count} days` : '—' },
                ].map((i) => (
                  <div key={i.l} className="flex justify-between text-sm">
                    <span className="text-gray-500">{i.l}</span>
                    <span className="font-medium text-gray-900">{i.v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FieldRow label="Full Name *">
                <input className={inputCls} placeholder="Student full name" value={form.name || ''} onChange={set('name')} />
              </FieldRow>
              <FieldRow label="Email Address">
                <input className={inputCls} type="email" placeholder="email@example.com" value={form.email || ''} onChange={set('email')} />
              </FieldRow>
              <FieldRow label="Phone">
                <input className={inputCls} placeholder="Parent phone" value={form.phone || ''} onChange={set('phone')} />
              </FieldRow>
              <FieldRow label="Date of Birth">
                <input className={inputCls} type="date" value={form.dob || ''} onChange={set('dob')} />
              </FieldRow>
              <FieldRow label="Class / Grade">
                <select className={selectCls} value={form.class_id || ''} onChange={set('class_id')}>
                  <option value="">Select class…</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Admission No">
                <input className={inputCls} placeholder="Auto-generated" value={form.admission_no || ''} onChange={set('admission_no')} />
              </FieldRow>
              <FieldRow label="Blood Group">
                <select className={selectCls} value={form.blood_group || ''} onChange={set('blood_group')}>
                  <option value="">Select…</option>
                  {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Gender">
                <select className={selectCls} value={form.gender || ''} onChange={set('gender')}>
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </FieldRow>
              <FieldRow label="Father's Name">
                <input className={inputCls} placeholder="Father's full name" value={form.father_name || ''} onChange={set('father_name')} />
              </FieldRow>
              <FieldRow label="Mother's Name">
                <input className={inputCls} placeholder="Mother's full name" value={form.mother_name || ''} onChange={set('mother_name')} />
              </FieldRow>
              <FieldRow label="Parent Phone">
                <input className={inputCls} placeholder="Parent contact" value={form.parent_phone || ''} onChange={set('parent_phone')} />
              </FieldRow>
              <FieldRow label="Address">
                <input className={inputCls} placeholder="Residential address" value={form.address || ''} onChange={set('address')} />
              </FieldRow>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => { setView('list'); setSelected(null); setForm({}); }} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveStudent} disabled={saving}
                className="px-6 py-2 rounded-lg bg-[#0891B2] text-white text-sm font-semibold hover:bg-[#0e7490] disabled:opacity-50"
              >
                {saving ? 'Saving…' : isEdit ? 'Update Student' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">Total: {total} students</p>
        </div>
        <button onClick={() => { setView('add'); setForm({}); setSelected(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0891B2] text-white text-sm font-semibold hover:bg-[#0e7490]"
        >
          + Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3">
        <input
          className="flex-1 min-w-48 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="🔍  Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(0); }}
        >
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Student</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Class</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">LD Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading…</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No students found</td></tr>
              ) : students.map((s, i) => (
                <tr key={s.id || s.user_id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 text-gray-400">{page * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {(s.name || '?')[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{s.name || '—'}</p>
                        <p className="text-xs text-gray-400">{s.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.class_grade ? `Grade ${s.class_grade}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.phone || '—'}</td>
                  <td className="px-4 py-3">
                    {s.ld_type ? (
                      <Badge text={s.ld_type.replace('_',' ')} color={s.ld_risk_score > 60 ? 'red' : s.ld_risk_score > 30 ? 'blue' : 'green'} />
                    ) : (
                      <Badge text="Not screened" color="gray" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openProfile(s)}
                      className="text-xs font-semibold text-[#0891B2] hover:text-[#0e7490] px-3 py-1.5 rounded-lg border border-[#0891B2]/30 hover:bg-[#0891B2]/5"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="text-xs px-3 py-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >← Prev</button>
              <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}
                className="text-xs px-3 py-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
