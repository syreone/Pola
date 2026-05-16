import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import Card from '../components/Card';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { useSplitPay } from '../data/SplitPayContext';
import { getSignaturesForAddress } from '../utils/solanaRpc';
import { buildSolanaPayUrl } from '../utils/solanaPay';
import { eur, sol } from '../utils/format';

const POLL_MS = 4000;

export default function SplitDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const { activeSplit, markParticipantPaid, walletAddress, refreshBalance } = useSplitPay();
  const [expanded, setExpanded] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!activeSplit) return;
    const poll = async () => {
      for (const p of activeSplit.participants) {
        if (p.status === 'paid') continue;
        try {
          const sigs = await getSignaturesForAddress(p.referenceKey, { limit: 1 });
          if (sigs?.length > 0) { markParticipantPaid(p.name); refreshBalance(); }
        } catch { /* silent */ }
      }
    };
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [activeSplit?.sessionId]);

  if (!activeSplit) {
    return (
      <ScreenBackground>
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No active split</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>Go to Split Bill to create one.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </ScreenBackground>
    );
  }

  const paidCount = activeSplit.participants.filter(p => p.status === 'paid').length;
  const total = activeSplit.participants.length;
  const paidPct = total > 0 ? (paidCount / total) * 100 : 0;
  const allPaid = paidCount === total;
  const remaining = total - paidCount;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backTap}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>Split Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {allPaid ? 'Everyone has paid!' : `Waiting for ${remaining} more payment${remaining !== 1 ? 's' : ''}`}
        </Text>

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <LinearGradient
            colors={colors.primaryGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${paidPct}%` }]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: colors.muted }]}>
          {paidCount}/{total} paid · {eur(activeSplit.totalEur)} total · {sol(activeSplit.eachSol)} each
        </Text>

        {activeSplit.participants.map(p => {
          const isPaid = p.status === 'paid';
          const isExpanded = expanded === p.name;
          return (
            <Card key={p.name} style={styles.card}>
              <TouchableOpacity onPress={() => setExpanded(isExpanded ? null : p.name)} activeOpacity={0.7}>
                <View style={styles.row}>
                  <View style={styles.nameRow}>
                    <View style={[styles.dot, { backgroundColor: isPaid ? colors.success : colors.danger }]} />
                    <Text style={[styles.nameText, { color: colors.text }]}>{p.name}</Text>
                  </View>
                  <View style={styles.rightRow}>
                    <Text style={[styles.statusText, { color: isPaid ? colors.success : colors.muted }]}>
                      {isPaid ? 'Paid ✓' : 'Pending'}
                    </Text>
                    {!isPaid && <ActivityIndicator size="small" color={colors.muted} style={styles.spinner} />}
                    <Text style={[styles.chevron, { color: colors.muted }]}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={[styles.qrSection, { borderTopColor: colors.border }]}>
                  <Text style={[styles.qrLabel, { color: colors.text }]}>Show this QR to {p.name}</Text>
                  <View style={styles.qrBox}>
                    <QRCode value={buildSolanaPayUrl({
                      recipient: walletAddress,
                      amountSol: activeSplit.eachSol.toFixed(5),
                      label: 'SplitPay',
                      message: `Split bill — ${p.name}`,
                      memo: `splitpay-${p.name}`,
                      reference: p.referenceKey,
                    })} size={200} />
                  </View>
                  <Text style={[styles.qrAmount, { color: colors.accent }]}>{sol(activeSplit.eachSol)} · Devnet</Text>
                  <Text style={[styles.qrHint, { color: colors.muted }]}>
                    {p.name} scans with Phantom → approves → status updates automatically
                  </Text>
                </View>
              )}
            </Card>
          );
        })}

        {allPaid && (
          <Card>
            <LinearGradient colors={colors.successGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.allPaidGrad}>
              <Text style={styles.allPaidText}>All payments confirmed on Solana Devnet ✓</Text>
            </LinearGradient>
          </Card>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingTop: 52, gap: 12, paddingBottom: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  emptyText: { marginBottom: 20 },
  backTap: { marginBottom: 4 },
  backText: { fontWeight: '700', fontSize: 16 },
  title: { fontSize: 30, fontWeight: '900' },
  subtitle: { marginBottom: 4 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: 8, borderRadius: 4 },
  progressLabel: { fontSize: 13, fontWeight: '700', marginBottom: 4, marginTop: 6 },
  card: { gap: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  nameText: { fontSize: 18, fontWeight: '800' },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontWeight: '800', fontSize: 14 },
  spinner: { marginLeft: 2 },
  chevron: { fontSize: 11, marginLeft: 4 },
  qrSection: { alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  qrBox: { padding: 14, backgroundColor: '#fff', borderRadius: 16, elevation: 2 },
  qrLabel: { fontWeight: '700', fontSize: 15 },
  qrAmount: { fontWeight: '800' },
  qrHint: { fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },
  allPaidGrad: { borderRadius: 16, padding: 16, alignItems: 'center' },
  allPaidText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
