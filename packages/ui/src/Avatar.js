import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getInitials } from '@school/shared';

const PALETTE = ['#4F46E5','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];

const colorFor = (name = '') => PALETTE[name.charCodeAt(0) % PALETTE.length];

export function Avatar({ name = '', size = 40, style }) {
  const initials = getInitials(name);
  const bg       = colorFor(name);

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }, style]}>
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { justifyContent: 'center', alignItems: 'center' },
  text:   { color: '#fff', fontWeight: '700' },
});
