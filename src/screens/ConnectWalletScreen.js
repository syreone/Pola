import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors } from '../theme';
import { useSplitPay } from '../data/SplitPayContext';

export default function ConnectWalletScreen({ navigation }) {
  const { walletAddress, connecting, connectPhantom } = useSplitPay();

  useEffect(() => {
    if (walletAddress) navigation.replace('MainTabs');
  }, [walletAddress]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>SplitPay</Text>
      <Text style={styles.subtitle}>
        Split bills with friends on Solana Devnet. Connect your Phantom wallet to receive payments.
      </Text>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Connect Phantom Wallet</Text>
        <Text style={styles.cardText}>
          Opens Phantom and asks for read permission. Your wallet address is used to receive split
          payments — no funds are moved during connect.
        </Text>
        {connecting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Waiting for Phantom…</Text>
          </View>
        ) : (
          <Button title="Connect Phantom" onPress={connectPhantom} />
        )}
        {walletAddress && (
          <Text style={styles.wallet} numberOfLines={1}>{walletAddress}</Text>
        )}
      </Card>
      <Text style={styles.hint}>
        Need Phantom? It's free on the App Store and Play Store.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center' },
  logo: { fontSize: 42, fontWeight: '900', color: colors.primary, marginBottom: 8 },
  subtitle: { color: colors.muted, fontSize: 17, lineHeight: 24, marginBottom: 28 },
  card: { gap: 14 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  cardText: { color: colors.muted, lineHeight: 21 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.muted, fontWeight: '700' },
  wallet: { marginTop: 4, color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  hint: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 24 },
});
