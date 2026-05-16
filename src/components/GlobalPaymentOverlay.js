import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import Button from './Button';
import { useTheme } from '../context/ThemeContext';
import { useSplitPay } from '../data/SplitPayContext';
import { getUsdcBalance } from '../utils/solanaRpc';
import { usdc } from '../utils/format';

const POLL_MS = 2500;
const TIMEOUT_MS = 60000;

export default function GlobalPaymentOverlay() {
  const { colors, isDark } = useTheme();
  const { notification, dismissNotification } = useSplitPay();
  const [sentStatus, setSentStatus] = useState('pending');
  const [confirmedBalance, setConfirmedBalance] = useState(null);
  const pollRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (!notification) {
      setSentStatus('pending');
      setConfirmedBalance(null);
      clearInterval(pollRef.current);
      return;
    }

    if (notification.type !== 'sent') return;

    const { senderAddress, senderPreTxBalance } = notification;
    if (!senderAddress || senderPreTxBalance == null) {
      setSentStatus('confirmed');
      return;
    }

    startRef.current = Date.now();
    const poll = async () => {
      if (Date.now() - startRef.current > TIMEOUT_MS) {
        clearInterval(pollRef.current);
        setSentStatus('timeout');
        return;
      }
      try {
        const balance = await getUsdcBalance(senderAddress);
        if (balance < senderPreTxBalance) {
          clearInterval(pollRef.current);
          setConfirmedBalance(balance);
          setSentStatus('confirmed');
        }
      } catch { /* silent */ }
    };
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [notification]);

  if (!notification) return null;

  const dismiss = () => {
    clearInterval(pollRef.current);
    dismissNotification();
    setSentStatus('pending');
    setConfirmedBalance(null);
  };

  return (
    <View style={styles.root}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={70} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(8,12,20,0.85)' : 'rgba(200,212,255,0.80)' }]} />
      )}

      <View style={[styles.panel, { backgroundColor: colors.surface, shadowColor: isDark ? '#000' : 'rgba(37,99,235,0.18)' }]}>

        {notification.type === 'received' && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(74,222,128,0.15)' : '#DCFCE7' }]}>
              <Text style={[styles.iconText, { color: colors.success }]}>✓</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Payment Received!</Text>
            <Text style={[styles.amount, { color: colors.success }]}>+{usdc(notification.amountUsdc)}</Text>
            <Text style={[styles.note, { color: colors.accent }]}>Confirmed on Solana</Text>
          </>
        )}

        {notification.type === 'sent' && sentStatus === 'pending' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Sending…</Text>
            <Text style={[styles.sub, { color: colors.muted }]}>
              Waiting for the transaction to confirm on Solana.
            </Text>
            {notification.recipientAddress && (
              <Text style={styles.addr}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{notification.recipientAddress.slice(0, 6)}</Text>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>...</Text>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{notification.recipientAddress.slice(-6)}</Text>
              </Text>
            )}
          </>
        )}

        {notification.type === 'sent' && sentStatus === 'confirmed' && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(74,222,128,0.15)' : '#DCFCE7' }]}>
              <Text style={[styles.iconText, { color: colors.success }]}>✓</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Payment Sent</Text>
            {confirmedBalance !== null && (
              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceLabel, { color: colors.muted }]}>Before</Text>
                  <Text style={[styles.balanceValue, { color: colors.text }]}>{usdc(notification.senderPreTxBalance)}</Text>
                </View>
                <Text style={[styles.arrow, { color: colors.muted }]}>→</Text>
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceLabel, { color: colors.muted }]}>After</Text>
                  <Text style={[styles.balanceValue, { color: colors.danger }]}>{usdc(confirmedBalance)}</Text>
                </View>
              </View>
            )}
            <Text style={[styles.sub, { color: colors.muted }]}>
              Funds left your account and were confirmed on Solana.
            </Text>
            {notification.recipientAddress && (
              <Text style={styles.addr}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{notification.recipientAddress.slice(0, 6)}</Text>
                <Text style={{ color: colors.muted, fontWeight: '700' }}>...</Text>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>{notification.recipientAddress.slice(-6)}</Text>
              </Text>
            )}
          </>
        )}

        {notification.type === 'sent' && sentStatus === 'timeout' && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF9C3' }]}>
              <Text style={[styles.iconText, { color: '#CA8A04' }]}>?</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Check Phantom</Text>
            <Text style={[styles.sub, { color: colors.muted }]}>
              No balance change detected after 60 seconds. The transaction may still be processing — open Phantom to verify.
            </Text>
          </>
        )}

        <Button title="Done" onPress={dismiss} style={styles.btn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    padding: 20,
    zIndex: 999,
    elevation: 999,
  },
  panel: {
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    shadowOpacity: 1,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 40, fontWeight: '900' },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  amount: { fontSize: 32, fontWeight: '900' },
  sub: { lineHeight: 22, textAlign: 'center' },
  note: { fontWeight: '700' },
  addr: { textAlign: 'center', fontSize: 13 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  balanceItem: { alignItems: 'center', gap: 4 },
  balanceLabel: { fontSize: 12, fontWeight: '700' },
  balanceValue: { fontSize: 15, fontWeight: '900' },
  arrow: { fontSize: 18 },
  btn: { width: '100%', marginTop: 8 },
});
