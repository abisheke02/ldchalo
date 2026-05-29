import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getStudents } from '../services/api';
import { useStudentStore } from '../store';

const LD_BADGE = {
  dyslexia:    { label: 'Dyslexia',    bg: '#DBEAFE', text: '#1D4ED8' },
  dyscalculia: { label: 'Dyscalculia', bg: '#FCE7F3', text: '#9D174D' },
  dysgraphia:  { label: 'Dysgraphia',  bg: '#FEF3C7', text: '#92400E' },
  mixed:       { label: 'Mixed LD',    bg: '#EDE9FE', text: '#5B21B6' },
};

const StudentCard = ({ student }) => {
  const ld = student.ldType && student.ldType !== 'not_detected' ? LD_BADGE[student.ldType] : null;
  const initials = student.name.split(' ').map((n) => n[0]).slice(0, 2).join('');

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View>
          <Text style={styles.name}>{student.name}</Text>
          <Text style={styles.meta}>
            Class {student.grade}{student.section} · Roll #{student.rollNumber}
          </Text>
          {student.age && <Text style={styles.meta}>Age {student.age}</Text>}
        </View>
      </View>
      {ld && (
        <View style={[styles.ldBadge, { backgroundColor: ld.bg }]}>
          <Text style={[styles.ldText, { color: ld.text }]}>{ld.label}</Text>
        </View>
      )}
    </View>
  );
};

export default function StudentsScreen() {
  const { students, setStudents, loading, setLoading, page, setPage, hasMore, setHasMore } = useStudentStore();
  const [search, setSearch] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchStudents = useCallback(async (q = '', p = 1, reset = false) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const data = await getStudents({ q, page: p, limit: 20 });
      const list = data?.students ?? [];
      if (reset || p === 1) setStudents(list);
      else setStudents([...students, ...list]);
      setHasMore(list.length === 20);
      setPage(p);
    } catch {
      // network error — keep stale data
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [students]);

  useEffect(() => { fetchStudents('', 1, true); }, []);

  const handleSearch = (text) => {
    setSearch(text);
    fetchStudents(text, 1, true);
  };

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    fetchStudents(search, page + 1);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Students</Text>
        <Text style={styles.count}>{students.length} students</Text>
      </View>

      <View style={styles.searchRow}>
        <Icon name="search" size={18} color="#9CA3AF" style={{ marginLeft: 12 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or roll no..."
          value={search}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity onPress={() => handleSearch('')} style={{ marginRight: 10 }}>
            <Icon name="close" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <StudentCard student={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#4F46E5" style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={<Text style={styles.empty}>No students found</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F9FAFB' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title:       { fontSize: 22, fontWeight: '700', color: '#111827' },
  count:       { fontSize: 13, color: '#6B7280' },
  searchRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, paddingVertical: 11, paddingHorizontal: 8, fontSize: 14, color: '#111827' },
  card:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  cardLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar:      { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  avatarText:  { color: '#4F46E5', fontWeight: '700', fontSize: 14 },
  name:        { fontSize: 14, fontWeight: '600', color: '#111827' },
  meta:        { fontSize: 11, color: '#6B7280', marginTop: 1 },
  ldBadge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ldText:      { fontSize: 10, fontWeight: '700' },
  empty:       { textAlign: 'center', color: '#9CA3AF', marginTop: 48, fontSize: 14 },
});
