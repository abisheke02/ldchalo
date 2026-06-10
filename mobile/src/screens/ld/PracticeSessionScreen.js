import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator, Animated, Vibration, Dimensions,
} from 'react-native';
import api from '../../services/api';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Colors ────────────────────────────────────────────────────────
const C = {
  primary: '#4F46E5', primaryDark: '#3730A3',
  success: '#10B981', successLight: '#D1FAE5',
  warning: '#F59E0B', warningLight: '#FEF3C7',
  amber: '#FBB96F', amberLight: '#FFF7ED',
  bg: '#FFF8F0', white: '#FFFFFF',
  gray100: '#F3F4F6', gray200: '#E5E7EB', gray300: '#D1D5DB',
  gray500: '#6B7280', gray700: '#374151', gray800: '#1F2937',
};

// ─── Encouragements ────────────────────────────────────────────────
const CORRECT_MSG = ['Perfect! ⭐', 'Amazing! 🌟', 'You got it! ✨', 'Super! 🎯', 'Brilliant! 💫', 'Awesome! 🔥', 'Great job! 🏆'];
const WRONG_MSG = ["Almost! Let's try the next one 💪", "Good try! Keep going 🌟", "That's okay! You're learning 🧠"];
const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ─── API helpers ───────────────────────────────────────────────────
const practiceApi = {
  startSession: () => api.get('/practice/start').then(r => r.data),
  submitAnswer: (sessionId, exerciseId, answer, timeSpentMs) =>
    api.post('/practice/answer', { sessionId, exerciseId, answer, timeSpentMs }).then(r => r.data),
  completeSession: (sessionId) => api.post('/practice/complete', { sessionId }).then(r => r.data),
};

// ═══════════════════════════════════════════════════════════════════
// EXERCISE CARD (MOBILE)
// ═══════════════════════════════════════════════════════════════════
function ExerciseCardMobile({ exercise, onAnswer, disabled }) {
  const [selected, setSelected] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setSelected(null);
    fadeAnim.setValue(0);
    Animated.spring(fadeAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, [exercise?.id]);

  const content = exercise?.content || {};
  const choices = content.choices || content.options || [];

  const handleSelect = (answer) => {
    if (disabled) return;
    setSelected(answer);
    setTimeout(() => onAnswer(answer), 300);
  };

  return (
    <Animated.View style={[styles.exerciseContainer, { opacity: fadeAnim, transform: [{ scale: fadeAnim }] }]}>
      {/* Target display */}
      {content.target && (
        <View style={styles.targetBox}>
          <Text style={styles.targetText}>{content.target}</Text>
          {exercise.type === 'phonics' && (
            <TouchableOpacity style={styles.soundButton}>
              <Text style={styles.soundIcon}>🔊</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Instructions */}
      <Text style={styles.instructionText}>
        {exercise?.instructions || exercise?.title}
      </Text>

      {/* MCQ Choices */}
      {choices.length > 0 && (
        <View style={styles.choicesGrid}>
          {choices.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.choiceButton, selected === String(opt) && styles.choiceSelected]}
              onPress={() => handleSelect(String(opt))}
              disabled={disabled}
              activeOpacity={0.8}
            >
              <Text style={[styles.choiceText, selected === String(opt) && styles.choiceTextSelected]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Counting visual */}
      {exercise?.type === 'counting' && content.count && (
        <View style={styles.countingArea}>
          <View style={styles.countingEmojis}>
            {Array.from({ length: content.count }).map((_, i) => (
              <Text key={i} style={styles.countEmoji}>{content.emoji || '⭐'}</Text>
            ))}
          </View>
        </View>
      )}

      {/* Arithmetic display */}
      {exercise?.type === 'arithmetic' && content.equation && (
        <View style={styles.equationBox}>
          <Text style={styles.equationText}>{content.equation} = ?</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FEEDBACK OVERLAY (MOBILE)
// ═══════════════════════════════════════════════════════════════════
function FeedbackOverlay({ feedback, onDismiss }) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, friction: 7, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={styles.feedbackOverlay}>
      <Animated.View style={[styles.feedbackCard, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.feedbackHeader}>
          <Text style={styles.feedbackIcon}>💡</Text>
          <Text style={styles.feedbackTitle}>Let's learn together!</Text>
        </View>
        <Text style={styles.feedbackText}>
          {feedback?.feedback_text || "That's okay! Let's look at this differently."}
        </Text>
        {feedback?.memory_hook && (
          <View style={styles.memoryHookBox}>
            <Text style={styles.memoryHookEmoji}>🧠</Text>
            <Text style={styles.memoryHookText}>Remember: "{feedback.memory_hook}"</Text>
          </View>
        )}
        <TouchableOpacity style={styles.feedbackDismiss} onPress={onDismiss} activeOpacity={0.85}>
          <Text style={styles.feedbackDismissText}>Got it! 👍</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LEVEL UP OVERLAY (MOBILE)
// ═══════════════════════════════════════════════════════════════════
function LevelUpOverlay({ newLevel, onDismiss }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 🔊 Sound placeholder: level_up_fanfare
    Vibration.vibrate([0, 100, 50, 100, 50, 200]);
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.levelUpOverlay}>
      <Animated.View style={[styles.levelUpContent, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.levelUpTrophy}>🏆</Text>
        <Text style={styles.levelUpBadge}>Level {newLevel}</Text>
        <Text style={styles.levelUpTitle}>LEVEL UP!</Text>
        <Text style={styles.levelUpSubtitle}>You're getting better every day! 🌟</Text>
        <TouchableOpacity style={styles.levelUpButton} onPress={onDismiss}>
          <Text style={styles.levelUpButtonText}>Keep Going! →</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SESSION COMPLETE (MOBILE)
// ═══════════════════════════════════════════════════════════════════
function SessionCompleteScreen({ stats, onFinish }) {
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const minutes = Math.round(stats.duration / 60);

  return (
    <View style={styles.completeContainer}>
      <Text style={styles.completeTrophy}>
        {accuracy >= 80 ? '🏆' : accuracy >= 60 ? '⭐' : '🌱'}
      </Text>
      <Text style={styles.completeTitle}>Session Complete!</Text>
      <Text style={styles.completeSubtitle}>Great work! Your brain is growing stronger.</Text>

      <View style={styles.completeStats}>
        <View style={styles.completeStatBox}>
          <Text style={[styles.completeStatValue, { color: C.success }]}>{accuracy}%</Text>
          <Text style={styles.completeStatLabel}>Accuracy</Text>
        </View>
        <View style={styles.completeStatBox}>
          <Text style={[styles.completeStatValue, { color: C.primary }]}>{stats.correct}/{stats.total}</Text>
          <Text style={styles.completeStatLabel}>Correct</Text>
        </View>
        <View style={styles.completeStatBox}>
          <Text style={[styles.completeStatValue, { color: '#8B5CF6' }]}>{minutes}m</Text>
          <Text style={styles.completeStatLabel}>Time</Text>
        </View>
      </View>

      {stats.streak > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakBadgeText}>🔥 {stats.streak} day streak!</Text>
        </View>
      )}

      <TouchableOpacity style={styles.finishButton} onPress={onFinish} activeOpacity={0.85}>
        <Text style={styles.finishButtonText}>Back to Dashboard 🏠</Text>
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PRACTICE SESSION SCREEN
// ═══════════════════════════════════════════════════════════════════
export default function PracticeSessionScreen({ navigation }) {
  const [phase, setPhase] = useState('loading');
  const [sessionId, setSessionId] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [stats, setStats] = useState({ correct: 0, total: 0, duration: 0, streak: 0 });
  const [feedback, setFeedback] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [levelUp, setLevelUp] = useState(null);
  const [correctFlash, setCorrectFlash] = useState('');
  const [disabled, setDisabled] = useState(false);

  const exerciseStartRef = useRef(Date.now());
  const sessionStartRef = useRef(Date.now());

  useEffect(() => { startSession(); }, []);

  const startSession = async () => {
    try {
      const data = await practiceApi.startSession();
      setSessionId(data.sessionId);
      setExercises(data.exercises || []);
      setPhase('active');
      sessionStartRef.current = Date.now();
      exerciseStartRef.current = Date.now();
    } catch (err) {
      console.error('Start error:', err);
      navigation.goBack();
    }
  };

  const handleAnswer = useCallback(async (answer) => {
    if (disabled) return;
    setDisabled(true);

    const timeSpent = Date.now() - exerciseStartRef.current;
    const exercise = exercises[currentIdx];

    try {
      const result = await practiceApi.submitAnswer(sessionId, exercise.id, answer, timeSpent);

      if (result.isCorrect) {
        // 🔊 Sound placeholder: correct_ding
        Vibration.vibrate(50);
        setCorrectFlash(random(CORRECT_MSG));
        setSessionStreak(prev => prev + 1);
        setStats(prev => ({ ...prev, correct: prev.correct + 1, total: prev.total + 1 }));

        if (result.levelUp) {
          setTimeout(() => { setCorrectFlash(''); setLevelUp(result.newLevel); }, 800);
        } else {
          setTimeout(() => { setCorrectFlash(''); moveToNext(); }, 1000);
        }
      } else {
        // 🔊 Sound placeholder: wrong_buzz (gentle)
        Vibration.vibrate([0, 30, 50, 30]);
        setSessionStreak(0);
        setStats(prev => ({ ...prev, total: prev.total + 1 }));

        if (result.feedback) {
          setFeedback(result.feedback);
          setShowFeedback(true);
        } else {
          setCorrectFlash(random(WRONG_MSG));
          setTimeout(() => { setCorrectFlash(''); moveToNext(); }, 1200);
        }
      }
    } catch (err) {
      console.error('Answer error:', err);
      setDisabled(false);
    }
  }, [disabled, currentIdx, exercises, sessionId]);

  const moveToNext = () => {
    if (currentIdx + 1 >= exercises.length) {
      completeSession();
    } else {
      setCurrentIdx(prev => prev + 1);
      exerciseStartRef.current = Date.now();
      setDisabled(false);
    }
  };

  const completeSession = async () => {
    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
    try {
      const result = await practiceApi.completeSession(sessionId);
      setStats(prev => ({ ...prev, duration, streak: result?.streak || 0 }));
    } catch (err) {
      setStats(prev => ({ ...prev, duration }));
    }
    setPhase('complete');
  };

  // ─── LOADING ────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🧩</Text>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.gray500, marginTop: 12 }}>Preparing exercises...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── COMPLETE ───────────────────────────────────────────────────
  if (phase === 'complete') {
    return (
      <SafeAreaView style={styles.container}>
        <SessionCompleteScreen stats={stats} onFinish={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  // ─── ACTIVE ─────────────────────────────────────────────────────
  const currentExercise = exercises[currentIdx];
  const progress = (currentIdx / exercises.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => completeSession()} style={styles.exitButton}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{currentIdx + 1}/{exercises.length}</Text>
        </View>
        <View style={styles.streakBubble}>
          <Text style={styles.streakBubbleEmoji}>🔥</Text>
          <Text style={styles.streakBubbleCount}>{sessionStreak}</Text>
        </View>
      </View>

      {/* Exercise */}
      <ScrollView contentContainerStyle={styles.exerciseScroll}>
        {currentExercise && (
          <ExerciseCardMobile
            key={currentExercise.id || currentIdx}
            exercise={currentExercise}
            onAnswer={handleAnswer}
            disabled={disabled}
          />
        )}
      </ScrollView>

      {/* Correct flash */}
      {correctFlash !== '' && (
        <View style={styles.flashOverlay}>
          <View style={styles.flashBubble}>
            <Text style={styles.flashText}>{correctFlash}</Text>
          </View>
        </View>
      )}

      {/* Feedback */}
      {showFeedback && (
        <FeedbackOverlay
          feedback={feedback}
          onDismiss={() => { setShowFeedback(false); setFeedback(null); moveToNext(); }}
        />
      )}

      {/* Level up */}
      {levelUp && (
        <LevelUpOverlay
          newLevel={levelUp}
          onDismiss={() => { setLevelUp(null); setCorrectFlash(''); moveToNext(); }}
        />
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.gray100 },
  exitButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  exitText: { fontSize: 18, color: C.gray500 },
  progressBarContainer: { flex: 1, marginHorizontal: 12, alignItems: 'center' },
  progressBarBg: { width: '100%', height: 8, backgroundColor: C.gray200, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: C.primary, borderRadius: 4 },
  progressText: { fontSize: 10, color: C.gray500, marginTop: 4 },
  streakBubble: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  streakBubbleEmoji: { fontSize: 16 },
  streakBubbleCount: { fontSize: 14, fontWeight: '800', color: C.gray700 },

  // Exercise
  exerciseScroll: { padding: 20, flex: 1, justifyContent: 'center' },
  exerciseContainer: { flex: 1, justifyContent: 'center' },
  targetBox: { backgroundColor: C.white, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20, elevation: 3, borderWidth: 2, borderColor: '#E0E7FF' },
  targetText: { fontSize: 56, fontWeight: '900', color: C.primary },
  soundButton: { marginTop: 8, padding: 8 },
  soundIcon: { fontSize: 28 },
  instructionText: { fontSize: 20, fontWeight: '700', color: C.gray700, textAlign: 'center', marginBottom: 20, lineHeight: 28 },

  // Choices
  choicesGrid: { gap: 10 },
  choiceButton: { backgroundColor: C.white, borderRadius: 14, padding: 18, borderWidth: 2, borderColor: C.gray200, elevation: 1 },
  choiceSelected: { backgroundColor: C.primary, borderColor: C.primary, elevation: 4 },
  choiceText: { fontSize: 20, fontWeight: '700', color: C.gray700, textAlign: 'center' },
  choiceTextSelected: { color: '#FFF' },

  // Counting
  countingArea: { marginBottom: 20 },
  countingEmojis: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  countEmoji: { fontSize: 36 },

  // Arithmetic
  equationBox: { backgroundColor: C.white, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20, elevation: 3 },
  equationText: { fontSize: 40, fontWeight: '900', color: C.primary },

  // Flash
  flashOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  flashBubble: { backgroundColor: C.white, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20, elevation: 8, borderWidth: 1, borderColor: C.successLight },
  flashText: { fontSize: 20, fontWeight: '800', color: C.success },

  // Feedback overlay
  feedbackOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end', zIndex: 60 },
  feedbackCard: { backgroundColor: C.amberLight, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  feedbackIcon: { fontSize: 28, marginRight: 10 },
  feedbackTitle: { fontSize: 18, fontWeight: '800', color: '#92400E' },
  feedbackText: { fontSize: 15, color: '#78350F', lineHeight: 22, marginBottom: 12 },
  memoryHookBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 12, marginBottom: 16 },
  memoryHookEmoji: { fontSize: 20, marginRight: 8 },
  memoryHookText: { fontSize: 13, fontWeight: '700', color: '#92400E', fontStyle: 'italic', flex: 1 },
  feedbackDismiss: { backgroundColor: '#F59E0B', paddingVertical: 14, borderRadius: 12 },
  feedbackDismissText: { color: '#FFF', textAlign: 'center', fontSize: 16, fontWeight: '800' },

  // Level up
  levelUpOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 70 },
  levelUpContent: { alignItems: 'center', padding: 32 },
  levelUpTrophy: { fontSize: 64, marginBottom: 12 },
  levelUpBadge: { fontSize: 36, fontWeight: '900', color: '#FFF', marginBottom: 8 },
  levelUpTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', marginBottom: 8 },
  levelUpSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  levelUpButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  levelUpButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Session complete
  completeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  completeTrophy: { fontSize: 56, marginBottom: 12 },
  completeTitle: { fontSize: 26, fontWeight: '900', color: C.gray800, marginBottom: 8 },
  completeSubtitle: { fontSize: 14, color: C.gray500, marginBottom: 24, textAlign: 'center' },
  completeStats: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  completeStatBox: { backgroundColor: C.white, borderRadius: 12, padding: 16, alignItems: 'center', flex: 1, elevation: 2 },
  completeStatValue: { fontSize: 20, fontWeight: '900' },
  completeStatLabel: { fontSize: 10, color: C.gray500, marginTop: 4 },
  streakBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FCD34D' },
  streakBadgeText: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  finishButton: { width: '100%', backgroundColor: C.primary, paddingVertical: 18, borderRadius: 14, elevation: 4 },
  finishButtonText: { color: '#FFF', textAlign: 'center', fontSize: 18, fontWeight: '800' },
});
