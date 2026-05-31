import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function RecommendationsPage() {
  const [rec, setRec]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ld/recommendations/me')
      .then((r) => setRec(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Learning Tips</h1>

      {loading ? (
        <div className="card text-center text-gray-400 py-12">Loading your tips…</div>
      ) : rec?.tips?.length ? (
        <div className="space-y-3">
          {rec.tips.map((tip, i) => (
            <div key={i} className="card flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                {i + 1}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{tip}</p>
            </div>
          ))}
          {rec.generated_at && (
            <p className="text-xs text-gray-400 text-center">
              Generated {new Date(rec.generated_at).toLocaleDateString('en-IN')}
            </p>
          )}
        </div>
      ) : (
        <div className="card text-center space-y-3 py-12">
          <p className="text-4xl">💡</p>
          <p className="text-gray-600">No tips yet. Complete your screening first!</p>
        </div>
      )}
    </div>
  );
}
