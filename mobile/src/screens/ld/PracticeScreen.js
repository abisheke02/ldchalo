import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, ActivityIndicator, Animated,
} from 'react-native';
import api from '../../services/api';

// ─── Colors ────────────────────────────────────────────────────────
const C = {
  primary: '#4F46E5', primaryDark: '#3730A3',
  success: '#10B981', warning: '#F59E0B', error: '#EF4444',
  bg: '#FFF8F0', white: '#FFFFFF',
  gray100: '#F3F4F6', gray200: '#E5E7EB', gray300: '#D1D5DB',
  gray500: '#6B7280', gray700: '#374151', gray800: '#1F2937',
};

// ─── Quotes ────────────────────────────────────────────────────────
const QUOTES = [
  { text: "Every expert was once a beginner.", icon: "🌱" },
  { text: "Practice makes progress!", icon: "📈" },
  { text: "You're braver than you believe.", icon: "🦁" },
  { text: "Small steps lead to big changes.", icon: "👣" },
  { text: "Your brain is growing stronger!", icon: "🧠" },
];

const LEVEL_INFO = {
  1: { label: 'Beginner', colors: ['#60A5FA', '#2563EB'] },
  2: { label: 'Explorer', colors: ['#34D399', '#059669'] },
  3: { label: 'Achiever', colors: ['#A78BFA', '#7C3AED'] },
  4: { label: 'Champion', colors: ['#FBBF24', '#D97706'] },
  5: { label: 'Master', colors: ['#F87171', '#DC2626'] },
};

// ─── API helpers ───────────────────────────────────────────────────
const practiceApi = {
  getProgress: () => api.get('/practice/progress').then(r => r.data),
  getHistory: () => api.get('/practice/history').then(r => r.data),
  getStreak: () => api.get('/practice/streak').then(r => r.data),
};

// ═══════════════════════════════════════════════════════════════════
// STREAK WIDGET
// ═══════════════════════════════════════════════════════════════════
function StreakWidget({ count, lastSevenDays = [] }) {
  const days = [...lastSevenDays];
  while (days.length < 7) days.push(false);
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = new Date().getDay();

  return (
    <View style={styles.streakWidget}>
      <View style={styles.streakRow}>
        <Text style={styles.streakEmoji}>🔥</Text>
        <Text style={styles.streakCount}>{count}</Text>
        <Text style={styles.streakLabel}>day streak</Text>
      </View>
      <View style={styles.dotsRow}>
        {days.map((practiced, i) => {
          const dayIdx = (today - 6 + i + 7) % 7;
          return (
            <View key={i} style={styles.dotCol}>
              <View style={[
                styles.dot,
                practiced ? styles.dotActive : styles.dotInactive,
                i === 6 && styles.dotToday,
              ]}>
                {practiced && <Text style={styles.dotCheck}>✓</Text>}
              </View>
              <Text style={styles.dotLabel}>{labels[dayIdx]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PROGRESS RING (native SVG alternative — simple circle display)
// ═══════════════════════════════════════════════════════════════════
function ProgressRingNative({ percent, color, size = 80 }) {
  return (
    <View style={[styles.ringContainer, { width: size, height: size }]}>
      <View style={[styles.ringOuter, { width: size, height: size, borderRadius: size / 2, borderColor: C.gray200 }]}>
        <View style={[styles.ringInner, { borderColor: color, borderWidth: 6, width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]} />
      </View>
      <View style={styles.ringTextContainer}>
        <Text style={[styles.ringPercent, { color }]}>{percent}%</Text>
        <Text style={styles.ringSubtext}>mastery</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PRACTICE SCREEN
// ═══════════════════════════════════════════════════════════════════
export default function PracticeScreen({ navigation }) {
  const [progress, setProgress] = useState(null);
  const [history, setHistory] = useState([]);
  const [streak, setStreak] = useState({ count: 0, lastSevenDays: [] });
  const [loading, setLoading] = useState(true);
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadData();
    // Pulsing button animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadData = async () => {
    try {
      const [p, h, s] = await Promise.allSettled([
        practiceApi.getProgress(),
        practiceApi.getHistory(),
        practiceApi.getStreak(),
      ]);
      if (p.status === 'fulfilled') setProgress(p.value);
      if (h.status === 'fulfilled') setHistory(h.value.sessions || []);
      if (s.status === 'fulfilled') setStreak(s.value);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const level = progress?.level || 1;
  const levelInfo = LEVEL_INFO[level] || LEVEL_INFO[1];
  const mastery = progress?.mastery || 0;
  const accuracy = progress?.accuracy || 0;
  const totalSessions = progress?.totalSessions || 0;
  const categoryMastery = progress?.categoryMastery || {};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Practice</Text>
            <Text style={styles.subtitle}>Build your skills every day 🌟</Text>
          </View>
        </View>

        {/* Streak */}
        <StreakWidget count={streak.count} lastSevenDays={streak.lastSevenDays} />

        {/* Level + Mastery */}
        <View style={styles.cardsRow}>
          <View style={[styles.levelCard, { backgroundColor: levelInfo.colors[1] }]}>
            <Text style={styles.levelNumber}>{level}</Text>
            <Text style={styles.levelLabel}>Level</Text>
            <Text style={styles.levelName}>{levelInfo.label}</Text>
          </View>
          <View style={styles.masteryCard}>
            <ProgressRingNative percent={mastery} color={C.primary} size={80} />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: C.success }]}>{accuracy}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: C.primary }]}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{streak.count}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        {/* Category mastery */}
        {Object.keys(categoryMastery).length > 0 && (
          <View style={styles.categoryCard}>
            <Text style={styles.categoryTitle}>Category Progress</Text>
            {Object.entries(categoryMastery).map(([cat, val]) => (
              <View key={cat} style={styles.categoryRow}>
                <View style={styles.categoryLabelRow}>
                  <Text style={styles.categoryName}>{cat.replace(/_/g, ' ')}</Text>
                  <Text style={styles.categoryPercent}>{val}%</Text>
                </View>
                <View style={styles.categoryBarBg}>
                  <View style={[
                    styles.categoryBarFill,
                    { width: `${val}%`, backgroundColor: val > 70 ? C.success : val > 40 ? C.warning : C.primary },
                  ]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* START PRACTICE BUTTON */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => navigation.navigate('PracticeSession')}
            activeOpacity={0.85}
          >
            <Text style={styles.startButtonText}>Start Practice 🚀</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteIcon}>{quote.icon}</Text>
          <Text style={styles.quoteText}>{quote.text}</Text>
        </View>

        {/* Recent sessions */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Recent Sessions</Text>
            {history.slice(0, 5).map((session, i) => (
              <View key={session.id || i} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyEmoji}>📝</Text>
                  <View>
                    <Text style={styles.historyDate}>
                      {new Date(session.created_at || session.date).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short',
                      })}
                    </Text>
                    <Text style={styles.historyDuration}>
                      {session.duration_minutes || Math.round((session.duration_seconds || 0) / 60)} min
                    </Text>
                  </View>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyScore}>{session.score || session.accuracy || 0}%</Text>
                  <Text style={styles.historyScoreLabel}>score</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: C.gray500, fontSize: 14 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: C.gray800 },
  subtitle: { fontSize: 13, color: C.gray500 },

  // Streak
  streakWidget: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  streakEmoji: { fontSize: 24, marginRight: 8 },
  streakCount: { fontSize: 22, fontWeight: '900', color: C.gray800, marginRight: 4 },
  streakLabel: { fontSize: 13, color: C.gray500 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dotCol: { alignItems: 'center', gap: 2 },
  dot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dotActive: { backgroundColor: '#34D399' },
  dotInactive: { backgroundColor: C.gray200 },
  dotToday: { borderWidth: 2, borderColor: C.primary },
  dotCheck: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  dotLabel: { fontSize: 9, color: C.gray500 },

  // Cards row
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  levelCard: { flex: 1, borderRadius: 16, padding: 18, elevation: 3 },
  levelNumber: { fontSize: 36, fontWeight: '900', color: '#FFF' },
  levelLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  levelName: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  masteryCard: { flex: 1, backgroundColor: C.white, borderRadius: 16, padding: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },

  // Progress ring
  ringContainer: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  ringOuter: { borderWidth: 6, position: 'absolute' },
  ringInner: { position: 'absolute' },
  ringTextContainer: { alignItems: 'center' },
  ringPercent: { fontSize: 18, fontWeight: '800' },
  ringSubtext: { fontSize: 9, color: C.gray500 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: C.white, borderRadius: 12, padding: 12, alignItems: 'center', elevation: 1 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, color: C.gray500, marginTop: 2 },

  // Category mastery
  categoryCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  categoryTitle: { fontSize: 13, fontWeight: '700', color: C.gray700, marginBottom: 12 },
  categoryRow: { marginBottom: 10 },
  categoryLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  categoryName: { fontSize: 12, fontWeight: '600', color: C.gray500, textTransform: 'capitalize' },
  categoryPercent: { fontSize: 11, color: C.gray300 },
  categoryBarBg: { height: 6, backgroundColor: C.gray100, borderRadius: 3, overflow: 'hidden' },
  categoryBarFill: { height: '100%', borderRadius: 3 },

  // Start button
  startButton: { backgroundColor: C.primary, paddingVertical: 20, borderRadius: 18, elevation: 6, marginBottom: 16, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  startButtonText: { color: '#FFF', textAlign: 'center', fontSize: 20, fontWeight: '800' },

  // Quote
  quoteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20, borderWidth: 1, borderColor: '#E0E7FF' },
  quoteIcon: { fontSize: 22, marginRight: 10 },
  quoteText: { fontSize: 13, color: C.gray500, fontStyle: 'italic', flex: 1 },

  // History
  historySection: { marginTop: 4 },
  historyTitle: { fontSize: 13, fontWeight: '700', color: C.gray700, marginBottom: 10 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, elevation: 1 },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyEmoji: { fontSize: 18 },
  historyDate: { fontSize: 13, fontWeight: '600', color: C.gray700 },
  historyDuration: { fontSize: 11, color: C.gray500 },
  historyRight: { alignItems: 'flex-end' },
  historyScore: { fontSize: 14, fontWeight: '800', color: C.primary },
  historyScoreLabel: { fontSize: 10, color: C.gray500 },
});
