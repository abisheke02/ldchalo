import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const Tab = ({ id, label, icon, active, onClick }) => (
  <button onClick={() => onClick(id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${active ? 'border-[#0891B2] text-[#0891B2]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
    <span>{icon}</span>{label}
  </button>
);

function FeeReports() {
  const [outstanding, setOutstanding] = useState([]);
  const [classes, setClasses]         = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading]         = useState(true);
  const [totals, setTotals]           = useState({ due: 0, paid: 0, balance: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/school/fees/outstanding'),
      api.get('/schools/classes'),
    ]).then(([feeRes, classRes]) => {
      setOutstanding(feeRes.data);
      setClasses(classRes.data);
      const list = feeRes.data;
      setTotals({
        due:     list.reduce((s, r) => s + Number(r.total_due  || 0), 0),
        paid:    list.reduce((s, r) => s + Number(r.total_paid || 0), 0),
        balance: list.reduce((s, r) => s + Number(r.balance    || 0), 0),
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = classFilter ? outstanding.filter((r) => r.class_id === classFilter) : outstanding;
  const fmt = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Due',      value: fmt(totals.due),     color: 'border-blue-500',  text: 'text-blue-600' },
          { label: 'Total Collected', value: fmt(totals.paid),   color: 'border-green-500', text: 'text-green-600' },
          { label: 'Outstanding',     value: fmt(totals.balance), color: 'border-red-500',  text: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${s.color} p-4`}>
            <p className={`text-xl font-bold ${s.text}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2">
          📥 Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-right">Due</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading…</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-10 text-gray-400">No outstanding fees</td></tr>
                : filtered.map((r) => (
                  <tr key={r.student_id} className="hover:bg-red-50/20">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.phone || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(r.total_due)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{fmt(r.total_paid)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">{fmt(r.balance)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AttendanceReport() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [month,   setMonth]   = useState(new Date().toISOString().slice(0, 7));
  const [report,  setReport]  = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/schools/classes').then((r) => setClasses(r.data)).catch(() => {}); }, []);

  const load = async () => {
    if (!classId) return;
    setLoading(true);
    const [yr, mo] = month.split('-');
    try {
      const list = (await api.get(`/schools/classes/${classId}/students`)).data;
      const reports = await Promise.all(list.map((s) =>
        api.get(`/school/attendance/student/${s.id}/report`, { params: { month: mo, year: yr } })
          .then((r) => ({ ...s, records: r.data }))
          .catch(() => ({ ...s, records: [] }))
      ));
      setReport(reports);
    } catch { setReport([]); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 bg-blue-50 rounded-xl border border-blue-200 p-4">
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Select Class…</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="month" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
        <button onClick={load} disabled={!classId || loading} className="px-4 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg hover:bg-[#0e7490] disabled:opacity-50">
          {loading ? 'Loading…' : 'Generate Report'}
        </button>
      </div>

      {report.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-right">Present</th>
              <th className="px-4 py-3 text-right">Absent</th>
              <th className="px-4 py-3 text-right">Late</th>
              <th className="px-4 py-3 text-right">Total Days</th>
              <th className="px-4 py-3 text-right">%</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {report.map((s) => {
                const present = s.records.filter((r) => r.status === 'present').length;
                const absent  = s.records.filter((r) => r.status === 'absent').length;
                const late    = s.records.filter((r) => r.status === 'late').length;
                const total   = s.records.length;
                const pct     = total ? Math.round((present / total) * 100) : 0;
                return (
                  <tr key={s.id} className="hover:bg-blue-50/20">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">{present}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-semibold">{absent}</td>
                    <td className="px-4 py-3 text-right text-yellow-600 font-semibold">{late}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{total}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{pct}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState('fees');
  const TABS = [
    { id: 'fees',       label: 'Fee Reports',       icon: '💰' },
    { id: 'attendance', label: 'Attendance Report',  icon: '✅' },
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map((t) => <Tab key={t.id} {...t} active={tab === t.id} onClick={setTab} />)}
        </div>
        <div className="p-5">
          {tab === 'fees'       && <FeeReports />}
          {tab === 'attendance' && <AttendanceReport />}
        </div>
      </div>
    </div>
  );
}
