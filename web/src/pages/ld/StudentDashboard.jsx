import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import analyticsApi from '../../services/analyticsApi';
import LDChatbot from '../../components/ld/LDChatbot';

// ─── SVG Line Chart ─────────────────────────────────────────────────────
function MiniLineChart({ data, width = 500, height = 140 }) {
  if (!data || data.length === 0) return null;
  const values = data.map(d => d.mastery);
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = points + ` ${width},${height} 0,${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 140 }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#chartGrad)" />
      <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {values.length > 0 && (
        <circle
          cx={(values.length - 1) / (values.length - 1) * width}
          cy={height - ((values[values.length - 1] - min) / range) * (height - 20) - 10}
          r="4" fill="#6366f1" stroke="white" strokeWidth="2"
        />
      )}
    </svg>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const card = { background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const REC_ICONS = ['🎯', '📖', '❓', '🔢', '✏️'];

// ─── Main Component ─────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.getStudentProgress()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ width: 32, height: 32, border: '4px solid #6366f1', borderTop: '4px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!data) return null;

  const firstName = user?.name?.split(' ')[0] || data?.name?.split(' ')[0] || 'Student';
  const level = data?.level ?? 3;
  const streak = data?.streak ?? 5;
  const practiceMinutes = data?.totalPracticeMinutes ?? 444;
  const practiceHours = Math.floor(practiceMinutes / 60);
  const mastery = data?.mastery ?? 72;
  const weekDays = data?.weekDays || [true, true, true, false, false, false, false];
  const weeklyCompleted = data?.weeklyGoal?.completed ?? weekDays.filter(Boolean).length;
  const weeklyTarget = data?.weeklyGoal?.target ?? 5;
  const progressHistory = data?.progressHistory || [];
  const categoryMastery = data?.categoryMastery || [];
  const recentSessions = data?.recentSessions || [];
  const testReady = data?.testReady ?? true;
  const ldType = data?.ldType || 'dyslexia';
  const riskScore = data?.riskScore ?? 45;
  const lastScreeningDate = data?.lastScreeningDate || '2026-05-15';
  const recommendations = data?.recommendations || data?.tips || [];

  return (
    <>
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ═══ ROW 1: Hero Banner + Stats ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 16, marginBottom: 16 }}>
        {/* Hero Banner */}
        <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', borderRadius: 16, padding: '28px 24px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Hi {firstName}! 🌟</h2>
          <p style={{ color: '#e0e7ff', fontSize: 13, margin: '8px 0 0' }}>Every expert was once a beginner. Keep going!</p>
        </div>

        {/* 4 Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { icon: '📋', value: `Lv ${level}`, label: 'Current Level', color: '#4338ca' },
            { icon: '🔥', value: streak, label: 'Day Streak', color: '#ea580c' },
            { icon: '🕐', value: `${practiceHours}h`, label: 'Practice Time', color: '#0f766e' },
            { icon: '💎', value: `${mastery}%`, label: 'Mastery', color: '#16a34a' },
          ].map((s) => (
            <div key={s.label} style={{ ...card, textAlign: 'center', padding: 14 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: '4px 0 2px' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ROW 2: Weekly Goal + Mastery Progress Chart ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 16, marginBottom: 16 }}>
        {/* Weekly Goal */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: 0 }}>📅 Weekly Goal: Practice 5 days</h3>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#4f46e5' }}>{weeklyCompleted}/{weeklyTarget}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
            {DAYS.map((day, i) => {
              const practiced = weekDays[i] === true;
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#fff',
                    background: practiced ? '#22c55e' : i < new Date().getDay() ? '#f87171' : '#e2e8f0',
                  }}>
                    {practiced ? '✓' : i < new Date().getDay() ? '✗' : '—'}
                  </div>
                  <span style={{ fontSize: 10, color: '#64748b', marginTop: 4, display: 'block' }}>{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mastery Progress Chart */}
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 12px' }}>📈 Mastery Progress (Last 30 Days)</h3>
          {progressHistory.length > 1 ? (
            <MiniLineChart data={progressHistory} />
          ) : (
            <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
              Practice more to see your progress chart!
            </div>
          )}
        </div>
      </div>

      {/* ═══ ROW 3: Category Mastery + Recent Practice + Side Cards ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr 3fr', gap: 16, marginBottom: 16 }}>
        {/* Category Mastery */}
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 14px' }}>🎯 Category Mastery</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {categoryMastery.map((cat, i) => {
              const m = cat.mastery ?? 0;
              const color = m >= 70 ? '#10B981' : m >= 40 ? '#F59E0B' : '#EF4444';
              const trendIcon = cat.trend === 'up' ? '↑' : cat.trend === 'down' ? '↓' : '→';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#475569', width: 110, flexShrink: 0 }}>{cat.category?.replace(/_/g, ' ')}</span>
                  <div style={{ flex: 1, height: 7, background: '#f1f5f9', borderRadius: 50, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 50, background: color, width: `${m}%`, transition: 'width 0.7s' }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b', width: 44, textAlign: 'right' }}>{trendIcon} {Math.round(m)}%</span>
                </div>
              );
            })}
            {categoryMastery.length === 0 && (
              <p style={{ color: '#94a3b8', fontSize: 12 }}>Complete practice sessions to see mastery data.</p>
            )}
          </div>
        </div>

        {/* Recent Practice */}
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 14px' }}>🕐 Recent Practice</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentSessions.slice(0, 5).map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none' }}>
                <div>
                  <span style={{ fontSize: 12, color: '#475569' }}>{s.date}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{s.duration} min</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: (s.score || 0) >= 80 ? '#16a34a' : (s.score || 0) >= 60 ? '#ea580c' : '#dc2626' }}>
                  {s.score}%
                </span>
              </div>
            ))}
            {recentSessions.length === 0 && (
              <p style={{ color: '#94a3b8', fontSize: 12 }}>No practice sessions yet.</p>
            )}
          </div>
        </div>

        {/* Side Cards: Level Test + Last Screening */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Level Test CTA */}
          <div style={{ background: testReady ? '#16a34a' : '#64748b', borderRadius: 16, padding: 18, color: '#fff' }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>🏆 Level Test</h4>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: '6px 0 12px' }}>
              {testReady ? `You're ready for Level ${level + 1}!` : 'Keep practicing to unlock'}
            </p>
            <button
              onClick={() => navigate('/ld/tests')}
              style={{ width: '100%', background: '#fff', color: '#16a34a', fontWeight: 700, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13 }}
            >
              Take Test →
            </button>
          </div>

          {/* Last Screening */}
          <div style={card}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#334155', margin: '0 0 10px' }}>📋 Last Screening</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                  background: ldType === 'dyslexia' ? '#f3e8ff' : ldType === 'dyscalculia' ? '#dcfce7' : '#ffedd5',
                  color: ldType === 'dyslexia' ? '#7c3aed' : ldType === 'dyscalculia' ? '#16a34a' : '#ea580c',
                }}>
                  {ldType.replace('_', ' ')}
                </span>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>{lastScreeningDate}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#4f46e5' }}>{riskScore}</span>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>risk score</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ROW 4: Recommendations + Activity Summary ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Recommendations */}
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 14px' }}>⭐ Recommendations for You</h3>
          {recommendations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{REC_ICONS[i % REC_ICONS.length]}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0 }}>
                      {typeof rec === 'string' ? rec : (rec.title || rec.category || 'Practice')}
                    </p>
                    {typeof rec !== 'string' && rec.description && (
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{rec.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate('/ld/practice')}
                    style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', background: '#eef2ff', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Start
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>AI recommendations appear after your first practice sessions.</p>
          )}
        </div>

        {/* Activity Summary */}
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 14px' }}>📊 Activity Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[
              { icon: '✅', value: data?.totalPractices ?? 23, label: 'Total Practices' },
              { icon: '🕐', value: `${practiceHours}h ${practiceMinutes % 60}m`, label: 'Total Time' },
              { icon: '📝', value: data?.totalTests ?? 4, label: 'Tests Taken' },
              { icon: '📊', value: `${data?.avgScore ?? mastery}%`, label: 'Avg Score' },
            ].map((stat) => (
              <div key={stat.label} style={{ background: '#f8fafc', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                <span style={{ fontSize: 18 }}>{stat.icon}</span>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '4px 0 2px' }}>{stat.value}</p>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>

    <LDChatbot studentData={data} />
    </>
  );
}
