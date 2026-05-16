import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export default function LoadingScreen() {
  const { isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const bg = isDark
    ? ['#080C14', '#0D1220', '#08101E']
    : ['#E8EEFF', '#F2F5FF', '#FAFBFF'];

  return (
    <LinearGradient colors={bg} style={styles.root}>
      <Animated.View style={[styles.center, { opacity, transform: [{ scale }] }]}>
        <Image
          source={isDark
            ? require('../../assets/pola-logo-dark.png')
            : require('../../assets/pola-logo-light.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.dots}>
        <Dot delay={0} isDark={isDark} />
        <Dot delay={200} isDark={isDark} />
        <Dot delay={400} isDark={isDark} />
      </View>
    </LinearGradient>
  );
}

function Dot({ delay, isDark }) {
  const opacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.25, duration: 400, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[
      styles.dot,
      { backgroundColor: isDark ? '#3B82F6' : '#2563EB', opacity },
    ]} />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  center: { alignItems: 'center' },
  logo: { width: 240, height: 220, backgroundColor: 'transparent' },
  dots: {
    position: 'absolute',
    bottom: 64,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});
