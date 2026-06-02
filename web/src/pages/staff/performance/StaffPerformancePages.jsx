import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import GenericMasterPage from '../../../components/common/GenericMasterPage';
import { master, staffApi } from '../../../services/erp-api';

// ─── 1. Evaluation Criteria Page ──────────────────────────────────────────────
export function EvaluationCriteriaPage() {
  return (
    <GenericMasterPage config={{
      title: 'Evaluation Criteria',
      subtitle: 'Define performance evaluation criteria and their weights',
      addLabel: 'Add Criterion',
      columns: [
        { key: 'name',       label: 'Criterion Name' },
        { key: 'category',   label: 'Category' },
        { key: 'weightage',  label: 'Weightage (%)', render: v => `${v ?? 0}%` },
        { key: 'max_score',  label: 'Max Score' },
        { key: 'is_active',  label: 'Active', render: v => v ? '✓ Yes' : '✗ No' },
      ],
      fields: [
        { key: 'name',        label: 'Criterion Name',   required: true },
        { key: 'code',        label: 'Short Code',       required: true, hint: 'e.g. CLASS_MGMT, SUBJECT_KNOW' },
        { key: 'category',    label: 'Category',         type: 'select', options: ['Teaching Skills', 'Classroom Management', 'Student Engagement', 'Administrative', 'Punctuality', 'Professional Development', 'Communication'] },
        { key: 'description', label: 'Description',      type: 'textarea' },
        { key: 'weightage',   label: 'Weightage (%)',     type: 'number', placeholder: '10', hint: 'Total across all criteria should be 100%' },
        { key: 'max_score',   label: 'Maximum Score',     type: 'number', placeholder: '10' },
        { key: 'is_active',   label: 'Active',            type: 'toggle', default: true },
      ],
      fetchFn:  () => master.list('evaluation-criteria'),
      saveFn:   (d) => master.save('evaluation-criteria', d),
      deleteFn: (id) => master.remove('evaluation-criteria', id),
    }} />
  );
}

// ─── 2. Evaluation Master Page ────────────────────────────────────────────────
export function EvaluationMasterPage() {
  return (
    <GenericMasterPage config={{
      title: 'Evaluation Master',
      subtitle: 'Set up evaluation periods and types',
      addLabel: 'Add Evaluation Period',
      columns: [
        { key: 'name',          label: 'Evaluation Name' },
        { key: 'period',        label: 'Period' },
        { key: 'academic_year', label: 'Academic Year' },
        { key: 'from_date',     label: 'From Date' },
        { key: 'to_date',       label: 'To Date' },
        { key: 'status',        label: 'Status' },
      ],
      fields: [
        { key: 'name',          label: 'Evaluation Name',    required: true, placeholder: 'e.g. Mid-Year Review 2024' },
        { key: 'period',        label: 'Period',             type: 'select', options: ['Quarterly', 'Half-Yearly', 'Annual', 'Probation Review', 'Ad-hoc'] },
        { key: 'academic_year', label: 'Academic Year',      required: true, placeholder: 'e.g. 2024-25' },
        { key: 'from_date',     label: 'Evaluation From',    type: 'date', required: true },
        { key: 'to_date',       label: 'Evaluation To',      type: 'date', required: true },
        { key: 'reviewer_type', label: 'Reviewer',           type: 'select', options: ['HOD', 'Principal', 'Vice Principal', 'HR Manager'] },
        { key: 'status',        label: 'Status',             type: 'select', options: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'] },
        { key: 'remarks',       label: 'Remarks',            type: 'textarea' },
      ],
      fetchFn:  () => master.list('evaluation-master'),
      saveFn:   (d) => master.save('evaluation-master', d),
      deleteFn: (id) => master.remove('evaluation-master', id),
    }} />
  );
}

// ─── 3. Observation Master Page ───────────────────────────────────────────────
export function ObservationMasterPage() {
  return (
    <GenericMasterPage config={{
      title: 'Observation Master',
      subtitle: 'Create observation forms for classroom visits',
      addLabel: 'Add Observation Type',
      columns: [
        { key: 'name',        label: 'Observation Type' },
        { key: 'target',      label: 'Applies To' },
        { key: 'frequency',   label: 'Frequency' },
        { key: 'criteria_count', label: 'Criteria Count' },
        { key: 'is_active',   label: 'Active', render: v => v ? '✓ Yes' : '✗ No' },
      ],
      fields: [
        { key: 'name',        label: 'Observation Type Name',  required: true },
        { key: 'description', label: 'Description',            type: 'textarea' },
        { key: 'target',      label: 'Applies To',             type: 'select', options: ['Teaching Staff', 'Non-Teaching Staff', 'All Staff'] },
        { key: 'frequency',   label: 'Observation Frequency',  type: 'select', options: ['Monthly', 'Quarterly', 'Half-Yearly', 'Annually', 'As Needed'] },
        { key: 'duration_mins', label: 'Duration (minutes)',   type: 'number', placeholder: '45' },
        { key: 'is_active',   label: 'Active',                 type: 'toggle', default: true },
      ],
      fetchFn:  () => master.list('observation-master'),
      saveFn:   (d) => master.save('observation-master', d),
      deleteFn: (id) => master.remove('observation-master', id),
    }} />
  );
}

// ─── 4. Rating Master Page ────────────────────────────────────────────────────
export function RatingMasterPage() {
  return (
    <GenericMasterPage config={{
      title: 'Rating Scale Master',
      subtitle: 'Define rating scales used in performance evaluations',
      addLabel: 'Add Rating Scale',
      columns: [
        { key: 'name',        label: 'Scale Name' },
        { key: 'min_value',   label: 'Min' },
        { key: 'max_value',   label: 'Max' },
        { key: 'levels',      label: 'Levels' },
        { key: 'is_default',  label: 'Default', render: v => v ? '✓ Default' : '—' },
      ],
      fields: [
        { key: 'name',        label: 'Rating Scale Name',     required: true, placeholder: 'e.g. 5-Point Scale' },
        { key: 'description', label: 'Description',           type: 'textarea' },
        { key: 'min_value',   label: 'Minimum Value',         type: 'number', default: 1 },
        { key: 'max_value',   label: 'Maximum Value',         type: 'number', default: 5 },
        { key: 'levels',      label: 'Rating Labels',         type: 'textarea', placeholder: 'e.g. 1=Poor, 2=Below Average, 3=Average, 4=Good, 5=Excellent' },
        { key: 'is_default',  label: 'Set as Default',        type: 'toggle', default: false },
      ],
      fetchFn:  () => master.list('rating-master'),
      saveFn:   (d) => master.save('rating-master', d),
      deleteFn: (id) => master.remove('rating-master', id),
    }} />
  );
}

// ─── 5. Evaluation Entry Page ─────────────────────────────────────────────────
export function EvaluationEntryPage() {
  const [staffList, setStaffList] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [scores, setScores] = useState({});
  const [generalRemarks, setGeneralRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      staffApi.list().then(d => setStaffList(d || [])),
      master.list('evaluation-criteria').then(d => setCriteria(d || [])),
      master.list('evaluation-master').then(d => setPeriods(d || [])),
    ]).catch(() => {});
  }, []);

  const loadExisting = async (staffId, periodId) => {
    if (!staffId || !periodId) return;
    setLoading(true);
    try {
      const data = await staffApi.evaluation(staffId);
      const existing = (data || []).find(e => String(e.period_id) === String(periodId));
      if (existing?.scores) {
        const s = {};
        existing.scores.forEach(sc => { s[sc.criterion_id] = sc.score; });
        setScores(s);
        setGeneralRemarks(existing.general_remarks || '');
      } else {
        const empty = {};
        criteria.forEach(c => { empty[c.id] = ''; });
        setScores(empty);
        setGeneralRemarks('');
      }
    } catch {
      const empty = {};
      criteria.forEach(c => { empty[c.id] = ''; });
      setScores(empty);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffChange = (e) => {
    setSelectedStaff(e.target.value);
    loadExisting(e.target.value, selectedPeriod);
  };

  const handlePeriodChange = (e) => {
    setSelectedPeriod(e.target.value);
    loadExisting(selectedStaff, e.target.value);
  };

  const setScore = (criterionId, value) => {
    const criterion = criteria.find(c => String(c.id) === String(criterionId));
    const max = criterion?.max_score || 10;
    const num = Math.min(Math.max(0, parseFloat(value) || 0), max);
    setScores(prev => ({ ...prev, [criterionId]: num }));
  };

  const totalScore = criteria.reduce((acc, c) => acc + (parseFloat(scores[c.id]) || 0), 0);
  const maxTotal = criteria.reduce((acc, c) => acc + (c.max_score || 10), 0);
  const percentage = maxTotal > 0 ? ((totalScore / maxTotal) * 100).toFixed(1) : 0;

  const handleSubmit = async () => {
    if (!selectedStaff) { toast.error('Please select a staff member'); return; }
    if (!selectedPeriod) { toast.error('Please select evaluation period'); return; }
    setSaving(true);
    try {
      await staffApi.saveEvaluation({
        staff_id: selectedStaff,
        period_id: selectedPeriod,
        general_remarks: generalRemarks,
        scores: criteria.map(c => ({ criterion_id: c.id, score: parseFloat(scores[c.id]) || 0 })),
        total_score: totalScore,
        percentage: parseFloat(percentage),
      });
      toast.success('Evaluation saved successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to save evaluation');
    } finally {
      setSaving(false);
    }
  };

  const selectCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white';

  return (
    <div className="flex flex-col h-full">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Evaluation Entry</h1>
        <p className="text-sm text-gray-500 mt-0.5">Enter performance evaluation scores for staff members</p>
      </div>

      {/* Selector */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Staff Member <span className="text-red-500">*</span></label>
            <select value={selectedStaff} onChange={handleStaffChange} className={selectCls}>
              <option value="">Select Staff Member</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim()} ({s.employee_code || s.designation || ''})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Evaluation Period <span className="text-red-500">*</span></label>
            <select value={selectedPeriod} onChange={handlePeriodChange} className={selectCls}>
              <option value="">Select Period</option>
              {periods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.academic_year})</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Score Summary */}
      {selectedStaff && selectedPeriod && criteria.length > 0 && (
        <div className="flex items-center gap-4 mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-indigo-700 font-semibold">Overall Score</span>
              <span className="text-indigo-700 font-bold">{totalScore} / {maxTotal} ({percentage}%)</span>
            </div>
            <div className="w-full bg-indigo-200 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${percentage}%` }} />
            </div>
          </div>
          <div className={`text-lg font-bold px-3 py-1 rounded-lg ${
            percentage >= 80 ? 'text-green-700 bg-green-100' :
            percentage >= 60 ? 'text-yellow-700 bg-yellow-100' :
            'text-red-700 bg-red-100'
          }`}>
            {percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : percentage >= 40 ? 'Average' : 'Needs Improvement'}
          </div>
        </div>
      )}

      {/* Criteria Grid */}
      {selectedStaff && selectedPeriod && (
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : criteria.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <p className="text-sm">No evaluation criteria configured. Please set up criteria first.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-10">#</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Criterion</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Weightage</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Max Score</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-36">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((c, idx) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-gray-800">{c.name}</div>
                        {c.description && <div className="text-xs text-gray-400 mt-0.5">{c.description}</div>}
                      </td>
                      <td className="px-5 py-3 text-gray-600 text-xs">{c.category || '—'}</td>
                      <td className="px-5 py-3 text-xs font-semibold text-indigo-700">{c.weightage || 0}%</td>
                      <td className="px-5 py-3 text-gray-600">{c.max_score || 10}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={c.max_score || 10}
                            step={0.5}
                            value={scores[c.id] ?? ''}
                            onChange={e => setScore(c.id, e.target.value)}
                            className="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 text-center"
                            placeholder="0"
                          />
                          <span className="text-xs text-gray-400">/ {c.max_score || 10}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-5 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-600 mb-1">General Remarks / Comments</label>
                <textarea
                  rows={3}
                  value={generalRemarks}
                  onChange={e => setGeneralRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  placeholder="Overall observations, areas of improvement, strengths..."
                />
              </div>
            </div>
          )}

          {criteria.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                {saving ? 'Saving...' : 'Submit Evaluation'}
              </button>
            </div>
          )}
        </div>
      )}

      {(!selectedStaff || !selectedPeriod) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <p className="text-sm font-medium">Select a staff member and evaluation period to begin</p>
          </div>
        </div>
      )}
    </div>
  );
}
