import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { schoolAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const Stat = ({ label, value, color }) => (
  <View style={[s.stat, { borderLeftColor: color }]}>
    <Text style={s.statValue}>{value ?? '—'}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const [stats, setStats]     = useState(null);
  const [classes, setClasses] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    await Promise.all([
      schoolAPI.dashboard().then((d) => setStats(d)).catch(() => {}),
      schoolAPI.classes().then((d) => setClasses(d)).catch(() => {}),
    ]);
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Hello, {user?.name || 'Teacher'} 👋</Text>
            <Text style={s.sub}>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={s.logoutBtn}>
            <Text style={s.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={s.statsRow}>
          <Stat label="Students"     value={stats?.students}               color="#4F46E5" />
          <Stat label="Present"      value={stats?.attendance?.present}    color="#10B981" />
          <Stat label="Fees Today"   value={`₹${stats?.fees?.collected_today || 0}`} color="#F59E0B" />
        </View>

        <View style={s.quickGrid}>
          {[
            { label: 'Attendance', icon: '📋', route: 'Attendance' },
            { label: 'Fees',       icon: '💰', route: 'Fees' },
            { label: 'Students',   icon: '👨‍🎓', route: 'Students' },
          ].map((item) => (
            <TouchableOpacity key={item.route} style={s.quickCard} onPress={() => navigation.navigate(item.route)}>
              <Text style={s.quickIcon}>{item.icon}</Text>
              <Text style={s.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {classes.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>My Classes</Text>
            {classes.map((c) => (
              <View key={c.id} style={s.classRow}>
                <Text style={s.className}>{c.name}</Text>
                <Text style={s.classInfo}>{c.student_count} students</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F8FAFC' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 16, backgroundColor: '#4F46E5' },
  greeting:    { fontSize: 20, fontWeight: '800', color: '#fff' },
  sub:         { fontSize: 12, color: '#C7D2FE', marginTop: 2 },
  logoutBtn:   { backgroundColor: '#3730A3', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  logoutText:  { color: '#fff', fontSize: 12, fontWeight: '600' },
  statsRow:    { flexDirection: 'row', gap: 10, padding: 16 },
  stat:        { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 3, elevation: 2 },
  statValue:   { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel:   { fontSize: 11, color: '#6B7280', marginTop: 2 },
  quickGrid:   { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  quickCard:   { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', elevation: 2 },
  quickIcon:   { fontSize: 26, marginBottom: 6 },
  quickLabel:  { fontSize: 12, fontWeight: '600', color: '#374151' },
  section:     { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, marginBottom: 20 },
  sectionTitle:{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  classRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderColor: '#F3F4F6' },
  className:   { fontSize: 14, fontWeight: '600', color: '#374151' },
  classInfo:   { fontSize: 12, color: '#9CA3AF' },
});
