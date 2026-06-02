import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { staffApi, master } from '../../../services/erp-api';

export default function SubjectAllocationPage() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [allocations, setAllocations] = useState({}); // subjectId -> staffId
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      master.list('classes').then(d => setClasses(d || [])),
      staffApi.list({ staff_type: 'Teaching' }).then(d => setStaffList(d || [])),
    ]).catch(() => {});
  }, []);

  useEffect(() => {
    if (classId) {
      master.list(`sections?class_id=${classId}`).then(d => setSections(d || [])).catch(() => {});
      setSubjects([]);
      setAllocations({});
      setLoaded(false);
    }
  }, [classId]);

  const loadSubjects = useCallback(async () => {
    if (!classId) { toast.error('Please select a class'); return; }
    setLoading(true);
    try {
      const [subjData, allocData] = await Promise.all([
        master.list(`subjects?class_id=${classId}`),
        staffApi.subjectAlloc(),
      ]);
      const subjs = subjData || [];
      setSubjects(subjs);

      // Build initial allocations from existing data
      const initAlloc = {};
      subjs.forEach(s => { initAlloc[s.id] = ''; });
      const existing = allocData || [];
      existing.forEach(alloc => {
        if (String(alloc.class_id) === String(classId) && (!sectionId || String(alloc.section_id) === String(sectionId))) {
          initAlloc[alloc.subject_id] = String(alloc.staff_id || '');
        }
      });
      setAllocations(initAlloc);
      setLoaded(true);
    } catch (err) {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, [classId, sectionId]);

  const handleSave = async () => {
    if (!loaded) { toast.error('Load subjects first'); return; }
    setSaving(true);
    try {
      const records = subjects.map(s => ({
        class_id: classId,
        section_id: sectionId || null,
        subject_id: s.id,
        staff_id: allocations[s.id] || null,
      })).filter(r => r.staff_id); // only save non-empty allocations
      await staffApi.saveSubjectAlloc({ class_id: classId, section_id: sectionId || null, allocations: records });
      toast.success('Subject allocations saved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const setAllocation = (subjectId, staffId) => {
    setAllocations(prev => ({ ...prev, [subjectId]: staffId }));
  };

  const allocatedCount = Object.values(allocations).filter(v => v).length;

  const selectCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Subject Allocation</h1>
        <p className="text-sm text-gray-500 mt-0.5">Assign teachers to subjects for each class and section</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Class <span className="text-red-500">*</span></label>
            <select value={classId} onChange={e => { setClassId(e.target.value); setLoaded(false); }} className={selectCls}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Section</label>
            <select value={sectionId} onChange={e => { setSectionId(e.target.value); setLoaded(false); }} className={selectCls}>
              <option value="">All Sections</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button
            onClick={loadSubjects}
            disabled={loading || !classId}
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
            {loading ? 'Loading...' : 'Load Subjects'}
          </button>
        </div>
      </div>

      {/* Summary */}
      {loaded && subjects.length > 0 && (
        <div className="flex items-center gap-4 mb-4">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-indigo-700">{allocatedCount}</span> of <span className="font-semibold">{subjects.length}</span> subjects assigned
          </div>
          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all"
              style={{ width: subjects.length > 0 ? `${(allocatedCount / subjects.length) * 100}%` : '0%' }}
            />
          </div>
          <button
            onClick={() => {
              const next = {};
              subjects.forEach(s => { next[s.id] = ''; });
              setAllocations(next);
            }}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Subjects Table */}
      {loaded && subjects.length > 0 && (
        <div className="flex-1 overflow-auto bg-white border border-gray-100 rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-10">#</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Subject Code</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-80">Assigned Teacher</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, idx) => (
                <tr key={subject.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-800">{subject.name}</div>
                    {subject.medium && <div className="text-xs text-gray-400">{subject.medium}</div>}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{subject.code || '—'}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${subject.type === 'Elective' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                      {subject.type || 'Core'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={allocations[subject.id] || ''}
                      onChange={e => setAllocation(subject.id, e.target.value)}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white transition-colors ${
                        allocations[subject.id] ? 'border-green-300 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <option value="">— Not Assigned —</option>
                      {staffList.map(staff => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim()}
                          {staff.designation ? ` (${staff.designation})` : ''}
                        </option>
                      ))}
                    </select>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-sm font-medium">Select a class and click Load Subjects</p>
          </div>
        </div>
      )}

      {loaded && subjects.length === 0 && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">No subjects configured for the selected class.</p>
        </div>
      )}

      {/* Save */}
      {loaded && subjects.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
            {saving ? 'Saving...' : 'Save Allocations'}
          </button>
        </div>
      )}
    </div>
  );
}
