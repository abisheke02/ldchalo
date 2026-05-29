import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

const TYPE_CONFIG = {
  screening_reminder: { icon: '📋', color: '#7C3AED' },
  level_up:           { icon: '🏆', color: '#F59E0B' },
  practice_reminder:  { icon: '📚', color: '#1976D2' },
  recommendation:     { icon: '💡', color: '#059669' },
  announcement:       { icon: '📢', color: '#DC2626' },
  default:            { icon: '🔔', color: '#64748B' },
};

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const NotificationItem = ({ item, onMarkRead }) => {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.default;
  return (
    <TouchableOpacity
      style={[styles.item, !item.is_read && styles.itemUnread]}
      onPress={() => !item.is_read && onMarkRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: cfg.color + '20' }]}>
        <Text style={styles.icon}>{cfg.icon}</Text>
      </View>
      <View style={styles.itemBody}>
        <Text style={[styles.itemTitle, !item.is_read && styles.itemTitleBold]}>
          {item.title}
        </Text>
        {!!item.body && (
          <Text style={styles.itemText} numberOfLines={2}>{item.body}</Text>
        )}
        <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
      </View>
      {!item.is_read && <View style={[styles.dot, { backgroundColor: cfg.color }]} />}
    </TouchableOpacity>
  );
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get('/notifications');
      setNotifications(Array.isArray(data) ? data : data?.notifications ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    try { await api.patch(`/notifications/${id}/read`); } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try { await api.post('/notifications/mark-all-read'); } catch { /* ignore */ }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color="#1976D2" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.subtitle}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem item={item} onMarkRead={markRead} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#F8FAFC' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F1F5F9' },
  title:        { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  subtitle:     { fontSize: 13, color: '#64748B', marginTop: 2 },
  markAllBtn:   { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#EFF6FF', borderRadius: 8 },
  markAllText:  { fontSize: 13, color: '#1976D2', fontWeight: '600' },
  list:         { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  item:         { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  itemUnread:   { borderLeftWidth: 3, borderLeftColor: '#1976D2' },
  iconWrap:     { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  icon:         { fontSize: 20 },
  itemBody:     { flex: 1 },
  itemTitle:    { fontSize: 14, color: '#334155', lineHeight: 20 },
  itemTitleBold:{ fontWeight: '700', color: '#0F172A' },
  itemText:     { fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 17 },
  itemTime:     { fontSize: 11, color: '#94A3B8', marginTop: 5 },
  dot:          { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  empty:        { alignItems: 'center', paddingTop: 80 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyText:    { fontSize: 16, color: '#94A3B8' },
});
