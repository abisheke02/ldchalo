import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ldAPI } from '../../services/api';

const TYPE_CONFIG = {
  phonics:  { icon: '🔤', color: '#7C3AED', bg: '#F5F3FF' },
  reading:  { icon: '📖', color: '#2563EB', bg: '#EFF6FF' },
  writing:  { icon: '✏️', color: '#D97706', bg: '#FEF3C7' },
  math:     { icon: '🔢', color: '#059669', bg: '#F0FDF4' },
};

function ExerciseCard({ ex, onStart }) {
  const cfg = TYPE_CONFIG[ex.type] || { icon: '📝', color: '#6B7280', bg: '#F3F4F6' };
  return (
    <TouchableOpacity style={s.exCard} onPress={() => onStart(ex)} activeOpacity={0.8}>
      <View style={[s.exIcon, { backgroundColor: cfg.bg }]}>
        <Text style={{ fontSize: 26 }}>{cfg.icon}</Text>
      </View>
      <View style={s.exBody}>
        <Text style={s.exTitle}>{ex.title}</Text>
        <Text style={s.exDesc} numberOfLines={2}>{ex.instructions}</Text>
      </View>
      <View style={[s.exTag, { backgroundColor: cfg.color }]}>
        <Text style={s.exTagText}>L{ex.level}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ActiveSession({ exercise, sessionId, onFinish }) {
  const [answer, setAnswer]   = useState(null);
  const [result, setResult]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const opts = exercise.content?.choices || exercise.content?.options || [];

  const select = async (opt) => {
    if (result) return;
    setAnswer(opt);

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    setSubmitting(true);
    try {
      const res = await ldAPI.recordAttempt(sessionId, {
        exercise_id:    exercise.id,
        user_answer:    opt,
        correct_answer: opts[0],
        score:          opt === opts[0] ? 100 : 0,
      });
      setResult(res);
      setTimeout(() => onFinish(res), 1200);
    } catch { Alert.alert('Error', 'Could not record answer'); }
    finally { setSubmitting(false); }
  };

  return (
    <View style={s.sessionWrap}>
      <View style={s.sessionHeader}>
        <Text style={s.sessionType}>{exercise.type?.toUpperCase()}</Text>
        <TouchableOpacity onPress={() => onFinish(null)}>
          <Text style={s.exitText}>✕ Exit</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.instructions}>{exercise.instructions}</Text>

      <View style={s.optGrid}>
        {opts.map((opt, i) => {
          const isSelected = answer === opt;
          const isCorrect  = result && opt === opts[0];
          const isWrong    = result && isSelected && opt !== opts[0];
          return (
            <Animated.View key={i} style={{ transform: [{ scale: isSelected ? scaleAnim : 1 }] }}>
              <TouchableOpacity
                style={[
                  s.optBtn,
                  isCorrect && s.optCorrect,
                  isWrong   && s.optWrong,
                  isSelected && !result && s.optSelected,
                ]}
                onPress={() => select(opt)}
                disabled={!!result || submitting}
                activeOpacity={0.8}
              >
                <Text style={[
                  s.optText,
                  (isCorrect || (isSelected && !result)) && s.optTextActive,
                ]}>{opt}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {result && (
        <View style={[s.resultBanner, result.correct ? s.resultOk : s.resultFail]}>
          <Text style={s.resultBannerText}>
            {result.correct ? '✅ Correct!' : `❌ Answer: ${opts[0]}`}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function PracticeScreen() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('');
  const [active, setActive]       = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [sessionStats, setStats]  = useState({ correct: 0, total: 0 });

  useEffect(() => {
    ldAPI.startSession('practice')
      .then((d) => setSessionId(d.id))
      .catch(() => {});
    loadExercises();
  }, []);

  const loadExercises = (type = '') => {
    setLoading(true);
    ldAPI.getExercises(type || undefined)
      .then((d) => setExercises(Array.isArray(d) ? d : []))
      .catch(() => setExercises([]))
      .finally(() => setLoading(false));
  };

  const handleFilter = (type) => {
    setFilter(type);
    loadExercises(type);
  };

  const handleFinish = (res) => {
    if (res) setStats((p) => ({ correct: p.correct + (res.correct ? 1 : 0), total: p.total + 1 }));
    setActive(null);
  };

  if (active && sessionId) {
    return (
      <SafeAreaView style={s.safe}>
        <ActiveSession exercise={active} sessionId={sessionId} onFinish={handleFinish} />
      </SafeAreaView>
    );
  }

  const TYPES = ['', 'phonics', 'reading', 'writing', 'math'];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Practice</Text>
          {sessionStats.total > 0 && (
            <Text style={s.statsText}>
              Session: {sessionStats.correct}/{sessionStats.total} correct
            </Text>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {TYPES.map((t) => {
          const cfg = TYPE_CONFIG[t] || { icon: '✨', color: '#4F46E5' };
          const active = filter === t;
          return (
            <TouchableOpacity key={t || 'all'} onPress={() => handleFilter(t)}
              style={[s.filterChip, active && { backgroundColor: cfg.color, borderColor: cfg.color }]}
            >
              <Text style={[s.filterChipText, active && { color: '#fff' }]}>
                {t ? `${cfg.icon} ${t}` : '✨ All'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#4F46E5" size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {exercises.length === 0
            ? <View style={s.empty}><Text style={{ fontSize: 48 }}>📚</Text><Text style={s.emptyText}>No exercises found</Text></View>
            : exercises.map((ex) => (
              <ExerciseCard key={ex.id} ex={ex} onStart={setActive} />
            ))
          }
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F8FAFC' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 8 },
  title:        { fontSize: 22, fontWeight: '800', color: '#111827' },
  statsText:    { fontSize: 12, color: '#6B7280', marginTop: 2 },
  filterRow:    { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip:   { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff' },
  filterChipText:{ fontSize: 13, fontWeight: '600', color: '#374151' },
  list:         { padding: 16, gap: 12, paddingBottom: 40 },
  exCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 2, gap: 12 },
  exIcon:       { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  exBody:       { flex: 1 },
  exTitle:      { fontSize: 14, fontWeight: '700', color: '#111827' },
  exDesc:       { fontSize: 12, color: '#6B7280', marginTop: 3 },
  exTag:        { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  exTagText:    { fontSize: 11, fontWeight: '700', color: '#fff' },
  empty:        { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText:    { fontSize: 15, color: '#94A3B8' },
  sessionWrap:  { flex: 1, padding: 20 },
  sessionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  sessionType:  { fontSize: 12, fontWeight: '800', color: '#6B7280', letterSpacing: 1 },
  exitText:     { fontSize: 14, color: '#DC2626', fontWeight: '600' },
  instructions: { fontSize: 20, fontWeight: '700', color: '#111827', lineHeight: 28, marginBottom: 32 },
  optGrid:      { gap: 12 },
  optBtn:       { borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 14, padding: 16, backgroundColor: '#fff' },
  optSelected:  { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  optCorrect:   { borderColor: '#059669', backgroundColor: '#F0FDF4' },
  optWrong:     { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  optText:      { fontSize: 16, color: '#374151', fontWeight: '500', textAlign: 'center' },
  optTextActive:{ fontWeight: '700', color: '#1e293b' },
  resultBanner: { marginTop: 24, borderRadius: 12, padding: 16, alignItems: 'center' },
  resultOk:     { backgroundColor: '#F0FDF4' },
  resultFail:   { backgroundColor: '#FEF2F2' },
  resultBannerText: { fontSize: 16, fontWeight: '700' },
});
