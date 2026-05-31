import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ldAPI } from '../../services/api';

const LEVEL_LABELS = ['', 'Starter', 'Basic', 'Intermediate', 'Advanced', 'Mastery'];
const LEVEL_COLORS = ['', '#6B7280', '#0891B2', '#059669', '#7C3AED', '#D97706'];

function LevelsView({ onStart }) {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ldAPI.getTestLevels()
      .then((d) => setLevels(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={s.center}><ActivityIndicator color="#4F46E5" /></View>;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={s.sectionTitle}>Choose Your Level</Text>
      {levels.map((l) => (
        <View key={l.level} style={[s.levelCard, !l.unlocked && s.levelLocked]}>
          <View style={s.levelLeft}>
            <View style={[s.levelBadge, { backgroundColor: l.unlocked ? LEVEL_COLORS[l.level] : '#9CA3AF' }]}>
              <Text style={s.levelNum}>{l.level}</Text>
            </View>
            <View>
              <Text style={s.levelName}>{LEVEL_LABELS[l.level]}</Text>
              <Text style={s.levelSub}>{l.unlocked ? '10 questions · 70% to pass' : 'Complete previous level first'}</Text>
            </View>
          </View>
          {l.unlocked ? (
            <TouchableOpacity style={[s.startBtn, { backgroundColor: LEVEL_COLORS[l.level] }]} onPress={() => onStart(l.level)}>
              <Text style={s.startBtnText}>Start</Text>
            </TouchableOpacity>
          ) : (
            <Text style={s.lockIcon}>🔒</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function QuizView({ level, onDone }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers]     = useState({});
  const [current, setCurrent]     = useState(0);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime]               = useState(Date.now());

  useEffect(() => {
    ldAPI.getTestQs(level)
      .then((d) => setQuestions(Array.isArray(d) ? d : []))
      .catch(() => Alert.alert('Error', 'Could not load questions'))
      .finally(() => setLoading(false));
  }, [level]);

  const selectAnswer = (qId, answer) => {
    setAnswers((prev) => ({ ...prev, [qId]: answer }));
    setTimeout(() => {
      if (current < questions.length - 1) setCurrent((c) => c + 1);
    }, 400);
  };

  const submit = async () => {
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      return Alert.alert('Incomplete', `${unanswered.length} questions not answered. Continue anyway?`, [
        { text: 'Go Back' },
        { text: 'Submit', onPress: doSubmit },
      ]);
    }
    await doSubmit();
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({ question_id: q.id, answer: answers[q.id] || '' }));
      const result  = await ldAPI.submitTest({ level, answers: payload, duration_seconds: Math.floor((Date.now() - startTime) / 1000) });
      onDone(result);
    } catch { Alert.alert('Error', 'Submission failed'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color="#4F46E5" /></View>;

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;
  const opts = Array.isArray(q?.options) ? q.options : [];

  return (
    <View style={{ flex: 1 }}>
      {/* Progress */}
      <View style={s.progressWrap}>
        <View style={[s.progressBar, { width: `${progress}%` }]} />
      </View>
      <View style={s.quizHeader}>
        <Text style={s.quizCounter}>{current + 1} / {questions.length}</Text>
        <TouchableOpacity onPress={() => Alert.alert('Quit', 'Exit this test?', [{ text: 'No' }, { text: 'Yes', onPress: () => onDone(null) }])}>
          <Text style={s.quitText}>Quit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={s.questionText}>{q?.question_text}</Text>

        <View style={{ gap: 10, marginTop: 20 }}>
          {opts.map((opt) => {
            const selected = answers[q?.id] === opt;
            return (
              <TouchableOpacity key={opt} onPress={() => selectAnswer(q?.id, opt)}
                style={[s.optBtn, selected && s.optBtnSelected]}
                activeOpacity={0.7}
              >
                <Text style={[s.optText, selected && s.optTextSelected]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {current === questions.length - 1 && (
        <View style={s.submitWrap}>
          <TouchableOpacity style={s.submitBtn} onPress={submit} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitBtnText}>Submit Test</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ResultView({ result, onBack }) {
  const pct = Math.round((result.correct / result.total) * 100);
  return (
    <View style={[s.center, { padding: 32 }]}>
      <Text style={{ fontSize: 64 }}>{result.passed ? '🏆' : '📖'}</Text>
      <Text style={s.resultScore}>{result.score}%</Text>
      <Text style={[s.resultStatus, { color: result.passed ? '#059669' : '#D97706' }]}>
        {result.passed ? 'Level Unlocked! 🎉' : 'Almost There — Keep Practising!'}
      </Text>
      <Text style={s.resultDetail}>{result.correct} / {result.total} correct</Text>

      <View style={s.resultBtns}>
        <TouchableOpacity style={[s.startBtn, { backgroundColor: '#4F46E5', flex: 1 }]} onPress={onBack}>
          <Text style={s.startBtnText}>Back to Levels</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TestsScreen() {
  const [view, setView]     = useState('levels'); // levels | quiz | result
  const [level, setLevel]   = useState(null);
  const [result, setResult] = useState(null);

  if (view === 'quiz' && level) {
    return (
      <SafeAreaView style={s.safe}>
        <QuizView level={level} onDone={(r) => {
          if (r) { setResult(r); setView('result'); }
          else   { setView('levels'); }
        }} />
      </SafeAreaView>
    );
  }

  if (view === 'result' && result) {
    return (
      <SafeAreaView style={s.safe}>
        <ResultView result={result} onBack={() => { setView('levels'); setResult(null); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Tests</Text>
        <Text style={s.subtitle}>Pass 70% to unlock the next level</Text>
      </View>
      <LevelsView onStart={(l) => { setLevel(l); setView('quiz'); }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F8FAFC' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { padding: 16, paddingBottom: 8 },
  title:        { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle:     { fontSize: 12, color: '#6B7280', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  levelCard:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2 },
  levelLocked:  { opacity: 0.5 },
  levelLeft:    { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  levelBadge:   { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  levelNum:     { fontSize: 18, fontWeight: '800', color: '#fff' },
  levelName:    { fontSize: 15, fontWeight: '700', color: '#111827' },
  levelSub:     { fontSize: 11, color: '#6B7280', marginTop: 2 },
  startBtn:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  lockIcon:     { fontSize: 20 },
  progressWrap: { height: 4, backgroundColor: '#E5E7EB' },
  progressBar:  { height: 4, backgroundColor: '#4F46E5' },
  quizHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  quizCounter:  { fontSize: 14, fontWeight: '700', color: '#374151' },
  quitText:     { fontSize: 13, color: '#DC2626', fontWeight: '600' },
  questionText: { fontSize: 18, fontWeight: '700', color: '#111827', lineHeight: 26 },
  optBtn:       { borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, backgroundColor: '#fff' },
  optBtnSelected:{ borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  optText:      { fontSize: 15, color: '#374151', fontWeight: '500' },
  optTextSelected:{ color: '#4F46E5', fontWeight: '700' },
  submitWrap:   { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB' },
  submitBtn:    { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitBtnText:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  resultScore:  { fontSize: 56, fontWeight: '900', color: '#111827', marginTop: 12 },
  resultStatus: { fontSize: 18, fontWeight: '700', marginTop: 8, textAlign: 'center' },
  resultDetail: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  resultBtns:   { flexDirection: 'row', gap: 12, marginTop: 32, width: '100%' },
});
