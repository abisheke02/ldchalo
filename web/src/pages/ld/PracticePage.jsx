import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const TYPE_COLOR = { phonics: 'bg-purple-50 text-purple-700', reading: 'bg-blue-50 text-blue-700', writing: 'bg-orange-50 text-orange-700', math: 'bg-green-50 text-green-700' };
const TYPE_ICON  = { phonics: '🔤', reading: '📖', writing: '✏️', math: '🔢' };

export default function PracticePage() {
  const [exercises, setExercises] = useState([]);
  const [active, setActive]       = useState(null);
  const [answer, setAnswer]       = useState('');
  const [result, setResult]       = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [type, setType]           = useState('');

  const loadExercises = (t = '') => {
    const params = t ? { type: t } : {};
    api.get('/ld/practice/exercises', { params }).then((r) => setExercises(r.data)).catch(() => {});
  };

  useEffect(() => {
    api.post('/ld/practice/sessions/start', { session_type: 'practice' })
      .then((r) => setSessionId(r.data.id)).catch(() => {});
    loadExercises();
  }, []);

  const attempt = async (ex) => {
    if (!answer.trim()) return;
    const { data } = await api.post(`/ld/practice/sessions/${sessionId}/attempt`, {
      exercise_id: ex.id,
      user_answer: answer,
      correct_answer: ex.content?.choices?.[0] || '',
    });
    setResult(data);
    setTimeout(() => { setResult(null); setActive(null); setAnswer(''); }, 1500);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Practice</h1>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {['' , 'phonics', 'reading', 'writing', 'math'].map((t) => (
          <button key={t || 'all'} onClick={() => { setType(t); loadExercises(t); }}
            className={`text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
              type === t ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t ? `${TYPE_ICON[t]} ${t}` : 'All'}
          </button>
        ))}
      </div>

      {/* Exercise grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {exercises.map((ex) => (
          <button key={ex.id} onClick={() => { setActive(ex); setAnswer(''); setResult(null); }}
            className={`card text-left hover:shadow-md transition-shadow ${active?.id === ex.id ? 'ring-2 ring-indigo-500' : ''}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{TYPE_ICON[ex.type]}</span>
              <span className={`badge ${TYPE_COLOR[ex.type]}`}>{ex.type}</span>
              <span className="text-xs text-gray-400 ml-auto">L{ex.level}</span>
            </div>
            <p className="font-semibold text-gray-900 text-sm">{ex.title}</p>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ex.instructions}</p>
          </button>
        ))}
      </div>

      {/* Active exercise */}
      {active && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold text-gray-900">{active.title}</h3>
              <button onClick={() => { setActive(null); setResult(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <p className="text-sm text-gray-600">{active.instructions}</p>

            {active.content?.choices && (
              <div className="grid grid-cols-2 gap-2">
                {active.content.choices.map((c) => (
                  <button key={c} onClick={() => setAnswer(c)}
                    className={`py-3 rounded-lg border text-sm font-medium transition-colors ${
                      answer === c ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {result && (
              <div className={`rounded-lg p-3 text-center font-semibold ${result.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {result.correct ? '✅ Correct!' : '❌ Try again'}
              </div>
            )}

            <button className="btn-primary w-full" onClick={() => attempt(active)} disabled={!answer || !!result}>
              Submit Answer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
