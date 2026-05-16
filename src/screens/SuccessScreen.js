
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import BlurOverlay from '../components/BlurOverlay';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors } from '../theme';
import { getBalance } from '../utils/solanaRpc';
import { sol } from '../utils/format';

const POLL_MS = 2500;
const TIMEOUT_MS = 60000;

export default function SuccessScreen({ navigation, route }) {
  const { recipientAddress, senderAddress, senderPreTxBalance } = route.params || {};
  const [status, setStatus] = useState('pending');
  const [confirmedBalance, setConfirmedBalance] = useState(null);
  const pollRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!senderAddress || senderPreTxBalance === null || senderPreTxBalance === undefined) {
      setStatus('confirmed');
      return;
    }

    const poll = async () => {
      if (Date.now() - startRef.current > TIMEOUT_MS) {
        clearInterval(pollRef.current);
        setStatus('timeout');
        return;
      }
      try {
        const balance = await getBalance(senderAddress);
        if (balance < senderPreTxBalance) {
          clearInterval(pollRef.current);
          setConfirmedBalance(balance);
          setStatus('confirmed');
        }
      } catch { /* silent */ }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, []);

  const close = () => navigation.goBack();

  return (
    <BlurOverlay style={styles.container}>
      <Card style={styles.card}>
        {status === 'pending' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.title}>Sending…</Text>
            <Text style={styles.subtitle}>
              Waiting for the transaction to land on Solana Devnet.
            </Text>
            {recipientAddress && (
              <Text style={styles.addressRow} numberOfLines={1}>
                <Text style={styles.addressBlue}>{recipientAddress.slice(0, 6)}</Text>
                <Text style={styles.addressMuted}>...</Text>
                <Text style={styles.addressBlue}>{recipientAddress.slice(-6)}</Text>
              </Text>
            )}
          </>
        )}

        {status === 'confirmed' && (
          <>
            <View style={styles.check}>
              <Text style={styles.checkText}>✓</Text>
            </View>
            <Text style={styles.title}>Payment Sent</Text>
            {confirmedBalance !== null && (
              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Before</Text>
                  <Text style={styles.balanceValue}>{sol(senderPreTxBalance)}</Text>
                </View>
                <Text style={styles.arrow}>→</Text>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>After</Text>
                  <Text style={[styles.balanceValue, styles.red]}>{sol(confirmedBalance)}</Text>
                </View>
              </View>
            )}
            <Text style={styles.subtitle}>Funds left your account and were confirmed on Solana Devnet.</Text>
            {recipientAddress && (
              <Text style={styles.addressRow} numberOfLines={1}>
                <Text style={styles.addressBlue}>{recipientAddress.slice(0, 6)}</Text>
                <Text style={styles.addressMuted}>...</Text>
                <Text style={styles.addressBlue}>{recipientAddress.slice(-6)}</Text>
              </Text>
            )}
          </>
        )}

        {status === 'timeout' && (
          <>
            <View style={[styles.check, styles.checkWarn]}>
              <Text style={[styles.checkText, styles.checkWarnText]}>?</Text>
            </View>
            <Text style={styles.title}>Check Phantom</Text>
            <Text style={styles.subtitle}>
              No balance change detected after 60 seconds. The transaction may still be processing — open Phantom to verify.
            </Text>
          </>
        )}

        <Button title="Done" onPress={close} style={styles.btn} />
      </Card>
    </BlurOverlay>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { alignItems: 'center', gap: 16 },
  check: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  checkWarn: { backgroundColor: '#FEF9C3' },
  checkText: { fontSize: 42, color: colors.success, fontWeight: '900' },
  checkWarnText: { color: '#CA8A04' },
  title: { fontSize: 30, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { color: colors.muted, lineHeight: 22, textAlign: 'center' },
  addressRow: { textAlign: 'center' },
  addressBlue: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  addressMuted: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  balanceItem: { alignItems: 'center', gap: 4 },
  balanceLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  balanceValue: { fontSize: 15, fontWeight: '900', color: colors.text },
  red: { color: colors.danger },
  arrow: { color: colors.muted, fontSize: 18 },
  btn: { width: '100%', marginTop: 8 },
});
