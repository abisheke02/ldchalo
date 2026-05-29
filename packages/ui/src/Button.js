import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

const VARIANTS = {
  primary:   { bg: '#4F46E5', text: '#fff',     border: 'transparent' },
  secondary: { bg: '#fff',    text: '#4F46E5',  border: '#4F46E5' },
  danger:    { bg: '#EF4444', text: '#fff',     border: 'transparent' },
  ghost:     { bg: 'transparent', text: '#4F46E5', border: 'transparent' },
};

const SIZES = {
  sm: { paddingVertical: 8,  paddingHorizontal: 14, fontSize: 13 },
  md: { paddingVertical: 13, paddingHorizontal: 20, fontSize: 15 },
  lg: { paddingVertical: 16, paddingHorizontal: 28, fontSize: 17 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) {
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  const s = SIZES[size]       ?? SIZES.md;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border, paddingVertical: s.paddingVertical, paddingHorizontal: s.paddingHorizontal },
        fullWidth && { alignSelf: 'stretch' },
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={v.text} size="small" />
        : <Text style={[styles.label, { color: v.text, fontSize: s.fontSize }]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base:     { borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  label:    { fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
