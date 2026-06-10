import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import testApi from '../../services/testApi';

const LEVEL_LABELS = ['', 'Basic Recognition', 'Simple Matching', 'Words & Math', 'Sentences', 'Complex Patterns'];

export default function TestsPage() {
  const [available, setAvailable] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([testApi.getAvailable(), testApi.getHistory()])
      .then(([avail, hist]) => { setAvailable(avail); setHistory(hist.attempts || []); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const attemptsLeft = available ? available.maxAttempts - available.attemptsToday : 0;
  const isLocked = attemptsLeft <= 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">📝 Level Tests</h1>
      <p className="text-gray-500 text-sm mb-8">Pass a test to officially advance to the next level</p>

      {/* Available Test Card */}
      {available && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">Available Now</p>
              <h2 className="text-xl font-bold text-gray-800">Level {available.level} Test</h2>
              <p className="text-sm text-gray-500">{LEVEL_LABELS[available.level]}</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-2xl">
              {available.level}
            </div>
          </div>

          {/* Requirements */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-800">{available.questionsCount}</p>
              <p className="text-[10px] text-gray-400">Questions</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-800">{Math.floor(available.timeLimit / 60)} min</p>
              <p className="text-[10px] text-gray-400">Time Limit</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-800">{available.passThreshold}%</p>
              <p className="text-[10px] text-gray-400">To Pass</p>
            </div>
          </div>

          {/* Attempts */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Attempts today:</span>
              <div className="flex gap-1">
                {Array.from({ length: available.maxAttempts }).map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full ${i < available.attemptsToday ? 'bg-gray-300' : 'bg-indigo-500'}`} />
                ))}
              </div>
              <span className="text-xs text-gray-400">{attemptsLeft} left</span>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={() => navigate('/ld/tests/session', { state: { level: available.level } })}
            disabled={isLocked}
            className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
              isLocked
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.01] shadow-md active:scale-[0.99]'
            }`}
          >
            {isLocked ? '🔒 No attempts left today' : 'Start Test →'}
          </button>
          {isLocked && <p className="text-xs text-center text-gray-400 mt-2">Come back tomorrow for more attempts</p>}
        </div>
      )}

      {/* Passed Levels */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Level Progression</h3>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map(lvl => {
            const passed = history.some(h => h.level === lvl && h.passed);
            const isCurrent = available?.level === lvl;
            return (
              <div key={lvl} className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                  ${passed ? 'bg-green-500 text-white' : isCurrent ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-300' : 'bg-gray-100 text-gray-400'}
                `}>
                  {passed ? '🏆' : lvl}
                </div>
                <span className="text-[10px] text-gray-400 mt-1">Lv{lvl}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Test History */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-3">Test History</h3>
        {history.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No tests taken yet</p>
        ) : (
          <div className="space-y-3">
            {history.map((attempt) => (
              <div key={attempt.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                    ${attempt.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                    {attempt.passed ? '✓' : '✗'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Level {attempt.level} Test</p>
                    <p className="text-xs text-gray-400">
                      {new Date(attempt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${attempt.passed ? 'text-green-600' : 'text-red-500'}`}>{attempt.score}%</p>
                  <p className={`text-xs font-medium ${attempt.passed ? 'text-green-500' : 'text-red-400'}`}>
                    {attempt.passed ? 'PASSED' : 'FAILED'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
