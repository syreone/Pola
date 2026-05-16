import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Button from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import { getUsdcBalance } from '../utils/solanaRpc';
import { usdc } from '../utils/format';

const POLL_MS = 2500;
const TIMEOUT_MS = 60000;

export default function SuccessScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
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
        const balance = await getUsdcBalance(senderAddress);
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

  return (
    <View style={styles.root}>
      {/* Full-screen blur — iOS gets real Gaussian blur, Android gets dark overlay */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={70}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(8,12,20,0.85)' : 'rgba(200,212,255,0.80)' }]} />
      )}

      {/* Opaque panel on top */}
      <View style={[styles.panel, { backgroundColor: colors.surface, shadowColor: isDark ? '#000' : 'rgba(37,99,235,0.18)' }]}>

        {status === 'pending' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Sending…</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Waiting for the transaction to confirm on Solana.
            </Text>
            {recipientAddress && (
              <Text style={styles.addrRow}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{recipientAddress.slice(0, 6)}</Text>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>...</Text>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{recipientAddress.slice(-6)}</Text>
              </Text>
            )}
          </>
        )}

        {status === 'confirmed' && (
          <>
            <View style={[styles.check, { backgroundColor: isDark ? 'rgba(74,222,128,0.15)' : '#DCFCE7' }]}>
              <Text style={[styles.checkText, { color: colors.success }]}>✓</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Payment Sent</Text>
            {confirmedBalance !== null && (
              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceLabel, { color: colors.muted }]}>Before</Text>
                  <Text style={[styles.balanceValue, { color: colors.text }]}>{usdc(senderPreTxBalance)}</Text>
                </View>
                <Text style={[styles.arrow, { color: colors.muted }]}>→</Text>
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceLabel, { color: colors.muted }]}>After</Text>
                  <Text style={[styles.balanceValue, { color: colors.danger }]}>{usdc(confirmedBalance)}</Text>
                </View>
              </View>
            )}
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Funds left your account and were confirmed on Solana.
            </Text>
            {recipientAddress && (
              <Text style={styles.addrRow}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{recipientAddress.slice(0, 6)}</Text>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>...</Text>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{recipientAddress.slice(-6)}</Text>
              </Text>
            )}
          </>
        )}

        {status === 'timeout' && (
          <>
            <View style={[styles.check, { backgroundColor: '#FEF9C3' }]}>
              <Text style={[styles.checkText, { color: '#CA8A04', fontSize: 36 }]}>?</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Check Phantom</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              No balance change detected after 60 seconds. The transaction may still be processing — open Phantom to verify.
            </Text>
          </>
        )}

        <Button title="Done" onPress={() => navigation.goBack()} style={styles.btn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    shadowOpacity: 1,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  check: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { fontSize: 42, fontWeight: '900' },
  title: { fontSize: 30, fontWeight: '900', textAlign: 'center' },
  subtitle: { lineHeight: 22, textAlign: 'center' },
  addrRow: { textAlign: 'center', fontSize: 13 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  balanceItem: { alignItems: 'center', gap: 4 },
  balanceLabel: { fontSize: 12, fontWeight: '700' },
  balanceValue: { fontSize: 15, fontWeight: '900' },
  arrow: { fontSize: 18 },
  btn: { width: '100%', marginTop: 8 },
});
