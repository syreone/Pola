import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Card from '../components/Card';
import { colors } from '../theme';
import { useSplitPay } from '../data/SplitPayContext';
import { getSignaturesForAddress } from '../utils/solanaRpc';
import { eur, sol } from '../utils/format';

const POLL_MS = 4000;

export default function SplitDashboardScreen({ navigation }) {
  const { activeSplit, markParticipantPaid } = useSplitPay();
  const [expanded, setExpanded] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!activeSplit) return;

    const poll = async () => {
      for (const p of activeSplit.participants) {
        if (p.status === 'paid') continue;
        try {
          const sigs = await getSignaturesForAddress(p.referenceKey, { limit: 1 });
          if (sigs?.length > 0) {
            markParticipantPaid(p.name);
          }
        } catch { /* silent — keep polling */ }
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [activeSplit?.sessionId]);

  if (!activeSplit) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyTitle}>No active split</Text>
        <Text style={styles.emptyText}>Go to Split Bill to create one.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backTap}>
          <Text style={styles.backText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const paidCount = activeSplit.participants.filter(p => p.status === 'paid').length;
  const total = activeSplit.participants.length;
  const paidPct = total > 0 ? (paidCount / total) * 100 : 0;
  const allPaid = paidCount === total;
  const remaining = total - paidCount;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backTap}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Split Dashboard</Text>
      <Text style={styles.subtitle}>
        {allPaid
          ? 'Everyone has paid!'
          : `Waiting for ${remaining} more payment${remaining !== 1 ? 's' : ''}`}
      </Text>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${paidPct}%` }]} />
      </View>
      <Text style={styles.progressLabel}>
        {paidCount}/{total} paid · {eur(activeSplit.totalEur)} total · {sol(activeSplit.eachSol)} each
      </Text>

      {/* Per-person cards */}
      {activeSplit.participants.map(p => {
        const isPaid = p.status === 'paid';
        const isExpanded = expanded === p.name;
        return (
          <Card key={p.name} style={styles.card}>
            <TouchableOpacity
              onPress={() => setExpanded(isExpanded ? null : p.name)}
              activeOpacity={0.7}
            >
              <View style={styles.row}>
                <View style={styles.nameRow}>
                  <View style={[styles.dot, isPaid ? styles.dotPaid : styles.dotPending]} />
                  <Text style={styles.nameText}>{p.name}</Text>
                </View>
                <View style={styles.rightRow}>
                  <Text style={[styles.statusText, isPaid ? styles.paidText : styles.pendingText]}>
                    {isPaid ? 'Paid ✓' : 'Pending'}
                  </Text>
                  {!isPaid && (
                    <ActivityIndicator size="small" color={colors.muted} style={styles.spinner} />
                  )}
                  <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.qrSection}>
                <Text style={styles.qrLabel}>Show this QR to {p.name}</Text>
                <View style={styles.qrBox}>
                  <QRCode value={p.payUrl} size={200} />
                </View>
                <Text style={styles.qrAmount}>{sol(activeSplit.eachSol)} · Devnet</Text>
                <Text style={styles.qrHint}>
                  {p.name} scans with Phantom → approves → status updates automatically
                </Text>
              </View>
            )}
          </Card>
        );
      })}

      {allPaid && (
        <Card style={styles.allPaidCard}>
          <Text style={styles.allPaidText}>All payments confirmed on Solana Devnet</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 52, gap: 12, paddingBottom: 40 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 8 },
  emptyText: { color: colors.muted, marginBottom: 20 },
  backTap: { marginBottom: 4 },
  backText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  title: { fontSize: 30, fontWeight: '900', color: colors.text },
  subtitle: { color: colors.muted },
  progressTrack: {
    height: 10, backgroundColor: colors.border,
    borderRadius: 5, overflow: 'hidden', marginTop: 8,
  },
  progressFill: { height: 10, backgroundColor: colors.success, borderRadius: 5 },
  progressLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  card: { gap: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 11, height: 11, borderRadius: 6 },
  dotPaid: { backgroundColor: colors.success },
  dotPending: { backgroundColor: colors.danger },
  nameText: { fontSize: 18, fontWeight: '800', color: colors.text },
  rightRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontWeight: '800', fontSize: 14 },
  paidText: { color: colors.success },
  pendingText: { color: colors.muted },
  spinner: { marginLeft: 2 },
  chevron: { color: colors.muted, fontSize: 11, marginLeft: 4 },
  qrSection: {
    alignItems: 'center', gap: 10,
    marginTop: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  qrBox: { padding: 14, backgroundColor: '#fff', borderRadius: 16, elevation: 2 },
  qrLabel: { color: colors.text, fontWeight: '700', fontSize: 15 },
  qrAmount: { color: colors.accent, fontWeight: '800' },
  qrHint: { color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },
  allPaidCard: { backgroundColor: colors.success, borderColor: colors.success, alignItems: 'center' },
  allPaidText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
