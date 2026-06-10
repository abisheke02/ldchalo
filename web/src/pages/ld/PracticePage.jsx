import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import practiceApi from '../../services/practiceApi';
import ProgressRing from '../../components/practice/ProgressRing';
import StreakDisplay from '../../components/practice/StreakDisplay';

// ─── Motivational quotes ────────────────────────────────────────────
const QUOTES = [
  { text: "Every expert was once a beginner.", icon: "🌱" },
  { text: "Practice makes progress!", icon: "📈" },
  { text: "You're braver than you believe.", icon: "🦁" },
  { text: "Small steps lead to big changes.", icon: "👣" },
  { text: "Your brain is growing stronger every day!", icon: "🧠" },
  { text: "Mistakes help your brain learn!", icon: "💡" },
  { text: "You can do hard things!", icon: "💪" },
];
const getQuote = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

// ─── Level badge colors ─────────────────────────────────────────────
const LEVEL_COLORS = {
  1: { bg: 'from-blue-400 to-blue-600', text: 'Beginner' },
  2: { bg: 'from-green-400 to-green-600', text: 'Explorer' },
  3: { bg: 'from-purple-400 to-purple-600', text: 'Achiever' },
  4: { bg: 'from-orange-400 to-orange-600', text: 'Champion' },
  5: { bg: 'from-red-400 to-pink-600', text: 'Master' },
};

export default function PracticePage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [history, setHistory] = useState([]);
  const [streak, setStreak] = useState({ count: 0, lastSevenDays: [] });
  const [loading, setLoading] = useState(true);
  const [quote] = useState(getQuote);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [progressData, historyData, streakData] = await Promise.allSettled([
        practiceApi.getProgress(),
        practiceApi.getHistory(),
        practiceApi.getStreak(),
      ]);
      if (progressData.status === 'fulfilled') setProgress(progressData.value);
      if (historyData.status === 'fulfilled') setHistory(historyData.value.sessions || []);
      if (streakData.status === 'fulfilled') setStreak(streakData.value);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPractice = () => {
    navigate('/ld/practice/session');
  };

  const level = progress?.level || 1;
  const levelInfo = LEVEL_COLORS[level] || LEVEL_COLORS[1];
  const mastery = progress?.mastery || 0;
  const accuracy = progress?.accuracy || 0;
  const totalSessions = progress?.totalSessions || 0;
  const categoryMastery = progress?.categoryMastery || {};

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] pb-8">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-100 rounded-full -translate-y-1/3 translate-x-1/3 opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Practice</h1>
            <p className="text-sm text-gray-500">Build your skills every day 🌟</p>
          </div>
          <StreakDisplay count={streak.count} lastSevenDays={streak.lastSevenDays} />
        </div>

        {/* Level + Mastery cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Level badge */}
          <div className={`bg-gradient-to-br ${levelInfo.bg} rounded-2xl p-5 text-white shadow-lg`}>
            <div className="text-4xl font-black">{level}</div>
            <div className="text-sm opacity-80 mt-1">Level</div>
            <div className="text-xs font-semibold opacity-70 mt-0.5">{levelInfo.text}</div>
          </div>

          {/* Mastery ring */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <ProgressRing percent={mastery} color="#4F46E5" size={80} sublabel="mastery" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <div className="text-xl font-bold text-green-600">{accuracy}%</div>
            <div className="text-xs text-gray-400">Accuracy</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <div className="text-xl font-bold text-indigo-600">{totalSessions}</div>
            <div className="text-xs text-gray-400">Sessions</div>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <div className="text-xl font-bold text-purple-600">{streak.count}</div>
            <div className="text-xs text-gray-400">Streak</div>
          </div>
        </div>

        {/* Category mastery bars */}
        {Object.keys(categoryMastery).length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Category Progress</h3>
            <div className="space-y-3">
              {Object.entries(categoryMastery).map(([category, value]) => (
                <div key={category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-500 capitalize">
                      {category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-gray-400">{value}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${value}%`,
                        background: value > 70 ? '#10B981' : value > 40 ? '#F59E0B' : '#4F46E5',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* START PRACTICE button */}
        <button
          onClick={handleStartPractice}
          className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xl font-black
            rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-200 relative overflow-hidden group mb-6"
        >
          {/* Animated glow */}
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
          <span className="relative">Start Practice 🚀</span>
        </button>

        {/* Motivational quote */}
        <div className="bg-white/60 backdrop-blur-sm rounded-xl px-5 py-4 mb-6 border border-indigo-100 text-center">
          <span className="text-2xl mr-2">{quote.icon}</span>
          <span className="text-sm text-gray-600 italic">{quote.text}</span>
        </div>

        {/* Recent sessions */}
        {history.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Recent Sessions</h3>
            <div className="space-y-2">
              {history.slice(0, 5).map((session, i) => (
                <div key={session.id || i} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📝</span>
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        {new Date(session.created_at || session.date).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short',
                        })}
                      </div>
                      <div className="text-xs text-gray-400">
                        {session.duration_minutes || Math.round((session.duration_seconds || 0) / 60)} min
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-indigo-600">
                      {session.score || session.accuracy || 0}%
                    </div>
                    <div className="text-xs text-gray-400">score</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
