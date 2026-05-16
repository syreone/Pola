import React from 'react';
import { View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';

export default function BlurOverlay({ style, children, intensity = 55 }) {
  const { isDark } = useTheme();
  const tint = isDark ? 'dark' : 'light';

  if (Platform.OS === 'android') {
    return (
      <View style={[style, { backgroundColor: isDark ? 'rgba(8,12,20,0.88)' : 'rgba(220,228,255,0.88)' }]}>
        {children}
      </View>
    );
  }
  return (
    <BlurView intensity={intensity} tint={tint} style={style}>
      {children}
    </BlurView>
  );
}
