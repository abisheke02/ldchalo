import React, { useState, useCallback, useMemo, useEffect } from 'react';
import api from '../../../services/api';

const PRIMARY = '#0891B2';
const DARK = '#0e3a5c';

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '₹0';
  return '₹' + Number(val).toLocaleString('en-IN');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function OutstandingReportPage() {
  const [filters, setFilters] = useState({
    class_id: '',
    section_id: '',
    fee_head_id: '',
    min_balance: '',
  });
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [feeHeads, setFeeHeads] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generated, setGenerated] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'balance', direction: 'desc' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderSent, setReminderSent] = useState({});

  // Fetch filter options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const classRes = await api.get('/schools/classes');
        setClasses(classRes.data?.data || classRes.data || []);
      } catch (err) {
        console.error('Failed to load classes', err);
      }
      try {
        const feeHeadRes = await api.get('/school/fee-heads');
        setFeeHeads(feeHeadRes.data?.data || feeHeadRes.data || []);
      } catch (err) {
        console.error('Failed to load fee heads', err);
      }
    };
    fetchOptions();
  }, []);

  // Fetch sections when class changes
  useEffect(() => {
    if (filters.class_id) {
      const fetchSections = async () => {
        try {
          const res = await api.get(`/schools/classes/${filters.class_id}/sections`);
          setSections(res.data?.data || res.data || []);
        } catch (err) {
          setSections([]);
        }
      };
      fetchSections();
    } else {
      setSections([]);
      setFilters((prev) => ({ ...prev, section_id: '' }));
    }
  }, [filters.class_id]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGenerated(false);
    try {
      const params = {};
      if (filters.class_id) params.class_id = filters.class_id;
      if (filters.section_id) params.section_id = filters.section_id;
      if (filters.fee_head_id) params.fee_head_id = filters.fee_head_id;
      if (filters.min_balance) params.min_balance = filters.min_balance;

      const res = await api.get('/school/fees/outstanding', { params });
      const resultData = res.data?.data || res.data || [];
      setData(Array.isArray(resultData) ? resultData : []);
      setGenerated(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch outstanding data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Summary calculations
  const summary = useMemo(() => {
    const totalStudents = data.length;
    const totalOutstanding = data.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);
    const avgBalance = totalStudents > 0 ? totalOutstanding / totalStudents : 0;
    const above10k = data.filter((s) => (Number(s.balance) || 0) > 10000).length;
    return { totalStudents, totalOutstanding, avgBalance, above10k };
  }, [data]);

  // Sorting
  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal || '');
      const bStr = String(bVal || '');
      return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return sorted;
  }, [data, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Totals
  const totalsRow = useMemo(() => {
    return data.reduce(
      (acc, s) => ({
        total_fee: acc.total_fee + (Number(s.total_fee || s.total_due) || 0),
        paid: acc.paid + (Number(s.paid || s.total_paid) || 0),
        balance: acc.balance + (Number(s.balance) || 0),
      }),
      { total_fee: 0, paid: 0, balance: 0 }
    );
  }, [data]);

  // Send individual reminder
  const sendReminder = async (student) => {
    try {
      setReminderSent((prev) => ({ ...prev, [student.student_id || student.id]: 'sending' }));
      await api.post('/school/communication-extended/send-bulk', {
        template: 'fee_due',
        recipients: [{ phone: student.phone, student_id: student.student_id || student.id, name: student.name || student.student_name }],
      });
      setReminderSent((prev) => ({ ...prev, [student.student_id || student.id]: 'sent' }));
    } catch (err) {
      setReminderSent((prev) => ({ ...prev, [student.student_id || student.id]: 'failed' }));
    }
  };

  // Send bulk reminders
  const sendBulkReminders = async () => {
    setSendingReminder(true);
    try {
      const recipients = sortedData.map((s) => ({
        phone: s.phone,
        student_id: s.student_id || s.id,
        name: s.name || s.student_name,
      }));
      await api.post('/school/communication-extended/send-bulk', {
        template: 'fee_due',
        recipients,
      });
      const sentMap = {};
      sortedData.forEach((s) => { sentMap[s.student_id || s.id] = 'sent'; });
      setReminderSent(sentMap);
    } catch (err) {
      setError('Failed to send bulk reminders. Please try again.');
    } finally {
      setSendingReminder(false);
      setShowConfirmModal(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['Sl No', 'Admission No', 'Student Name', 'Father Name', 'Class/Section', 'Total Fee', 'Paid', 'Balance', 'Last Payment Date'];
    const rows = sortedData.map((s, idx) => [
      idx + 1,
      s.admission_no || s.admission_number || '',
      s.name || s.student_name || '',
      s.father_name || '',
      s.class_section || `${s.class_name || ''}/${s.section_name || ''}`,
      Number(s.total_fee || s.total_due) || 0,
      Number(s.paid || s.total_paid) || 0,
      Number(s.balance) || 0,
      s.last_payment_date || '',
    ]);
    rows.push(['', '', '', '', 'TOTAL', totalsRow.total_fee, totalsRow.paid, totalsRow.balance, '']);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `outstanding_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    window.print();
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto print:p-2">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: DARK }}>Outstanding Fee Report</h1>
        <p className="text-gray-500 text-sm mt-1">View students with pending fee balances and send payment reminders</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
            <select
              value={filters.class_id}
              onChange={(e) => handleFilterChange('class_id', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name || cls.class_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
            <select
              value={filters.section_id}
              onChange={(e) => handleFilterChange('section_id', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
              disabled={!filters.class_id}
            >
              <option value="">All Sections</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>{sec.name || sec.section_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fee Head</label>
            <select
              value={filters.fee_head_id}
              onChange={(e) => handleFilterChange('fee_head_id', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
            >
              <option value="">All Fee Heads</option>
              {feeHeads.map((fh) => (
                <option key={fh.id} value={fh.id}>{fh.name || fh.fee_head_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Min Balance (₹)</label>
            <input
              type="number"
              value={filters.min_balance}
              onChange={(e) => handleFilterChange('min_balance', e.target.value)}
              placeholder="e.g. 5000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
            />
          </div>
          <div>
            <button
              onClick={generateReport}
              disabled={loading}
              className="w-full px-4 py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Generating...
                </span>
              ) : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <svg className="animate-spin h-10 w-10 mx-auto mb-3" style={{ color: PRIMARY }} viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <p className="text-gray-500 text-sm">Generating report...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {generated && !loading && data.length === 0 && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <h3 className="text-lg font-medium text-gray-700 mb-1">No outstanding dues found</h3>
          <p className="text-gray-400 text-sm">All students are up to date with their fee payments, or try adjusting the filters.</p>
        </div>
      )}

      {/* Report Content */}
      {generated && !loading && data.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Students with Dues</p>
              <p className="text-2xl font-bold mt-1" style={{ color: DARK }}>{summary.totalStudents.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Outstanding</p>
              <p className="text-2xl font-bold mt-1 text-red-600">{formatCurrency(summary.totalOutstanding)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Average Balance</p>
              <p className="text-2xl font-bold mt-1" style={{ color: DARK }}>{formatCurrency(Math.round(summary.avgBalance))}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Students &gt;₹10K Due</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{summary.above10k}</p>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4 print:hidden">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: '#dc2626' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
              Send Reminder to All
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Export CSV
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              Print Report
            </button>
            <span className="text-xs text-gray-400 ml-auto">
              Showing {sortedData.length} student{sortedData.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100" style={{ backgroundColor: '#f8fafb' }}>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600 w-12">Sl</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('admission_no')}>
                      Adm No<SortIcon column="admission_no" />
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('name')}>
                      Student Name<SortIcon column="name" />
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">Father Name</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('class_section')}>
                      Class/Sec<SortIcon column="class_section" />
                    </th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('total_fee')}>
                      Total Fee<SortIcon column="total_fee" />
                    </th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('paid')}>
                      Paid<SortIcon column="paid" />
                    </th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => handleSort('balance')}>
                      Balance<SortIcon column="balance" />
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">Last Payment</th>
                    <th className="px-3 py-3 text-center font-semibold text-gray-600 print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((student, idx) => {
                    const balance = Number(student.balance) || 0;
                    const isHighBalance = balance > 10000;
                    const studentId = student.student_id || student.id;
                    const reminderStatus = reminderSent[studentId];

                    return (
                      <tr
                        key={studentId || idx}
                        className={`border-b border-gray-50 transition-colors ${isHighBalance ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-gray-50/50'}`}
                      >
                        <td className="px-3 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-3 font-medium text-gray-800">{student.admission_no || student.admission_number || '—'}</td>
                        <td className="px-3 py-3 font-medium text-gray-800">{student.name || student.student_name || '—'}</td>
                        <td className="px-3 py-3 text-gray-600">{student.father_name || '—'}</td>
                        <td className="px-3 py-3 text-gray-600">{student.class_section || `${student.class_name || ''}/${student.section_name || ''}`}</td>
                        <td className="px-3 py-3 text-right text-gray-600">{formatCurrency(student.total_fee || student.total_due)}</td>
                        <td className="px-3 py-3 text-right text-green-700">{formatCurrency(student.paid || student.total_paid)}</td>
                        <td className={`px-3 py-3 text-right font-semibold ${isHighBalance ? 'text-red-600' : 'text-amber-600'}`}>
                          {formatCurrency(balance)}
                        </td>
                        <td className="px-3 py-3 text-gray-500 text-xs">{formatDate(student.last_payment_date)}</td>
                        <td className="px-3 py-3 text-center print:hidden">
                          <div className="flex items-center justify-center gap-2">
                            {reminderStatus === 'sent' ? (
                              <span className="text-xs text-green-600 font-medium">✓ Sent</span>
                            ) : reminderStatus === 'sending' ? (
                              <span className="text-xs text-gray-400">Sending...</span>
                            ) : reminderStatus === 'failed' ? (
                              <span className="text-xs text-red-500">Failed</span>
                            ) : (
                              <button
                                onClick={() => sendReminder(student)}
                                className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                title="Send SMS reminder"
                              >
                                Remind
                              </button>
                            )}
                            <a
                              href={`/school/fees/receipts?student_id=${studentId}`}
                              className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                              title="View payment history"
                            >
                              History
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="border-t-2 border-gray-200 font-bold" style={{ backgroundColor: '#f0f9fb' }}>
                    <td className="px-3 py-3" colSpan={5} style={{ color: DARK }}>TOTAL ({data.length} students)</td>
                    <td className="px-3 py-3 text-right" style={{ color: DARK }}>{formatCurrency(totalsRow.total_fee)}</td>
                    <td className="px-3 py-3 text-right text-green-700">{formatCurrency(totalsRow.paid)}</td>
                    <td className="px-3 py-3 text-right text-red-600">{formatCurrency(totalsRow.balance)}</td>
                    <td className="px-3 py-3" colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Print Footer */}
          <div className="hidden print:block mt-4 text-xs text-gray-400 text-center">
            Generated on {new Date().toLocaleString('en-IN')} | Outstanding Fee Report
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center print:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => !sendingReminder && setShowConfirmModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Send Bulk Fee Reminder</h3>
              <p className="text-gray-600 text-sm mb-6">
                Send fee reminder SMS to <strong className="text-red-600">{sortedData.length} parent{sortedData.length !== 1 ? 's' : ''}</strong>?
                <br />
                <span className="text-xs text-gray-400 mt-1 block">This will notify all visible students about their pending dues.</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  disabled={sendingReminder}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={sendBulkReminders}
                  disabled={sendingReminder}
                  className="flex-1 px-4 py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#dc2626' }}
                >
                  {sendingReminder ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Sending...
                    </span>
                  ) : 'Yes, Send All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
