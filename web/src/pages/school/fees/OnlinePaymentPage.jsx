import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const formatCurrency = (amount) => {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
};

const statusColors = {
  success: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
};

export default function OnlinePaymentPage() {
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [fees, setFees] = useState([]);
  const [selectedFees, setSelectedFees] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [razorpayError, setRazorpayError] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [error, setError] = useState('');

  // Load Razorpay script dynamically
  useEffect(() => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      setRazorpayLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => setRazorpayError(true);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  // Load students list for admin, auto-select for parent
  useEffect(() => {
    if (user.role === 'school_admin') {
      api.get('/school/students?minimal=true').then((res) => {
        setStudents(res.data.data || []);
      });
    } else {
      const studentId = user.student_id || user.child_id || '';
      setSelectedStudent(studentId);
    }
  }, [user]);

  // Fetch outstanding fees when student changes
  const fetchFees = useCallback(async (studentId) => {
    if (!studentId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/school/payments-online/outstanding?student_id=${studentId}`);
      setFees(res.data.data || []);
      setSelectedFees([]);
    } catch {
      setError('Failed to load outstanding fees.');
      setFees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch payment history
  const fetchHistory = useCallback(async (studentId) => {
    if (!studentId) return;
    try {
      const res = await api.get(`/school/payments-online/history?student_id=${studentId}`);
      setHistory(res.data.data || []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      fetchFees(selectedStudent);
      fetchHistory(selectedStudent);
    }
  }, [selectedStudent, fetchFees, fetchHistory]);

  const toggleFee = (feeId) => {
    setSelectedFees((prev) =>
      prev.includes(feeId) ? prev.filter((id) => id !== feeId) : [...prev, feeId]
    );
  };

  const toggleAll = () => {
    if (selectedFees.length === fees.length) {
      setSelectedFees([]);
    } else {
      setSelectedFees(fees.map((f) => f.fee_head_id));
    }
  };

  const selectedItems = fees.filter((f) => selectedFees.includes(f.fee_head_id));
  const totalAmount = selectedItems.reduce((sum, f) => sum + (f.balance || 0), 0);
  const convenienceFee = 0; // Can be configured
  const grandTotal = totalAmount + convenienceFee;

  const verifyPayment = async (response) => {
    try {
      const res = await api.post('/school/payments-online/verify', {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      setPaymentSuccess(res.data.data);
      setSelectedFees([]);
      fetchFees(selectedStudent);
      fetchHistory(selectedStudent);
    } catch {
      setError('Payment verification failed. If amount was debited, it will be refunded within 5-7 business days.');
    } finally {
      setPaying(false);
    }
  };

  const handlePayNow = async () => {
    if (!razorpayLoaded) {
      setError('Payment gateway is not loaded. Please refresh the page.');
      return;
    }
    if (selectedItems.length === 0) return;

    setPaying(true);
    setError('');
    setPaymentSuccess(null);

    try {
      const res = await api.post('/school/payments-online/create-order', {
        student_id: selectedStudent,
        fee_heads: selectedItems.map((f) => ({ fee_head_id: f.fee_head_id, amount: f.balance })),
        total_amount: grandTotal,
      });

      const data = res.data.data;
      const options = {
        key: data.key_id,
        amount: data.amount_in_paise,
        currency: 'INR',
        name: data.school_name,
        description: 'Fee Payment',
        order_id: data.order_id,
        prefill: data.prefill,
        handler: function (response) { verifyPayment(response); },
        modal: { ondismiss: () => setPaying(false) },
        theme: { color: '#0891B2' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
        setPaying(false);
      });
      rzp.open();
    } catch {
      setError('Failed to initiate payment. Please try again.');
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#0e3a5c]">Online Fee Payment</h1>
          <p className="text-gray-500 mt-1">Pay your fees securely via Razorpay</p>
        </div>

        {/* Razorpay Load Error */}
        {razorpayError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            Payment gateway failed to load. Please check your internet connection and refresh the page.
          </div>
        )}

        {/* Student Selection (admin only) */}
        {user.role === 'school_admin' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0891B2] focus:border-transparent outline-none"
            >
              <option value="">-- Select a student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.class_name} {s.section}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Payment Success Screen */}
        {paymentSuccess && (
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-green-700 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">Your fee payment has been processed successfully.</p>
            <div className="space-y-1 text-sm text-gray-600 mb-6">
              <p>Receipt No: <span className="font-semibold">{paymentSuccess.receipt_number}</span></p>
              <p>Amount Paid: <span className="font-semibold">{formatCurrency(paymentSuccess.amount)}</span></p>
              <p>Transaction ID: <span className="font-semibold">{paymentSuccess.transaction_id}</span></p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {paymentSuccess.receipt_url && (
                <a
                  href={paymentSuccess.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0e3a5c] transition-colors"
                >
                  Download Receipt
                </a>
              )}
              <button
                onClick={() => setPaymentSuccess(null)}
                className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Make Another Payment
              </button>
            </div>
          </div>
        )}

        {/* Outstanding Fees */}
        {!paymentSuccess && selectedStudent && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#0e3a5c]">Outstanding Fees</h2>
                {fees.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFees.length === fees.length && fees.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-gray-300 text-[#0891B2] focus:ring-[#0891B2]"
                    />
                    Select All
                  </label>
                )}
              </div>

              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading fees...</div>
              ) : fees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No outstanding fees found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-2 font-medium text-gray-500 w-10"></th>
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Fee Head</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-500 hidden sm:table-cell">Term</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500">Amount Due</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 hidden sm:table-cell">Paid</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.map((fee) => (
                        <tr key={fee.fee_head_id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <input
                              type="checkbox"
                              checked={selectedFees.includes(fee.fee_head_id)}
                              onChange={() => toggleFee(fee.fee_head_id)}
                              className="w-4 h-4 rounded border-gray-300 text-[#0891B2] focus:ring-[#0891B2]"
                            />
                          </td>
                          <td className="py-3 px-2 font-medium text-gray-800">{fee.fee_head_name}</td>
                          <td className="py-3 px-2 text-gray-600 hidden sm:table-cell">{fee.term || '-'}</td>
                          <td className="py-3 px-2 text-right text-gray-700">{formatCurrency(fee.amount_due)}</td>
                          <td className="py-3 px-2 text-right text-gray-500 hidden sm:table-cell">{formatCurrency(fee.paid)}</td>
                          <td className="py-3 px-2 text-right font-semibold text-[#0e3a5c]">{formatCurrency(fee.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Running Total */}
              {fees.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-sm text-gray-600">{selectedFees.length} item(s) selected</span>
                  <span className="text-lg font-bold text-[#0e3a5c]">{formatCurrency(totalAmount)}</span>
                </div>
              )}
            </div>

            {/* Payment Summary */}
            {selectedItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-lg font-semibold text-[#0e3a5c] mb-4">Payment Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Selected Items</span>
                    <span className="font-medium">{selectedItems.length} item(s)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-medium">{formatCurrency(totalAmount)}</span>
                  </div>
                  {convenienceFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Convenience Fee (incl. GST)</span>
                      <span className="font-medium">{formatCurrency(convenienceFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-gray-100">
                    <span className="font-semibold text-[#0e3a5c]">Grand Total</span>
                    <span className="text-xl font-bold text-[#0891B2]">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* Pay Now Button */}
                <button
                  onClick={handlePayNow}
                  disabled={paying || !razorpayLoaded}
                  className="mt-5 w-full py-3 bg-[#0891B2] text-white rounded-lg font-semibold text-base hover:bg-[#0e3a5c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>Pay {formatCurrency(grandTotal)} Now</>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Payment History */}
        {!paymentSuccess && selectedStudent && history.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-[#0e3a5c] mb-4">Payment History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Date</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500">Amount</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Status</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 hidden sm:table-cell">Transaction ID</th>
                    <th className="text-center py-2 px-2 font-medium text-gray-500">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((txn) => (
                    <tr key={txn.id} className="border-b border-gray-50">
                      <td className="py-3 px-2 text-gray-700">
                        {new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-gray-800">{formatCurrency(txn.amount)}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[txn.status] || 'bg-gray-100 text-gray-600'}`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-500 text-xs hidden sm:table-cell font-mono">{txn.transaction_id || '-'}</td>
                      <td className="py-3 px-2 text-center">
                        {txn.receipt_url ? (
                          <a
                            href={txn.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0891B2] hover:underline text-xs font-medium"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
