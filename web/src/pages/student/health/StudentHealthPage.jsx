import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { studentApi } from '../../../services/erp-api';

const today = () => new Date().toISOString().split('T')[0];
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const HISTORY_COLS = ['Date', 'Height (cm)', 'Weight (kg)', 'BMI', 'Vision L', 'Vision R', 'BP', 'Recorded By'];

const calcBMI = (height, weight) => {
  const h = parseFloat(height);
  const w = parseFloat(weight);
  if (!h || !w || h <= 0) return '';
  const bmi = (w / ((h / 100) ** 2)).toFixed(1);
  return bmi;
};

const bmiBadge = (bmi) => {
  const val = parseFloat(bmi);
  if (!val) return null;
  if (val < 18.5) return { label: 'Underweight', color: 'text-blue-700 bg-blue-50 border border-blue-200' };
  if (val < 25)   return { label: 'Normal',       color: 'text-green-700 bg-green-50 border border-green-200' };
  if (val < 30)   return { label: 'Overweight',   color: 'text-yellow-700 bg-yellow-50 border border-yellow-200' };
  return { label: 'Obese', color: 'text-red-700 bg-red-50 border border-red-200' };
};

export default function StudentHealthPage() {
  const [activeView, setActiveView] = useState('form'); // 'form' | 'history'
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [healthHistory, setHealthHistory] = useState([]);

  const [form, setForm] = useState({
    height: '',
    weight: '',
    vision_left: '',
    vision_right: '',
    blood_group: '',
    blood_pressure: '',
    allergies: '',
    medical_conditions: '',
    checkup_date: today(),
    doctor_notes: '',
    doctor_name: '',
  });

  const bmi = calcBMI(form.height, form.weight);
  const bmiInfo = bmiBadge(bmi);

  const searchStudents = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const data = await studentApi.list({ search });
      setSearchResults(data || []);
    } catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setSearch('');
    setActiveView('form');

    // Load existing health record
    try {
      const data = await studentApi.healthRecord(student.id);
      if (data) {
        setForm({
          height: data.height || '',
          weight: data.weight || '',
          vision_left: data.vision_left || '',
          vision_right: data.vision_right || '',
          blood_group: data.blood_group || student.blood_group || '',
          blood_pressure: data.blood_pressure || '',
          allergies: data.allergies || '',
          medical_conditions: data.medical_conditions || '',
          checkup_date: data.checkup_date || today(),
          doctor_notes: data.doctor_notes || '',
          doctor_name: data.doctor_name || '',
        });
      } else {
        setForm(prev => ({ ...prev, blood_group: student.blood_group || '' }));
      }
    } catch {
      // No existing record, that's fine
    }
  };

  const loadHistory = useCallback(async () => {
    if (!selectedStudent) return;
    setLoadingHistory(true);
    try {
      const data = await studentApi.healthRecord(selectedStudent.id + '/history');
      setHealthHistory(data || []);
    } catch {
      setHealthHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedStudent]);

  useEffect(() => {
    if (activeView === 'history' && selectedStudent) {
      loadHistory();
    }
  }, [activeView, loadHistory, selectedStudent]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!selectedStudent) { toast.error('Select a student'); return; }
    if (!form.checkup_date) { toast.error('Checkup date is required'); return; }
    setSaving(true);
    try {
      await studentApi.saveHealth(selectedStudent.id, { ...form, bmi });
      toast.success('Health record saved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save health record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Student Health Evaluation</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record and track student health metrics</p>
        </div>
      </div>

      {/* Student Search */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 mb-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className={labelCls}>Search Student</label>
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchStudents()}
              className={inputCls} placeholder="Enter student name or admission number"
            />
          </div>
          <button onClick={searchStudents} disabled={searching} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 whitespace-nowrap">
            {searching ? 'Searching...' : 'Search Student'}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
            {searchResults.map(s => (
              <button key={s.id} onClick={() => selectStudent(s)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 border-b border-gray-100 last:border-0 transition-colors">
                <span className="font-medium text-gray-800">{s.name || `${s.first_name} ${s.last_name}`}</span>
                <span className="text-gray-400 ml-2 text-xs">
                  {s.class_name} {s.section_name} · Adm: {s.admission_no}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {!selectedStudent ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p className="text-sm font-medium">Search and select a student to view or enter health data</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Student Badge */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-sm font-bold text-blue-700">
                {(selectedStudent.name || selectedStudent.first_name || 'S').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{selectedStudent.name || `${selectedStudent.first_name} ${selectedStudent.last_name}`}</p>
                <p className="text-xs text-gray-500">{selectedStudent.class_name} {selectedStudent.section_name} · Adm: {selectedStudent.admission_no} · DOB: {selectedStudent.dob || '—'}</p>
              </div>
            </div>
            <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4 w-fit">
            <button onClick={() => setActiveView('form')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeView === 'form' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              Health Form
            </button>
            <button onClick={() => setActiveView('history')} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeView === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              History
            </button>
          </div>

          {activeView === 'form' && (
            <div className="flex-1 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-sm p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Physical Measurements */}
                <div>
                  <label className={labelCls}>Height (cm)</label>
                  <input type="number" value={form.height} onChange={e => set('height', e.target.value)} className={inputCls} placeholder="e.g. 155" min={0} max={250} />
                </div>
                <div>
                  <label className={labelCls}>Weight (kg)</label>
                  <input type="number" value={form.weight} onChange={e => set('weight', e.target.value)} className={inputCls} placeholder="e.g. 45" min={0} max={200} />
                </div>
                <div>
                  <label className={labelCls}>BMI (auto-calculated)</label>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 px-3 py-2 text-sm rounded-lg font-semibold ${bmi ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-400'}`}>
                      {bmi || '—'}
                    </div>
                    {bmiInfo && (
                      <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${bmiInfo.color}`}>{bmiInfo.label}</span>
                    )}
                  </div>
                </div>

                {/* Vision */}
                <div>
                  <label className={labelCls}>Vision — Left Eye</label>
                  <input type="text" value={form.vision_left} onChange={e => set('vision_left', e.target.value)} className={inputCls} placeholder="e.g. 6/6 or 20/20" />
                </div>
                <div>
                  <label className={labelCls}>Vision — Right Eye</label>
                  <input type="text" value={form.vision_right} onChange={e => set('vision_right', e.target.value)} className={inputCls} placeholder="e.g. 6/6 or 20/20" />
                </div>

                {/* Blood */}
                <div>
                  <label className={labelCls}>Blood Group</label>
                  <select value={form.blood_group} onChange={e => set('blood_group', e.target.value)} className={inputCls}>
                    <option value="">Select Blood Group</option>
                    {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Blood Pressure</label>
                  <input type="text" value={form.blood_pressure} onChange={e => set('blood_pressure', e.target.value)} className={inputCls} placeholder="e.g. 120/80 mmHg" />
                </div>

                {/* Date & Doctor */}
                <div>
                  <label className={labelCls}>Last Checkup Date <span className="text-red-500">*</span></label>
                  <input type="date" value={form.checkup_date} onChange={e => set('checkup_date', e.target.value)} max={today()} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Doctor Name</label>
                  <input type="text" value={form.doctor_name} onChange={e => set('doctor_name', e.target.value)} className={inputCls} placeholder="Examining doctor's name" />
                </div>

                {/* Text areas */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className={labelCls}>Allergies</label>
                  <textarea rows={2} value={form.allergies} onChange={e => set('allergies', e.target.value)} className={inputCls} placeholder="Food, medication, environmental allergies..." />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className={labelCls}>Medical Conditions</label>
                  <textarea rows={3} value={form.medical_conditions} onChange={e => set('medical_conditions', e.target.value)} className={inputCls} placeholder="Chronic conditions, disabilities, ongoing treatments..." />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className={labelCls}>Doctor's Notes</label>
                  <textarea rows={3} value={form.doctor_notes} onChange={e => set('doctor_notes', e.target.value)} className={inputCls} placeholder="Doctor's observations and recommendations..." />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
                >
                  {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {saving ? 'Saving...' : 'Save Health Record'}
                </button>
              </div>
            </div>
          )}

          {activeView === 'history' && (
            <div className="flex-1 overflow-auto bg-white border border-gray-100 rounded-xl shadow-sm">
              {loadingHistory ? (
                <div className="flex items-center justify-center h-40">
                  <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              ) : healthHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm">No health records found for this student</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {HISTORY_COLS.map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {healthHistory.map((record, i) => {
                      const recBmi = calcBMI(record.height, record.weight);
                      const recBmiInfo = bmiBadge(recBmi);
                      return (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{record.checkup_date}</td>
                          <td className="px-4 py-3 text-gray-600">{record.height || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{record.weight || '—'}</td>
                          <td className="px-4 py-3">
                            {recBmi ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-gray-700">{recBmi}</span>
                                {recBmiInfo && <span className={`text-xs px-1.5 py-0.5 rounded ${recBmiInfo.color}`}>{recBmiInfo.label}</span>}
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{record.vision_left || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{record.vision_right || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{record.blood_pressure || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{record.recorded_by || record.doctor_name || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
