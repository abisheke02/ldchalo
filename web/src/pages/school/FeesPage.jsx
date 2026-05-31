import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function FeesPage() {
  const [outstanding, setOutstanding] = useState([]);
  const [collecting, setCollecting]   = useState(null);
  const [amount, setAmount]           = useState('');
  const [mode, setMode]               = useState('cash');

  useEffect(() => {
    api.get('/school/fees/outstanding').then((r) => setOutstanding(r.data)).catch(() => {});
  }, []);

  const collect = async () => {
    try {
      await api.post('/school/fees/collect/counter', {
        student_id: collecting.student_id, amount: +amount, payment_mode: mode,
      });
      alert('Receipt generated!');
      setCollecting(null);
      setAmount('');
      api.get('/school/fees/outstanding').then((r) => setOutstanding(r.data)).catch(() => {});
    } catch {
      alert('Collection failed');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fees</h1>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Outstanding Dues</h2>
        {outstanding.length === 0 ? (
          <p className="text-gray-400 text-sm">No outstanding fees</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Student</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Balance</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {outstanding.map((s) => (
                  <tr key={s.student_id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="py-3 text-gray-600">{s.phone || '—'}</td>
                    <td className="py-3 text-red-600 font-semibold">₹{s.balance}</td>
                    <td className="py-3">
                      <button onClick={() => setCollecting(s)} className="btn-school text-xs px-3 py-1.5">
                        Collect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collection modal */}
      {collecting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold">Collect Fee — {collecting.name}</h3>
            <p className="text-sm text-gray-500">Balance: ₹{collecting.balance}</p>
            <input type="number" className="input" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
            <div className="flex gap-3 justify-end">
              <button className="btn-outline" onClick={() => setCollecting(null)}>Cancel</button>
              <button className="btn-school" onClick={collect} disabled={!amount}>Collect</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
