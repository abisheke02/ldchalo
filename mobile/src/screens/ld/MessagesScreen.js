import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ldAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const timeLabel = (iso) => {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

function ConversationItem({ item, onPress }) {
  return (
    <TouchableOpacity style={s.convItem} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={s.convAvatar}>
        <Text style={s.convAvatarText}>{(item.partner_name || '?')[0].toUpperCase()}</Text>
        {item.unread > 0 && <View style={s.unreadDot} />}
      </View>
      <View style={s.convBody}>
        <View style={s.convRow}>
          <Text style={s.convName}>{item.partner_name || 'Unknown'}</Text>
          <Text style={s.convTime}>{item.last_at ? timeLabel(item.last_at) : ''}</Text>
        </View>
        <Text style={[s.convPreview, item.unread > 0 && s.convPreviewBold]} numberOfLines={1}>
          {item.last_message || 'No messages yet'}
        </Text>
      </View>
      {item.unread > 0 && (
        <View style={s.unreadBadge}><Text style={s.unreadBadgeText}>{item.unread}</Text></View>
      )}
    </TouchableOpacity>
  );
}

function ThreadView({ partner, myId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const listRef                 = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await ldAPI.getThread(partner.partner_id);
      setMessages(Array.isArray(data) ? data : data?.messages ?? []);
    } catch { Alert.alert('Error', 'Could not load messages'); }
    finally { setLoading(false); }
  }, [partner.partner_id]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    const optimistic = {
      id: `tmp-${Date.now()}`, sender_id: myId, receiver_id: partner.partner_id,
      body, created_at: new Date().toISOString(),
    };
    setMessages((p) => [...p, optimistic]);
    setSending(true);
    try {
      const res = await ldAPI.sendMessage(partner.partner_id, body);
      setMessages((p) => p.map((m) => m.id === optimistic.id ? (res?.message || m) : m));
    } catch {
      setMessages((p) => p.filter((m) => m.id !== optimistic.id));
      setText(body);
      Alert.alert('Error', 'Message not sent');
    } finally { setSending(false); }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color="#0891B2" /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={80}>
      <View style={s.threadHeader}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={[s.convAvatar, { width: 36, height: 36, borderRadius: 18 }]}>
          <Text style={s.convAvatarText}>{(partner.partner_name || '?')[0].toUpperCase()}</Text>
        </View>
        <Text style={s.threadName}>{partner.partner_name}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.threadList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={s.emptyThread}>
            <Text style={{ fontSize: 36 }}>💬</Text>
            <Text style={s.emptyText}>Say hello to {partner.partner_name}!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.sender_id === myId;
          return (
            <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
              <Text style={[s.bubbleText, isMe && s.bubbleTextMe]}>{item.body}</Text>
              <Text style={[s.bubbleTime, isMe && s.bubbleTimeMe]}>{timeLabel(item.created_at)}</Text>
            </View>
          );
        }}
      />

      <View style={s.inputRow}>
        <TextInput
          style={s.msgInput}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          multiline
          maxLength={500}
          onSubmitEditing={send}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnOff]}
          onPress={send}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.sendIcon}>➤</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function MessagesScreen() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [thread, setThread]               = useState(null);

  useEffect(() => {
    ldAPI.getConversations()
      .then((d) => setConversations(Array.isArray(d) ? d : []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  if (thread) {
    return (
      <SafeAreaView style={s.safe}>
        <ThreadView partner={thread} myId={user?.id} onBack={() => setThread(null)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
        {conversations.filter((c) => c.unread > 0).length > 0 && (
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeText}>{conversations.filter((c) => c.unread > 0).length} unread</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#0891B2" size="large" /></View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.partner_id}
          contentContainerStyle={s.convList}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={{ fontSize: 48 }}>💬</Text>
              <Text style={s.emptyText}>No conversations yet</Text>
              <Text style={s.emptySub}>Your teacher or parent will appear here</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ConversationItem item={item} onPress={setThread} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#fff' },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  title:          { fontSize: 22, fontWeight: '800', color: '#111827' },
  headerBadge:    { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  headerBadgeText:{ fontSize: 12, color: '#2563EB', fontWeight: '700' },
  convList:       { paddingBottom: 20 },
  convItem:       { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  convAvatar:     { width: 46, height: 46, borderRadius: 23, backgroundColor: '#0891B2', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  convAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  unreadDot:      { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#DC2626', borderWidth: 2, borderColor: '#fff' },
  convBody:       { flex: 1 },
  convRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  convName:       { fontSize: 15, fontWeight: '700', color: '#111827' },
  convTime:       { fontSize: 11, color: '#9CA3AF' },
  convPreview:    { fontSize: 13, color: '#6B7280' },
  convPreviewBold:{ fontWeight: '700', color: '#374151' },
  unreadBadge:    { backgroundColor: '#2563EB', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  unreadBadgeText:{ fontSize: 11, color: '#fff', fontWeight: '700' },
  empty:          { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText:      { fontSize: 16, color: '#374151', fontWeight: '600' },
  emptySub:       { fontSize: 13, color: '#94A3B8' },
  threadHeader:   { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: '#F3F4F6', gap: 10 },
  backBtn:        { padding: 4 },
  backArrow:      { fontSize: 22, color: '#0891B2' },
  threadName:     { fontSize: 16, fontWeight: '700', color: '#111827' },
  threadList:     { padding: 16, gap: 8 },
  emptyThread:    { alignItems: 'center', paddingTop: 60, gap: 10 },
  bubble:         { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 2 },
  bubbleMe:       { alignSelf: 'flex-end', backgroundColor: '#0891B2', borderBottomRightRadius: 4 },
  bubbleThem:     { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  bubbleText:     { fontSize: 14, color: '#1e293b', lineHeight: 20 },
  bubbleTextMe:   { color: '#fff' },
  bubbleTime:     { fontSize: 10, color: '#94A3B8', marginTop: 3, textAlign: 'right' },
  bubbleTimeMe:   { color: 'rgba(255,255,255,.7)' },
  inputRow:       { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#F3F4F6', gap: 8 },
  msgInput:       { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827', maxHeight: 120, backgroundColor: '#F8FAFC' },
  sendBtn:        { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0891B2', justifyContent: 'center', alignItems: 'center' },
  sendBtnOff:     { backgroundColor: '#9CA3AF' },
  sendIcon:       { fontSize: 16, color: '#fff' },
});
