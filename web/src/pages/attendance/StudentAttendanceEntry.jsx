import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { attendanceApi, master } from '../../services/erp-api';

const today = () => new Date().toISOString().split('T')[0];

export default function StudentAttendanceEntry() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    master.list('classes').then(data => setClasses(data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (classId) {
      master.list(`sections?class_id=${classId}`).then(data => setSections(data || [])).catch(() => {});
      setStudents([]);
      setAttendance({});
      setLoaded(false);
    }
  }, [classId]);

  const loadStudents = async () => {
    if (!classId) { toast.error('Please select a class'); return; }
    if (!date) { toast.error('Please select a date'); return; }
    setLoading(true);
    try {
      const params = sectionId ? `${classId}&section_id=${sectionId}` : classId;
      const data = await attendanceApi.getStudents(params, date);
      const list = data || [];
      setStudents(list);
      const init = {};
      list.forEach(s => { init[s.id] = s.status || 'P'; });
      setAttendance(init);
      setLoaded(true);
      toast.success(`Loaded ${list.length} students`);
    } catch (err) {
      toast.error(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (id, status) => {
    setAttendance(prev => ({ ...prev, [id]: status }));
  };

  const markAll = (status) => {
    const next = {};
    students.forEach(s => { next[s.id] = status; });
    setAttendance(next);
  };

  const counts = students.reduce(
    (acc, s) => {
      const st = attendance[s.id] || 'P';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    { P: 0, A: 0, L: 0 }
  );

  const handleSave = async () => {
    if (!loaded || students.length === 0) { toast.error('Load students first'); return; }
    setSaving(true);
    try {
      const records = students.map(s => ({
        student_id: s.id,
        class_id: classId,
        section_id: sectionId || null,
        date,
        status: attendance[s.id] || 'P',
      }));
      await attendanceApi.markStudents({ date, class_id: classId, section_id: sectionId || null, records });
      toast.success('Attendance saved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const statusConfig = {
    P: { label: 'Present', bg: 'bg-green-100 text-green-700 border-green-300', active: 'bg-green-500 text-white border-green-500' },
    A: { label: 'Absent',  bg: 'bg-red-100 text-red-700 border-red-300',     active: 'bg-red-500 text-white border-red-500' },
    L: { label: 'Late',    bg: 'bg-yellow-100 text-yellow-700 border-yellow-300', active: 'bg-yellow-500 text-white border-yellow-500' },
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Student Attendance Entry</h1>
        <p className="text-sm text-gray-500 mt-0.5">Mark daily attendance for students</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Class <span className="text-red-500">*</span></label>
            <select
              value={classId}
              onChange={e => { setClassId(e.target.value); setLoaded(false); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Section</label>
            <select
              value={sectionId}
              onChange={e => { setSectionId(e.target.value); setLoaded(false); }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option value="">All Sections</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setLoaded(false); }}
              max={today()}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
          </div>
          <button
            onClick={loadStudents}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {loading ? 'Loading...' : 'Load Students'}
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      {loaded && students.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total',   value: students.length, color: 'bg-gray-50 border-gray-200 text-gray-700' },
            { label: 'Present', value: counts.P || 0,   color: 'bg-green-50 border-green-200 text-green-700' },
            { label: 'Absent',  value: counts.A || 0,   color: 'bg-red-50 border-red-200 text-red-700' },
            { label: 'Late',    value: counts.L || 0,   color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          ].map(stat => (
            <div key={stat.label} className={`border rounded-xl p-3 text-center ${stat.color}`}>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs font-semibold mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Actions */}
      {loaded && students.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-gray-500 mr-1">Mark All:</span>
          {['P', 'A', 'L'].map(s => (
            <button
              key={s}
              onClick={() => markAll(s)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${statusConfig[s].bg} hover:opacity-80`}
            >
              {statusConfig[s].label}
            </button>
          ))}
        </div>
      )}

      {/* Student List */}
      {loaded && students.length > 0 && (
        <div className="flex-1 overflow-auto bg-white border border-gray-100 rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Roll No.</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{student.roll_no || student.admission_no || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim()}</div>
                    {student.section_name && <div className="text-xs text-gray-400">{student.section_name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {(['P', 'A', 'L']).map(status => {
                        const isActive = attendance[student.id] === status;
                        const cfg = statusConfig[status];
                        return (
                          <button
                            key={status}
                            onClick={() => setStatus(student.id, status)}
                            className={`w-9 h-9 text-xs font-bold rounded-lg border transition-all ${isActive ? cfg.active : cfg.bg} hover:opacity-90 active:scale-95`}
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loaded && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm font-medium">Select class and date, then click Load Students</p>
          </div>
        </div>
      )}

      {loaded && students.length === 0 && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">No students found for the selected class/section.</p>
        </div>
      )}

      {/* Save Button */}
      {loaded && students.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      )}
    </div>
  );
}
