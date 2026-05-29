import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../services/authStore';

const StudentInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setDemoAuth } = useAuthStore();

  const [student, setStudent] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | valid | invalid | expired | done
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/auth/student-invite/${token}`)
      .then((r) => {
        if (r.status === 410) return r.json().then((d) => { setStatus('expired'); throw new Error(d.error); });
        if (!r.ok) return r.json().then((d) => { setStatus('invalid'); throw new Error(d.error); });
        return r.json();
      })
      .then((d) => { setStudent(d); setStatus('valid'); })
      .catch((err) => { if (status === 'loading') setStatus('invalid'); });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    setSubmitting(true);
    try {
      const resp = await fetch(`/api/auth/student-invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Activation failed');
      setDemoAuth(data.user, data.token);
      toast.success(`Welcome, ${data.user.name}!`);
      navigate('/student');
    } catch (err) {
      toast.error(err.message || 'Activation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-blue-800 mb-1">LD Support</h1>
          <p className="text-slate-500 text-sm font-medium">Student Activation</p>
        </div>

        {status === 'loading' && (
          <div className="text-center py-12 text-slate-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Verifying invite link…
          </div>
        )}

        {status === 'invalid' && (
          <div className="text-center py-8 space-y-3">
            <p className="text-4xl">❌</p>
            <p className="font-bold text-slate-800">Invalid invite link</p>
            <p className="text-slate-500 text-sm">This link doesn't exist. Ask your teacher to resend the invite.</p>
            <button onClick={() => navigate('/login')} className="text-blue-600 font-bold text-sm hover:underline">
              Go to Login
            </button>
          </div>
        )}

        {status === 'expired' && (
          <div className="text-center py-8 space-y-3">
            <p className="text-4xl">⏰</p>
            <p className="font-bold text-slate-800">Invite link expired</p>
            <p className="text-slate-500 text-sm">Links are valid for 24 hours. Ask your teacher to send a new invite.</p>
            <button onClick={() => navigate('/login')} className="text-blue-600 font-bold text-sm hover:underline">
              Go to Login
            </button>
          </div>
        )}

        {status === 'valid' && student && (
          <div className="space-y-5">
            <div className="bg-blue-50 rounded-xl px-5 py-4 border border-blue-100">
              <p className="text-sm text-slate-600">Setting up account for</p>
              <p className="text-lg font-black text-slate-800">{student.name}</p>
              <p className="text-sm text-slate-500">{student.email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Set Password</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-blue-200 transition disabled:bg-blue-300"
              >
                {submitting ? 'Activating…' : 'Activate & Start Learning'}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400">
              Already have a password?{' '}
              <button onClick={() => navigate('/login')} className="text-blue-600 font-bold hover:underline">
                Login here
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentInvitePage;
