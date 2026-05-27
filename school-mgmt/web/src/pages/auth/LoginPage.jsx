import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../services/authStore';

export default function LoginPage() {
  const [mode, setMode] = useState('admin'); // admin | otp
  const [form, setForm] = useState({ username: '', password: '', phone: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleAdminLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login/admin', { username: form.username, password: form.password });
      setAuth(data.access, { name: 'Admin', role: 'super_admin' });
      navigate('/dashboard');
    } catch { toast.error('Invalid credentials'); }
    finally { setLoading(false); }
  }

  async function requestOtp(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/otp/request', { phone: form.phone });
      setOtpSent(true);
      toast.success('OTP sent!');
    } catch { toast.error('Failed to send OTP'); }
    finally { setLoading(false); }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/otp/verify', { phone: form.phone, otp: form.otp });
      setAuth(data.access, data.user);
      navigate('/dashboard');
    } catch { toast.error('Invalid OTP'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">School Mgmt</h1>
          <p className="text-gray-500 text-sm mt-1">School Management Automation Platform</p>
        </div>

        <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
          {['admin', 'otp'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2 text-sm font-medium ${mode === m ? 'bg-primary text-white' : 'bg-white text-gray-600'}`}>
              {m === 'admin' ? 'Admin Login' : 'Phone OTP'}
            </button>
          ))}
        </div>

        {mode === 'admin' ? (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input className="input" placeholder="Username" value={form.username} onChange={set('username')} required />
            <input className="input" type="password" placeholder="Password" value={form.password} onChange={set('password')} required />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={otpSent ? verifyOtp : requestOtp} className="space-y-4">
            <input className="input" placeholder="+91 Phone Number" value={form.phone} onChange={set('phone')} required />
            {otpSent && <input className="input" placeholder="Enter OTP" value={form.otp} onChange={set('otp')} required />}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '...' : otpSent ? 'Verify OTP' : 'Send OTP'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .input { @apply w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500; }
        .btn-primary { @apply bg-primary text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-900 disabled:opacity-60 transition-colors; }
      `}</style>
    </div>
  );
}
