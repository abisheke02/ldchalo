import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

const ROLE_REDIRECT = {
  super_admin:  '/admin',
  school_admin: '/school',
  teacher:      '/ld/teacher',
  parent:       '/ld/parent',
  student:      '/ld/student',
};

export default function LoginPage() {
  const [tab, setTab]       = useState('teacher');
  const [form, setForm]     = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const { setAuth }         = useAuthStore();
  const navigate            = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const login = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (tab === 'admin') {
        res = await api.post('/auth/credentials', { username: form.username, password: form.password });
      } else {
        res = await api.post('/auth/login', { email: form.email, password: form.password });
      }
      const { token, user } = res.data;
      setAuth(token, user);
      navigate(ROLE_REDIRECT[user.role] || '/');
    } catch (err) {
      setError(err?.error || err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (role) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/demo', { role });
      setAuth(data.token, data.user);
      navigate(ROLE_REDIRECT[data.user.role] || '/');
    } catch {
      setError('Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'teacher', label: 'Teacher / Staff' },
    { id: 'student', label: 'Student' },
    { id: 'parent',  label: 'Parent' },
    { id: 'admin',   label: 'Admin' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">📖</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">LD Schools</h1>
          <p className="text-gray-500 text-sm mt-1">School ERP + Learning Disability Platform</p>
        </div>

        <div className="card">
          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6 gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setError(''); }}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
                  tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={login} className="space-y-4">
            {tab === 'admin' ? (
              <>
                <input className="input" placeholder="Username" autoComplete="username" onChange={set('username')} required />
                <input className="input" type="password" placeholder="Password" autoComplete="current-password" onChange={set('password')} required />
              </>
            ) : (
              <>
                <input className="input" type="email" placeholder="Email address" autoComplete="email" onChange={set('email')} required />
                <input className="input" type="password" placeholder="Password" autoComplete="current-password" onChange={set('password')} required />
              </>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo buttons */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3">Try a demo account</p>
            <div className="grid grid-cols-2 gap-2">
              {['teacher','student','parent'].map((r) => (
                <button key={r} onClick={() => demoLogin(r)} disabled={loading}
                  className="btn-outline text-xs capitalize"
                >
                  Demo {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Don't have an account? Contact your school admin.
        </p>
      </div>
    </div>
  );
}
