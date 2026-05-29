import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export function EmptyState({ icon = 'inbox', title, message, action }) {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={52} color="#D1D5DB" />
      {title   && <Text style={styles.title}>{title}</Text>}
      {message && <Text style={styles.message}>{message}</Text>}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  title:     { fontSize: 17, fontWeight: '700', color: '#374151', marginTop: 16, textAlign: 'center' },
  message:   { fontSize: 13, color: '#9CA3AF', marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
