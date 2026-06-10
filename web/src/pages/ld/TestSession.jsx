import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import testApi, { TIME_LIMITS } from '../../services/testApi';

const LEVEL_LABELS = ['', 'Basic Recognition', 'Simple Matching', 'Words & Math', 'Sentences', 'Complex Patterns'];

export default function TestSession() {
  const location = useLocation();
  const navigate = useNavigate();
  const level = location.state?.level || 1;

  const [phase, setPhase] = useState('starting'); // starting | test | submitting | result
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMITS[level] || 600);
  const [answering, setAnswering] = useState(false);

  const timerRef = useRef(null);

  // Start test
  useEffect(() => {
    testApi.startTest(level).then(data => {
      setQuestions(data.questions || []);
      setAttemptId(data.attemptId);
      setTimeLeft(data.timeLimit || TIME_LIMITS[level]);
      setPhase('test');
    }).catch(() => navigate('/ld/tests'));
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'test') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerColor = timeLeft < 120 ? 'text-red-600 animate-pulse' : timeLeft < 300 ? 'text-amber-500' : 'text-gray-700';

  // Answer a question
  const handleAnswer = async (answer) => {
    if (answering) return;
    setAnswering(true);

    const question = questions[currentIdx];
    setAnswers(prev => ({ ...prev, [question.id]: answer }));

    // Submit to API
    testApi.submitAnswer(attemptId, question.id, answer).catch(console.error);

    // Move to next or complete
    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(prev => prev + 1);
      } else {
        handleComplete();
      }
      setAnswering(false);
    }, 300);
  };

  // Complete test
  const handleComplete = async () => {
    clearInterval(timerRef.current);
    setPhase('submitting');
    try {
      const res = await testApi.completeTest(attemptId);
      await new Promise(r => setTimeout(r, 1500));
      setResult(res);
      setPhase('result');
    } catch {
      navigate('/ld/tests');
    }
  };

  // ─── STARTING SCREEN ─────────────────────────────────────────
  if (phase === 'starting') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Preparing your test...</p>
        </div>
      </div>
    );
  }

  // ─── TEST IN PROGRESS ────────────────────────────────────────
  if (phase === 'test') {
    const question = questions[currentIdx];
    const progress = ((currentIdx) / questions.length) * 100;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Level {level} Test</span>
              <p className="text-sm font-semibold text-gray-700">Q{currentIdx + 1} of {questions.length}</p>
            </div>
            <div className={`text-lg font-mono font-bold ${timerColor}`}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
          </div>
          {/* Progress bar */}
          <div className="max-w-2xl mx-auto mt-2">
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-xl">
            {/* Question text */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 text-center leading-relaxed">
                {question?.question_text}
              </h2>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(question?.options || []).map((opt, idx) => {
                const isSelected = answers[question?.id] === opt;
                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(opt)}
                    disabled={answering}
                    className={`p-4 rounded-xl text-left text-base font-medium transition-all border-2 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                    } ${answering ? 'opacity-60' : ''}`}
                  >
                    <span className="text-xs opacity-60 mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── SUBMITTING ──────────────────────────────────────────────
  if (phase === 'submitting') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700">Grading your test...</p>
        </div>
      </div>
    );
  }

  // ─── RESULT SCREEN ───────────────────────────────────────────
  if (phase === 'result' && result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-lg text-center">
          {/* Score reveal */}
          <div className={`mb-8 ${result.passed ? 'animate-bounce' : ''}`}>
            <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-4xl font-bold border-8 ${
              result.passed ? 'border-green-400 text-green-600 bg-green-50' : 'border-amber-300 text-amber-600 bg-amber-50'
            }`}>
              {result.score}%
            </div>
          </div>

          {/* Pass/Fail message */}
          {result.passed ? (
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-green-600 mb-2">🎉 Level {result.level} Passed!</h2>
              <p className="text-gray-500">You've officially advanced! Certificate earned.</p>
            </div>
          ) : (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-700 mb-2">Keep Practicing! 💪</h2>
              <p className="text-gray-500">You scored {result.score}% — need 80% to pass.</p>
              <p className="text-sm text-gray-400 mt-1">You got {result.correct}/{result.total} correct</p>
            </div>
          )}

          {/* Wrong answers (only shown on fail) */}
          {!result.passed && result.wrongAnswers?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 text-left mb-6 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Review incorrect answers:</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {result.wrongAnswers.map((item, i) => (
                  <div key={i} className="bg-red-50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-gray-700 mb-1">{item.question_text}</p>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded">You: {item.answer}</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded">Correct: {item.correct_answer}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {result.passed && result.certificate && (
              <button
                onClick={() => navigate('/ld/tests/certificate', { state: { certificate: result.certificate } })}
                className="py-4 bg-yellow-500 text-white text-lg font-bold rounded-xl hover:bg-yellow-600 transition-colors shadow-md"
              >
                View Certificate 🏆
              </button>
            )}
            <button
              onClick={() => navigate('/ld/tests')}
              className="py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Back to Tests
            </button>
            {!result.passed && (
              <button
                onClick={() => navigate('/ld/practice')}
                className="py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Practice More
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
