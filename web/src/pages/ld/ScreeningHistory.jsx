import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import screeningApi from '../../services/screeningApi';

const LD_TYPE_BADGES = {
  dyslexia: { label: 'Dyslexia', color: '#7C3AED', icon: '📖' },
  dysgraphia: { label: 'Dysgraphia', color: '#EC4899', icon: '✍️' },
  dyscalculia: { label: 'Dyscalculia', color: '#F59E0B', icon: '🔢' },
  mixed: { label: 'Mixed', color: '#EF4444', icon: '🔀' },
  not_detected: { label: 'Not Detected', color: '#10B981', icon: '✅' },
};

export default function ScreeningHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    screeningApi.getHistory()
      .then((data) => setSessions(data.sessions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Screening History</h1>
          <p className="text-gray-500 text-sm">Past assessments and results</p>
        </div>
        <button
          onClick={() => navigate('/ld/screening')}
          className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          New Screening
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-500 text-lg">No screening sessions yet</p>
          <button
            onClick={() => navigate('/ld/screening')}
            className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700"
          >
            Take Your First Screening
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const badge = LD_TYPE_BADGES[session.ld_type_detected] || LD_TYPE_BADGES.not_detected;
            const riskColor = session.risk_score <= 30 ? '#10B981'
              : session.risk_score <= 60 ? '#F59E0B' : '#EF4444';

            return (
              <div
                key={session.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/ld/screening?result=${session.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-gray-50">
                      {badge.icon}
                    </div>
                    <div>
                      <span
                        className="inline-block px-3 py-0.5 rounded-full text-xs font-bold text-white mb-1"
                        style={{ backgroundColor: badge.color }}
                      >
                        {badge.label}
                      </span>
                      <p className="text-sm text-gray-500">
                        {new Date(session.completed_at || session.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold" style={{ color: riskColor }}>
                        {session.risk_score ?? '—'}
                      </div>
                      <div className="text-xs text-gray-400">Risk Score</div>
                    </div>
                    <div className="text-gray-300">→</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
