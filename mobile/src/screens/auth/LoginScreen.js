import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { loginWithToken }      = useAuthStore();

  const login = async () => {
    if (!email.trim() || !password) return Alert.alert('Error', 'Enter email and password');
    setLoading(true);
    try {
      const { token, user } = await authAPI.login(email.trim(), password);
      await loginWithToken(token, user);
    } catch (err) {
      Alert.alert('Login Failed', err?.error || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const demo = async (role) => {
    setLoading(true);
    try {
      const { token, user } = await authAPI.demo(role);
      await loginWithToken(token, user);
    } catch { Alert.alert('Error', 'Demo login failed'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.kav}>
        <View style={s.card}>
          <Text style={s.logo}>📖</Text>
          <Text style={s.title}>LD Schools</Text>
          <Text style={s.subtitle}>School ERP + LD Platform</Text>

          <TextInput style={s.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <TextInput style={s.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

          <TouchableOpacity style={s.btn} onPress={login} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <View style={s.demoRow}>
            {['teacher', 'student', 'parent'].map((r) => (
              <TouchableOpacity key={r} style={s.demoBtn} onPress={() => demo(r)} disabled={loading}>
                <Text style={s.demoBtnText}>Demo {r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: '#EEF2FF' },
  kav:      { flex: 1, justifyContent: 'center', padding: 24 },
  card:     { backgroundColor: '#fff', borderRadius: 20, padding: 28, elevation: 4 },
  logo:     { fontSize: 44, textAlign: 'center', marginBottom: 6 },
  title:    { fontSize: 24, fontWeight: '800', textAlign: 'center', color: '#111827' },
  subtitle: { fontSize: 13, textAlign: 'center', color: '#6B7280', marginBottom: 24, marginTop: 4 },
  input:    { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#111827', marginBottom: 12 },
  btn:      { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  btnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  demoRow:  { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  demoBtn:  { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  demoBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
});

