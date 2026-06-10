import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Animated, Dimensions, SafeAreaView, ActivityIndicator,
} from 'react-native';
import api from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Colors ────────────────────────────────────────────────────────
const COLORS = {
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  bg: '#FFF8F0',
  white: '#FFFFFF',
  gray100: '#F3F4F6',
  gray300: '#D1D5DB',
  gray500: '#6B7280',
  gray700: '#374151',
  gray800: '#1F2937',
};

// ─── Encouragements ────────────────────────────────────────────────
const ENCOURAGEMENTS = [
  'Great job! 🌟', "You're doing amazing! 💪", 'Keep going! 🚀',
  'Wonderful! ✨', 'Nice thinking! 🧠', "You're a star! ⭐",
  'Almost there! 🎯', 'Fantastic! 🎉', 'Super! 🦸', 'Brilliant! 💫',
];
const randomEncouragement = () => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];

// ─── API helpers ───────────────────────────────────────────────────
const screeningApi = {
  getQuestions: () => api.get('/screening/questions').then(r => r.data),
  startSession: () => api.post('/screening/start').then(r => r.data),
  submitAnswer: (sessionId, questionId, answer, timeSpentMs) =>
    api.post('/screening/answer', { sessionId, questionId, answer, timeSpentMs }).then(r => r.data),
  completeSession: (sessionId) => api.post('/screening/complete', { sessionId }).then(r => r.data),
};

// ═══════════════════════════════════════════════════════════════════
// WELCOME SCREEN
// ═══════════════════════════════════════════════════════════════════
function WelcomeScreen({ onStart, loading }) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -10, duration: 800, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.welcomeContainer}>
      <Animated.Text style={[styles.welcomeEmoji, { transform: [{ translateY: bounceAnim }] }]}>
        🧩
      </Animated.Text>
      <Text style={styles.welcomeTitle}>Let's Play a Fun Quiz!</Text>
      <Text style={styles.welcomeSubtitle}>
        We'll ask you some questions about letters, numbers, and sounds.{'\n'}
        There are no wrong answers — just do your best! 🌈
      </Text>
      <Text style={styles.welcomeMeta}>About 10 minutes • 30 questions</Text>

      <TouchableOpacity
        style={styles.startButton}
        onPress={onStart}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.startButtonText}>Start Quiz 🎮</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// QUESTION CARD
// ═══════════════════════════════════════════════════════════════════
function QuestionCardMobile({ question, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    setSelected(null);
  }, [question.id]);

  const options = typeof question.options === 'string'
    ? JSON.parse(question.options) : (question.options || []);

  const handleSelect = (answer) => {
    setSelected(answer);
    // Brief haptic-like flash
    setTimeout(() => onAnswer(answer), 400);
  };

  return (
    <Animated.View style={[styles.questionContainer, { transform: [{ scale: scaleAnim }] }]}>
      {/* Question text */}
      <View style={styles.questionBox}>
        <Text style={styles.questionText}>{question.question_text}</Text>
      </View>

      {/* MCQ */}
      {question.question_type === 'mcq' && (
        <View style={styles.optionsGrid}>
          {options.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.optionButton,
                selected === opt && styles.optionSelected,
              ]}
              onPress={() => handleSelect(opt)}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionLabel, selected === opt && styles.optionLabelSelected]}>
                {String.fromCharCode(65 + idx)}
              </Text>
              <Text style={[styles.optionText, selected === opt && styles.optionTextSelected]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Yes/No */}
      {question.question_type === 'yes_no' && (
        <View style={styles.yesNoContainer}>
          <TouchableOpacity
            style={[styles.yesNoButton, styles.yesButton, selected === 'yes' && styles.yesButtonActive]}
            onPress={() => handleSelect('yes')}
          >
            <Text style={styles.yesNoEmoji}>👍</Text>
            <Text style={[styles.yesNoLabel, selected === 'yes' && { color: '#FFF' }]}>YES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.yesNoButton, styles.noButton, selected === 'no' && styles.noButtonActive]}
            onPress={() => handleSelect('no')}
          >
            <Text style={styles.yesNoEmoji}>👎</Text>
            <Text style={[styles.yesNoLabel, selected === 'no' && { color: '#FFF' }]}>NO</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Drag order (simplified as numbered taps) */}
      {question.question_type === 'drag_order' && (
        <View style={styles.dragContainer}>
          <Text style={styles.dragHint}>Tap items in the correct order:</Text>
          {options.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.dragItem}
              onPress={() => handleSelect(options.join(','))}
            >
              <View style={styles.dragNumber}>
                <Text style={styles.dragNumberText}>{idx + 1}</Text>
              </View>
              <Text style={styles.dragItemText}>{opt}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.confirmOrderButton}
            onPress={() => handleSelect(options.join(','))}
          >
            <Text style={styles.confirmOrderText}>Confirm Order ✓</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PROGRESS BAR
// ═══════════════════════════════════════════════════════════════════
function ProgressBarMobile({ current, total, timeRemaining, category }) {
  const progress = (current / total) * 100;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timerColor = timeRemaining < 60 ? COLORS.error : timeRemaining < 180 ? COLORS.warning : COLORS.gray500;

  const CATEGORY_LABELS = {
    letter_recognition: '🔤 Letters',
    rhyme_detection: '🎵 Rhymes',
    phoneme_blending: '🗣️ Sounds',
    number_sense: '🔢 Numbers',
    sequencing: '📋 Order',
  };

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>Q {current + 1}/{total}</Text>
        {category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{CATEGORY_LABELS[category] || category}</Text>
          </View>
        )}
        <Text style={[styles.timerText, { color: timerColor }]}>
          ⏱️ {minutes}:{seconds.toString().padStart(2, '0')}
        </Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ANALYZING SCREEN
// ═══════════════════════════════════════════════════════════════════
function AnalyzingScreen() {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
    ).start();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.analyzingContainer}>
      <Animated.View style={[styles.spinnerCircle, { transform: [{ rotate: spin }] }]} />
      <Text style={styles.analyzingEmoji}>🧠</Text>
      <Text style={styles.analyzingTitle}>Analyzing Your Responses...</Text>
      <Text style={styles.analyzingSubtitle}>Our AI is looking at your answers</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RESULT SCREEN
// ═══════════════════════════════════════════════════════════════════
function ResultScreen({ result, onStartPractice }) {
  const { ldType, riskScore, breakdown, recommendations } = result;
  const riskColor = riskScore <= 30 ? COLORS.success : riskScore <= 60 ? COLORS.warning : COLORS.error;

  const ldLabels = {
    dyslexia: '📖 Dyslexia',
    dysgraphia: '✍️ Dysgraphia',
    dyscalculia: '🔢 Dyscalculia',
    mixed: '🔀 Mixed Type',
    not_detected: '✅ No LD Detected',
  };

  return (
    <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent}>
      {/* Score circle */}
      <View style={styles.scoreCircle}>
        <Text style={[styles.scoreNumber, { color: riskColor }]}>{riskScore}</Text>
        <Text style={styles.scoreLabel}>Risk Score</Text>
      </View>

      {/* LD Type */}
      <View style={[styles.ldBadge, { backgroundColor: riskColor }]}>
        <Text style={styles.ldBadgeText}>{ldLabels[ldType] || ldType}</Text>
      </View>

      {ldType === 'not_detected' ? (
        <Text style={styles.resultMessage}>Great news! No learning difficulties detected. 🎉</Text>
      ) : (
        <Text style={styles.resultMessage}>Don't worry — we have exercises to help you improve!</Text>
      )}

      {/* Breakdown */}
      {breakdown && Object.keys(breakdown).length > 0 && (
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Breakdown</Text>
          {Object.entries(breakdown).map(([key, value]) => (
            <View key={key} style={styles.breakdownRow}>
              <View style={styles.breakdownLabelRow}>
                <Text style={styles.breakdownKey}>{key}</Text>
                <Text style={styles.breakdownValue}>{value}%</Text>
              </View>
              <View style={styles.breakdownBarBg}>
                <View
                  style={[
                    styles.breakdownBarFill,
                    { width: `${value}%`, backgroundColor: value > 60 ? COLORS.error : value > 30 ? COLORS.warning : COLORS.success },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <View style={styles.recsCard}>
          <Text style={styles.recsTitle}>💡 Recommendations</Text>
          {recommendations.map((rec, i) => (
            <View key={i} style={styles.recRow}>
              <Text style={styles.recBullet}>•</Text>
              <Text style={styles.recText}>{rec}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action button */}
      <TouchableOpacity style={styles.practiceButton} onPress={onStartPractice} activeOpacity={0.85}>
        <Text style={styles.practiceButtonText}>Start Practice 🚀</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SCREENING QUIZ SCREEN
// ═══════════════════════════════════════════════════════════════════
export default function ScreeningQuizScreen({ navigation }) {
  const [phase, setPhase] = useState('welcome');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [encouragement, setEncouragement] = useState('');
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(600);
  const timerRef = useRef(null);
  const questionStartRef = useRef(Date.now());

  // Timer
  useEffect(() => {
    if (phase === 'quiz') {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const [qData, sData] = await Promise.all([
        screeningApi.getQuestions(),
        screeningApi.startSession(),
      ]);
      setQuestions(qData.questions || []);
      setSessionId(sData.sessionId);
      setPhase('quiz');
      questionStartRef.current = Date.now();
    } catch (err) {
      console.error('Start error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = useCallback(async (answer) => {
    const timeSpent = Date.now() - questionStartRef.current;
    const question = questions[currentIdx];

    setEncouragement(randomEncouragement());
    setShowEncouragement(true);
    setTimeout(() => setShowEncouragement(false), 1200);

    screeningApi.submitAnswer(sessionId, question.id, answer, timeSpent).catch(console.error);

    if (currentIdx + 1 >= questions.length) {
      await handleComplete();
    } else {
      setTimeout(() => {
        setCurrentIdx((prev) => prev + 1);
        questionStartRef.current = Date.now();
      }, 600);
    }
  }, [currentIdx, questions, sessionId]);

  const handleComplete = async () => {
    clearInterval(timerRef.current);
    setPhase('analyzing');
    try {
      const res = await screeningApi.completeSession(sessionId);
      await new Promise((r) => setTimeout(r, 2500));
      setResult(res);
      setPhase('result');
    } catch (err) {
      console.error('Complete error:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Encouragement popup */}
      {showEncouragement && (
        <View style={styles.encouragementPopup}>
          <Text style={styles.encouragementText}>{encouragement}</Text>
        </View>
      )}

      {phase === 'welcome' && <WelcomeScreen onStart={handleStart} loading={loading} />}

      {phase === 'quiz' && questions[currentIdx] && (
        <View style={styles.quizContainer}>
          <ProgressBarMobile
            current={currentIdx}
            total={questions.length}
            timeRemaining={timeRemaining}
            category={questions[currentIdx]?.category}
          />
          <QuestionCardMobile
            key={questions[currentIdx].id}
            question={questions[currentIdx]}
            onAnswer={handleAnswer}
          />
        </View>
      )}

      {phase === 'analyzing' && <AnalyzingScreen />}
      {phase === 'result' && result && (
        <ResultScreen
          result={result}
          onStartPractice={() => navigation?.navigate?.('Practice') || null}
        />
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Welcome
  welcomeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  welcomeEmoji: { fontSize: 64, marginBottom: 16 },
  welcomeTitle: { fontSize: 28, fontWeight: '800', color: COLORS.gray800, textAlign: 'center', marginBottom: 12 },
  welcomeSubtitle: { fontSize: 16, color: COLORS.gray500, textAlign: 'center', lineHeight: 24, marginBottom: 8 },
  welcomeMeta: { fontSize: 13, color: COLORS.gray300, marginBottom: 32 },
  startButton: { backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 18, borderRadius: 16, elevation: 4 },
  startButtonText: { color: '#FFF', fontSize: 20, fontWeight: '700' },

  // Progress
  progressContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '700', color: COLORS.gray700 },
  categoryBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  categoryText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  timerText: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  progressBarBg: { height: 8, backgroundColor: COLORS.gray100, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },

  // Quiz
  quizContainer: { flex: 1 },

  // Question
  questionContainer: { flex: 1, padding: 16, justifyContent: 'center' },
  questionBox: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24, marginBottom: 24, elevation: 3, borderWidth: 2, borderColor: '#E0E7FF' },
  questionText: { fontSize: 22, fontWeight: '700', color: COLORS.gray800, textAlign: 'center', lineHeight: 32 },

  // MCQ options
  optionsGrid: { gap: 12 },
  optionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 14, padding: 18, borderWidth: 2, borderColor: COLORS.gray300, elevation: 1 },
  optionSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, elevation: 4 },
  optionLabel: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.gray100, textAlign: 'center', lineHeight: 28, fontSize: 13, fontWeight: '700', color: COLORS.gray500, marginRight: 14 },
  optionLabelSelected: { backgroundColor: 'rgba(255,255,255,0.3)', color: '#FFF' },
  optionText: { fontSize: 18, fontWeight: '600', color: COLORS.gray700, flex: 1 },
  optionTextSelected: { color: '#FFF' },

  // Yes/No
  yesNoContainer: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  yesNoButton: { width: 130, height: 130, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 3 },
  yesButton: { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' },
  yesButtonActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  noButton: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  noButtonActive: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  yesNoEmoji: { fontSize: 36, marginBottom: 6 },
  yesNoLabel: { fontSize: 18, fontWeight: '800', color: COLORS.gray700 },

  // Drag order
  dragContainer: { gap: 10 },
  dragHint: { textAlign: 'center', color: COLORS.gray500, fontSize: 13, marginBottom: 8 },
  dragItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, borderWidth: 2, borderColor: COLORS.gray300 },
  dragNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dragNumberText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  dragItemText: { fontSize: 16, fontWeight: '600', color: COLORS.gray700 },
  confirmOrderButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, marginTop: 8 },
  confirmOrderText: { color: '#FFF', textAlign: 'center', fontSize: 16, fontWeight: '700' },

  // Analyzing
  analyzingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  spinnerCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: COLORS.primary, borderTopColor: 'transparent', position: 'absolute' },
  analyzingEmoji: { fontSize: 40, marginBottom: 20 },
  analyzingTitle: { fontSize: 22, fontWeight: '700', color: COLORS.gray800, marginBottom: 8 },
  analyzingSubtitle: { fontSize: 14, color: COLORS.gray500 },

  // Result
  resultScroll: { flex: 1 },
  resultContent: { padding: 24, alignItems: 'center' },
  scoreCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, borderColor: COLORS.gray100, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  scoreNumber: { fontSize: 36, fontWeight: '800' },
  scoreLabel: { fontSize: 11, color: COLORS.gray500 },
  ldBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginBottom: 12 },
  ldBadgeText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  resultMessage: { fontSize: 15, color: COLORS.gray500, textAlign: 'center', marginBottom: 24 },

  breakdownCard: { width: '100%', backgroundColor: COLORS.white, borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2 },
  breakdownTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray700, marginBottom: 16 },
  breakdownRow: { marginBottom: 14 },
  breakdownLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  breakdownKey: { fontSize: 13, fontWeight: '600', color: COLORS.gray500, textTransform: 'capitalize' },
  breakdownValue: { fontSize: 13, color: COLORS.gray300 },
  breakdownBarBg: { height: 8, backgroundColor: COLORS.gray100, borderRadius: 4, overflow: 'hidden' },
  breakdownBarFill: { height: '100%', borderRadius: 4 },

  recsCard: { width: '100%', backgroundColor: '#EFF6FF', borderRadius: 16, padding: 20, marginBottom: 20 },
  recsTitle: { fontSize: 16, fontWeight: '700', color: '#1E40AF', marginBottom: 12 },
  recRow: { flexDirection: 'row', marginBottom: 8, paddingRight: 8 },
  recBullet: { color: COLORS.success, marginRight: 8, fontSize: 14 },
  recText: { fontSize: 14, color: '#1E40AF', flex: 1, lineHeight: 20 },

  practiceButton: { width: '100%', backgroundColor: COLORS.primary, padding: 18, borderRadius: 14, marginTop: 8, elevation: 4 },
  practiceButtonText: { color: '#FFF', textAlign: 'center', fontSize: 18, fontWeight: '700' },

  // Encouragement
  encouragementPopup: { position: 'absolute', top: 60, alignSelf: 'center', zIndex: 999, backgroundColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, elevation: 8, borderWidth: 1, borderColor: '#D1FAE5' },
  encouragementText: { fontSize: 16, fontWeight: '700', color: COLORS.success },
});
