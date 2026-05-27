import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const TABS = ['Outstanding', 'Concessions', 'EOD Report'];

export default function FeesPage() {
  const [tab, setTab] = useState('Outstanding');
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [eodDate, setEodDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setData([]);
    setTotals(null);
    setLoading(true);
    if (tab === 'Outstanding') {
      api.get('/fees/outstanding').then(r => { setData(r.data.rows); setTotals(r.data.totals); }).catch(() => toast.error('Failed')).finally(() => setLoading(false));
    } else if (tab === 'Concessions') {
      api.get('/fees/concessions').then(r => setData(r.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
    } else {
      api.get('/reports/eod', { params: { date: eodDate } }).then(r => setData(r.data)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
    }
  }, [tab, eodDate]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Fees Management</h2>

      {/* Method badges */}
      <div className="flex gap-3">
        {[
          { label: 'Method 1: Challan', color: 'bg-blue-100 text-blue-700' },
          { label: 'Method 2: Counter', color: 'bg-green-100 text-green-700' },
          { label: 'Method 3: Online', color: 'bg-purple-100 text-purple-700' },
        ].map(m => (
          <span key={m.label} className={`px-3 py-1 rounded-full text-xs font-medium ${m.color}`}>{m.label}</span>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <p className="text-center py-10 text-gray-400">Loading...</p> : (
        <>
          {tab === 'Outstanding' && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {totals && (
                <div className="grid grid-cols-3 bg-primary text-white text-center py-3">
                  <div><p className="text-xs opacity-70">Total Fees</p><p className="font-bold">₹{Number(totals.total_fees).toLocaleString()}</p></div>
                  <div><p className="text-xs opacity-70">Collected</p><p className="font-bold text-green-300">₹{Number(totals.receipts).toLocaleString()}</p></div>
                  <div><p className="text-xs opacity-70">Outstanding</p><p className="font-bold text-amber-300">₹{Number(totals.outstanding).toLocaleString()}</p></div>
                </div>
              )}
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>{['Adm.No', 'Student', 'Class', 'Total (₹)', 'Paid (₹)', 'Outstanding (₹)'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {data.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 font-mono text-xs">{r.admission_number}</td>
                      <td className="px-4 py-2 font-medium">{r.student_name}</td>
                      <td className="px-4 py-2">{r.class_name} {r.section}</td>
                      <td className="px-4 py-2">₹{Number(r.total_fees).toLocaleString()}</td>
                      <td className="px-4 py-2 text-green-600">₹{Number(r.receipts).toLocaleString()}</td>
                      <td className="px-4 py-2 text-red-600 font-semibold">₹{Number(r.outstanding).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!data.length && <tr><td colSpan={6} className="text-center py-10 text-gray-400">No outstanding fees</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'Concessions' && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>{['Student', 'Class', 'Fee Head', 'Category', 'Term', 'Actual (₹)', 'Concession (₹)', '%'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {data.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 font-medium">{r.student_name}</td>
                      <td className="px-4 py-2">{r.class_name}</td>
                      <td className="px-4 py-2">{r.fee_head}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{r.category}</td>
                      <td className="px-4 py-2">{r.term}</td>
                      <td className="px-4 py-2">₹{Number(r.actual).toLocaleString()}</td>
                      <td className="px-4 py-2 text-green-600">₹{Number(r.concession_amount).toLocaleString()}</td>
                      <td className="px-4 py-2 font-semibold">{r.concession_pct}%</td>
                    </tr>
                  ))}
                  {!data.length && <tr><td colSpan={8} className="text-center py-10 text-gray-400">No concessions found</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'EOD Report' && (
            <div className="space-y-4">
              <input type="date" value={eodDate} onChange={e => setEodDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-3 gap-4">
                {data.map(r => (
                  <div key={r.collection_method} className="bg-white rounded-xl shadow p-5">
                    <p className="text-sm text-gray-500 capitalize">{r.collection_method}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">₹{Number(r.total_collected).toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.transactions} transactions</p>
                  </div>
                ))}
                {!data.length && <p className="col-span-3 text-center py-10 text-gray-400">No transactions on this date</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
