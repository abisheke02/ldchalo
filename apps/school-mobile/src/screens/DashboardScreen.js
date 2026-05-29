import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getDashboardStats, getSchoolInfo } from '../services/api';
import { useAuthStore, useSchoolStore } from '../store';

const StatCard = ({ icon, label, value, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Icon name={icon} size={24} color={color} />
    <Text style={styles.statValue}>{value ?? '—'}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const QuickAction = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.quickBtn} onPress={onPress}>
    <View style={[styles.quickIcon, { backgroundColor: color + '20' }]}>
      <Icon name={icon} size={22} color={color} />
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function DashboardScreen({ navigation }) {
  const { user } = useAuthStore();
  const { school, stats, setSchool, setStats } = useSchoolStore();
  const [loading, setLoading] = useState(!stats);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [schoolData, statsData] = await Promise.all([
        getSchoolInfo().catch(() => null),
        getDashboardStats().catch(() => null),
      ]);
      if (schoolData) setSchool(schoolData);
      if (statsData)  setStats(statsData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning, {user?.name?.split(' ')[0] ?? 'Teacher'} 👋</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name ?? 'T')[0]}</Text>
          </View>
        </View>

        {school && (
          <View style={styles.schoolBanner}>
            <Icon name="school" size={16} color="#4F46E5" />
            <Text style={styles.schoolName}>{school.name}</Text>
          </View>
        )}

        {/* Stats */}
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="group"        label="Total Students"  value={stats?.totalStudents}    color="#4F46E5" />
          <StatCard icon="how-to-reg"   label="Present Today"   value={stats?.presentToday}     color="#10B981" />
          <StatCard icon="cancel"       label="Absent Today"    value={stats?.absentToday}       color="#EF4444" />
          <StatCard icon="payments"     label="Fees Due (₹)"   value={stats?.feesDueCount}      color="#F59E0B" />
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <QuickAction icon="how-to-reg" label="Mark Attendance" color="#10B981" onPress={() => navigation.navigate('Attendance')} />
          <QuickAction icon="group"      label="View Students"   color="#4F46E5" onPress={() => navigation.navigate('Students')} />
          <QuickAction icon="payments"   label="Collect Fee"     color="#F59E0B" onPress={() => navigation.navigate('Fees')} />
          <QuickAction icon="bar-chart"  label="Reports"         color="#8B5CF6" onPress={() => {}} />
        </View>

        {/* Alerts */}
        {stats?.pendingTasks > 0 && (
          <View style={styles.alertBanner}>
            <Icon name="notifications" size={18} color="#B45309" />
            <Text style={styles.alertText}>{stats.pendingTasks} pending tasks need your attention</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F9FAFB' },
  scroll:       { padding: 16, paddingBottom: 32 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  greeting:     { fontSize: 18, fontWeight: '700', color: '#111827' },
  date:         { fontSize: 12, color: '#6B7280', marginTop: 2 },
  avatar:       { width: 42, height: 42, borderRadius: 21, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  avatarText:   { color: '#fff', fontWeight: '700', fontSize: 18 },
  schoolBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 8, padding: 10, marginBottom: 20, gap: 6 },
  schoolName:   { color: '#4F46E5', fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12, marginTop: 4 },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard:     { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  statValue:    { fontSize: 26, fontWeight: '800', color: '#111827', marginTop: 8 },
  statLabel:    { fontSize: 11, color: '#6B7280', marginTop: 2 },
  quickGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  quickBtn:     { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  quickIcon:    { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickLabel:   { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },
  alertBanner:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, gap: 8 },
  alertText:    { fontSize: 13, color: '#92400E', flex: 1 },
});
