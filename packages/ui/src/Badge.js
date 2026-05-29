import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function Badge({ label, color = '#4F46E5', bg, size = 'md' }) {
  const bgColor = bg ?? color + '20';
  const fontSize = size === 'sm' ? 10 : 12;
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color, fontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  text:  { fontWeight: '700' },
});
