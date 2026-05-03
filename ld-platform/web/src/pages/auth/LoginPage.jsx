import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../services/authStore';
import { complianceAPI } from '../../services/api';
import { trackLogin, trackDemoLogin } from '../../services/analytics';

const ConsentModal = ({ onAccept }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
      <h2 className="text-lg font-extrabold text-slate-800">Data Privacy Consent</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        LD Support Platform collects and processes student learning data to provide personalised
        support. This is governed by India's <strong>DPDP Act 2023</strong>.
      </p>
      <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
        <li>Learning progress and assessment scores</li>
        <li>Error patterns for targeted recommendations</li>
        <li>Usage analytics to improve the platform</li>
      </ul>
      <p className="text-xs text-slate-400">
        You can request data export or account deletion at any time from Settings.
      </p>
      <button
        onClick={onAccept}
        className="w-full bg-blue-700 text-white font-bold py-3 rounded-xl text-sm hover:bg-blue-800 transition"
      >
        I Understand &amp; Agree
      </button>
    </div>
  </div>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const { setDemoAuth, demoLogin } = useAuthStore();
  const [portalTab, setPortalTab] = useState('teacher');
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [pendingNav, setPendingNav] = useState(null);

  // Teacher / Parent form fields
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('teacher');

  // Admin form fields
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleConsentAccept = async () => {
    await complianceAPI.recordConsent('data_processing').catch(() => {});
    navigate(pendingNav || '/dashboard');
    setPendingNav(null);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword.trim()) {
      toast.error('Enter username and password');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername.trim(), password: adminPassword }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Login failed');
      setDemoAuth(data.user, data.token);
      trackLogin('credentials', 'admin');
      toast.success('Welcome, Admin!');
      navigate('/admin');
    } catch (err) {
      toast.error(err.message || 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Login failed');
      setDemoAuth(data.user, data.token);
      trackLogin('email', data.user.role);
      toast.success(`Welcome back, ${data.user.name || 'User'}!`);
      const dest = data.user.role === 'parent' ? '/parent' : '/dashboard';
      if (data.isNewUser) setPendingNav(dest);
      else navigate(dest);
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Registration failed');
      setDemoAuth(data.user, data.token);
      toast.success('Account created! Welcome.');
      const dest = data.user.role === 'parent' ? '/parent' : '/dashboard';
      setPendingNav(dest);
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {pendingNav && <ConsentModal onAccept={handleConsentAccept} />}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-blue-800 mb-2">LD Support</h1>
            <p className="text-slate-500 font-medium">School Platform</p>
          </div>

          {/* Portal tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            {['teacher', 'parent', 'admin'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setPortalTab(tab); setMode('login'); }}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all capitalize ${
                  portalTab === tab
                    ? 'bg-white shadow-sm ' + (tab === 'admin' ? 'text-purple-700' : tab === 'parent' ? 'text-green-700' : 'text-blue-700')
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'teacher' ? '🏫' : tab === 'parent' ? '👨‍👩‍👧' : '🔑'} {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Admin form */}
          {portalTab === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Username</label>
                <input
                  type="text"
                  placeholder="admin"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-500 transition-colors"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-purple-500 transition-colors"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-purple-200 transition-all disabled:bg-purple-300"
              >
                {loading ? 'Signing in…' : 'Sign In as Admin'}
              </button>
            </form>
          )}

          {/* Teacher / Parent form */}
          {(portalTab === 'teacher' || portalTab === 'parent') && (
            <>
              {/* Login form */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Email</label>
                    <input
                      type="email"
                      placeholder={portalTab === 'parent' ? 'parent@email.com' : 'teacher@school.com'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-blue-200 transition-all disabled:bg-blue-300"
                  >
                    {loading ? 'Signing in…' : 'Login'}
                  </button>
                  <p className="text-center text-sm text-slate-500">
                    New here?{' '}
                    <button type="button" onClick={() => { setMode('register'); setRole(portalTab); }} className="text-blue-600 font-bold hover:underline">
                      Create account
                    </button>
                  </p>
                </form>
              )}

              {/* Register form */}
              {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Full Name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Email</label>
                    <input
                      type="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Password</label>
                    <input
                      type="password"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="teacher">Teacher</option>
                      <option value="parent">Parent</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-blue-200 transition-all disabled:bg-blue-300"
                  >
                    {loading ? 'Creating account…' : 'Create Account'}
                  </button>
                  <p className="text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <button type="button" onClick={() => setMode('login')} className="text-blue-600 font-bold hover:underline">
                      Login
                    </button>
                  </p>
                </form>
              )}

              {/* Demo buttons */}
              <div className="relative py-4 mt-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">Or for testing</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await demoLogin('teacher');
                      trackDemoLogin('teacher');
                      toast.success('Demo Teacher — entering dashboard');
                      navigate('/dashboard');
                    } catch (err) {
                      toast.error(err?.message || 'Demo login failed');
                    } finally { setLoading(false); }
                  }}
                  className="border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50 text-blue-700 font-bold py-3 rounded-xl transition-all text-sm"
                >
                  🏫 Demo Teacher
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await demoLogin('student');
                      trackDemoLogin('student');
                      toast.success('Demo Student — entering dashboard');
                      navigate('/student');
                    } catch (err) {
                      toast.error(err?.message || 'Demo login failed');
                    } finally { setLoading(false); }
                  }}
                  className="border-2 border-slate-100 hover:border-purple-200 hover:bg-purple-50 text-purple-700 font-bold py-3 rounded-xl transition-all text-sm"
                >
                  🎒 Demo Student
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default LoginPage;
