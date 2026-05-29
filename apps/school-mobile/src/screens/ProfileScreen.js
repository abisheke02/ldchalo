import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getProfile } from '../services/api';
import { useAuthStore, useSchoolStore } from '../store';

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Icon name={icon} size={18} color="#6B7280" style={{ marginRight: 10 }} />
    <View style={styles.infoText}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  </View>
);

const MenuRow = ({ icon, label, color = '#374151', onPress, danger }) => (
  <TouchableOpacity style={styles.menuRow} onPress={onPress}>
    <View style={[styles.menuIcon, { backgroundColor: (color || '#374151') + '15' }]}>
      <Icon name={icon} size={18} color={color} />
    </View>
    <Text style={[styles.menuLabel, danger && { color: '#EF4444' }]}>{label}</Text>
    <Icon name="chevron-right" size={20} color="#D1D5DB" />
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const { user, logout }    = useAuthStore();
  const { school }          = useSchoolStore();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    if (user) { setProfile(user); return; }
    setLoading(true);
    getProfile()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;

  const initials = profile?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('') ?? 'U';
  const roleLabel = {
    teacher:   'Teacher',
    principal: 'Principal',
    admin:     'Admin',
    staff:     'Staff',
  }[profile?.role] ?? profile?.role ?? 'Staff';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile?.name ?? 'User'}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
          {school && <Text style={styles.schoolName}>{school.name}</Text>}
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Info</Text>
          <InfoRow icon="phone"        label="Mobile"     value={profile?.phone} />
          <InfoRow icon="email"        label="Email"      value={profile?.email} />
          <InfoRow icon="location-on"  label="School ID"  value={profile?.schoolId} />
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <MenuRow icon="notifications"  label="Notification Preferences" color="#4F46E5" onPress={() => {}} />
          <MenuRow icon="language"       label="Language"                 color="#10B981" onPress={() => {}} />
          <MenuRow icon="lock"           label="Change PIN"               color="#F59E0B" onPress={() => {}} />
          <MenuRow icon="help-outline"   label="Help & Support"           color="#8B5CF6" onPress={() => {}} />
          <MenuRow icon="info-outline"   label="About"                    color="#6B7280" onPress={() => {}} />
        </View>

        <View style={styles.section}>
          <MenuRow icon="logout" label="Sign Out" color="#EF4444" danger onPress={handleLogout} />
        </View>

        <Text style={styles.version}>School Staff App · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F9FAFB' },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:        { paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 28, backgroundColor: '#fff', marginBottom: 12 },
  avatar:        { width: 72, height: 72, borderRadius: 36, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText:    { color: '#fff', fontWeight: '800', fontSize: 26 },
  name:          { fontSize: 20, fontWeight: '700', color: '#111827' },
  rolePill:      { backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginTop: 6 },
  roleText:      { fontSize: 12, fontWeight: '600', color: '#4F46E5' },
  schoolName:    { fontSize: 12, color: '#6B7280', marginTop: 6 },
  section:       { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, marginBottom: 12, paddingHorizontal: 16, paddingVertical: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  sectionTitle:  { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, paddingTop: 6, paddingBottom: 4 },
  infoRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  infoText:      { flex: 1 },
  infoLabel:     { fontSize: 11, color: '#9CA3AF' },
  infoValue:     { fontSize: 14, color: '#111827', fontWeight: '500', marginTop: 1 },
  menuRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  menuIcon:      { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuLabel:     { flex: 1, fontSize: 14, fontWeight: '500', color: '#374151' },
  version:       { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 8 },
});
