import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import practiceApi from '../../services/practiceApi';
import ExerciseCard from '../../components/practice/ExerciseCard';
import FeedbackCard from '../../components/practice/FeedbackCard';
import LevelUpOverlay from '../../components/practice/LevelUpOverlay';
import { playCorrect, playWrong, playLevelUp, playStreak, playComplete } from '../../utils/sounds';

// ─── Encouragements ────────────────────────────────────────────────
const CORRECT_MESSAGES = [
  'Perfect! ⭐', 'Amazing! 🌟', 'You got it! ✨', 'Super! 🎯',
  'Brilliant! 💫', 'Awesome! 🔥', 'Great job! 🏆', 'Wonderful! 🎉',
];
const getCorrectMsg = () => CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)];

// ─── Session result summary ────────────────────────────────────────
function SessionComplete({ stats, onFinish }) {
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const minutes = Math.round(stats.duration / 60);

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center animate-fade-in">
        {/* Trophy */}
        <div className="text-6xl mb-4">
          {accuracy >= 80 ? '🏆' : accuracy >= 60 ? '⭐' : '🌱'}
        </div>
        <h1 className="text-3xl font-black text-gray-800 mb-2">Session Complete!</h1>
        <p className="text-gray-500 mb-8">Great work today! Your brain is growing stronger.</p>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-black text-green-600">{accuracy}%</div>
            <div className="text-xs text-gray-400">Accuracy</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-black text-indigo-600">{stats.correct}/{stats.total}</div>
            <div className="text-xs text-gray-400">Correct</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-black text-purple-600">{minutes}m</div>
            <div className="text-xs text-gray-400">Time</div>
          </div>
        </div>

        {/* Streak */}
        {stats.streak > 0 && (
          <div className="bg-amber-50 rounded-xl px-5 py-3 mb-6 border border-amber-200 inline-flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <span className="font-bold text-amber-700">{stats.streak} day streak!</span>
          </div>
        )}

        {/* Level change */}
        {stats.levelChanged && (
          <div className="bg-indigo-50 rounded-xl px-5 py-3 mb-6 border border-indigo-200">
            <span className="font-bold text-indigo-700">
              {stats.levelDirection === 'up' ? '⬆️ Leveled up!' : '📚 More practice at this level'}
              {' '}Now at Level {stats.newLevel}
            </span>
          </div>
        )}

        <button
          onClick={onFinish}
          className="w-full py-4 bg-indigo-600 text-white text-lg font-bold rounded-xl
            hover:bg-indigo-700 shadow-lg transition-colors"
        >
          Back to Dashboard 🏠
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PRACTICE SESSION
// ═══════════════════════════════════════════════════════════════════
export default function PracticeSession() {
  const navigate = useNavigate();

  // State
  const [phase, setPhase] = useState('loading'); // loading | active | complete
  const [sessionId, setSessionId] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [stats, setStats] = useState({ correct: 0, total: 0, duration: 0, streak: 0 });
  const [feedback, setFeedback] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [correctFlash, setCorrectFlash] = useState(false);
  const [correctMsg, setCorrectMsg] = useState('');
  const [levelUp, setLevelUp] = useState(null);
  const [disabled, setDisabled] = useState(false);

  const exerciseStartRef = useRef(Date.now());
  const sessionStartRef = useRef(Date.now());

  // ─── Start session ──────────────────────────────────────────────
  useEffect(() => {
    startSession();
  }, []);

  const startSession = async () => {
    try {
      const data = await practiceApi.startSession();
      setSessionId(data.sessionId);
      setExercises(data.exercises || []);
      setPhase('active');
      sessionStartRef.current = Date.now();
      exerciseStartRef.current = Date.now();
    } catch (err) {
      console.error('Failed to start practice session:', err);
      navigate('/ld/practice');
    }
  };

  // ─── Handle answer ──────────────────────────────────────────────
  const handleAnswer = useCallback(async (answer) => {
    if (disabled) return;
    setDisabled(true);

    const timeSpent = Date.now() - exerciseStartRef.current;
    const exercise = exercises[currentIdx];

    try {
      const result = await practiceApi.submitAnswer(
        sessionId, exercise.id, answer, timeSpent
      );

      if (result.isCorrect) {
        // 🔊 Sound effect
        playCorrect();
        setCorrectFlash(true);
        setCorrectMsg(getCorrectMsg());
        setSessionStreak(prev => prev + 1);
        setStats(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));

        // Check level up
        if (result.levelChange?.levelChanged && result.levelChange.direction === 'up') {
          playLevelUp();
          setTimeout(() => {
            setCorrectFlash(false);
            setLevelUp(result.levelChange.toLevel);
          }, 800);
        } else {
          setTimeout(() => {
            setCorrectFlash(false);
            moveToNext();
          }, 1000);
        }
      } else {
        // 🔊 Gentle wrong sound
        playWrong();
        setSessionStreak(0);
        setStats(prev => ({ ...prev, total: prev.total + 1 }));

        if (result.feedback) {
          setFeedback(result.feedback);
          setShowFeedback(true);
        } else {
          // No AI feedback available, just move on with brief message
          setCorrectMsg("Almost! Let's keep going 💪");
          setCorrectFlash(true);
          setTimeout(() => {
            setCorrectFlash(false);
            moveToNext();
          }, 1200);
        }
      }
    } catch (err) {
      console.error('Answer submit error:', err);
      setDisabled(false);
    }
  }, [disabled, currentIdx, exercises, sessionId]);

  // ─── Move to next exercise ──────────────────────────────────────
  const moveToNext = () => {
    if (currentIdx + 1 >= exercises.length) {
      completeSession();
    } else {
      setCurrentIdx(prev => prev + 1);
      exerciseStartRef.current = Date.now();
      setDisabled(false);
    }
  };

  // ─── Complete session ───────────────────────────────────────────
  const completeSession = async () => {
    playComplete();
    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
    try {
      const result = await practiceApi.completeSession(sessionId);
      setStats(prev => ({
        ...prev,
        duration,
        streak: result?.streak || prev.streak,
        levelChanged: result?.levelChanged,
        levelDirection: result?.levelDirection,
        newLevel: result?.newLevel,
      }));
    } catch (err) {
      console.error('Complete error:', err);
      setStats(prev => ({ ...prev, duration }));
    }
    setPhase('complete');
  };

  // ─── Dismiss feedback ───────────────────────────────────────────
  const handleDismissFeedback = () => {
    setShowFeedback(false);
    setFeedback(null);
    moveToNext();
  };

  // ─── Dismiss level up ───────────────────────────────────────────
  const handleDismissLevelUp = () => {
    // 🔊 Sound placeholder: level_up_fanfare
    setLevelUp(null);
    setCorrectFlash(false);
    moveToNext();
  };

  // ─── LOADING ────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🧩</div>
          <p className="text-gray-500 font-medium">Preparing your exercises...</p>
        </div>
      </div>
    );
  }

  // ─── COMPLETE ───────────────────────────────────────────────────
  if (phase === 'complete') {
    return <SessionComplete stats={stats} onFinish={() => navigate('/ld/practice')} />;
  }

  // ─── ACTIVE SESSION ─────────────────────────────────────────────
  const currentExercise = exercises[currentIdx];
  const progress = ((currentIdx) / exercises.length) * 100;

  return (
    <div className="min-h-screen bg-[#FFF8F0] relative">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-[#FFF8F0]/90 backdrop-blur-sm px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {/* Exit button */}
          <button
            onClick={() => {
              if (window.confirm('End practice session?')) completeSession();
            }}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>

          {/* Progress bar */}
          <div className="flex-1 mx-4">
            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-center text-xs text-gray-400 mt-1">
              {currentIdx + 1} / {exercises.length}
            </div>
          </div>

          {/* Streak */}
          <div className="flex items-center gap-1">
            <span className={`text-lg ${sessionStreak > 0 ? 'animate-pulse' : ''}`}>🔥</span>
            <span className="text-sm font-bold text-gray-700">{sessionStreak}</span>
          </div>
        </div>
      </div>

      {/* Exercise area */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {currentExercise && (
          <ExerciseCard
            key={currentExercise.id || currentIdx}
            exercise={currentExercise}
            onAnswer={handleAnswer}
            disabled={disabled}
          />
        )}
      </div>

      {/* Correct flash overlay */}
      {correctFlash && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-green-500/10 absolute inset-0 animate-pulse" />
          <div className="bg-white px-8 py-4 rounded-2xl shadow-xl border border-green-200 animate-bounce">
            <span className="text-2xl font-black text-green-600">{correctMsg}</span>
          </div>
        </div>
      )}

      {/* Feedback overlay */}
      {showFeedback && (
        <FeedbackCard feedback={feedback} onDismiss={handleDismissFeedback} />
      )}

      {/* Level up overlay */}
      {levelUp && (
        <LevelUpOverlay newLevel={levelUp} onDismiss={handleDismissLevelUp} />
      )}
    </div>
  );
}
