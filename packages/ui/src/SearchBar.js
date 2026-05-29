import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export function SearchBar({ value, onChangeText, placeholder = 'Search...', onClear, style }) {
  return (
    <View style={[styles.container, style]}>
      <Icon name="search" size={18} color="#9CA3AF" style={{ marginLeft: 12 }} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value ? (
        <TouchableOpacity onPress={onClear ?? (() => onChangeText(''))} style={{ marginRight: 10 }}>
          <Icon name="close" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#111827',
  },
});
