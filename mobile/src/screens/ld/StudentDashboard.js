import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ldAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const LEVEL_LABELS = ['', 'Starter', 'Basic', 'Intermediate', 'Advanced', 'Mastery'];

export default function StudentDashboard({ navigation }) {
  const { user, logout }  = useAuthStore();
  const [data, setData]   = useState(null);
  const [refreshing, setR] = useState(false);

  const load = async () => {
    const d = await ldAPI.getMyAnalytics().catch(() => null);
    setData(d);
  };

  useEffect(() => { load(); }, []);

  const p         = data?.profile || {};
  const screened  = p.ld_type != null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setR(true); await load(); setR(false); }} />}>
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Hello, {user?.name || 'Student'} 👋</Text>
            <Text style={s.sub}>Level {p.current_level ?? 1} — {LEVEL_LABELS[p.current_level ?? 1]}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={s.logoutBtn}>
            <Text style={s.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={s.statsRow}>
          <View style={[s.stat, { borderLeftColor: '#F97316' }]}>
            <Text style={s.statValue}>{p.streak_count ?? 0}</Text>
            <Text style={s.statLabel}>🔥 Streak</Text>
          </View>
          <View style={[s.stat, { borderLeftColor: '#4F46E5' }]}>
            <Text style={s.statValue}>{p.total_minutes_today ?? 0}</Text>
            <Text style={s.statLabel}>📚 Min Today</Text>
          </View>
        </View>

        {!screened ? (
          <TouchableOpacity style={s.ctaBanner} onPress={() => navigation.navigate('Screening')}>
            <Text style={s.ctaTitle}>Start LD Screening →</Text>
            <Text style={s.ctaSub}>10-min quiz to personalise your learning</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.ldBadge}>
            <Text style={s.ldTitle}>{p.ld_type?.replace('_', ' ')}</Text>
            <View style={s.riskBar}>
              <View style={[s.riskFill, { width: `${p.ld_risk_score || 0}%` }]} />
            </View>
            <Text style={s.riskScore}>Risk: {p.ld_risk_score ?? 0}/100</Text>
          </View>
        )}

        <View style={s.quickGrid}>
          {[
            { label: 'Practice', icon: '📚', route: 'Practice', color: '#4F46E5' },
            { label: 'Tests',    icon: '📝', route: 'Tests',    color: '#0891B2' },
            { label: 'Tips',     icon: '💡', route: 'Tips',     color: '#7C3AED' },
            { label: 'Messages', icon: '💬', route: 'Messages', color: '#059669' },
          ].map((item) => (
            <TouchableOpacity key={item.route} style={s.quickCard}
              onPress={() => navigation.navigate(item.route)}
            >
              <Text style={s.quickIcon}>{item.icon}</Text>
              <Text style={s.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#F0F4FF' },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 16, backgroundColor: '#1565C0' },
  greeting:  { fontSize: 20, fontWeight: '800', color: '#fff' },
  sub:       { fontSize: 12, color: '#BBDEFB', marginTop: 2 },
  logoutBtn: { backgroundColor: '#0D47A1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  logoutText:{ color: '#fff', fontSize: 12, fontWeight: '600' },
  statsRow:  { flexDirection: 'row', gap: 10, padding: 16 },
  stat:      { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 3, elevation: 2 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  ctaBanner: { margin: 16, borderRadius: 14, backgroundColor: '#1976D2', padding: 20 },
  ctaTitle:  { fontSize: 18, fontWeight: '800', color: '#fff' },
  ctaSub:    { fontSize: 13, color: '#BBDEFB', marginTop: 4 },
  ldBadge:   { margin: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#7C3AED' },
  ldTitle:   { fontSize: 18, fontWeight: '800', color: '#7B1FA2', textTransform: 'capitalize' },
  riskBar:   { height: 8, backgroundColor: '#F3E5F5', borderRadius: 4, overflow: 'hidden', marginTop: 10 },
  riskFill:  { height: '100%', backgroundColor: '#9C27B0', borderRadius: 4 },
  riskScore: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingBottom: 30 },
  quickCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 18, alignItems: 'center', elevation: 2 },
  quickIcon: { fontSize: 28, marginBottom: 8 },
  quickLabel:{ fontSize: 13, fontWeight: '700', color: '#374151' },
});
