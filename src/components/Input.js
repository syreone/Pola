import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Input({ style, ...props }) {
  const { colors, isDark } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      style={[
        styles.input,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(224,232,255,0.55)',
          borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(100,140,255,0.30)',
          color: colors.text,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
});
