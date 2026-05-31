import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const Tab = ({ id, label, icon, active, onClick }) => (
  <button onClick={() => onClick(id)}
    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
      active ? 'border-[#0891B2] text-[#0891B2]' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`}
  >
    <span>{icon}</span>{label}
  </button>
);

/* ── Circulars ── */
function Circulars() {
  const [circulars, setCirculars] = useState([]);
  const [form, setForm]           = useState({ title: '', body: '', audience: 'all' });
  const [rephrasing, setRephrasing] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [showForm, setShowForm]   = useState(false);

  useEffect(() => {
    api.get('/school/communications/circulars').then((r) => setCirculars(r.data)).catch(() => {});
  }, []);

  const rephrase = async () => {
    if (!form.body.trim()) return;
    setRephrasing(true);
    try {
      const { data } = await api.post('/school/communications/ai/rephrase', { text: form.body, tone: 'professional' });
      setForm((f) => ({ ...f, body: data.rephrased }));
    } catch { alert('AI rephrase failed'); }
    finally { setRephrasing(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/school/communications/circulars', form);
      setCirculars((p) => [data, ...p]);
      setForm({ title: '', body: '', audience: 'all' });
      setShowForm(false);
    } catch { alert('Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-gray-900">School Circulars</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg hover:bg-[#0e7490]"
        >
          + New Circular
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Create Circular</h3>
          <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Circular title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <div className="relative">
            <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              placeholder="Circular body text…" value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
            <button onClick={rephrase} disabled={rephrasing || !form.body}
              className="absolute bottom-2 right-2 text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
            >
              {rephrasing ? '✨ Rephrasing…' : '✨ AI Rephrase'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600">Audience:</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
            >
              <option value="all">All</option>
              <option value="students">Students</option>
              <option value="teachers">Teachers</option>
              <option value="parents">Parents</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={saving || !form.title}
              className="px-5 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg hover:bg-[#0e7490] disabled:opacity-50"
            >
              {saving ? 'Publishing…' : 'Publish Circular'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {circulars.length === 0 ? (
          <p className="text-center text-gray-400 py-10">No circulars yet</p>
        ) : circulars.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{c.title}</h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{c.body}</p>
              </div>
              <span className="text-xs text-gray-400 shrink-0 ml-3">
                {new Date(c.created_at).toLocaleDateString('en-IN')}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium capitalize">{c.audience}</span>
              <span className="text-xs text-gray-400">by {c.created_by_name || 'You'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Notifications ── */
function Notifications() {
  const [notifs, setNotifs]   = useState([]);
  const [form, setForm]       = useState({ title: '', body: '', type: 'announcement' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get('/school/communications/notifications').then((r) => setNotifs(r.data?.notifications || [])).catch(() => {});
  }, []);

  const markAllRead = async () => {
    await api.post('/school/communications/notifications/mark-all-read').catch(() => {});
    setNotifs((p) => p.map((n) => ({ ...n, is_read: true })));
  };

  const unread = notifs.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-gray-900">Notifications {unread > 0 && <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{unread}</span>}</h2>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-sm text-[#0891B2] font-medium hover:underline">
            Mark all read
          </button>
        )}
      </div>
      <div className="space-y-2">
        {notifs.length === 0
          ? <p className="text-center text-gray-400 py-10">No notifications</p>
          : notifs.map((n) => (
            <div key={n.id} className={`flex gap-4 p-4 rounded-xl border ${n.is_read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-200'}`}>
              <span className="text-xl shrink-0">
                {{ screening_reminder: '📋', level_up: '🏆', announcement: '📢', recommendation: '💡' }[n.type] || '🔔'}
              </span>
              <div className="flex-1">
                <p className={`text-sm ${n.is_read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</p>
                {n.body && <p className="text-xs text-gray-500 mt-1">{n.body}</p>}
                <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('en-IN')}</p>
              </div>
              {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />}
            </div>
          ))
        }
      </div>
    </div>
  );
}

/* ── Bulk SMS placeholder ── */
function BulkSMS() {
  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
        <p className="font-semibold text-yellow-800">⚠️ SMS Gateway Not Configured</p>
        <p className="text-sm text-yellow-700 mt-1">Go to <strong>Settings → SMS Configuration</strong> to connect your SMS gateway (Twilio / MSG91 / Fast2SMS).</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 opacity-50 pointer-events-none">
        <h3 className="font-semibold text-gray-900">Send Bulk SMS</h3>
        <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[80px]" placeholder="Message text (160 characters recommended)…" />
        <div className="flex gap-3">
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option>All Parents</option>
            <option>Class-wise</option>
            <option>Fee Defaulters</option>
          </select>
          <button className="px-5 py-2 bg-[#0891B2] text-white text-sm font-semibold rounded-lg">Send SMS</button>
        </div>
      </div>
    </div>
  );
}

export default function CommunicationsPage() {
  const [tab, setTab] = useState('circulars');

  const TABS = [
    { id: 'circulars',      label: 'Circulars',      icon: '📋' },
    { id: 'notifications',  label: 'Notifications',  icon: '🔔' },
    { id: 'sms',            label: 'Bulk SMS',       icon: '📱' },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Communication</h1>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map((t) => <Tab key={t.id} {...t} active={tab === t.id} onClick={setTab} />)}
        </div>
        <div className="p-5">
          {tab === 'circulars'     && <Circulars />}
          {tab === 'notifications' && <Notifications />}
          {tab === 'sms'           && <BulkSMS />}
        </div>
      </div>
    </div>
  );
}
