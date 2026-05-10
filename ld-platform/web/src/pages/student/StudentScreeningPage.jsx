import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../services/authStore';

const LD_RESULT = {
  dyslexia:    { label: 'Dyslexia', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: '📖' },
  dysgraphia:  { label: 'Dysgraphia', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: '✏️' },
  dyscalculia: { label: 'Dyscalculia', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: '🔢' },
  mixed:       { label: 'Mixed LD', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: '🔀' },
  not_detected:{ label: 'No LD Detected', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: '✅' },
};

const StudentScreeningPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [phase, setPhase] = useState('loading'); // loading | intro | quiz | submitting | result | empty
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const startTimeRef = useRef(null);
  const questionStartRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    fetch('/api/screening/questions', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.questions || d.questions.length === 0) { setPhase('empty'); return; }
        setQuestions(d.questions);
        setPhase('intro');
      })
      .catch(() => setPhase('empty'));
  }, []);

  const startQuiz = () => {
    startTimeRef.current = Date.now();
    questionStartRef.current = Date.now();
    setPhase('quiz');
  };

  const handleAnswer = (option) => {
    if (selected !== null) return;
    setSelected(option);
  };

  const handleNext = () => {
    if (selected === null) return;
    const q = questions[current];
    const responseMs = Date.now() - questionStartRef.current;
    const correctAnswer = q.options_json
      ? (Array.isArray(q.options_json) ? q.options_json[0] : Object.values(q.options_json)[0])
      : q.correct_answer || q.options_json?.[0];

    const isCorrect = selected === (q.correct_answer || correctAnswer);

    const answer = {
      question_id: q.id,
      category: q.category || 'reading',
      ld_target: q.ld_target || 'dyslexia',
      difficulty: q.difficulty || 1,
      correct_answer: q.correct_answer || correctAnswer || selected,
      student_answer: selected,
      is_correct: isCorrect,
      response_time_ms: responseMs,
    };

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setSelected(null);
    questionStartRef.current = Date.now();

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      submitScreening(newAnswers);
    }
  };

  const submitScreening = async (finalAnswers) => {
    setPhase('submitting');
    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const token = localStorage.getItem('auth_token');
    try {
      const resp = await fetch('/api/screening/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers: finalAnswers, duration_seconds: Math.max(60, durationSeconds) }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Submission failed');
      setResult(data);
      setPhase('result');
    } catch (err) {
      toast.error(err.message || 'Could not submit screening');
      setPhase('quiz');
    }
  };

  const q = questions[current];
  const options = q?.options_json
    ? (Array.isArray(q.options_json) ? q.options_json : Object.values(q.options_json))
    : [];
  const progress = questions.length ? Math.round((current / questions.length) * 100) : 0;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">Preparing your assessment…</p>
        </div>
      </div>
    );
  }

  // ── Empty / no questions ────────────────────────────────────────────────────
  if (phase === 'empty') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-4">
          <p className="text-4xl">🔧</p>
          <h2 className="text-xl font-black text-slate-800">Screening Not Ready Yet</h2>
          <p className="text-slate-500 text-sm">Your teacher hasn't set up the screening questions yet. Check back soon!</p>
          <button onClick={() => navigate('/student')}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Intro ───────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 space-y-6">
          <div className="text-center">
            <p className="text-5xl mb-3">🧠</p>
            <h2 className="text-2xl font-black text-slate-800">Learning Assessment</h2>
            <p className="text-slate-500 text-sm mt-2">
              Welcome, {user?.name?.split(' ')[0] || 'Student'}! Let's understand how you learn best.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">What to expect</p>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li>📝 {questions.length} short questions</li>
              <li>⏱️ About 5–10 minutes</li>
              <li>🎯 No right or wrong — just answer honestly</li>
              <li>📊 We'll personalise your learning plan after</li>
            </ul>
          </div>
          <button onClick={startQuiz}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-lg shadow-lg shadow-blue-200 transition">
            Start Assessment
          </button>
          <button onClick={() => navigate('/student')}
            className="w-full text-slate-400 text-sm hover:text-slate-600 transition">
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // ── Quiz ────────────────────────────────────────────────────────────────────
  if (phase === 'quiz' && q) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400 font-semibold">
              <span>Question {current + 1} of {questions.length}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Category badge */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wide">
              {q.category}
            </span>
            <span className="text-xs text-slate-400">Difficulty {q.difficulty || 1}/3</span>
          </div>

          {/* Question */}
          <div className="bg-slate-50 rounded-xl p-5">
            <p className="text-lg font-bold text-slate-800 leading-relaxed">{q.question_text}</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 font-semibold text-sm transition-all
                  ${selected === opt
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700'
                  }`}
              >
                <span className="mr-3 font-black text-slate-400">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={selected === null}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition disabled:bg-slate-200 disabled:text-slate-400"
          >
            {current + 1 === questions.length ? 'Finish Assessment' : 'Next Question →'}
          </button>
        </div>
      </div>
    );
  }

  // ── Submitting ──────────────────────────────────────────────────────────────
  if (phase === 'submitting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-bold">Analysing your responses…</p>
          <p className="text-slate-400 text-sm">This may take a moment</p>
        </div>
      </div>
    );
  }

  // ── Result ──────────────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const info = LD_RESULT[result.ldType] || LD_RESULT.not_detected;
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 space-y-6">
          <div className="text-center">
            <p className="text-5xl mb-3">{info.icon}</p>
            <h2 className="text-2xl font-black text-slate-800">Assessment Complete!</h2>
          </div>

          <div className={`border-2 rounded-2xl p-6 text-center ${info.bg}`}>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Your Learning Profile</p>
            <p className={`text-3xl font-black ${info.color}`}>{info.label}</p>
            {result.overallRiskScore != null && (
              <p className="text-sm text-slate-500 mt-2">Risk Score: {result.overallRiskScore}/100</p>
            )}
          </div>

          {result.reasoning && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Analysis</p>
              <p className="text-sm text-slate-700 leading-relaxed">{result.reasoning}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            Your learning path has been personalised. Your teacher can now see your profile and assign targeted exercises.
          </div>

          <button
            onClick={() => navigate('/student')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-lg shadow-lg shadow-blue-200 transition"
          >
            Go to My Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default StudentScreeningPage;
