import { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState({ class_id: '', term_id: '', month: '', year: new Date().getFullYear(), date: new Date().toISOString().slice(0, 10) });

  const set = k => e => setParams(p => ({ ...p, [k]: e.target.value }));

  async function runReport(type) {
    setActiveReport(type);
    setLoading(true);
    try {
      let res;
      if (type === 'outstanding') res = await api.get('/reports/fee-outstanding', { params: { term_id: params.term_id, class_id: params.class_id } });
      else if (type === 'attendance') res = await api.get('/reports/attendance', { params });
      else if (type === 'eod') res = await api.get('/reports/eod', { params: { date: params.date } });
      setData(type === 'outstanding' ? res.data.rows : res.data);
    } catch { toast.error('Report failed'); }
    finally { setLoading(false); }
  }

  const reports = [
    { key: 'outstanding', label: 'Fee Outstanding', icon: '💰', desc: 'Class-wise pending fee report' },
    { key: 'attendance',  label: 'Attendance',      icon: '✅', desc: 'Monthly attendance per student' },
    { key: 'eod',         label: 'EOD Collection',  icon: '📊', desc: 'End-of-day fee collection summary' },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Reports</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reports.map(r => (
          <div key={r.key} className={`bg-white rounded-xl shadow p-5 cursor-pointer transition-all hover:shadow-md ${activeReport === r.key ? 'ring-2 ring-primary' : ''}`}
            onClick={() => runReport(r.key)}>
            <div className="text-3xl mb-2">{r.icon}</div>
            <p className="font-semibold text-gray-800">{r.label}</p>
            <p className="text-xs text-gray-400 mt-1">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4 flex gap-3 flex-wrap">
        <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Class ID" value={params.class_id} onChange={set('class_id')} />
        <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Term ID" value={params.term_id} onChange={set('term_id')} />
        <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24" placeholder="Month" value={params.month} onChange={set('month')} min={1} max={12} />
        <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24" placeholder="Year" value={params.year} onChange={set('year')} />
        <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={params.date} onChange={set('date')} />
      </div>

      {/* Results */}
      {loading ? <p className="text-center py-10 text-gray-400">Generating report...</p> : (
        data.length > 0 && (
          <div className="bg-white rounded-xl shadow overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>{Object.keys(data[0]).map(k => (
                  <th key={k} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 capitalize">{k.replace(/_/g, ' ')}</th>
                ))}</tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-4 py-2 text-sm">{v != null ? String(v) : '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
