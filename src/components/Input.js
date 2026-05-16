import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function Input({ style, ...props }) {
  return <TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} {...props} />;
}

const styles = StyleSheet.create({ input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.text, marginBottom: 12 } });
