import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { frontOfficeApi, master } from '../../services/erp-api';

export default function SectionAllocationPage() {
  const [applicants, setApplicants] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // applicant object
  const [selectedSection, setSelectedSection] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const loadApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await frontOfficeApi.getApplications({ status: 'approved', unallocated: true, class: classFilter });
      setApplicants(data || []);
    } catch {
      toast.error('Failed to load applicants');
    } finally {
      setLoading(false);
    }
  }, [classFilter]);

  useEffect(() => { loadApplicants(); }, [loadApplicants]);

  const openAllocate = async (applicant) => {
    setModal(applicant);
    setSelectedSection('');
    try {
      const data = await master.list(`sections?class=${encodeURIComponent(applicant.class_applying || applicant.class_name || '')}`);
      setSections(data || []);
    } catch {
      setSections([]);
    }
  };

  const closeModal = () => { setModal(null); setSelectedSection(''); setSections([]); };

  const handleAllocate = async () => {
    if (!selectedSection) { toast.error('Please select a section'); return; }
    setAllocating(true);
    try {
      await frontOfficeApi.allocateSection({ application_id: modal.id, section_id: selectedSection });
      toast.success(`Section allocated for ${modal.applicant_name || modal.name}`);
      closeModal();
      loadApplicants();
    } catch (err) {
      toast.error(err.message || 'Allocation failed');
    } finally {
      setAllocating(false);
    }
  };

  const filtered = applicants.filter(a =>
    [a.applicant_name, a.name, a.class_applying, a.class_name, a.category].some(v =>
      String(v || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const categoryBadge = (cat) => {
    const colors = { General: 'bg-gray-100 text-gray-600', OBC: 'bg-blue-50 text-blue-600', SC: 'bg-purple-50 text-purple-600', ST: 'bg-orange-50 text-orange-600', EWS: 'bg-yellow-50 text-yellow-600' };
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[cat] || 'bg-gray-100 text-gray-600'}`}>{cat || 'General'}</span>;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Section Allocation</h1>
          <p className="text-sm text-gray-500 mt-0.5">Allocate sections to approved admission applicants</p>
        </div>
        <button onClick={loadApplicants} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" placeholder="Search applicants..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
        </div>
        <input
          type="text" placeholder="Filter by class..."
          value={classFilter} onChange={e => setClassFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 w-40"
        />
      </div>

      <p className="text-xs text-gray-500 mb-3">{filtered.length} applicants pending allocation</p>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white border border-gray-100 rounded-xl shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <svg className="w-10 h-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No pending section allocations</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['#', 'Applicant Name', 'Class Applied', 'Category', 'Application Date', 'Parent / Phone', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app, i) => (
                <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{app.applicant_name || app.name}</div>
                    {app.dob && <div className="text-xs text-gray-400">DOB: {app.dob}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-lg">
                      {app.class_applying || app.class_name || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{categoryBadge(app.category)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700 text-xs">{app.parent_name || app.father_name || '—'}</div>
                    <div className="text-gray-400 text-xs">{app.phone || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openAllocate(app)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Allocate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Allocation Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-indigo-50">
              <h2 className="text-base font-bold text-gray-900">Allocate Section</h2>
              <p className="text-xs text-gray-500 mt-0.5">Assign a section to the applicant</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Applicant Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Applicant</span>
                  <span className="text-sm font-semibold text-gray-800">{modal.applicant_name || modal.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Class Applying</span>
                  <span className="text-sm font-semibold text-indigo-700">{modal.class_applying || modal.class_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Category</span>
                  <span className="text-sm font-medium text-gray-700">{modal.category || 'General'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Select Section <span className="text-red-500">*</span></label>
                <select
                  value={selectedSection}
                  onChange={e => setSelectedSection(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                >
                  <option value="">Select a section...</option>
                  {sections.length > 0
                    ? sections.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.available_seats != null ? `(${s.available_seats} seats available)` : ''}
                        </option>
                      ))
                    : <option disabled>No sections available</option>
                  }
                </select>
                {sections.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">No sections configured for this class. Please set up sections first.</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleAllocate}
                disabled={allocating || !selectedSection}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {allocating && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {allocating ? 'Allocating...' : 'Confirm Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
