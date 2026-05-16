import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, PanResponder } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import Button from '../components/Button';
import { colors } from '../theme';
import { useSplitPay } from '../data/SplitPayContext';
import { sol } from '../utils/format';

function ShortAddress({ address }) {
  if (!address) return null;
  const start = address.slice(0, 6);
  const end = address.slice(-6);
  return (
    <Text style={styles.walletInCard}>
      <Text style={styles.walletBlue}>{start}</Text>
      <Text style={styles.walletMuted}>...</Text>
      <Text style={styles.walletBlue}>{end}</Text>
    </Text>
  );
}

export default function HomeScreen({ navigation }) {
  const { walletAddress, displayName, walletBalance, refreshBalance, activeSplit, disconnect } = useSplitPay();
  const [refreshing, setRefreshing] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      refreshBalance();
      const interval = setInterval(refreshBalance, 8000);
      return () => clearInterval(interval);
    }, [walletAddress])
  );

  const activePending = activeSplit
    ? activeSplit.participants.filter(p => p.status === 'pending').length
    : 0;

  const onPullRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  };

  // Swipe left → History
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
    <View style={styles.wrapper} {...panResponder.panHandlers}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Text
            style={styles.hello}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            Welcome back{displayName ? `, ${displayName}` : ''}
          </Text>
          {walletAddress && (
            <Button
              title="Disconnect"
              onPress={() => { disconnect(); navigation.replace('ConnectWallet'); }}
              variant="secondary"
              style={styles.disconnectBtn}
            />
          )}
        </View>

        <Card style={styles.balanceCard}>
          <Text style={styles.label}>Devnet balance</Text>
          <Text style={styles.sol}>
            {walletBalance !== null ? sol(walletBalance) : '—'}
          </Text>
          <Text style={styles.network}>Solana Devnet</Text>
          <ShortAddress address={walletAddress} />
        </Card>

        {activeSplit && (
          <Card style={styles.splitBanner}>
            <Text style={styles.splitBannerTitle}>Active Split</Text>
            <Text style={styles.splitBannerSub}>
              {activePending} payment{activePending !== 1 ? 's' : ''} still pending
            </Text>
            <Button
              title="View Dashboard"
              onPress={() => navigation.navigate('SplitDashboard')}
              style={styles.viewBtn}
            />
          </Card>
        )}

        <View style={styles.grid}>
          <Button title="Request Money" onPress={() => navigation.navigate('RequestMoney')} style={styles.action} />
          <Button title="Send Money" onPress={() => navigation.navigate('SendMoney')} style={styles.action} />
          <Button title="Split Bill" onPress={() => navigation.navigate('SplitBill')} variant="secondary" style={styles.action} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 58, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  hello: { flex: 1, color: colors.text, fontSize: 28, fontWeight: '900', marginRight: 10 },
  disconnectBtn: { paddingVertical: 8, paddingHorizontal: 14, flexShrink: 0 },
  balanceCard: { marginBottom: 14 },
  label: { color: colors.muted, fontWeight: '700' },
  sol: { fontSize: 40, color: colors.text, fontWeight: '900', marginTop: 8 },
  network: { color: colors.accent, fontWeight: '800', marginTop: 4 },
  walletInCard: { marginTop: 8, fontSize: 13, fontWeight: '700' },
  walletBlue: { color: colors.primary },
  walletMuted: { color: colors.muted },
  splitBanner: { marginBottom: 14, gap: 6 },
  splitBannerTitle: { fontWeight: '900', fontSize: 17, color: colors.text },
  splitBannerSub: { color: colors.muted, fontSize: 14 },
  viewBtn: { marginTop: 4 },
  grid: { gap: 12 },
  action: { width: '100%' },
});
