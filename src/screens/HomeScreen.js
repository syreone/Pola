import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, PanResponder, TouchableOpacity, Pressable, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Card from '../components/Card';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { useSplitPay } from '../data/SplitPayContext';
import { usdc, mkd } from '../utils/format';
import { fetchRates, FALLBACK_RATES } from '../utils/priceService';

function ActionButton({ icon, label, onPress, colors, grad }) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };
  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.actionWrap, { opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
    >
      <LinearGradient
        colors={grad || [colors.card, colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.actionCircle, { borderColor: colors.cardBorder }]}
      >
        <Ionicons name={icon} size={26} color={grad ? '#fff' : colors.primary} />
      </LinearGradient>
      <Text style={[styles.actionLabel, { color: colors.textSub || colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { walletAddress, displayName, walletBalance, refreshBalance, activeSplit, disconnect } = useSplitPay();
  const [refreshing, setRefreshing] = useState(false);
  const [rates, setRates] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchRates().then(r => { if (alive) setRates(r); });
    return () => { alive = false; };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refreshBalance();
      const interval = setInterval(refreshBalance, 8000);
      return () => clearInterval(interval);
    }, [walletAddress])
  );

  const r = rates ?? FALLBACK_RATES;
  const balanceMkd = walletBalance !== null ? walletBalance * r.mkdPerUsdc : null;
  const activePending = activeSplit
    ? activeSplit.participants.filter(p => p.status === 'pending').length
    : 0;

  const onPullRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60) navigation.navigate('History');
      },
    })
  ).current;

  return (
    <ScreenBackground>
      <View style={styles.wrapper} {...panResponder.panHandlers}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.primary} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerBrand}>
              <Image
                source={require('../../assets/pola-icon.png')}
                style={styles.headerLogo}
                resizeMode="contain"
                fadeDuration={0}
              />
              <View style={styles.headerText}>
                <Text style={[displayName ? styles.greeting : styles.greetingNoName, { color: colors.muted }]}>
                  Welcome back
                </Text>
                {displayName ? (
                  <Text
                    style={[styles.name, { color: colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {displayName}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTheme(); }}
                style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); disconnect(); navigation.replace('ConnectWallet'); }}
                style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Balance card */}
          <Card style={styles.balanceCard}>
            <Text style={[styles.balanceLabel, { color: colors.muted }]}>Balance</Text>
            <Text style={[styles.balanceAmount, { color: colors.text }]}>
              {balanceMkd !== null ? mkd(balanceMkd) : '—'}
            </Text>
            <Text style={[styles.balanceUsdc, { color: colors.primary }]}>
              {walletBalance !== null ? usdc(walletBalance) : ''}
            </Text>

            {/* Wallet address — prominently below balance */}
            {walletAddress && (
              <View style={[styles.addressBox, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(37,99,235,0.06)', borderColor: colors.border }]}>
                <Ionicons name="wallet-outline" size={14} color={colors.muted} style={{ marginRight: 6 }} />
                <Text style={[styles.addressText, { color: colors.muted }]} numberOfLines={1}>
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>{walletAddress.slice(0, 8)}</Text>
                  {'···'}
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>{walletAddress.slice(-8)}</Text>
                </Text>
              </View>
            )}

          </Card>

          {/* Active split banner */}
          {activeSplit && (
            <Card style={styles.splitBanner}>
              <View style={styles.splitBannerRow}>
                <View style={[styles.splitIconWrap, { backgroundColor: colors.isDark ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.08)' }]}>
                  <Ionicons name="people-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.splitBannerText}>
                  <Text style={[styles.splitBannerTitle, { color: colors.text }]}>Active Split</Text>
                  <Text style={[styles.splitBannerSub, { color: colors.muted }]}>
                    {activePending} payment{activePending !== 1 ? 's' : ''} pending
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('SplitDashboard'); }}
                  style={[styles.splitArrow, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {/* Action grid */}
          <View style={styles.actionRow}>
            <ActionButton
              icon="arrow-down-outline"
              label="Request"
              onPress={() => navigation.navigate('RequestMoney')}
              colors={colors}
              grad={colors.primaryGrad}
            />
            <ActionButton
              icon="arrow-up-outline"
              label="Send"
              onPress={() => navigation.navigate('SendMoney')}
              colors={colors}
              grad={colors.primaryGrad}
            />
            <ActionButton
              icon="people-outline"
              label="Split"
              onPress={() => navigation.navigate('SplitBill')}
              colors={colors}
              grad={null}
            />
          </View>
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  content: { padding: 20, paddingTop: 58, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, marginRight: 12 },
  headerLogo: { width: 62, height: 62, backgroundColor: 'transparent' },
  headerText: { flex: 1, gap: 3 },
  greeting: { fontSize: 15, fontWeight: '600' },
  greetingNoName: { fontSize: 22, fontWeight: '800' },
  name: { fontSize: 24, fontWeight: '900' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  balanceCard: { marginBottom: 14, gap: 4 },
  balanceLabel: { fontSize: 13, fontWeight: '700' },
  balanceAmount: { fontSize: 42, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  balanceUsdc: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  addressBox: {
    flexDirection: 'row', alignItems: 'center', marginTop: 10,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1,
  },
  addressText: { fontSize: 13, fontWeight: '700', flex: 1 },
  networkPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  networkDot: { width: 6, height: 6, borderRadius: 3 },
  networkText: { fontSize: 12, fontWeight: '800' },
  splitBanner: { marginBottom: 14 },
  splitBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  splitIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  splitBannerText: { flex: 1 },
  splitBannerTitle: { fontWeight: '900', fontSize: 15 },
  splitBannerSub: { fontSize: 13, marginTop: 1 },
  splitArrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 12 },
  actionWrap: { flex: 1, alignItems: 'center', gap: 10 },
  actionCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actionLabel: { fontSize: 13, fontWeight: '700' },
});
