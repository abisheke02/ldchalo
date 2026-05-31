import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { schoolAPI } from '../../services/api';

const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const PayModal = ({ student, onClose, onSuccess }) => {
  const [amount, setAmount] = useState(String(student?.balance || ''));
  const [mode, setMode]     = useState('cash');
  const [loading, setLoading] = useState(false);
  const MODES = ['cash', 'upi', 'card', 'bank_transfer'];

  const collect = async () => {
    if (!amount || isNaN(+amount) || +amount <= 0) {
      return Alert.alert('Error', 'Enter a valid amount');
    }
    setLoading(true);
    try {
      await schoolAPI.collectFee(student.student_id, +amount, mode);
      Alert.alert('Success', `Receipt generated for ${fmt(amount)}`);
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err?.error || 'Collection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Collect Fee</Text>
            <TouchableOpacity onPress={onClose}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>
          <Text style={s.modalSub}>{student?.name}</Text>
          <Text style={s.balanceText}>Balance: <Text style={{ color: '#DC2626' }}>{fmt(student?.balance)}</Text></Text>

          <Text style={s.label}>Amount (₹)</Text>
          <TextInput
            style={s.input}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
          />

          <Text style={s.label}>Payment Mode</Text>
          <View style={s.modeRow}>
            {MODES.map((m) => (
              <TouchableOpacity key={m} onPress={() => setMode(m)}
                style={[s.modeBtn, mode === m && s.modeBtnActive]}
              >
                <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
                  {m === 'cash' ? '💵' : m === 'upi' ? '📱' : m === 'card' ? '💳' : '🏦'} {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.modalFooter}>
            <TouchableOpacity style={s.btnOutline} onPress={onClose}>
              <Text style={s.btnOutlineText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnPrimary} onPress={collect} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnPrimaryText}>Collect {amount ? fmt(amount) : ''}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function FeesScreen() {
  const [outstanding, setOutstanding] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [totals, setTotals]           = useState({ due: 0, paid: 0, balance: 0 });

  const load = () => {
    setLoading(true);
    schoolAPI.getOutstandingFees()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setOutstanding(list);
        setTotals({
          due:     list.reduce((s, r) => s + Number(r.total_due  || 0), 0),
          paid:    list.reduce((s, r) => s + Number(r.total_paid || 0), 0),
          balance: list.reduce((s, r) => s + Number(r.balance    || 0), 0),
        });
      })
      .catch(() => setOutstanding([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Fee &amp; Finance</Text>
        <Text style={s.date}>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { borderTopColor: '#2563EB' }]}>
          <Text style={s.summaryVal}>{fmt(totals.due)}</Text>
          <Text style={s.summaryLabel}>Total Due</Text>
        </View>
        <View style={[s.summaryCard, { borderTopColor: '#059669' }]}>
          <Text style={[s.summaryVal, { color: '#059669' }]}>{fmt(totals.paid)}</Text>
          <Text style={s.summaryLabel}>Collected</Text>
        </View>
        <View style={[s.summaryCard, { borderTopColor: '#DC2626' }]}>
          <Text style={[s.summaryVal, { color: '#DC2626' }]}>{fmt(totals.balance)}</Text>
          <Text style={s.summaryLabel}>Outstanding</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#0891B2" /></View>
      ) : (
        <FlatList
          data={outstanding}
          keyExtractor={(item) => item.student_id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.empty}><Text style={s.emptyIcon}>✅</Text><Text style={s.emptyText}>No outstanding fees</Text></View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardLeft}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{(item.name || '?')[0]}</Text>
                </View>
                <View>
                  <Text style={s.studentName}>{item.name}</Text>
                  <Text style={s.phone}>{item.phone || '—'}</Text>
                </View>
              </View>
              <View style={s.cardRight}>
                <Text style={s.balanceAmt}>{fmt(item.balance)}</Text>
                <TouchableOpacity style={s.collectBtn} onPress={() => setSelected(item)}>
                  <Text style={s.collectBtnText}>Collect</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {selected && (
        <PayModal
          student={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); load(); }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F8FAFC' },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:        { padding: 16, paddingBottom: 8 },
  title:         { fontSize: 22, fontWeight: '800', color: '#111827' },
  date:          { fontSize: 12, color: '#6B7280', marginTop: 2 },
  summaryRow:    { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  summaryCard:   { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderTopWidth: 3, elevation: 2 },
  summaryVal:    { fontSize: 15, fontWeight: '800', color: '#111827' },
  summaryLabel:  { fontSize: 10, color: '#6B7280', marginTop: 2 },
  card:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  cardLeft:      { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar:        { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0891B2', justifyContent: 'center', alignItems: 'center' },
  avatarText:    { color: '#fff', fontWeight: '700', fontSize: 16 },
  studentName:   { fontSize: 14, fontWeight: '700', color: '#111827' },
  phone:         { fontSize: 12, color: '#6B7280', marginTop: 1 },
  cardRight:     { alignItems: 'flex-end', gap: 6 },
  balanceAmt:    { fontSize: 16, fontWeight: '800', color: '#DC2626' },
  collectBtn:    { backgroundColor: '#0891B2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  collectBtnText:{ color: '#fff', fontWeight: '700', fontSize: 12 },
  empty:         { alignItems: 'center', paddingTop: 80 },
  emptyIcon:     { fontSize: 48, marginBottom: 10 },
  emptyText:     { fontSize: 15, color: '#94A3B8' },
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal:         { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle:    { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalClose:    { fontSize: 20, color: '#6B7280', padding: 4 },
  modalSub:      { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  balanceText:   { fontSize: 14, color: '#374151', marginBottom: 16 },
  label:         { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:         { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#111827', marginBottom: 16 },
  modeRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  modeBtn:       { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  modeBtnActive: { backgroundColor: '#0891B2', borderColor: '#0891B2' },
  modeBtnText:   { fontSize: 12, color: '#374151', textTransform: 'capitalize' },
  modeBtnTextActive: { color: '#fff', fontWeight: '600' },
  modalFooter:   { flexDirection: 'row', gap: 12 },
  btnOutline:    { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnOutlineText:{ fontSize: 14, fontWeight: '600', color: '#374151' },
  btnPrimary:    { flex: 2, backgroundColor: '#0891B2', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnPrimaryText:{ fontSize: 14, fontWeight: '700', color: '#fff' },
});
