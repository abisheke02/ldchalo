import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { schoolAPI } from '../../services/api';

const SC = { present: '#10B981', absent: '#EF4444', late: '#F59E0B', unmarked: '#9CA3AF' };

export default function AttendanceScreen() {
  const [classId, setClassId]   = useState('');
  const [classes, setClasses]   = useState([]);
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const date = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    schoolAPI.classes().then((d) => setClasses(d)).catch(() => {});
  }, []);

  const load = () => {
    if (!classId) return;
    setLoading(true);
    schoolAPI.getAttendance(classId, date)
      .then((d) => setRecords(Array.isArray(d) ? d : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };

  const mark = (id, status) => setRecords((p) => p.map((r) => r.id === id ? { ...r, status } : r));

  const save = async () => {
    setSaving(true);
    try {
      await schoolAPI.markAttendance({
        class_id: classId, date,
        attendance: records.map((r) => ({ student_id: r.id, status: r.status || 'present' })),
      });
      Alert.alert('Saved', 'Attendance recorded');
    } catch { Alert.alert('Error', 'Save failed'); }
    finally { setSaving(false); }
  };

  const stats = records.reduce((acc, r) => {
    acc[r.status || 'unmarked'] = (acc[r.status || 'unmarked'] || 0) + 1;
    return acc;
  }, {});

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Attendance</Text>
        <Text style={s.date}>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
      </View>

      <View style={s.row}>
        <View style={s.selectWrap}>
          {classes.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => setClassId(c.id)}
              style={[s.classChip, classId === c.id && s.classChipActive]}
            >
              <Text style={[s.classChipText, classId === c.id && s.classChipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.loadBtn} onPress={load} disabled={!classId || loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.loadBtnText}>Load</Text>}
        </TouchableOpacity>
      </View>

      {records.length > 0 && (
        <View style={s.summaryBar}>
          {Object.entries(stats).map(([status, count]) => (
            <View key={status} style={s.summaryItem}>
              <Text style={[s.summaryCount, { color: SC[status] || '#9CA3AF' }]}>{count}</Text>
              <Text style={s.summaryLabel}>{status}</Text>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={records}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={s.empty}>{classId ? 'No students' : 'Select a class to begin'}</Text>}
        renderItem={({ item }) => (
          <View style={s.row2}>
            <View style={[s.dot, { backgroundColor: SC[item.status || 'unmarked'] }]} />
            <Text style={s.name}>{item.name}</Text>
            <View style={s.actions}>
              {['present','absent','late'].map((st) => (
                <TouchableOpacity key={st} style={[s.btn, item.status === st && { backgroundColor: SC[st] }]}
                  onPress={() => mark(item.id, st)}
                >
                  <Text style={{ fontSize: 13, color: item.status === st ? '#fff' : SC[st] }}>
                    {st === 'present' ? '✓' : st === 'absent' ? '✗' : '⏰'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      />

      {records.length > 0 && (
        <View style={s.footer}>
          <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Attendance</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F8FAFC' },
  header:          { padding: 16, paddingBottom: 8 },
  title:           { fontSize: 22, fontWeight: '700', color: '#111827' },
  date:            { fontSize: 12, color: '#6B7280' },
  row:             { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8, flexWrap: 'wrap' },
  selectWrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  classChip:       { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  classChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  classChipText:   { fontSize: 12, color: '#374151' },
  classChipTextActive: { color: '#fff', fontWeight: '700' },
  loadBtn:         { backgroundColor: '#4F46E5', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  loadBtnText:     { color: '#fff', fontWeight: '700' },
  summaryBar:      { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 12, marginBottom: 8, elevation: 2, gap: 8 },
  summaryItem:     { flex: 1, alignItems: 'center' },
  summaryCount:    { fontSize: 18, fontWeight: '800' },
  summaryLabel:    { fontSize: 10, color: '#6B7280' },
  row2:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, elevation: 1, gap: 10 },
  dot:             { width: 10, height: 10, borderRadius: 5 },
  name:            { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  actions:         { flexDirection: 'row', gap: 6 },
  btn:             { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  empty:           { textAlign: 'center', color: '#9CA3AF', marginTop: 48 },
  footer:          { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB' },
  saveBtn:         { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
});
