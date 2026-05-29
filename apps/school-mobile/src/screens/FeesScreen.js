import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getFeesDue, collectFee } from '../services/api';
import { useFeesStore } from '../store';

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Online'];

const FeeCard = ({ item, onCollect }) => {
  const overdue = new Date(item.dueDate) < new Date();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.studentName}>{item.studentName}</Text>
          <Text style={styles.meta}>Class {item.grade}{item.section} · Roll #{item.rollNumber}</Text>
        </View>
        <View style={[styles.badge, overdue ? styles.badgeRed : styles.badgeAmber]}>
          <Text style={[styles.badgeText, { color: overdue ? '#991B1B' : '#92400E' }]}>
            {overdue ? 'Overdue' : 'Due'}
          </Text>
        </View>
      </View>
      <View style={styles.feeRow}>
        <View>
          <Text style={styles.feeLabel}>{item.feeType}</Text>
          <Text style={styles.dueDate}>Due: {new Date(item.dueDate).toLocaleDateString('en-IN')}</Text>
        </View>
        <View style={styles.feeRight}>
          <Text style={styles.amount}>₹{item.amount.toLocaleString('en-IN')}</Text>
          <TouchableOpacity style={styles.collectBtn} onPress={() => onCollect(item)}>
            <Text style={styles.collectBtnText}>Collect</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function FeesScreen() {
  const { dueFees, setDueFees, loading, setLoading } = useFeesStore();
  const [modalVisible, setModalVisible]   = useState(false);
  const [selectedFee, setSelectedFee]     = useState(null);
  const [paymentMode, setPaymentMode]     = useState('Cash');
  const [remarks, setRemarks]             = useState('');
  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    setLoading(true);
    getFeesDue()
      .then((data) => setDueFees(data?.fees ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openCollect = (fee) => {
    setSelectedFee(fee);
    setPaymentMode('Cash');
    setRemarks('');
    setModalVisible(true);
  };

  const handleCollect = async () => {
    if (!selectedFee) return;
    setSaving(true);
    try {
      await collectFee(selectedFee.studentId, selectedFee.amount, paymentMode.toLowerCase());
      setDueFees(dueFees.filter((f) => f.id !== selectedFee.id));
      setModalVisible(false);
      Alert.alert('Success', `Fee of ₹${selectedFee.amount.toLocaleString('en-IN')} collected via ${paymentMode}`);
    } catch {
      Alert.alert('Error', 'Could not record payment. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const totalDue = dueFees.reduce((sum, f) => sum + (f.amount || 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Fee Collection</Text>
        {dueFees.length > 0 && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalText}>₹{totalDue.toLocaleString('en-IN')} pending</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>
      ) : (
        <FlatList
          data={dueFees}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FeeCard item={item} onCollect={openCollect} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="check-circle" size={48} color="#10B981" />
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptyText}>No pending fees to collect</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Collect Fee</Text>
            {selectedFee && (
              <>
                <Text style={styles.modalStudent}>{selectedFee.studentName}</Text>
                <Text style={styles.modalAmount}>₹{selectedFee.amount?.toLocaleString('en-IN')}</Text>
                <Text style={styles.modalFeeType}>{selectedFee.feeType}</Text>
              </>
            )}
            <Text style={styles.modeLabel}>Payment Mode</Text>
            <View style={styles.modeGrid}>
              {PAYMENT_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeBtn, paymentMode === mode && styles.modeBtnActive]}
                  onPress={() => setPaymentMode(mode)}
                >
                  <Text style={[styles.modeBtnText, paymentMode === mode && styles.modeBtnTextActive]}>{mode}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.remarkInput}
              placeholder="Remarks (optional)"
              value={remarks}
              onChangeText={setRemarks}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCollect} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#F9FAFB' },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title:            { fontSize: 22, fontWeight: '700', color: '#111827' },
  totalBadge:       { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  totalText:        { fontSize: 12, fontWeight: '700', color: '#92400E' },
  card:             { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cardHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  studentName:      { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta:             { fontSize: 11, color: '#6B7280', marginTop: 2 },
  badge:            { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeRed:         { backgroundColor: '#FEE2E2' },
  badgeAmber:       { backgroundColor: '#FEF3C7' },
  badgeText:        { fontSize: 11, fontWeight: '700' },
  feeRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeLabel:         { fontSize: 13, fontWeight: '600', color: '#374151' },
  dueDate:          { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  feeRight:         { alignItems: 'flex-end' },
  amount:           { fontSize: 18, fontWeight: '800', color: '#111827' },
  collectBtn:       { backgroundColor: '#4F46E5', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, marginTop: 6 },
  collectBtnText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyState:       { flex: 1, alignItems: 'center', marginTop: 80 },
  emptyTitle:       { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 12 },
  emptyText:        { fontSize: 13, color: '#6B7280', marginTop: 4 },
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:            { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle:       { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  modalStudent:     { fontSize: 15, fontWeight: '600', color: '#374151' },
  modalAmount:      { fontSize: 32, fontWeight: '800', color: '#4F46E5', marginVertical: 4 },
  modalFeeType:     { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  modeLabel:        { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  modeGrid:         { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeBtn:          { flex: 1, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  modeBtnActive:    { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  modeBtnText:      { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  modeBtnTextActive:{ color: '#4F46E5' },
  remarkInput:      { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 16 },
  modalActions:     { flexDirection: 'row', gap: 10 },
  cancelBtn:        { flex: 1, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText:    { color: '#374151', fontWeight: '600' },
  confirmBtn:       { flex: 2, backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  confirmBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});
