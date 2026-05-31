import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

const CHANNELS = ['all', 'sms', 'whatsapp', 'email'];
const STATUSES = ['all', 'queued', 'sent', 'delivered', 'failed'];

const channelBadge = (channel) => {
  const styles = {
    sms: 'bg-purple-100 text-purple-700',
    whatsapp: 'bg-green-100 text-green-700',
    email: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[channel] || 'bg-gray-100 text-gray-700'}`}>
      {channel === 'whatsapp' ? 'WhatsApp' : channel?.toUpperCase()}
    </span>
  );
};

const statusBadge = (status) => {
  const styles = {
    queued: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
};

export default function MessageLogPage() {
  const [summary, setSummary] = useState({ sent_today: 0, delivered: 0, failed: 0, pending: 0 });
  const [messages, setMessages] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [resending, setResending] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters
  const [channel, setChannel] = useState('all');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/school/communication-extended/log/summary');
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to fetch summary', err);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (channel !== 'all') params.channel = channel;
      if (status !== 'all') params.status = status;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/school/communication-extended/log', { params });
      setMessages(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch messages', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [page, channel, status, dateFrom, dateTo, search]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const handleFilter = () => {
    setPage(1);
    fetchMessages();
  };

  const handleResend = async (id, e) => {
    e.stopPropagation();
    setResending(id);
    try {
      await api.post(`/school/communication-extended/log/${id}/resend`);
      showToast('Message queued for resend', 'success');
      fetchMessages();
      fetchSummary();
    } catch (err) {
      showToast(err.response?.data?.message || 'Resend failed', 'error');
    } finally {
      setResending(null);
    }
  };

  const handleExport = () => {
    showToast('Coming soon', 'info');
  };

  const summaryCards = [
    { label: 'Sent Today', value: summary.sent_today, color: 'text-blue-600', bg: 'bg-blue-50', icon: '📤' },
    { label: 'Delivered', value: summary.delivered, color: 'text-green-600', bg: 'bg-green-50', icon: '✅' },
    { label: 'Failed', value: summary.failed, color: 'text-red-600', bg: 'bg-red-50', icon: '❌' },
    { label: 'Pending', value: summary.pending, color: 'text-amber-600', bg: 'bg-amber-50', icon: '⏳' },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
          toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-[#0891B2]'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0e3a5c]">Message Log</h1>
          <p className="text-sm text-gray-500 mt-1">Delivery report and message history</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>📥</span> Export
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center text-lg`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Channel</label>
            <select
              value={channel}
              onChange={(e) => { setChannel(e.target.value); setPage(1); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2]"
            >
              {CHANNELS.map((ch) => (
                <option key={ch} value={ch}>{ch === 'all' ? 'All Channels' : ch === 'whatsapp' ? 'WhatsApp' : ch.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2]"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2]"
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2]"
            />
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search Recipient</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
              placeholder="Phone or email..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0891B2]/30 focus:border-[#0891B2]"
            />
          </div>

          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-[#0891B2] text-white text-sm font-medium rounded-lg hover:bg-[#0891B2]/90 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#0891B2]/30 border-t-[#0891B2] rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">No messages found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Date/Time</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Channel</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Recipient</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Subject / Preview</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Triggered By</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => (
                    <React.Fragment key={msg._id}>
                      <tr
                        onClick={() => setExpandedId(expandedId === msg._id ? null : msg._id)}
                        className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                          {new Date(msg.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-3">{channelBadge(msg.channel)}</td>
                        <td className="px-5 py-3 text-gray-700 font-mono text-xs">{msg.recipient}</td>
                        <td className="px-5 py-3 text-gray-700 max-w-[250px] truncate">
                          {msg.subject || msg.preview || '—'}
                        </td>
                        <td className="px-5 py-3">{statusBadge(msg.status)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium ${msg.triggered_by === 'system' ? 'text-gray-500' : 'text-[#0891B2]'}`}>
                            {msg.triggered_by === 'system' ? '⚙️ System' : '👤 Manual'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {msg.status === 'failed' && (
                            <button
                              onClick={(e) => handleResend(msg._id, e)}
                              disabled={resending === msg._id}
                              className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {resending === msg._id ? 'Resending...' : 'Resend'}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Detail Row */}
                      {expandedId === msg._id && (
                        <tr className="bg-gray-50/80">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Full Message</p>
                                <p className="text-gray-700 bg-white rounded-lg p-3 border border-gray-100 whitespace-pre-wrap text-xs">
                                  {msg.body || msg.preview || 'No message content available'}
                                </p>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">Provider Message ID</p>
                                  <p className="text-gray-700 font-mono text-xs bg-white rounded-lg p-3 border border-gray-100">
                                    {msg.provider_message_id || '—'}
                                  </p>
                                </div>
                                {msg.status === 'failed' && msg.error_details && (
                                  <div>
                                    <p className="text-xs font-medium text-red-600 mb-1">Error Details</p>
                                    <p className="text-red-700 text-xs bg-red-50 rounded-lg p-3 border border-red-100">
                                      {msg.error_details}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, totalCount)} of {totalCount} messages
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-600 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
