import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export function LoadingSpinner({ color = '#4F46E5', size = 'large', fullScreen = true }) {
  return (
    <View style={fullScreen ? styles.fullScreen : styles.inline}>
      <ActivityIndicator color={color} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inline:     { padding: 16, alignItems: 'center' },
});
