import React from 'react';
import { View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

export default function BlurOverlay({ style, children, intensity = 55, tint = 'dark' }) {
  if (Platform.OS === 'android') {
    return (
      <View style={[style, { backgroundColor: 'rgba(0,0,0,0.80)' }]}>
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
