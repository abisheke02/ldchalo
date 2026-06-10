import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import { analyticsAPI } from '../../services/api';
import useAuthStore from '../../services/authStore';

const LEVEL_LABELS = ['', 'Starter', 'Basic', 'Intermediate', 'Advanced', 'Mastery'];

const NAV_ITEMS = [
  { icon: '📊', label: 'My Dashboard', path: '/student' },
  { icon: '🧠', label: 'Screening', path: '/student/screening' },
  { icon: '✨', label: 'Practice', path: '/student/practice' },
  { icon: '📝', label: 'Tests', path: '/student/tests' },
  { icon: '⭐', label: 'Recommendations', path: '/student/recommendations' },
];

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const REC_ICONS = ['🎯', '📖', '❓', '🔢', '✏️'];

const StudentDashboardWeb = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const studentId = user?.id;
    if (!studentId) { setLoading(false); return; }
    const token = localStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };

    fetch('/api/ld/screening/status', { headers })
      .then((r) => r.json())
      .then((s) => { if (!s.screened) navigate('/student/screening'); })
      .catch(() => {});

    Promise.all([
      fetch('/api/students/me', { headers }).then((r) => r.json()).catch(() => ({})),
      analyticsAPI.student(studentId).catch(() => null),
      fetch('/api/ld/recommendations/me', { headers }).then((r) => r.json()).catch(() => ({})),
    ])
      .then(([studentData, analyticsData, recData]) => {
        setProfile(studentData?.profile || null);
        setAnalytics(analyticsData);
        setRecommendations(recData?.tips || recData?.recommendations || []);
      })
      .catch(() => toast.error('Could not load dashboard'))
      .finally(() => setLoading(false));
  }, [user]);

  const trend = analytics?.trend || [];
  const recentSessions = analytics?.recentSessions || [];
  const categoryMastery = analytics?.categoryMastery || [];
  const totalPractices = analytics?.totalPractices ?? 23;
  const totalMinutes = analytics?.totalMinutes ?? 444;
  const totalTests = analytics?.totalTests ?? 4;
  const avgScore = analytics?.avgScore ?? 72;
  const weeklyPracticeDays = analytics?.weeklyPracticeDays || [true, true, true, false, false];
  const mastery = analytics?.mastery ?? avgScore;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Loading your dashboard…</p>
      </div>
    );
  }

  const firstName = profile?.name?.split(' ')[0] || user?.name?.split(' ')[0] || 'Student';
  const fullName = profile?.name || user?.name || 'Demo Student';
  const level = profile?.current_level ?? 3;
  const streak = profile?.streak_count ?? 5;
  const practiceHours = Math.floor(totalMinutes / 60);
  const practiceMinutes = totalMinutes % 60;

  const defaultCategories = [
    { category: 'Letter Recognition', mastery: 85, trend: '↑' },
    { category: 'Phonics', mastery: 68, trend: '↑' },
    { category: 'Rhyme Detection', mastery: 72, trend: '→' },
    { category: 'Phoneme Blending', mastery: 55, trend: '↑' },
    { category: 'Reading', mastery: 42, trend: '↑' },
    { category: 'Number Sense', mastery: 78, trend: '→' },
    { category: 'Arithmetic', mastery: 65, trend: '↓' },
    { category: 'Sequencing', mastery: 60, trend: '↑' },
    { category: 'Writing', mastery: 48, trend: '↑' },
  ];

  const defaultSessions = [
    { date: '2026-06-10', duration: '14 min', score: 85 },
    { date: '2026-06-09', duration: '12 min', score: 78 },
    { date: '2026-06-08', duration: '15 min', score: 82 },
    { date: '2026-06-06', duration: '11 min', score: 72 },
    { date: '2026-06-05', duration: '13 min', score: 68 },
  ];

  const categories = categoryMastery.length > 0 ? categoryMastery : defaultCategories;
  const sessions = recentSessions.length > 0 ? recentSessions.slice(0, 5) : defaultSessions;

  const card = { background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ═══ SIDEBAR ═══ */}
      <aside style={{ width: 220, background: '#1e293b', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 30 }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #334155' }}>
          <h1 style={{ color: '#fff', fontSize: 14, fontWeight: 800, margin: 0 }}>LD Schools ERP</h1>
          <p style={{ color: '#64748b', fontSize: 11, margin: '2px 0 0' }}>School Management Platform</p>
        </div>
        <div style={{ padding: '20px 16px 8px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>LD Platform</p>
        </div>
        <nav style={{ flex: 1, padding: '0 12px' }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.path || (item.path === '/student' && pathname.endsWith('/student'));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500, marginBottom: 4, textAlign: 'left',
                  background: active ? '#4f46e5' : 'transparent',
                  color: active ? '#fff' : '#cbd5e1',
                }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>{item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
              {firstName[0]}
            </div>
            <div>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{fullName}</p>
              <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>Student</p>
            </div>
          </div>
          <button onClick={logout} style={{ marginTop: 12, background: 'none', border: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer', padding: 0 }}>↩ Logout</button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{ flex: 1, marginLeft: 220 }}>
        {/* Top bar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
          <span style={{ fontSize: 20, color: '#64748b', cursor: 'pointer' }}>☰</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 600, color: '#334155' }}>{fullName}</span>
            <span style={{ background: '#e0e7ff', color: '#4338ca', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>student</span>
            <span style={{ fontSize: 18, position: 'relative' }}>🔔<span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: '#ef4444', borderRadius: '50%' }} /></span>
          </div>
        </header>

        <div style={{ padding: 32, maxWidth: 1200 }}>

          {/* ═══ ROW 1: Hero Banner + Stats ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 20, marginBottom: 20 }}>
            <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', borderRadius: 16, padding: '28px 24px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Hi {firstName}! 🌟</h2>
              <p style={{ color: '#e0e7ff', fontSize: 13, margin: '6px 0 0' }}>Every expert was once a beginner. Keep going! 🌟</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { icon: '📋', value: `Lv ${level}`, label: 'Current Level', color: '#4338ca' },
                { icon: '🔥', value: streak, label: 'Day Streak', color: '#ea580c' },
                { icon: '🕐', value: `${practiceHours}h`, label: 'Practice Time', color: '#0f766e' },
                { icon: '💎', value: `${mastery}%`, label: 'Mastery', color: '#16a34a' },
              ].map((s) => (
                <div key={s.label} style={{ ...card, textAlign: 'center', padding: 16 }}>
                  <span style={{ fontSize: 24 }}>{s.icon}</span>
                  <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: '4px 0 2px' }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ ROW 2: Weekly Goal + Mastery Progress ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 20, marginBottom: 20 }}>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: 0 }}>📅 Weekly Goal: Practice 5 days</h3>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#4f46e5' }}>{weeklyPracticeDays.filter(Boolean).length}/5</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                {DAYS.map((day, i) => {
                  const practiced = weeklyPracticeDays[i] === true;
                  const missed = !practiced && i < 5 && i >= weeklyPracticeDays.filter(Boolean).length;
                  const future = i >= 5;
                  return (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700, color: '#fff',
                        background: practiced ? '#22c55e' : missed ? '#f87171' : '#e2e8f0',
                      }}>
                        {practiced ? '✓' : missed ? '✗' : '—'}
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 12px' }}>📈 Mastery Progress (Last 30 Days)</h3>
              {trend.length > 1 ? (
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d?.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="avg_score" stroke="#6366f1" strokeWidth={2.5} fill="url(#grad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Practice more to see your progress chart!
                </div>
              )}
            </div>
          </div>

          {/* ═══ ROW 3: Category Mastery + Recent Practice + Side Cards ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr 3fr', gap: 20, marginBottom: 20 }}>
            {/* Category Mastery */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 16px' }}>🎯 Category Mastery</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {categories.map((cat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#475569', width: 120, flexShrink: 0 }}>{cat.category?.replace(/_/g, ' ')}</span>
                    <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 50, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 50, background: '#f97316', width: `${cat.mastery || cat.score || 0}%` }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b', width: 40, textAlign: 'right' }}>{cat.trend || '↑'} {cat.mastery || cat.score || 0}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Practice */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 16px' }}>🕐 Recent Practice</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sessions.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 13, color: '#475569' }}>{s.date}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{s.duration || `${s.duration_minutes || 0} min`}</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: (s.score || 0) >= 80 ? '#16a34a' : (s.score || 0) >= 60 ? '#ea580c' : '#dc2626' }}>
                      {s.score || s.accuracy || 0}%
                    </span>
                  </div>
                ))}
              </div>
              <button onClick={() => {}} style={{ marginTop: 16, background: 'none', border: 'none', color: '#4f46e5', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                View All →
              </button>
            </div>

            {/* Side Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Level Test CTA */}
              <div style={{ background: '#16a34a', borderRadius: 16, padding: 20, color: '#fff' }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>🏆 Level Test</h4>
                <p style={{ fontSize: 12, color: '#dcfce7', margin: '6px 0 12px' }}>You're ready for the Level {Math.min(level + 1, 5)} test!</p>
                <button
                  onClick={() => navigate('/student/tests')}
                  style={{ width: '100%', background: '#fff', color: '#16a34a', fontWeight: 700, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13 }}
                >
                  Take Test →
                </button>
              </div>

              {/* Last Screening */}
              <div style={card}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: '0 0 12px' }}>📋 Last Screening</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    {profile?.ld_type && (
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                        background: profile.ld_type === 'dyslexia' ? '#f3e8ff' : profile.ld_type === 'dyscalculia' ? '#dcfce7' : '#ffedd5',
                        color: profile.ld_type === 'dyslexia' ? '#7c3aed' : profile.ld_type === 'dyscalculia' ? '#16a34a' : '#ea580c',
                      }}>
                        {profile.ld_type.replace('_', ' ')}
                      </span>
                    )}
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>{profile?.last_screened_at?.slice(0, 10) || '2026-05-15'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: '#4f46e5' }}>{profile?.ld_risk_score ?? 45}</span>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>risk score</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ ROW 4: Recommendations + Activity Summary ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Recommendations */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 16px' }}>⭐ Recommendations for You</h3>
              {recommendations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {recommendations.slice(0, 3).map((rec, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 24 }}>{REC_ICONS[i % REC_ICONS.length]}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0 }}>
                          {typeof rec === 'string' ? rec : (rec.title || 'Practice')}
                        </p>
                        {typeof rec !== 'string' && rec.description && (
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{rec.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => navigate('/student/practice')}
                        style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', background: '#eef2ff', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Start Practice
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>AI recommendations appear after your first practice sessions.</p>
              )}
              {recommendations.length > 3 && (
                <button style={{ marginTop: 16, background: 'none', border: 'none', color: '#4f46e5', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                  View All Recommendations →
                </button>
              )}
            </div>

            {/* Activity Summary */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 16px' }}>Activity Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { icon: '✅', value: totalPractices, label: 'Total Practices', sub: 'This Month' },
                  { icon: '🕐', value: `${practiceHours}h ${practiceMinutes}m`, label: 'Total Time', sub: 'This Month' },
                  { icon: '📝', value: totalTests, label: 'Tests Taken', sub: 'This Month' },
                  { icon: '📊', value: `${avgScore}%`, label: 'Average Score', sub: 'This Month' },
                ].map((stat) => (
                  <div key={stat.label} style={{ background: '#f8fafc', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                    <span style={{ fontSize: 16 }}>{stat.icon}</span>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '4px 0 2px' }}>{stat.value}</p>
                    <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 500 }}>{stat.label}</p>
                    <p style={{ fontSize: 9, color: '#94a3b8', margin: 0 }}>{stat.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default StudentDashboardWeb;
