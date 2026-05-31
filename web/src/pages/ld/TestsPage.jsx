import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const LEVEL_LABELS = ['', 'Starter', 'Basic', 'Intermediate', 'Advanced', 'Mastery'];

export default function TestsPage() {
  const [levels, setLevels]   = useState([]);
  const [active, setActive]   = useState(null);
  const [questions, setQs]    = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/ld/tests/levels').then((r) => setLevels(r.data)).catch(() => {});
  }, []);

  const startTest = async (level) => {
    const { data } = await api.get('/ld/tests/questions', { params: { level } });
    setQs(data);
    setAnswers({});
    setResult(null);
    setActive(level);
  };

  const submit = async () => {
    setLoading(true);
    try {
      const payload = questions.map((q) => ({ question_id: q.id, answer: answers[q.id] || '' }));
      const { data } = await api.post('/ld/tests/submit', { level: active, answers: payload });
      setResult(data);
      api.get('/ld/tests/levels').then((r) => setLevels(r.data)).catch(() => {});
    } catch { alert('Submission failed'); }
    finally { setLoading(false); }
  };

  if (result) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Test Result</h1>
        <div className="card text-center space-y-4">
          <p className="text-5xl">{result.passed ? '🏆' : '📖'}</p>
          <p className="text-4xl font-bold text-gray-900">{result.score}%</p>
          <p className={`text-lg font-semibold ${result.passed ? 'text-green-600' : 'text-orange-600'}`}>
            {result.passed ? 'Level Unlocked!' : 'Keep Practising'}
          </p>
          <p className="text-sm text-gray-500">{result.correct}/{result.total} correct</p>
          <button className="btn-primary w-full" onClick={() => { setResult(null); setActive(null); }}>
            Back to Levels
          </button>
        </div>
      </div>
    );
  }

  if (active && questions.length) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Level {active} Test</h1>
          <span className="text-sm text-gray-500">{Object.keys(answers).length}/{questions.length}</span>
        </div>

        <div className="space-y-6">
          {questions.map((q, i) => (
            <div key={q.id} className="card space-y-3">
              <p className="font-medium text-gray-900 text-sm">{i + 1}. {q.question_text}</p>
              {Array.isArray(q.options) && (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <button key={opt} onClick={() => setAnswers((p) => ({ ...p, [q.id]: opt }))}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                        answers[q.id] === opt
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                          : 'border-gray-200 hover:border-indigo-300 text-gray-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button className="btn-outline" onClick={() => setActive(null)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={submit} disabled={loading || Object.keys(answers).length < questions.length}>
            {loading ? 'Submitting…' : 'Submit Test'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tests</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {levels.map((l) => (
          <div key={l.level} className={`card space-y-3 ${!l.unlocked ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-2xl">{l.unlocked ? '📝' : '🔒'}</span>
              <span className="badge bg-indigo-50 text-indigo-700">Level {l.level}</span>
            </div>
            <p className="font-semibold text-gray-900">{LEVEL_LABELS[l.level]}</p>
            <button className="btn-primary w-full text-sm" disabled={!l.unlocked} onClick={() => startTest(l.level)}>
              {l.unlocked ? 'Start Test' : 'Locked'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
