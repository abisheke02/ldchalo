import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function ScreeningPage() {
  const [status, setStatus]     = useState(null);
  const [questions, setQs]      = useState([]);
  const [answers, setAnswers]   = useState({});
  const [step, setStep]         = useState('intro'); // intro | quiz | result
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const navigate                = useNavigate();

  useEffect(() => {
    api.get('/ld/screening/status').then((r) => setStatus(r.data)).catch(() => {});
  }, []);

  const startQuiz = async () => {
    const { data } = await api.get('/ld/screening/questions');
    setQs(data);
    setStep('quiz');
  };

  const submit = async () => {
    setLoading(true);
    try {
      const payload = questions.map((q) => ({
        question_id: q.id,
        category:    q.category,
        answer:      answers[q.id],
        score:       answers[q.id] === q.correct_answer ? 3 : 0,
      }));
      const { data } = await api.post('/ld/screening/submit', { answers: payload });
      setResult(data);
      setStep('result');
    } catch { alert('Submission failed'); }
    finally { setLoading(false); }
  };

  const answered = Object.keys(answers).length;
  const LD_COLORS = { dyslexia: 'text-red-600', mixed: 'text-orange-600', not_detected: 'text-green-600' };

  if (step === 'result' && result) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Screening Complete</h1>
        <div className="card text-center space-y-4">
          <p className="text-5xl">{result.ldType === 'not_detected' ? '✅' : '📊'}</p>
          <p className={`text-2xl font-bold capitalize ${LD_COLORS[result.ldType] || 'text-gray-900'}`}>
            {result.ldType?.replace('_', ' ')}
          </p>
          <div>
            <p className="text-sm text-gray-500 mb-1">Risk Score</p>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${result.riskScore}%` }} />
            </div>
            <p className="text-lg font-bold text-gray-900 mt-1">{result.riskScore}/100</p>
          </div>
          <button className="btn-primary w-full" onClick={() => navigate('/ld/practice')}>
            Start Personalised Practice →
          </button>
        </div>
      </div>
    );
  }

  if (step === 'quiz') {
    const current = questions[answered] || questions[questions.length - 1];
    const qIdx    = Math.min(answered, questions.length - 1);

    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Screening Quiz</h1>
          <span className="text-sm text-gray-500">{Math.min(answered + 1, questions.length)} / {questions.length}</span>
        </div>

        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(answered / questions.length) * 100}%` }} />
        </div>

        {questions.map((q, i) => (
          <div key={q.id} className={`card space-y-4 ${i !== qIdx ? 'hidden' : ''}`}>
            <p className="text-base font-semibold text-gray-900">{i + 1}. {q.question_text}</p>
            {Array.isArray(q.options) && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <button key={opt} onClick={() => {
                    setAnswers((prev) => ({ ...prev, [q.id]: opt }));
                    if (i < questions.length - 1) {/* move to next auto */}
                  }}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      answers[q.id] === opt
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-gray-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-between">
          {qIdx > 0 && (
            <button className="btn-outline" onClick={() => {
              const prevQ = questions[qIdx - 1];
              const newAnswers = { ...answers };
              delete newAnswers[prevQ.id];
              setAnswers(newAnswers);
            }}>← Back</button>
          )}
          <div className="ml-auto">
            {answered < questions.length ? (
              <button className="btn-primary" disabled={!answers[questions[qIdx]?.id]}
                onClick={() => {/* auto-advance handled by selection */}}
              >
                Next →
              </button>
            ) : (
              <button className="btn-primary" onClick={submit} disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Quiz'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">LD Screening</h1>

      {status?.status === 'completed' ? (
        <div className="card space-y-3">
          <p className="font-semibold text-gray-900">You've already completed the screening.</p>
          <p className="text-sm text-gray-500">LD Type: <strong>{status.ld_type?.replace('_', ' ')}</strong></p>
          <p className="text-sm text-gray-500">Risk Score: <strong>{status.ld_risk_score}/100</strong></p>
          <button className="btn-primary" onClick={startQuiz}>Redo Screening</button>
        </div>
      ) : (
        <div className="card space-y-4">
          <p className="text-4xl text-center">🔍</p>
          <h2 className="text-lg font-semibold text-gray-900 text-center">Learning Disability Screening</h2>
          <p className="text-sm text-gray-600 text-center">
            Answer {10}+ questions to detect phonics, reading, writing, and math difficulties.
            Takes about 10 minutes.
          </p>
          <button className="btn-primary w-full" onClick={startQuiz}>Start Quiz →</button>
        </div>
      )}
    </div>
  );
}
