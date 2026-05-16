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
          backgroundColor: colors.inputBg,
          borderColor: colors.inputBorder,
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
