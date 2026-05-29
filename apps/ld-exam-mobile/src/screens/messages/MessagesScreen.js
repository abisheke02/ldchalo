import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

const timeLabel = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const ConversationList = ({ conversations, onSelect }) => (
  <FlatList
    data={conversations}
    keyExtractor={(item) => item.partner_id}
    contentContainerStyle={styles.convList}
    renderItem={({ item }) => (
      <TouchableOpacity style={styles.convItem} onPress={() => onSelect(item)} activeOpacity={0.7}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.partner_name || '?')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.convBody}>
          <View style={styles.convRow}>
            <Text style={styles.convName}>{item.partner_name}</Text>
            <Text style={styles.convTime}>{item.last_at ? timeLabel(item.last_at) : ''}</Text>
          </View>
          <Text style={styles.convPreview} numberOfLines={1}>{item.last_message || 'No messages yet'}</Text>
        </View>
        {item.unread > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{item.unread}</Text></View>
        )}
      </TouchableOpacity>
    )}
    ListEmptyComponent={
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.emptyText}>No conversations yet</Text>
        <Text style={styles.emptyHint}>Your teacher or parent will appear here.</Text>
      </View>
    }
  />
);

const MessageBubble = ({ msg, myId }) => {
  const isMe = msg.sender_id === myId;
  return (
    <View style={[styles.bubbleWrap, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.body}</Text>
        <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeDark]}>{timeLabel(msg.created_at)}</Text>
      </View>
    </View>
  );
};

const ThreadView = ({ partner, myId, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const listRef = useRef(null);

  const loadThread = useCallback(async () => {
    try {
      const data = await api.get(`/ld/messages/${partner.partner_id}`);
      setMessages(Array.isArray(data) ? data : data?.messages ?? []);
    } catch {
      Alert.alert('Error', 'Could not load messages');
    } finally {
      setLoading(false);
    }
  }, [partner.partner_id]);

  useEffect(() => { loadThread(); }, [loadThread]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    setSending(true);
    const optimistic = {
      id: `tmp-${Date.now()}`,
      sender_id: myId,
      receiver_id: partner.partner_id,
      body,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const saved = await api.post('/ld/messages', { receiverId: partner.partner_id, body });
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? (saved.message || m) : m));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      Alert.alert('Error', 'Message could not be sent');
      setText(body);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Thread header */}
      <View style={styles.threadHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={[styles.avatar, styles.avatarSmall]}>
          <Text style={styles.avatarText}>{(partner.partner_name || '?')[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.threadName}>{partner.partner_name}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.threadList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => <MessageBubble msg={item} myId={myId} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyHint}>Say hello to {partner.partner_name}!</Text>
          </View>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.msgInput}
          placeholder="Type a message…"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.sendIcon}>➤</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default function MessagesScreen() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeThread, setActiveThread] = useState(null);

  useEffect(() => {
    api.get('/ld/messages')
      .then((data) => setConversations(Array.isArray(data) ? data : data?.conversations ?? []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color="#1976D2" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {activeThread ? (
        <ThreadView
          partner={activeThread}
          myId={user?.id}
          onBack={() => setActiveThread(null)}
        />
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Messages</Text>
          </View>
          <ConversationList conversations={conversations} onSelect={setActiveThread} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F8FAFC' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F1F5F9' },
  title:        { fontSize: 22, fontWeight: '800', color: '#0F172A' },

  convList:     { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  convItem:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  avatar:       { width: 46, height: 46, borderRadius: 23, backgroundColor: '#1976D2', justifyContent: 'center', alignItems: 'center' },
  avatarSmall:  { width: 34, height: 34, borderRadius: 17 },
  avatarText:   { fontSize: 18, fontWeight: '700', color: '#fff' },
  convBody:     { flex: 1 },
  convRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  convName:     { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  convTime:     { fontSize: 12, color: '#94A3B8' },
  convPreview:  { fontSize: 13, color: '#64748B' },
  badge:        { backgroundColor: '#1976D2', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText:    { fontSize: 11, fontWeight: '700', color: '#fff' },

  emptyWrap:    { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIcon:    { fontSize: 48 },
  emptyText:    { fontSize: 16, color: '#94A3B8' },
  emptyHint:    { fontSize: 13, color: '#CBD5E1' },

  threadHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F1F5F9', gap: 10 },
  backBtn:      { padding: 4 },
  backArrow:    { fontSize: 22, color: '#1976D2' },
  threadName:   { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  threadList:   { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },

  bubbleWrap:   { marginBottom: 6 },
  bubbleLeft:   { alignItems: 'flex-start' },
  bubbleRight:  { alignItems: 'flex-end' },
  bubble:       { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe:     { backgroundColor: '#1976D2', borderBottomRightRadius: 4 },
  bubbleThem:   { backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  bubbleText:   { fontSize: 14, color: '#0F172A', lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime:   { fontSize: 10, color: '#94A3B8', marginTop: 4, textAlign: 'right' },
  bubbleTimeDark: { color: '#BFDBFE' },

  inputRow:     { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#F1F5F9', gap: 10 },
  msgInput:     { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#0F172A', maxHeight: 120, backgroundColor: '#F8FAFC' },
  sendBtn:      { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1976D2', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#93C5FD' },
  sendIcon:     { fontSize: 16, color: '#fff' },
});
