import React, { useState, useEffect, useRef, useCallback } from 'react';
import screeningApi from '../../services/screeningApi';
import QuestionCard from '../../components/screening/QuestionCard';

// ─── Encouragement messages ────────────────────────────────────────
const ENCOURAGEMENTS = [
  "Great job! 🌟", "You're doing amazing! 💪", "Keep going! 🚀",
  "Wonderful! ✨", "Nice thinking! 🧠", "You're a star! ⭐",
  "Almost there! 🎯", "Fantastic work! 🎉", "Super! 🦸", "Brilliant! 💫",
];
const getEncouragement = () => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];

const LEVEL_LABELS = ['', 'Basic Recognition', 'Simple Matching', 'Words & Math', 'Sentences', 'Complex Patterns'];
const LEVEL_EMOJIS = ['', '🟢', '🔵', '🟡', '🟠', '🔴'];

// ─── Timer hook ────────────────────────────────────────────────────
function useCountdown(startSeconds, onTimeout) {
  const [remaining, setRemaining] = useState(startSeconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current); onTimeout?.(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const stop = () => clearInterval(intervalRef.current);
  return { remaining, stop };
}

// ─── Level Progress Indicator ──────────────────────────────────────
function LevelIndicator({ currentLevel, levelResults }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      {[1, 2, 3, 4, 5].map((lvl) => {
        const result = levelResults[lvl];
        const isCurrent = lvl === currentLevel;
        const passed = result?.passed;
        const failed = result && !result.passed;

        return (
          <div key={lvl} className="flex flex-col items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
              ${isCurrent ? 'ring-4 ring-indigo-300 scale-110' : ''}
              ${passed ? 'bg-green-500 text-white' : ''}
              ${failed ? 'bg-red-400 text-white' : ''}
              ${!passed && !failed && !isCurrent ? 'bg-gray-200 text-gray-400' : ''}
              ${isCurrent && !passed && !failed ? 'bg-indigo-600 text-white' : ''}
            `}>
              {passed ? '✓' : failed ? '✗' : lvl}
            </div>
            <span className={`text-[10px] mt-1 ${isCurrent ? 'text-indigo-600 font-bold' : 'text-gray-400'}`}>
              Lv{lvl}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Level Progress Bar ────────────────────────────────────────────
function ProgressBar({ currentQuestion, totalInLevel, currentLevel, timeRemaining }) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timerColor = timeRemaining < 60 ? 'text-red-500' : timeRemaining < 180 ? 'text-amber-500' : 'text-gray-600';
  const progress = (currentQuestion / totalInLevel) * 100;

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{LEVEL_EMOJIS[currentLevel]}</span>
          <span className="text-sm font-bold text-gray-700">
            Level {currentLevel}: {LEVEL_LABELS[currentLevel]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Q{currentQuestion}/20</span>
          <span className={`text-sm font-mono font-bold ${timerColor}`}>
            ⏱️ {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #4F46E5, #7C3AED)' }}
        />
      </div>
    </div>
  );
}

// ─── Welcome Screen ────────────────────────────────────────────────
function WelcomeScreen({ onStart, loading }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 animate-fade-in">
      <div className="text-6xl mb-6">🧩</div>
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
        Let's Find Your Level!
      </h1>
      <p className="text-lg text-gray-600 max-w-md mb-2">
        We'll start easy and get harder. Answer as many as you can!<br/>
        There are 5 levels — let's see how far you get! 🌈
      </p>

      {/* Level preview */}
      <div className="flex items-center gap-3 my-6">
        {[1, 2, 3, 4, 5].map(lvl => (
          <div key={lvl} className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
              {LEVEL_EMOJIS[lvl]}
            </div>
            <span className="text-[10px] text-gray-400 mt-1">Lv{lvl}</span>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-400 mb-6">About 15 minutes • 100 questions • 5 levels (20 each)</p>

      <button
        onClick={onStart}
        disabled={loading}
        className="px-10 py-4 bg-indigo-600 text-white text-xl font-bold rounded-2xl
          hover:bg-indigo-700 hover:scale-105 transition-all duration-200 shadow-lg active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Loading...' : 'Start Quiz 🎮'}
      </button>
    </div>
  );
}

// ─── Level Passed Celebration ──────────────────────────────────────
function LevelPassedOverlay({ level, onContinue }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center animate-fade-in">
      <div className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-sm mx-4">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">Level {level} Passed!</h2>
        <p className="text-gray-500 mb-6">Great job! Let's try the next level...</p>
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map(lvl => (
            <div key={lvl} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
              ${lvl <= level ? 'bg-green-500 text-white' : lvl === level + 1 ? 'bg-indigo-500 text-white animate-pulse' : 'bg-gray-200 text-gray-400'}
            `}>
              {lvl <= level ? '✓' : lvl}
            </div>
          ))}
        </div>
        <button
          onClick={onContinue}
          className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Next Level →
        </button>
      </div>
    </div>
  );
}

// ─── Analyzing Screen ──────────────────────────────────────────────
function AnalyzingScreen() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-200 animate-ping" />
        <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-4xl">🧠</div>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-3">Analyzing Your Responses...</h2>
      <p className="text-gray-500">Finding your learning level and areas to improve</p>
    </div>
  );
}

// ─── Result Screen (Progressive) ──────────────────────────────────
function ResultScreen({ result }) {
  const { ldLevel, ldType, riskScore, breakdown, levelResults, recommendations, allAnswers = [] } = result;
  const [showWrongAnswers, setShowWrongAnswers] = useState(true);
  const [expandedLevel, setExpandedLevel] = useState(ldLevel || null);

  const riskColor = riskScore <= 30 ? '#10B981' : riskScore <= 60 ? '#F59E0B' : '#EF4444';
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (riskScore / 100) * circumference;

  const ldTypeInfo = {
    dyslexia: { icon: '📖', label: 'Dyslexia', desc: 'Difficulty with reading, letter recognition, and phonics' },
    dysgraphia: { icon: '✍️', label: 'Dysgraphia', desc: 'Difficulty with writing, spelling, and sequencing' },
    dyscalculia: { icon: '🔢', label: 'Dyscalculia', desc: 'Difficulty with numbers, arithmetic, and math patterns' },
    mixed: { icon: '🔀', label: 'Mixed Type', desc: 'Multiple areas of difficulty detected' },
    not_detected: { icon: '✅', label: 'No LD Detected', desc: 'No significant learning difficulties found' },
  };
  const ldInfo = ldTypeInfo[ldType] || ldTypeInfo.not_detected;

  // Group wrong answers by level
  const wrongByLevel = {};
  allAnswers.forEach(a => {
    if (!a.isCorrect) {
      if (!wrongByLevel[a.level]) wrongByLevel[a.level] = [];
      wrongByLevel[a.level].push(a);
    }
  });

  // LD Analysis per type
  const ldAnalysis = [
    { key: 'dyslexia', icon: '📖', label: 'Dyslexia (Reading)', score: breakdown?.dyslexia || 0, categories: ['letter_recognition', 'phonics', 'rhyme_detection', 'phoneme_blending', 'reading'] },
    { key: 'dyscalculia', icon: '🔢', label: 'Dyscalculia (Math)', score: breakdown?.dyscalculia || 0, categories: ['number_sense', 'counting', 'arithmetic', 'patterns'] },
    { key: 'dysgraphia', icon: '✍️', label: 'Dysgraphia (Writing)', score: breakdown?.dysgraphia || 0, categories: ['sequencing', 'writing', 'tracing'] },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">

      {/* ═══ SECTION 1: Level Results ═══ */}
      <div className="flex items-center justify-center gap-3 mb-6">
        {[1, 2, 3, 4, 5].map(lvl => {
          const r = levelResults?.[lvl];
          return (
            <div key={lvl} className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${r?.passed ? 'bg-green-500 text-white' : r && !r.passed ? 'bg-red-400 text-white ring-4 ring-red-200' : 'bg-gray-200 text-gray-400'}`}>
                {r?.passed ? '✓' : r && !r.passed ? '✗' : '—'}
              </div>
              <span className="text-xs text-gray-500 mt-1">Lv{lvl}</span>
              {r && <span className="text-[10px] text-gray-400">{r.score}%</span>}
            </div>
          );
        })}
      </div>

      {/* ═══ SECTION 2: LD Level Badge ═══ */}
      {ldLevel && (
        <div className="text-center mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-sm text-amber-600 font-medium">Difficulty starts at</p>
          <p className="text-3xl font-bold text-amber-700">Level {ldLevel}</p>
          <p className="text-sm text-amber-500 mt-1">{LEVEL_LABELS[ldLevel]}</p>
        </div>
      )}

      {/* ═══ SECTION 3: Learning Disability Analysis ═══ */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-base font-bold text-gray-800 mb-1">🧠 Learning Disability Analysis</h3>
        <p className="text-xs text-gray-400 mb-5">Based on error patterns at Level {ldLevel || 'all levels'}</p>

        {/* LD Type Result Card */}
        <div className="flex items-center gap-4 p-4 rounded-xl mb-5" style={{ backgroundColor: ldType === 'not_detected' ? '#ECFDF5' : '#FEF3C7' }}>
          <div className="text-3xl">{ldInfo.icon}</div>
          <div className="flex-1">
            <p className="font-bold text-gray-800">{ldInfo.label}</p>
            <p className="text-xs text-gray-500">{ldInfo.desc}</p>
          </div>
          <div className="text-center">
            <div className="relative w-14 h-14">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                <circle cx="60" cy="60" r="50" fill="none" stroke={riskColor} strokeWidth="8"
                  strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold" style={{ color: riskColor }}>{riskScore}</span>
              </div>
            </div>
            <span className="text-[9px] text-gray-400">risk</span>
          </div>
        </div>

        {/* Per-type breakdown */}
        <div className="space-y-4">
          {ldAnalysis.map(data => {
            const errorRate = data.score;
            const status = errorRate > 60 ? 'High Risk' : errorRate > 30 ? 'Moderate' : 'Normal';
            const statusColor = errorRate > 60 ? '#EF4444' : errorRate > 30 ? '#F59E0B' : '#10B981';
            const wrongInType = allAnswers.filter(a => !a.isCorrect && a.ld_target === data.key);
            const totalInType = allAnswers.filter(a => a.ld_target === data.key);

            return (
              <div key={data.key} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{data.icon}</span>
                    <span className="text-sm font-semibold text-gray-700">{data.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{wrongInType.length}/{totalInType.length} wrong</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: statusColor }}>{status}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${errorRate}%`, backgroundColor: statusColor }} />
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {data.categories.map(cat => {
                    const catWrong = allAnswers.filter(a => !a.isCorrect && a.category === cat).length;
                    const catTotal = allAnswers.filter(a => a.category === cat).length;
                    if (catTotal === 0) return null;
                    return (
                      <span key={cat} className={`text-[10px] px-2 py-0.5 rounded-full ${catWrong > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {cat.replace(/_/g, ' ')} {catWrong}/{catTotal}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ SECTION 4: Wrong Answers Review ═══ */}
      {Object.keys(wrongByLevel).length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-800">❌ Incorrect Answers Review</h3>
            <button onClick={() => setShowWrongAnswers(!showWrongAnswers)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              {showWrongAnswers ? 'Hide' : 'Show'}
            </button>
          </div>

          {showWrongAnswers && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(lvl => {
                const wrong = wrongByLevel[lvl];
                if (!wrong || wrong.length === 0) return null;
                const isExpanded = expandedLevel === lvl;

                return (
                  <div key={lvl} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedLevel(isExpanded ? null : lvl)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{LEVEL_EMOJIS[lvl]}</span>
                        <span className="text-sm font-semibold text-gray-700">Level {lvl}: {LEVEL_LABELS[lvl]}</span>
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{wrong.length} wrong</span>
                      </div>
                      <span className="text-gray-400 text-sm">{isExpanded ? '▼' : '▶'}</span>
                    </button>

                    {isExpanded && (
                      <div className="p-3 space-y-2 bg-white">
                        {wrong.map((item, idx) => (
                          <div key={idx} className="bg-red-50 border border-red-100 rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-800 mb-2">{idx + 1}. {item.question_text}</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md">
                                Your answer: <strong>{item.userAnswer || item.answer}</strong>
                              </span>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md">
                                Correct: <strong>{item.correct_answer}</strong>
                              </span>
                              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-md">
                                {item.ld_target} • {(item.category || '').replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ SECTION 5: Recommendations ═══ */}
      {recommendations?.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-100">
          <h3 className="text-base font-bold text-blue-900 mb-1">🎯 Practice Plan to Crack Level {ldLevel || 'Next'}</h3>
          <p className="text-xs text-blue-500 mb-4">Do these exercises daily for 15 minutes</p>
          <div className="space-y-2">
            {recommendations.map((rec, i) => {
              const isHeader = i === 0;
              const isFooter = rec.includes('15 minutes') || rec.includes('Re-screen');
              return (
                <div key={i} className={`${isHeader ? 'mb-3' : ''} ${isFooter ? 'mt-3 pt-3 border-t border-blue-200' : ''}`}>
                  {isHeader ? (
                    <p className="text-sm font-semibold text-indigo-700">{rec}</p>
                  ) : isFooter ? (
                    <p className="text-xs text-blue-400 italic">{rec}</p>
                  ) : (
                    <p className="text-sm text-blue-800 leading-relaxed pl-1">{rec}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Actions ═══ */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <a href="/ld/practice" className="flex-1 py-4 bg-indigo-600 text-white text-center text-lg font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md">
          Start Practice 🚀
        </a>
        <button onClick={() => window.print()} className="flex-1 py-4 bg-gray-100 text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-200 transition-colors">
          Download Report 📄
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SCREENING PAGE
// ═══════════════════════════════════════════════════════════════════
export default function ScreeningPage() {
  const [phase, setPhase] = useState('welcome'); // welcome | quiz | level_passed | analyzing | result
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [result, setResult] = useState(null);
  const [encouragement, setEncouragement] = useState('');
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [levelResults, setLevelResults] = useState({}); // { 1: { passed: true, score: 100 }, ... }
  const [passedLevel, setPassedLevel] = useState(null); // for celebration overlay
  const [answering, setAnswering] = useState(false); // prevent double-tap

  const questionStartRef = useRef(Date.now());
  const levelAnswersRef = useRef([]); // answers in current level
  const allAnswersRef = useRef([]); // ALL answers across all levels (never reset)

  // Current level derived from current question
  const currentQuestion = questions[currentIdx];
  const currentLevel = currentQuestion?.level || 1;

  // Timer (20 min for 100 questions)
  const { remaining: timeRemaining, stop: stopTimer } = useCountdown(1200, () => {
    if (phase === 'quiz') handleComplete();
  });

  // Start quiz
  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionData = await screeningApi.startSession();
      const questionsData = await screeningApi.getQuestions();
      if (!questionsData?.questions?.length) throw new Error('No questions');
      setQuestions(questionsData.questions);
      setSessionId(sessionData.sessionId);
      setPhase('quiz');
      questionStartRef.current = Date.now();
      levelAnswersRef.current = [];
    } catch (err) {
      setError('Failed to start quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Submit answer
  const handleAnswer = async (answer) => {
    // Prevent double-tap
    if (answering) return;
    setAnswering(true);

    const timeSpent = Date.now() - questionStartRef.current;
    const question = questions[currentIdx];
    const isCorrect = String(answer).trim() === String(question.correct_answer).trim();

    // Track level answers locally
    levelAnswersRef.current.push({ ...question, isCorrect, answer });
    allAnswersRef.current.push({ ...question, isCorrect, answer, userAnswer: answer });

    // Encouragement
    setEncouragement(getEncouragement());
    setShowEncouragement(true);
    setTimeout(() => setShowEncouragement(false), 1200);

    // Submit to API
    screeningApi.submitAnswer(sessionId, question.id, answer, timeSpent).catch(console.error);

    // Check if level is complete (20 questions per level)
    const questionsInLevel = questions.filter(q => q.level === question.level);
    const answeredInLevel = levelAnswersRef.current.filter(a => a.level === question.level);

    if (answeredInLevel.length >= questionsInLevel.length) {
      // Level done — calculate result
      const correct = answeredInLevel.filter(a => a.isCorrect).length;
      const total = answeredInLevel.length;
      const score = Math.round((correct / total) * 100);
      const passed = correct / total >= 0.70;

      setLevelResults(prev => ({ ...prev, [question.level]: { passed, score, correct, total } }));

      if (passed) {
        // Check if there are more levels
        const nextIdx = currentIdx + 1;
        const nextQuestion = questions[nextIdx];
        if (nextQuestion) {
          // Show level passed celebration
          setPassedLevel(question.level);
          setPhase('level_passed');
          return;
        } else if (!nextQuestion) {
          // Passed ALL levels!
          await handleComplete();
          return;
        }
      } else {
        // FAILED this level — this is the LD level, end quiz
        await handleComplete();
        return;
      }
    }

    // Move to next question
    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(prev => prev + 1);
        questionStartRef.current = Date.now();
        setAnswering(false);
      } else {
        handleComplete();
      }
    }, 600);
  };

  // Continue after level passed celebration
  const handleContinueAfterLevel = () => {
    setPhase('quiz');
    setCurrentIdx(prev => prev + 1);
    questionStartRef.current = Date.now();
    levelAnswersRef.current = [];
    setAnswering(false);
  };

  // Complete quiz
  const handleComplete = async () => {
    stopTimer();
    setPhase('analyzing');
    try {
      const res = await screeningApi.completeSession(sessionId);
      await new Promise(r => setTimeout(r, 2000));
      // Merge local data with API result — include ALL answers for review
      setResult({
        ...res,
        levelResults: res.levelResults || levelResults,
        allAnswers: allAnswersRef.current,
      });
      setPhase('result');
    } catch (err) {
      setError('Failed to analyze results.');
      setPhase('welcome');
    }
  };

  // Error
  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <div className="text-5xl mb-4">😞</div>
        <p className="text-red-600 text-lg mb-4">{error}</p>
        <button onClick={() => { setError(null); setPhase('welcome'); }}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold">Try Again</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-100 rounded-full translate-y-1/2 -translate-x-1/2 opacity-50" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">

        {/* Level indicator during quiz */}
        {phase === 'quiz' && (
          <>
            <LevelIndicator currentLevel={currentLevel} levelResults={levelResults} />
            <ProgressBar
              currentQuestion={questions.filter(q => q.level === currentLevel).indexOf(currentQuestion) + 1}
              totalInLevel={questions.filter(q => q.level === currentLevel).length}
              currentLevel={currentLevel}
              timeRemaining={timeRemaining}
            />
          </>
        )}

        {/* Encouragement toast */}
        {showEncouragement && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
            <div className="bg-white px-6 py-3 rounded-full shadow-lg border border-green-200 text-lg font-bold text-green-600">
              {encouragement}
            </div>
          </div>
        )}

        {/* Phases */}
        {phase === 'welcome' && <WelcomeScreen onStart={handleStart} loading={loading} />}

        {phase === 'quiz' && currentQuestion && (
          <div className="mt-6">
            <QuestionCard key={currentQuestion.id} question={currentQuestion} onAnswer={handleAnswer} disabled={loading || answering} />
          </div>
        )}

        {phase === 'level_passed' && passedLevel && (
          <LevelPassedOverlay level={passedLevel} onContinue={handleContinueAfterLevel} />
        )}

        {phase === 'analyzing' && <AnalyzingScreen />}
        {phase === 'result' && result && <ResultScreen result={result} />}
      </div>
    </div>
  );
}
