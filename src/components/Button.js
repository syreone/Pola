import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

export default function Button({ title, onPress, variant = 'primary', style, icon }) {
  const { colors } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.base, { opacity: pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
      >
        <LinearGradient
          colors={colors.primaryGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={styles.primaryText}>{title}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        styles.secondary,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          opacity: pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={[styles.secondaryText, { color: colors.text }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 18, overflow: 'hidden' },
  gradient: { paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderRadius: 18 },
  secondary: { paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryText: { fontWeight: '800', fontSize: 16 },
  iconWrap: { marginRight: 8 },
});
