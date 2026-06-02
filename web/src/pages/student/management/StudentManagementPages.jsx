import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { studentApi, master } from '../../../services/erp-api';

const today = () => new Date().toISOString().split('T')[0];
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

// ─── 1. Student Information Page ─────────────────────────────────────────────
const STUDENT_TABS = [
  { id: 'profile',    label: 'Profile' },
  { id: 'academic',   label: 'Academic' },
  { id: 'health',     label: 'Health' },
  { id: 'documents',  label: 'Documents' },
  { id: 'ld',         label: 'LD Profile' },
];

export function StudentInformationPage() {
  const [students, setStudents] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [search, setSearch] = useState('');

  useEffect(() => {
    studentApi.list().then(d => setStudents(d || [])).catch(() => toast.error('Failed to load students')).finally(() => setLoadingList(false));
  }, []);

  const loadProfile = useCallback(async (id) => {
    setLoadingProfile(true);
    try {
      const data = await studentApi.get(id);
      setProfile(data);
    } catch { toast.error('Failed to load profile'); }
    finally { setLoadingProfile(false); }
  }, []);

  const filtered = students.filter(s =>
    [s.name, s.first_name, s.last_name, s.admission_no, s.class_name, s.section_name].some(v =>
      String(v || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const InfoRow = ({ label, value }) => (
    <div>
      <p className={labelCls}>{label}</p>
      <p className="text-sm text-gray-800 bg-gray-50 px-3 py-2 rounded-lg">{value || <span className="text-gray-400">—</span>}</p>
    </div>
  );

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <h2 className="text-xs font-bold text-gray-700 mb-2">Students</h2>
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? <div className="p-3 space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
          : filtered.map(s => (
            <button key={s.id} onClick={() => { setSelected(s); loadProfile(s.id); setActiveTab('profile'); }}
              className={`w-full text-left px-3 py-2.5 border-b border-gray-50 hover:bg-indigo-50 transition-colors ${selected?.id === s.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''}`}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                  {(s.name || s.first_name || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim()}</p>
                  <p className="text-xs text-gray-400">{s.class_name} {s.section_name || ''}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center bg-white border border-gray-100 rounded-xl shadow-sm">
            <div className="text-center text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <p className="text-sm font-medium">Select a student to view profile</p>
            </div>
          </div>
        ) : loadingProfile ? (
          <div className="flex-1 flex items-center justify-center bg-white border border-gray-100 rounded-xl shadow-sm">
            <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          </div>
        ) : (
          <div className="flex-1 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-blue-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-sm font-bold text-blue-700">
                {(profile?.name || profile?.first_name || 'S').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{profile?.name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}</p>
                <p className="text-xs text-gray-500">{profile?.class_name} {profile?.section_name} · Adm: {profile?.admission_no}</p>
              </div>
            </div>
            <div className="flex border-b border-gray-100 px-5">
              {STUDENT_TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`py-2.5 px-1 mr-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'profile' && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoRow label="Full Name"     value={profile?.name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()} />
                  <InfoRow label="Date of Birth" value={profile?.dob} />
                  <InfoRow label="Gender"        value={profile?.gender} />
                  <InfoRow label="Admission No." value={profile?.admission_no} />
                  <InfoRow label="Roll Number"   value={profile?.roll_no} />
                  <InfoRow label="Blood Group"   value={profile?.blood_group} />
                  <InfoRow label="Nationality"   value={profile?.nationality} />
                  <InfoRow label="Religion"      value={profile?.religion} />
                  <InfoRow label="Category"      value={profile?.category} />
                  <InfoRow label="Father's Name" value={profile?.father_name} />
                  <InfoRow label="Mother's Name" value={profile?.mother_name} />
                  <InfoRow label="Phone"         value={profile?.phone || profile?.parent_phone} />
                  <InfoRow label="Email"         value={profile?.email} />
                  <div className="col-span-2 lg:col-span-3"><InfoRow label="Address" value={profile?.address} /></div>
                </div>
              )}
              {activeTab === 'academic' && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoRow label="Current Class"      value={profile?.class_name} />
                  <InfoRow label="Section"            value={profile?.section_name} />
                  <InfoRow label="Academic Year"      value={profile?.academic_year} />
                  <InfoRow label="Previous School"    value={profile?.previous_school} />
                  <InfoRow label="Previous Class"     value={profile?.previous_class} />
                  <InfoRow label="Previous Board"     value={profile?.previous_board} />
                  <InfoRow label="Marks Obtained"     value={profile?.previous_marks} />
                  <InfoRow label="Admission Date"     value={profile?.admission_date} />
                  <InfoRow label="House / Group"      value={profile?.house} />
                </div>
              )}
              {activeTab === 'health' && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoRow label="Height (cm)"        value={profile?.height} />
                  <InfoRow label="Weight (kg)"        value={profile?.weight} />
                  <InfoRow label="Blood Group"        value={profile?.blood_group} />
                  <InfoRow label="Vision - Left Eye"  value={profile?.vision_left} />
                  <InfoRow label="Vision - Right Eye" value={profile?.vision_right} />
                  <InfoRow label="Blood Pressure"     value={profile?.blood_pressure} />
                  <div className="col-span-2 lg:col-span-3"><InfoRow label="Allergies"  value={profile?.allergies} /></div>
                  <div className="col-span-2 lg:col-span-3"><InfoRow label="Medical Conditions" value={profile?.medical_conditions} /></div>
                </div>
              )}
              {activeTab === 'documents' && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoRow label="Aadhaar Number"    value={profile?.aadhaar} />
                  <InfoRow label="Birth Certificate" value={profile?.birth_cert} />
                  <InfoRow label="TC Number"         value={profile?.tc_number} />
                  <InfoRow label="Migration Cert."   value={profile?.migration_cert} />
                  <InfoRow label="Caste Certificate" value={profile?.caste_cert} />
                </div>
              )}
              {activeTab === 'ld' && (
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Screening Status"  value={profile?.ld_screening_status} />
                  <InfoRow label="Identified Issues" value={profile?.ld_issues} />
                  <InfoRow label="Support Plan"      value={profile?.ld_support_plan} />
                  <InfoRow label="Therapist"         value={profile?.ld_therapist} />
                  <div className="col-span-2"><InfoRow label="Observations"  value={profile?.ld_observations} /></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 2. Class Section Change Page ────────────────────────────────────────────
export function ClassSectionChangePage() {
  const [classes, setClasses] = useState([]);
  const [newSections, setNewSections] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState({ new_class_id: '', new_section_id: '', reason: '', effective_date: today() });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { master.list('classes').then(d => setClasses(d || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (form.new_class_id) master.list(`sections?class_id=${form.new_class_id}`).then(d => setNewSections(d || [])).catch(() => {});
  }, [form.new_class_id]);

  const searchStudents = async () => {
    if (!studentSearch.trim()) return;
    setSearching(true);
    try {
      const data = await studentApi.list({ search: studentSearch });
      setSearchResults(data || []);
    } catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  const handleSubmit = async () => {
    if (!selectedStudent) { toast.error('Please select a student'); return; }
    if (!form.new_class_id) { toast.error('Please select new class'); return; }
    if (!form.reason.trim()) { toast.error('Reason is required'); return; }
    setSubmitting(true);
    try {
      await studentApi.changeSect({ student_id: selectedStudent.id, ...form });
      toast.success('Section change processed');
      setSelectedStudent(null); setSearchResults([]); setStudentSearch('');
      setForm({ new_class_id: '', new_section_id: '', reason: '', effective_date: today() });
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col h-full gap-5">
      <div><h1 className="text-xl font-bold text-gray-900">Class / Section Change</h1><p className="text-sm text-gray-500">Transfer a student to a different class or section</p></div>
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-4">
        <div>
          <label className={labelCls}>Search Student</label>
          <div className="flex gap-2">
            <input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchStudents()} className={inputCls} placeholder="Name or admission number" />
            <button onClick={searchStudents} disabled={searching} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60">Search</button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
              {searchResults.map(s => (
                <button key={s.id} onClick={() => { setSelectedStudent(s); setSearchResults([]); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-gray-100 last:border-0">
                  <span className="font-medium">{s.name || `${s.first_name} ${s.last_name}`}</span>
                  <span className="text-gray-400 ml-2 text-xs">({s.class_name} {s.section_name} · {s.admission_no})</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedStudent && (
          <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
            <div><p className="text-sm font-bold text-gray-800">{selectedStudent.name || `${selectedStudent.first_name} ${selectedStudent.last_name}`}</p>
              <p className="text-xs text-gray-500">Current: {selectedStudent.class_name} {selectedStudent.section_name} · {selectedStudent.admission_no}</p>
            </div>
            <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>New Class <span className="text-red-500">*</span></label>
            <select value={form.new_class_id} onChange={e => setForm(p => ({...p, new_class_id: e.target.value, new_section_id: ''}))} className={inputCls}>
              <option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>New Section</label>
            <select value={form.new_section_id} onChange={e => setForm(p => ({...p, new_section_id: e.target.value}))} className={inputCls}>
              <option value="">Select Section</option>{newSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Effective Date</label>
            <input type="date" value={form.effective_date} onChange={e => setForm(p => ({...p, effective_date: e.target.value}))} className={inputCls} />
          </div>
        </div>
        <div><label className={labelCls}>Reason <span className="text-red-500">*</span></label>
          <textarea rows={3} value={form.reason} onChange={e => setForm(p => ({...p, reason: e.target.value}))} className={inputCls} placeholder="Reason for section change..." />
        </div>
        <div className="flex justify-end">
          <button onClick={handleSubmit} disabled={submitting || !selectedStudent} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {submitting && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {submitting ? 'Processing...' : 'Process Change'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 3. Roll Number Allocation Page ──────────────────────────────────────────
export function RollNoAllocationPage() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [students, setStudents] = useState([]);
  const [rollNos, setRollNos] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { master.list('classes').then(d => setClasses(d || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (classId) master.list(`sections?class_id=${classId}`).then(d => setSections(d || [])).catch(() => {});
  }, [classId]);

  const loadStudents = async () => {
    if (!classId) { toast.error('Select class'); return; }
    setLoading(true);
    try {
      const data = await studentApi.list({ class_id: classId, section_id: sectionId || undefined });
      const list = data || [];
      setStudents(list);
      const init = {};
      list.forEach(s => { init[s.id] = s.roll_no || ''; });
      setRollNos(init);
      setLoaded(true);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const autoAssign = () => {
    const next = {};
    students.forEach((s, i) => { next[s.id] = String(i + 1); });
    setRollNos(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(students.map(s => studentApi.save({ id: s.id, roll_no: rollNos[s.id] })));
      toast.success('Roll numbers saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5"><h1 className="text-xl font-bold text-gray-900">Roll Number Allocation</h1><p className="text-sm text-gray-500">Assign roll numbers to students</p></div>
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 mb-4">
        <div className="grid grid-cols-3 gap-3 items-end">
          <div><label className={labelCls}>Class</label>
            <select value={classId} onChange={e => { setClassId(e.target.value); setLoaded(false); }} className={inputCls}>
              <option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Section</label>
            <select value={sectionId} onChange={e => { setSectionId(e.target.value); setLoaded(false); }} className={inputCls}>
              <option value="">All Sections</option>{sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button onClick={loadStudents} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60">
            {loading ? 'Loading...' : 'Load Students'}
          </button>
        </div>
      </div>
      {loaded && students.length > 0 && (
        <>
          <div className="flex gap-2 mb-3">
            <button onClick={autoAssign} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Auto Assign (Sequential)</button>
          </div>
          <div className="flex-1 overflow-auto bg-white border border-gray-100 rounded-xl shadow-sm">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">{['#','Adm. No.','Student Name','Current Roll No.','New Roll No.'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{i+1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{s.admission_no}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-800">{s.name || `${s.first_name} ${s.last_name}`}</td>
                    <td className="px-4 py-2.5 text-gray-500">{s.roll_no || '—'}</td>
                    <td className="px-4 py-2.5">
                      <input type="number" value={rollNos[s.id] || ''} onChange={e => setRollNos(prev => ({...prev, [s.id]: e.target.value}))}
                        className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 text-center" placeholder="0" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60">
              {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {saving ? 'Saving...' : 'Save All Roll Numbers'}
            </button>
          </div>
        </>
      )}
      {!loaded && !loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <p className="text-sm">Select class and click Load Students</p>
        </div>
      )}
    </div>
  );
}

// ─── 4. Student Promotion Page ────────────────────────────────────────────────
export function StudentPromotionPage() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { master.list('classes').then(d => setClasses(d || [])).catch(() => {}); }, []);

  const loadStudents = async () => {
    if (!classId) { toast.error('Select class'); return; }
    setLoading(true);
    try {
      const data = await studentApi.list({ class_id: classId });
      const list = data || [];
      setStudents(list);
      const init = {};
      list.forEach(s => { init[s.id] = s.result || 'pass'; });
      setResults(init);
      setLoaded(true);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const toggleAll = (val) => {
    const next = {};
    students.forEach(s => { next[s.id] = val; });
    setResults(next);
  };

  const handlePromote = async () => {
    if (!academicYear.trim()) { toast.error('Enter next academic year'); return; }
    setPromoting(true);
    try {
      await studentApi.promote({ class_id: classId, academic_year: academicYear, results });
      toast.success('Students promoted successfully');
    } catch (err) { toast.error(err.message || 'Promotion failed'); }
    finally { setPromoting(false); }
  };

  const passCount = Object.values(results).filter(v => v === 'pass').length;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5"><h1 className="text-xl font-bold text-gray-900">Student Promotion</h1><p className="text-sm text-gray-500">Promote students to the next academic year / class</p></div>
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 mb-4">
        <div className="grid grid-cols-3 gap-3 items-end">
          <div><label className={labelCls}>Current Class</label>
            <select value={classId} onChange={e => { setClassId(e.target.value); setLoaded(false); }} className={inputCls}>
              <option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Next Academic Year <span className="text-red-500">*</span></label>
            <input type="text" value={academicYear} onChange={e => setAcademicYear(e.target.value)} className={inputCls} placeholder="e.g. 2025-26" />
          </div>
          <button onClick={loadStudents} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60">
            {loading ? 'Loading...' : 'Load Students'}
          </button>
        </div>
      </div>
      {loaded && students.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs text-gray-500">{passCount} Pass / {students.length - passCount} Fail</span>
            <button onClick={() => toggleAll('pass')} className="px-2.5 py-1 text-xs bg-green-50 text-green-700 rounded border border-green-200">Mark All Pass</button>
            <button onClick={() => toggleAll('fail')} className="px-2.5 py-1 text-xs bg-red-50 text-red-600 rounded border border-red-200">Mark All Fail</button>
          </div>
          <div className="flex-1 overflow-auto bg-white border border-gray-100 rounded-xl shadow-sm">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">{['#','Adm. No.','Name','Current Class','Result'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id} className={`border-b hover:bg-gray-50 ${results[s.id] === 'fail' ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{i+1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{s.admission_no}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-800">{s.name || `${s.first_name} ${s.last_name}`}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{s.class_name} {s.section_name}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        {['pass','fail'].map(v => (
                          <button key={v} onClick={() => setResults(prev => ({...prev, [s.id]: v}))}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${results[s.id] === v
                              ? v === 'pass' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
                              : v === 'pass' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                            }`}>
                            {v.charAt(0).toUpperCase() + v.slice(1)}
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
            <button onClick={handlePromote} disabled={promoting} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60">
              {promoting && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {promoting ? 'Promoting...' : `Promote ${passCount} Students`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── 5. TC Request Page ───────────────────────────────────────────────────────
export function TCRequestPage() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState({ reason: '', last_attendance_date: today(), remarks: '' });
  const [submitting, setSubmitting] = useState(false);

  const searchStudents = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try { const data = await studentApi.list({ search }); setResults(data || []); }
    catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  const handleSubmit = async () => {
    if (!selected) { toast.error('Select student'); return; }
    if (!form.reason.trim()) { toast.error('Reason is required'); return; }
    setSubmitting(true);
    try {
      await studentApi.tcRequest({ student_id: selected.id, ...form });
      toast.success('TC request submitted');
      setSelected(null); setResults([]); setSearch('');
      setForm({ reason: '', last_attendance_date: today(), remarks: '' });
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col h-full gap-5">
      <div><h1 className="text-xl font-bold text-gray-900">TC Request</h1><p className="text-sm text-gray-500">Submit Transfer Certificate request for a student</p></div>
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-4 flex-1">
        <div>
          <label className={labelCls}>Search Student</label>
          <div className="flex gap-2">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchStudents()} className={inputCls} placeholder="Student name or admission no." />
            <button onClick={searchStudents} disabled={searching} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60">Search</button>
          </div>
          {results.length > 0 && !selected && (
            <div className="mt-2 border rounded-lg overflow-hidden max-h-36 overflow-y-auto">
              {results.map(s => (
                <button key={s.id} onClick={() => { setSelected(s); setResults([]); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b last:border-0">
                  <span className="font-medium">{s.name || `${s.first_name} ${s.last_name}`}</span>
                  <span className="text-gray-400 text-xs ml-2">({s.class_name} {s.section_name} · {s.admission_no})</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {selected && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-gray-800">{selected.name || `${selected.first_name} ${selected.last_name}`}</p>
              <p className="text-xs text-gray-500">{selected.class_name} {selected.section_name} · Adm: {selected.admission_no}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>TC Reason <span className="text-red-500">*</span></label>
            <input type="text" value={form.reason} onChange={e => setForm(p => ({...p, reason: e.target.value}))} className={inputCls} placeholder="Reason for TC (e.g. Parent relocation)" />
          </div>
          <div><label className={labelCls}>Last Date of Attendance</label>
            <input type="date" value={form.last_attendance_date} onChange={e => setForm(p => ({...p, last_attendance_date: e.target.value}))} className={inputCls} />
          </div>
        </div>
        <div><label className={labelCls}>Remarks</label>
          <textarea rows={3} value={form.remarks} onChange={e => setForm(p => ({...p, remarks: e.target.value}))} className={inputCls} placeholder="Additional remarks..." />
        </div>
        <div className="flex justify-end">
          <button onClick={handleSubmit} disabled={submitting || !selected} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60">
            {submitting && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {submitting ? 'Submitting...' : 'Submit TC Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 6. Student ID Card Page ──────────────────────────────────────────────────
export function StudentIdCardPage() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { master.list('classes').then(d => setClasses(d || [])).catch(() => {}); }, []);
  useEffect(() => {
    if (classId) master.list(`sections?class_id=${classId}`).then(d => setSections(d || [])).catch(() => {});
  }, [classId]);

  const loadStudents = async () => {
    if (!classId) { toast.error('Select class'); return; }
    setLoading(true);
    try {
      const data = await studentApi.list({ class_id: classId, section_id: sectionId || undefined });
      setStudents(data || []);
      setSelected(new Set());
      setLoaded(true);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const toggleStudent = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => prev.size === students.length ? new Set() : new Set(students.map(s => s.id)));

  const handleDownload = async () => {
    if (selected.size === 0) { toast.error('Select at least one student'); return; }
    setDownloading(true);
    try {
      await studentApi.idCard([...selected]);
      toast.success(`Generating ID cards for ${selected.size} students`);
    } catch (err) { toast.error(err.message || 'Download failed'); }
    finally { setDownloading(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5"><h1 className="text-xl font-bold text-gray-900">Student ID Card</h1><p className="text-sm text-gray-500">Select students and download ID cards</p></div>
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 mb-4">
        <div className="grid grid-cols-3 gap-3 items-end">
          <div><label className={labelCls}>Class</label>
            <select value={classId} onChange={e => { setClassId(e.target.value); setLoaded(false); }} className={inputCls}>
              <option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Section</label>
            <select value={sectionId} onChange={e => { setSectionId(e.target.value); setLoaded(false); }} className={inputCls}>
              <option value="">All Sections</option>{sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button onClick={loadStudents} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60">
            {loading ? 'Loading...' : 'Load Students'}
          </button>
        </div>
      </div>
      {loaded && students.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={toggleAll} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                {selected.size === students.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-xs text-gray-500">{selected.size} selected</span>
            </div>
            <button onClick={handleDownload} disabled={downloading || selected.size === 0} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-60">
              {downloading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {downloading ? 'Generating...' : `Download Selected (${selected.size})`}
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-white border border-gray-100 rounded-xl shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
              {students.map(s => (
                <div key={s.id} onClick={() => toggleStudent(s.id)}
                  className={`cursor-pointer border-2 rounded-xl p-3 transition-all ${selected.has(s.id) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" readOnly checked={selected.has(s.id)} className="rounded text-indigo-600" />
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                      {(s.name || s.first_name || 'S').charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mt-2 truncate">{s.name || `${s.first_name} ${s.last_name}`}</p>
                  <p className="text-xs text-gray-400">{s.class_name} {s.section_name}</p>
                  <p className="text-xs text-gray-400 font-mono">{s.admission_no}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
