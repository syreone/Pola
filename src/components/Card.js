import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Card({ children, style }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.outer, { borderColor: colors.cardBorderOuter, shadowColor: colors.cardShadowColor }, style]}>
      <View style={[styles.inner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 24,
    borderWidth: 1,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  inner: {
    borderRadius: 23,
    padding: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
