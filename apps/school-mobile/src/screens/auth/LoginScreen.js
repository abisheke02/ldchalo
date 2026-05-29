import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login, demoLogin } from '../../services/api';
import { useAuthStore } from '../../store';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { loginWithToken }      = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password) return Alert.alert('Invalid', 'Enter email and password');
    setLoading(true);
    try {
      const { token, user } = await login(email.trim(), password);
      await loginWithToken(token, user);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    try {
      const { token, user } = await demoLogin('teacher');
      await loginWithToken(token, user);
    } catch {
      Alert.alert('Error', 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <View style={styles.card}>
          <Text style={styles.logo}>🏫</Text>
          <Text style={styles.title}>School Staff Portal</Text>
          <Text style={styles.subtitle}>Sign in with your school email</Text>

          <TextInput
            style={styles.input}
            placeholder="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDemo} disabled={loading}>
            <Text style={styles.demo}>Use Demo Account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F3F4F6' },
  kav:    { flex: 1, justifyContent: 'center', padding: 24 },
  card:   { backgroundColor: '#fff', borderRadius: 16, padding: 28, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  logo:   { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  title:  { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  input:  { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#111827', marginBottom: 12 },
  btn:    { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  demo:   { color: '#4F46E5', textAlign: 'center', fontSize: 14 },
});
