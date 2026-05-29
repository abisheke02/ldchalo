import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getTodayAttendance, markAttendance } from '../services/api';
import { useAttendanceStore } from '../store';

const STATUS_COLORS = { present: '#10B981', absent: '#EF4444', late: '#F59E0B', unmarked: '#9CA3AF' };

const StudentRow = ({ student, onMark }) => {
  const status = student.status || 'unmarked';
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]} />
        <View>
          <Text style={styles.rowName}>{student.name}</Text>
          <Text style={styles.rowRoll}>Roll #{student.rollNumber}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        {['present', 'absent', 'late'].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.actionBtn, status === s && { backgroundColor: STATUS_COLORS[s] }]}
            onPress={() => onMark(student.id, s)}
          >
            <Icon
              name={s === 'present' ? 'check' : s === 'absent' ? 'close' : 'access-time'}
              size={14}
              color={status === s ? '#fff' : STATUS_COLORS[s]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default function AttendanceScreen() {
  const { records, setRecords, setLoading } = useAttendanceStore();
  const [saving, setSaving]   = useState(false);
  const [loading, setPageLoad] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [classId, setClassId] = useState('');

  const loadClass = () => {
    if (!classId.trim()) return Alert.alert('Enter Class ID', 'Paste the class UUID to load students');
    setPageLoad(true);
    getTodayAttendance(classId.trim())
      .then((data) => setRecords(Array.isArray(data) ? data : data?.records ?? []))
      .catch(() => setRecords([]))
      .finally(() => setPageLoad(false));
  };

  const handleMark = (studentId, status) => {
    setRecords(records.map((r) => r.id === studentId ? { ...r, status } : r));
    setSaved(false);
  };

  const handleSave = async () => {
    const unmarked = records.filter((r) => !r.status || r.status === 'unmarked');
    if (unmarked.length > 0) {
      return Alert.alert(
        'Unmarked Students',
        `${unmarked.length} students are not marked. Save anyway?`,
        [{ text: 'Cancel' }, { text: 'Save', onPress: submit }]
      );
    }
    await submit();
  };

  const submit = async () => {
    setSaving(true);
    try {
      await markAttendance({
        class_id: classId,
        date: new Date().toISOString().slice(0, 10),
        attendance: records.map((r) => ({ student_id: r.id, status: r.status || 'present' })),
      });
      setSaved(true);
      Alert.alert('Saved', 'Attendance recorded successfully');
    } catch {
      Alert.alert('Error', 'Could not save attendance. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    present: records.filter((r) => r.status === 'present').length,
    absent:  records.filter((r) => r.status === 'absent').length,
    late:    records.filter((r) => r.status === 'late').length,
    total:   records.length,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      </View>

      {/* Class picker */}
      <View style={styles.classRow}>
        <TextInput
          style={styles.classInput}
          placeholder="Class ID (UUID)"
          value={classId}
          onChangeText={setClassId}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.loadBtn} onPress={loadClass} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.loadBtnText}>Load</Text>}
        </TouchableOpacity>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        {[
          { label: 'Present', count: stats.present, color: '#10B981' },
          { label: 'Absent',  count: stats.absent,  color: '#EF4444' },
          { label: 'Late',    count: stats.late,    color: '#F59E0B' },
        ].map(({ label, count, color }) => (
          <View key={label} style={styles.summaryItem}>
            <Text style={[styles.summaryCount, { color }]}>{count}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
          </View>
        ))}
        <View style={styles.summaryItem}>
          <Text style={styles.summaryCount}>{stats.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StudentRow student={item} onMark={handleMark} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>No students found</Text>}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.savedBtn]}
          onPress={handleSave}
          disabled={saving || saved}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>{saved ? '✓ Saved' : 'Save Attendance'}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F9FAFB' },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:        { padding: 16, paddingBottom: 8 },
  title:         { fontSize: 22, fontWeight: '700', color: '#111827' },
  date:          { fontSize: 12, color: '#6B7280', marginTop: 2 },
  summaryBar:    { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  summaryItem:   { flex: 1, alignItems: 'center' },
  summaryCount:  { fontSize: 20, fontWeight: '800', color: '#111827' },
  summaryLabel:  { fontSize: 10, color: '#6B7280', marginTop: 2 },
  row:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  rowLeft:       { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dot:           { width: 10, height: 10, borderRadius: 5 },
  rowName:       { fontSize: 14, fontWeight: '600', color: '#111827' },
  rowRoll:       { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  actions:       { flexDirection: 'row', gap: 6 },
  actionBtn:     { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  classRow:      { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  classInput:    { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#111827', backgroundColor: '#fff' },
  loadBtn:       { backgroundColor: '#4F46E5', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  loadBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty:         { textAlign: 'center', color: '#9CA3AF', marginTop: 48, fontSize: 14 },
  footer:        { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB' },
  saveBtn:       { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  savedBtn:      { backgroundColor: '#10B981' },
  saveBtnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
});
