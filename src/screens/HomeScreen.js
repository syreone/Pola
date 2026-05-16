import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import { colors } from '../theme';
import { useSplitPay } from '../data/SplitPayContext';
import { sol } from '../utils/format';

export default function HomeScreen({ navigation }) {
  const { walletAddress, walletBalance, refreshBalance, activeSplit, disconnect } = useSplitPay();

  useEffect(() => {
    refreshBalance();
  }, [walletAddress]);

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : 'Not connected';

  const activePending = activeSplit
    ? activeSplit.participants.filter(p => p.status === 'pending').length
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Welcome back</Text>
          <Text style={styles.wallet}>{shortAddress}</Text>
        </View>
        {walletAddress && (
          <Button title="Disconnect" onPress={disconnect} variant="secondary" style={styles.disconnectBtn} />
        )}
      </View>

      <Card style={styles.balanceCard}>
        <Text style={styles.label}>Devnet balance</Text>
        <Text style={styles.sol}>
          {walletBalance !== null ? sol(walletBalance) : '—'}
        </Text>
        <Text style={styles.network}>Solana Devnet</Text>
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
        <Button title="History" onPress={() => navigation.navigate('History')} variant="secondary" style={styles.action} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 58 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  hello: { color: colors.text, fontSize: 28, fontWeight: '900' },
  wallet: { color: colors.muted, marginTop: 4, fontSize: 13 },
  disconnectBtn: { paddingVertical: 8, paddingHorizontal: 14 },
  balanceCard: { marginBottom: 14 },
  label: { color: colors.muted, fontWeight: '700' },
  sol: { fontSize: 40, color: colors.text, fontWeight: '900', marginTop: 8 },
  network: { color: colors.accent, fontWeight: '800', marginTop: 4 },
  splitBanner: { marginBottom: 14, gap: 6 },
  splitBannerTitle: { fontWeight: '900', fontSize: 17, color: colors.text },
  splitBannerSub: { color: colors.muted, fontSize: 14 },
  viewBtn: { marginTop: 4 },
  grid: { gap: 12 },
  action: { width: '100%' },
});
