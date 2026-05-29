import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const AddStudentModal = ({ isOpen, onClose, classData, onStudentAdded }) => {
  const [tab, setTab] = useState('manual');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Invite by email state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/schools/classes', { headers: authHeader })
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen || !classData) return null;

  const reset = () => {
    setName(''); setPhone(''); setEmail(''); setSelectedClass('');
    setInviteName(''); setInviteEmail(''); setInviteLink('');
  };

  const handleTabChange = (t) => { setTab(t); setInviteLink(''); };

  const copyCode = () => {
    navigator.clipboard.writeText(classData.join_code);
    toast.success('Join code copied!');
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Student name is required'); return; }
    setLoading(true);
    try {
      const targetClassId = selectedClass || classData.id;
      const resp = await fetch(`/api/schools/classes/${targetClassId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to add student');
      toast.success(`${name} added to class!`);
      reset();
      onStudentAdded?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setLoading(true);
    setInviteLink('');
    try {
      const resp = await fetch(`/api/schools/classes/${classData.id}/invite-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ name: inviteName.trim(), email: inviteEmail.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to send invite');
      toast.success('Invite sent!');
      if (data.inviteLink) {
        setInviteLink(data.inviteLink);
      } else {
        reset();
        onStudentAdded?.();
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Add Student</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            {[
              { key: 'manual', label: '✏️ Manual' },
              { key: 'invite', label: '✉️ Email Invite' },
              { key: 'code',   label: '🔑 Join Code' },
            ].map((t) => (
              <button key={t.key} type="button" onClick={() => handleTabChange(t.key)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Manual add */}
          {tab === 'manual' && (
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Student Name *</label>
                <input type="text" placeholder="e.g. Arjun Kumar" value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 transition-colors"
                  required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Class</label>
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors">
                  <option value="">— Current class ({classData.class_name}) —</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Phone (optional)</label>
                <input type="tel" placeholder="+91XXXXXXXXXX" value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Email (optional)</label>
                <input type="email" placeholder="student@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:bg-blue-300">
                {loading ? 'Adding…' : '+ Add Student'}
              </button>
            </form>
          )}

          {/* Email invite */}
          {tab === 'invite' && (
            <div className="space-y-4">
              {inviteLink ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-amber-700 mb-2">SMTP not configured — share this link with the student:</p>
                    <p className="text-xs font-mono break-all text-slate-700">{inviteLink}</p>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Link copied!'); }}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">
                    Copy Invite Link
                  </button>
                  <button onClick={() => { reset(); onStudentAdded?.(); onClose(); }}
                    className="w-full border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition">
                    Done
                  </button>
                </>
              ) : (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 font-medium">
                    An invite link will be sent to the student's Gmail. They set their own password and get auto-enrolled in <strong>{classData.class_name}</strong>.
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Student Name *</label>
                    <input type="text" placeholder="e.g. Priya Sharma" value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 transition-colors"
                      required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Student Gmail *</label>
                    <input type="email" placeholder="student@gmail.com" value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      required />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:bg-blue-300">
                    {loading ? 'Sending…' : '✉️ Send Invite'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Join code */}
          {tab === 'code' && (
            <div className="text-center space-y-6">
              <div className="bg-blue-50 rounded-3xl p-8 border-2 border-blue-100 border-dashed">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2">Class Join Code</p>
                <p className="text-5xl font-black text-blue-700 tracking-[0.1em] font-mono">{classData.join_code}</p>
              </div>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                Students can join <span className="font-bold text-slate-800">{classData.class_name}</span> by entering this code in their app.
              </p>
              <button onClick={copyCode}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-95">
                Copy Join Code
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {classData.class_name} • Secure Enrollment
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddStudentModal;
