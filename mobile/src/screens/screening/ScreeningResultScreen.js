import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import api from '../../services/api';

const COLORS = {
  primary: '#4F46E5',
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

const LD_TYPE_INFO = {
  dyslexia: { icon: '📖', label: 'Dyslexia', desc: 'Difficulty with reading, spelling, and word recognition' },
  dysgraphia: { icon: '✍️', label: 'Dysgraphia', desc: 'Difficulty with writing, handwriting, and spelling' },
  dyscalculia: { icon: '🔢', label: 'Dyscalculia', desc: 'Difficulty with numbers, math facts, and calculations' },
  mixed: { icon: '🔀', label: 'Mixed Type', desc: 'Multiple learning challenges identified' },
  not_detected: { icon: '✅', label: 'No LD Detected', desc: 'No significant learning difficulties identified' },
};

export default function ScreeningResultScreen({ route, navigation }) {
  const sessionId = route?.params?.sessionId;
  const [result, setResult] = useState(route?.params?.result || null);
  const [loading, setLoading] = useState(!result);

  useEffect(() => {
    if (!result && sessionId) {
      api.get(`/screening/result/${sessionId}`)
        .then(r => setResult(r.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [sessionId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading result...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>😞</Text>
          <Text style={styles.errorText}>Result not found</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { ldType, riskScore, breakdown, recommendations } = result;
  const riskColor = riskScore <= 30 ? COLORS.success : riskScore <= 60 ? COLORS.warning : COLORS.error;
  const ldInfo = LD_TYPE_INFO[ldType] || LD_TYPE_INFO.not_detected;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Text style={styles.headerTitle}>Screening Result</Text>

        {/* Score Ring */}
        <View style={[styles.scoreRing, { borderColor: riskColor }]}>
          <Text style={[styles.scoreValue, { color: riskColor }]}>{riskScore}</Text>
          <Text style={styles.scoreSubtext}>/ 100</Text>
        </View>
        <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
          <Text style={styles.riskBadgeText}>
            {riskScore <= 30 ? 'Low Risk' : riskScore <= 60 ? 'Moderate Risk' : 'High Risk'}
          </Text>
        </View>

        {/* LD Type card */}
        <View style={styles.ldCard}>
          <Text style={styles.ldIcon}>{ldInfo.icon}</Text>
          <Text style={styles.ldLabel}>{ldInfo.label}</Text>
          <Text style={styles.ldDesc}>{ldInfo.desc}</Text>
        </View>

        {/* Breakdown */}
        {breakdown && Object.keys(breakdown).length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📊 Detailed Breakdown</Text>
            {Object.entries(breakdown).map(([key, value]) => (
              <View key={key} style={styles.barRow}>
                <View style={styles.barLabelRow}>
                  <Text style={styles.barKey}>{key}</Text>
                  <Text style={styles.barValue}>{value}%</Text>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(value, 100)}%`,
                        backgroundColor: value > 60 ? COLORS.error : value > 30 ? COLORS.warning : COLORS.success,
                      },
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
            <Text style={styles.sectionTitle}>💡 What We Recommend</Text>
            {recommendations.map((rec, i) => (
              <View key={i} style={styles.recItem}>
                <Text style={styles.recBullet}>→</Text>
                <Text style={styles.recText}>{rec}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => navigation?.navigate?.('Practice')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionText}>Start Practice 🚀</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => navigation?.navigate?.('Home')}
          >
            <Text style={styles.secondaryActionText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 24, alignItems: 'center' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.gray500, fontSize: 14 },
  errorText: { fontSize: 16, color: COLORS.error, marginBottom: 16 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#FFF', fontWeight: '700' },

  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.gray800, marginBottom: 24 },

  scoreRing: { width: 140, height: 140, borderRadius: 70, borderWidth: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  scoreValue: { fontSize: 42, fontWeight: '900' },
  scoreSubtext: { fontSize: 13, color: COLORS.gray300 },
  riskBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginBottom: 24 },
  riskBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  ldCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24, alignItems: 'center', width: '100%', marginBottom: 20, elevation: 3 },
  ldIcon: { fontSize: 40, marginBottom: 8 },
  ldLabel: { fontSize: 20, fontWeight: '800', color: COLORS.gray800, marginBottom: 6 },
  ldDesc: { fontSize: 14, color: COLORS.gray500, textAlign: 'center', lineHeight: 20 },

  sectionCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, width: '100%', marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.gray700, marginBottom: 16 },
  barRow: { marginBottom: 14 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barKey: { fontSize: 13, fontWeight: '600', color: COLORS.gray500, textTransform: 'capitalize' },
  barValue: { fontSize: 13, color: COLORS.gray300, fontWeight: '600' },
  barBg: { height: 10, backgroundColor: COLORS.gray100, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },

  recsCard: { backgroundColor: '#EFF6FF', borderRadius: 16, padding: 20, width: '100%', marginBottom: 20 },
  recItem: { flexDirection: 'row', marginBottom: 10, paddingRight: 8 },
  recBullet: { color: COLORS.primary, marginRight: 8, fontWeight: '700', fontSize: 14 },
  recText: { fontSize: 14, color: '#1E40AF', flex: 1, lineHeight: 20 },

  actionsContainer: { width: '100%', gap: 12, marginTop: 8 },
  primaryAction: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 14, elevation: 4 },
  primaryActionText: { color: '#FFF', textAlign: 'center', fontSize: 18, fontWeight: '700' },
  secondaryAction: { backgroundColor: COLORS.gray100, padding: 16, borderRadius: 14 },
  secondaryActionText: { textAlign: 'center', fontSize: 16, fontWeight: '600', color: COLORS.gray700 },
});
