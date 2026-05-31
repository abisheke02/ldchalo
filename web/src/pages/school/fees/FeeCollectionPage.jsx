import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../../services/api';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const numberToWords = (num) => {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertBelowThousand = (n) => {
    let str = '';
    if (n >= 100) { str += ones[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
    if (n >= 20) { str += tens[Math.floor(n / 10)] + ' '; n %= 10; }
    if (n > 0) str += ones[n] + ' ';
    return str.trim();
  };

  let result = '';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = Math.floor(num % 1000);

  if (crore) result += convertBelowThousand(crore) + ' Crore ';
  if (lakh) result += convertBelowThousand(lakh) + ' Lakh ';
  if (thousand) result += convertBelowThousand(thousand) + ' Thousand ';
  if (remainder) result += convertBelowThousand(remainder);

  return result.trim() + ' Rupees Only';
};

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function FeeCollectionPage() {
  // State: Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // State: Selected Student
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feeHeads, setFeeHeads] = useState([]);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState(null);

  // State: Payment
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [remarks, setRemarks] = useState('');

  // State: Collection
  const [collecting, setCollecting] = useState(false);
  const [collectionError, setCollectionError] = useState(null);

  // State: Receipt Modal
  const [receiptData, setReceiptData] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // State: Today's collection
  const [todaysCollection, setTodaysCollection] = useState(0);

  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // ─── Fetch today's collection summary ───────────────────────────────────────

  useEffect(() => {
    const fetchTodaysSummary = async () => {
      try {
        const res = await api.get('/school/fee-collections/today-summary');
        setTodaysCollection(res.data?.total || 0);
      } catch {
        // Silent fail for summary
      }
    };
    fetchTodaysSummary();
  }, []);

  // ─── Student Search with Debounce ──────────────────────────────────────────

  const handleSearch = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await api.get(`/school/fee-collections/student-search?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data || []);
      setShowDropdown(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const onSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 350);
  };

  // ─── Select Student & Load Outstanding ─────────────────────────────────────

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
    setFeeError(null);
    setFeeLoading(true);
    setCollectionError(null);

    try {
      const res = await api.get(`/school/fee-collections/student/${student.id}/outstanding`);
      const heads = (res.data?.fee_heads || []).map((item) => ({
        ...item,
        selected: true,
        paying_now: item.balance || 0,
      }));
      setFeeHeads(heads);
    } catch (err) {
      setFeeError(err?.response?.data?.message || 'Failed to load fee details.');
      setFeeHeads([]);
    } finally {
      setFeeLoading(false);
    }
  };

  // ─── Fee Head Controls ─────────────────────────────────────────────────────

  const toggleFeeHead = (index) => {
    setFeeHeads((prev) => prev.map((item, i) =>
      i === index ? { ...item, selected: !item.selected, paying_now: !item.selected ? item.balance : 0 } : item
    ));
  };

  const toggleSelectAll = () => {
    const allSelected = feeHeads.every((h) => h.selected);
    setFeeHeads((prev) => prev.map((item) => ({
      ...item,
      selected: !allSelected,
      paying_now: !allSelected ? item.balance : 0,
    })));
  };

  const updatePayingNow = (index, value) => {
    const numVal = Math.max(0, Math.min(Number(value) || 0, feeHeads[index].balance));
    setFeeHeads((prev) => prev.map((item, i) =>
      i === index ? { ...item, paying_now: numVal } : item
    ));
  };

  // ─── Calculations ──────────────────────────────────────────────────────────

  const selectedHeads = feeHeads.filter((h) => h.selected && h.paying_now > 0);
  const subtotal = selectedHeads.reduce((sum, h) => sum + h.paying_now, 0);
  const totalLateFee = selectedHeads.reduce((sum, h) => sum + (h.late_fee || 0), 0);
  const totalConcession = selectedHeads.reduce((sum, h) => sum + (h.concession_amount || 0), 0);
  const grandTotal = subtotal + totalLateFee;

  const totalDue = feeHeads.reduce((sum, h) => sum + (h.amount_due || 0), 0);
  const totalPaid = feeHeads.reduce((sum, h) => sum + (h.paid || 0), 0);
  const totalBalance = feeHeads.reduce((sum, h) => sum + (h.balance || 0), 0);

  // ─── Collect Fee ───────────────────────────────────────────────────────────

  const handleCollect = async () => {
    if (selectedHeads.length === 0) {
      setCollectionError('Please select at least one fee head with an amount to collect.');
      return;
    }
    if (paymentMode === 'Cheque' && (!chequeNumber || !bankName)) {
      setCollectionError('Cheque number and bank name are required for cheque payments.');
      return;
    }
    if ((paymentMode === 'UPI' || paymentMode === 'Online') && !transactionId) {
      setCollectionError('Transaction ID is required for UPI/Online payments.');
      return;
    }

    setCollecting(true);
    setCollectionError(null);

    const payload = {
      student_id: selectedStudent.id,
      fee_items: selectedHeads.map((h) => ({
        fee_head_id: h.fee_head_id,
        term_id: h.term_id,
        amount: h.paying_now,
        concession_amount: h.concession_amount || 0,
        late_fee: h.late_fee || 0,
      })),
      payment_mode: paymentMode,
      cheque_number: paymentMode === 'Cheque' ? chequeNumber : undefined,
      bank_name: paymentMode === 'Cheque' ? bankName : undefined,
      transaction_id: ['UPI', 'Online'].includes(paymentMode) ? transactionId : undefined,
      remarks: remarks || undefined,
    };

    try {
      const res = await api.post('/school/fee-collections', payload);
      setReceiptData({
        receipt_number: res.data.receipt_number,
        collection_id: res.data.collection_id,
        student: selectedStudent,
        fee_items: selectedHeads,
        payment_mode: paymentMode,
        subtotal,
        late_fee: totalLateFee,
        concession: totalConcession,
        grand_total: grandTotal,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      });
      setShowReceipt(true);
      setTodaysCollection((prev) => prev + grandTotal);

      // Reset form
      resetForm();
    } catch (err) {
      setCollectionError(err?.response?.data?.message || 'Fee collection failed. Please try again.');
    } finally {
      setCollecting(false);
    }
  };

  const resetForm = () => {
    setSelectedStudent(null);
    setFeeHeads([]);
    setPaymentMode('Cash');
    setChequeNumber('');
    setBankName('');
    setTransactionId('');
    setRemarks('');
    setCollectionError(null);
  };

  // ─── Click outside to close dropdown ───────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ═══ Top Bar ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0e3a5c]">Fee Collection</h1>
            <p className="text-sm text-gray-500 mt-0.5">Collect fees and generate receipts</p>
          </div>
          <div className="bg-[#0891B2]/10 border border-[#0891B2]/20 rounded-lg px-4 py-2.5">
            <span className="text-xs font-medium text-[#0891B2] uppercase tracking-wide">Today's Collection</span>
            <p className="text-lg font-bold text-[#0e3a5c]">{formatCurrency(todaysCollection)}</p>
          </div>
        </div>

        {/* ═══ Student Search ═══ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5" ref={searchRef}>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Search Student</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search by student name, admission number, or phone..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2] transition"
            />
            {searchLoading && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="w-5 h-5 border-2 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Search Results Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                {searchResults.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => selectStudent(student)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">
                          {student.admission_no} • Class {student.class}-{student.section} • F: {student.father_name}
                        </p>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{student.admission_no}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
                <p className="text-sm text-gray-500">No students found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>

        {/* ═══ Selected Student Info Card ═══ */}
        {selectedStudent && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#0891B2]/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-[#0891B2]">{selectedStudent.name?.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#0e3a5c]">{selectedStudent.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                    <span><strong>Adm No:</strong> {selectedStudent.admission_no}</span>
                    <span><strong>Class:</strong> {selectedStudent.class}-{selectedStudent.section}</span>
                    <span><strong>Father:</strong> {selectedStudent.father_name}</span>
                  </div>
                </div>
              </div>
              <button onClick={resetForm} className="text-sm text-gray-400 hover:text-gray-600 transition" title="Clear selection">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Fee Summary Badges */}
            {!feeLoading && feeHeads.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">Total Due</p>
                  <p className="text-base font-bold text-blue-900">{formatCurrency(totalDue)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600 font-medium">Total Paid</p>
                  <p className="text-base font-bold text-green-900">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-red-600 font-medium">Balance Outstanding</p>
                  <p className="text-base font-bold text-red-700">{formatCurrency(totalBalance)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ Fee Heads Breakdown Table ═══ */}
        {selectedStudent && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Fee Heads Breakdown</h2>
              {feeHeads.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-xs font-medium text-[#0891B2] hover:text-[#0891B2]/80 transition"
                >
                  {feeHeads.every((h) => h.selected) ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {feeLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-[#0891B2] border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-sm text-gray-500">Loading fee details...</span>
              </div>
            )}

            {feeError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-sm text-red-700">{feeError}</p>
              </div>
            )}

            {!feeLoading && !feeError && feeHeads.length === 0 && (
              <div className="text-center py-10">
                <svg className="w-12 h-12 mx-auto text-green-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-600">No outstanding fees for this student.</p>
              </div>
            )}

            {!feeLoading && feeHeads.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-500 w-8"></th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Fee Head</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Term</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Amount Due</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Paid</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Balance</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Concession</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500">Late Fee</th>
                      <th className="text-right py-2 px-2 font-medium text-gray-500 w-32">Paying Now</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeHeads.map((head, index) => (
                      <tr key={`${head.fee_head_id}-${head.term_id}`} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="py-2.5 px-2">
                          <input
                            type="checkbox"
                            checked={head.selected}
                            onChange={() => toggleFeeHead(index)}
                            className="w-4 h-4 rounded border-gray-300 text-[#0891B2] focus:ring-[#0891B2]/30"
                          />
                        </td>
                        <td className="py-2.5 px-2 font-medium text-gray-800">{head.fee_head_name}</td>
                        <td className="py-2.5 px-2 text-gray-600">{head.term_name || '-'}</td>
                        <td className="py-2.5 px-2 text-right text-gray-700">{formatCurrency(head.amount_due)}</td>
                        <td className="py-2.5 px-2 text-right text-gray-600">{formatCurrency(head.paid)}</td>
                        <td className="py-2.5 px-2 text-right font-medium text-red-600">{formatCurrency(head.balance)}</td>
                        <td className="py-2.5 px-2 text-right text-gray-500">
                          {head.concession_amount ? formatCurrency(head.concession_amount) : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-right text-orange-600">
                          {head.late_fee ? formatCurrency(head.late_fee) : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            max={head.balance}
                            value={head.paying_now}
                            onChange={(e) => updatePayingNow(index, e.target.value)}
                            disabled={!head.selected}
                            className="w-28 text-right px-2 py-1.5 border border-gray-200 rounded-md text-sm
                              focus:outline-none focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2]
                              disabled:bg-gray-100 disabled:text-gray-400 transition"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td colSpan={8} className="py-3 px-2 text-right font-semibold text-gray-700">Total Paying Now:</td>
                      <td className="py-3 px-2 text-right font-bold text-[#0e3a5c] text-base">{formatCurrency(subtotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ Payment Details Section ═══ */}
        {selectedStudent && feeHeads.length > 0 && !feeLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Payment Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Mode</label>
                <div className="flex flex-wrap gap-2">
                  {['Cash', 'Cheque', 'UPI', 'Online', 'DD'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPaymentMode(mode)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        paymentMode === mode
                          ? 'bg-[#0891B2] text-white border-[#0891B2] shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#0891B2]/40'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Fields */}
              {paymentMode === 'Cheque' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Cheque Number *</label>
                    <input
                      type="text"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="Enter cheque number"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Bank Name *</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Enter bank name"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2] transition"
                    />
                  </div>
                </>
              )}

              {(paymentMode === 'UPI' || paymentMode === 'Online') && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Transaction ID *</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction ID / UTR number"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2] transition"
                  />
                </div>
              )}

              {/* Remarks */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Remarks (optional)</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  placeholder="Any additional notes..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2] transition resize-none"
                />
              </div>
            </div>

            {/* Late Fee Notice */}
            {totalLateFee > 0 && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm text-orange-700">
                  Late fee of <strong>{formatCurrency(totalLateFee)}</strong> has been automatically applied due to overdue payments.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══ Summary & Collect Button ═══ */}
        {selectedStudent && feeHeads.length > 0 && !feeLoading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Collection Summary</h2>

            <div className="space-y-2 max-w-sm">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal ({selectedHeads.length} items)</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {totalLateFee > 0 && (
                <div className="flex justify-between text-sm text-orange-600">
                  <span>Late Fee</span>
                  <span className="font-medium">+ {formatCurrency(totalLateFee)}</span>
                </div>
              )}
              {totalConcession > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Concession Applied</span>
                  <span className="font-medium">- {formatCurrency(totalConcession)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                <span className="text-base font-bold text-[#0e3a5c]">Grand Total</span>
                <span className="text-xl font-bold text-[#0e3a5c]">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Error */}
            {collectionError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-700">{collectionError}</p>
              </div>
            )}

            {/* Collect Button */}
            <button
              onClick={handleCollect}
              disabled={collecting || grandTotal <= 0}
              className="mt-5 w-full md:w-auto px-8 py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300
                disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm
                transition transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {collecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Collect {formatCurrency(grandTotal)} & Generate Receipt
                </>
              )}
            </button>
          </div>
        )}

        {/* ═══ Empty State (no student selected) ═══ */}
        {!selectedStudent && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-base font-medium text-gray-600 mb-1">Search for a student to begin</h3>
            <p className="text-sm text-gray-400">Use the search bar above to find a student by name, admission number, or phone number.</p>
          </div>
        )}
      </div>

      {/* ═══ Receipt Preview Modal ═══ */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            {/* Receipt Content */}
            <div className="p-8" id="receipt-content">
              {/* School Header */}
              <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
                <h2 className="text-xl font-bold text-[#0e3a5c] uppercase">School Fee Receipt</h2>
                <p className="text-xs text-gray-500 mt-1">Computer Generated Receipt</p>
              </div>

              {/* Receipt Meta */}
              <div className="flex justify-between text-sm mb-4">
                <div>
                  <p><strong>Receipt No:</strong> {receiptData.receipt_number}</p>
                  <p><strong>Date:</strong> {receiptData.date}</p>
                </div>
                <div className="text-right">
                  <p><strong>Payment Mode:</strong> {receiptData.payment_mode}</p>
                  <p><strong>Student:</strong> {receiptData.student.name}</p>
                </div>
              </div>

              {/* Student Info */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm grid grid-cols-2 gap-2">
                <p><strong>Admission No:</strong> {receiptData.student.admission_no}</p>
                <p><strong>Class:</strong> {receiptData.student.class}-{receiptData.student.section}</p>
                <p><strong>Father's Name:</strong> {receiptData.student.father_name}</p>
              </div>

              {/* Fee Items Table */}
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2">#</th>
                    <th className="text-left py-2">Fee Head</th>
                    <th className="text-left py-2">Term</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-right py-2">Late Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.fee_items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-2">{idx + 1}</td>
                      <td className="py-2">{item.fee_head_name}</td>
                      <td className="py-2">{item.term_name || '-'}</td>
                      <td className="py-2 text-right">{formatCurrency(item.paying_now)}</td>
                      <td className="py-2 text-right">{item.late_fee ? formatCurrency(item.late_fee) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td colSpan={3} className="py-2">Grand Total</td>
                    <td colSpan={2} className="py-2 text-right text-base">{formatCurrency(receiptData.grand_total)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Amount in Words */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm">
                  <strong>Amount in Words:</strong>{' '}
                  <span className="italic">{numberToWords(Math.round(receiptData.grand_total))}</span>
                </p>
              </div>

              {/* Signature Area */}
              <div className="flex justify-between mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500">
                <span>Parent/Guardian Signature</span>
                <span>Authorized Signatory</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-gray-200 p-4 flex items-center justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowReceipt(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#0891B2] hover:bg-[#0891B2]/90 rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
