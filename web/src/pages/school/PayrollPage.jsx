import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const Tab = ({ id, label, icon, active, onClick }) => (
  <button onClick={() => onClick(id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${active ? 'border-[#0891B2] text-[#0891B2]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
    <span>{icon}</span>{label}
  </button>
);

function SalaryStructures() {
  const [structures, setStructures] = useState([]);
  const [adding, setAdding]         = useState(false);
  const [form, setForm]             = useState({ basic_salary: 0, hra_percent: 10, da_percent: 5, pf_employee_percent: 12, esi_employee_percent: 0.75 });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.get('/school/payroll/structures').then((r) => setStructures(r.data)).catch(() => {});
  }, []);

  const save = async () => {
    try {
      const { data } = await api.post('/school/payroll/structures', form);
      setStructures((p) => [data, ...p]);
      setAdding(false);
    } catch { alert('Failed'); }
  };

  const formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setAdding(true)} className="px-4 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg hover:bg-[#0e7490]">
          + Create Structure
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
            <th className="px-4 py-3 text-left">Staff</th>
            <th className="px-4 py-3 text-left">Basic</th>
            <th className="px-4 py-3 text-left">HRA</th>
            <th className="px-4 py-3 text-left">DA</th>
            <th className="px-4 py-3 text-left">PF (Emp)</th>
            <th className="px-4 py-3 text-left">Gross</th>
            <th className="px-4 py-3 text-left">Net</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {structures.length === 0
              ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">No salary structures</td></tr>
              : structures.map((s) => {
                const gross = Number(s.basic_salary) + Number(s.hra_amount || 0) + Number(s.da_amount || 0);
                const deductions = Number(s.pf_employee || 0) + Number(s.esi_employee || 0) + Number(s.tds || 0);
                return (
                  <tr key={s.id} className="hover:bg-blue-50/30">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.staff_name || s.designation || 'Staff'}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(s.basic_salary)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(s.hra_amount || s.basic_salary * (s.hra_percent / 100))}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(s.da_amount || s.basic_salary * (s.da_percent / 100))}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(s.pf_employee || s.basic_salary * 0.12)}</td>
                    <td className="px-4 py-3 font-semibold text-blue-600">{formatCurrency(gross)}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(gross - deductions)}</td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>

      {adding && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold">Create Salary Structure</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['designation', 'Designation'],
                ['basic_salary', 'Basic Salary (₹)'],
                ['hra_percent', 'HRA %'],
                ['da_percent', 'DA %'],
                ['pf_employee_percent', 'PF Employee %'],
                ['esi_employee_percent', 'ESI Employee %'],
                ['tds', 'TDS (₹)'],
              ].map(([k, label]) => (
                <div key={k} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">{label}</label>
                  <input className={inputCls} type={k.endsWith('_percent') || k === 'tds' ? 'number' : 'text'}
                    value={form[k] || ''} onChange={set(k)} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setAdding(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700">Cancel</button>
              <button onClick={save} className="px-5 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PayrollRuns() {
  const [runs, setRuns] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    api.get('/school/payroll/runs').then((r) => setRuns(r.data)).catch(() => {});
  }, []);

  const runPayroll = async () => {
    setProcessing(true);
    try {
      const [yr, mo] = month.split('-');
      const { data } = await api.post('/school/payroll/run', { month: parseInt(mo), year: parseInt(yr) });
      setRuns((p) => [data, ...p]);
    } catch (err) { alert(err?.error || 'Payroll run failed'); }
    finally { setProcessing(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Select Month</label>
          <input type="month" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        <button onClick={runPayroll} disabled={processing}
          className="px-5 py-2 bg-[#DC2626] text-white text-sm font-semibold rounded-lg hover:bg-[#b91c1c] disabled:opacity-50"
        >
          {processing ? 'Processing…' : '▶ Run Payroll'}
        </button>
      </div>

      <table className="w-full text-sm bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
          <th className="px-4 py-3 text-left">Month</th>
          <th className="px-4 py-3 text-left">Staff</th>
          <th className="px-4 py-3 text-left">Total Gross</th>
          <th className="px-4 py-3 text-left">Total Net</th>
          <th className="px-4 py-3 text-left">Status</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-50">
          {runs.length === 0
            ? <tr><td colSpan={5} className="text-center py-10 text-gray-400">No payroll runs yet</td></tr>
            : runs.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50/30">
                <td className="px-4 py-3 font-medium text-gray-900">{r.month}/{r.year}</td>
                <td className="px-4 py-3 text-gray-600">{r.staff_count}</td>
                <td className="px-4 py-3 text-blue-600 font-semibold">₹{Number(r.total_gross || 0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-green-600 font-semibold">₹{Number(r.total_net || 0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {r.status || 'completed'}
                  </span>
                </td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

export default function PayrollPage() {
  const [tab, setTab] = useState('structure');
  const TABS = [
    { id: 'structure', label: 'Salary Structures', icon: '💵' },
    { id: 'runs',      label: 'Monthly Payroll',   icon: '🗓️' },
  ];
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map((t) => <Tab key={t.id} {...t} active={tab === t.id} onClick={setTab} />)}
        </div>
        <div className="p-5">
          {tab === 'structure' && <SalaryStructures />}
          {tab === 'runs'      && <PayrollRuns />}
        </div>
      </div>
    </div>
  );
}
