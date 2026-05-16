import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Share, ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Card from '../components/Card';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { useSplitPay } from '../data/SplitPayContext';
import { getSignaturesForAddress } from '../utils/solanaRpc';
import { eur, mkd, sol } from '../utils/format';
import { FALLBACK_PRICES } from '../utils/priceService';

const POLL_MS = 4000;

function StatusBadge({ status, colors }) {
  const cfg = {
    pending: { label: 'No action', color: colors.muted },
    scanned: { label: 'Scanned',   color: colors.primary },
    paid:    { label: 'Paid ✓',    color: colors.success },
  }[status] ?? { label: 'No action', color: colors.muted };

  return (
    <View style={[styles.badge, { borderColor: cfg.color, backgroundColor: colors.card }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

export default function SplitDashboardScreen({ navigation, route }) {
  const { colors } = useTheme();
  const {
    activeSplits, markParticipantPaid, markParticipantScanned,
    completeSplit, clearSplit, refreshBalance,
  } = useSplitPay();

  const paramSessionId = route.params?.sessionId;
  const session = paramSessionId
    ? (activeSplits.find(s => s.sessionId === paramSessionId) ?? activeSplits[0])
    : activeSplits[0];

  const otherSessions = activeSplits.filter(s => s.sessionId !== session?.sessionId);
  const [expandedQR, setExpandedQR] = useState(null);
  const pollRef = useRef(null);

  // On-chain payment polling
  useEffect(() => {
    if (!session) return;
    const poll = async () => {
      for (const pt of session.participants) {
        if (pt.status === 'paid') continue;
        try {
          const sigs = await getSignaturesForAddress(pt.referenceKey, { limit: 1 });
          if (sigs?.length > 0) { markParticipantPaid(session.sessionId, pt.name); refreshBalance(); }
        } catch { /* silent */ }
      }
    };
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [session?.sessionId]);

  // Simulate "scanned" after 10–15s for demo
  const simRef = useRef(session);
  useEffect(() => {
    const s = simRef.current;
    if (!s) return;
    const timers = s.participants
      .filter(pt => pt.status === 'pending')
      .map(pt => {
        const delay = 10000 + Math.random() * 5000;
        return setTimeout(() => markParticipantScanned(s.sessionId, pt.name), delay);
      });
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleShare = async (participant) => {
    const dSol = participant.amountSol ?? session.eachSol;
    const p = session.prices ?? FALLBACK_PRICES;
    try {
      await Share.share({ message: participant.payUrl, title: `Pay your share: ${eur(dSol * p.solInEur)}` });
    } catch { /* dismissed */ }
  };

  const handlePoke = (participant) => {
    Alert.alert('Poke sent!', `Hey ${participant.name}, you haven't paid your part yet!`, [{ text: 'OK' }]);
  };

  const handleComplete = () => {
    Alert.alert('Complete Session', 'Save this split to history and close it?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: () => { completeSplit(session.sessionId); navigation.goBack(); } },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Split', 'This will permanently discard this split without saving to history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { clearSplit(session.sessionId); navigation.goBack(); } },
    ]);
  };

  if (!session) {
    return (
      <ScreenBackground>
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No active split</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>Go to Split Bill to start one.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </ScreenBackground>
    );
  }

  const paidCount = session.participants.filter(pt => pt.status === 'paid').length;
  const total = session.participants.length;
  const paidPct = total > 0 ? (paidCount / total) * 100 : 0;
  const allPaid = paidCount === total;
  const remaining = total - paidCount;
  const p = session.prices ?? FALLBACK_PRICES;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}>
            <Text style={[styles.deleteText, { color: colors.danger }]}>Delete Split</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Split Dashboard</Text>

        {/* Other active session banner */}
        {otherSessions.map(s => (
          <TouchableOpacity
            key={s.sessionId}
            style={[styles.otherBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.replace('SplitDashboard', { sessionId: s.sessionId })}
            activeOpacity={0.75}
          >
            <Text style={[styles.otherBannerText, { color: colors.primary }]}>
              Another active split · {s.participants.length} people
            </Text>
            <Text style={[styles.otherBannerLink, { color: colors.primary }]}>View →</Text>
          </TouchableOpacity>
        ))}

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${paidPct}%`, backgroundColor: colors.success }]} />
        </View>
        <Text style={[styles.progressLabel, { color: colors.text }]}>{paidCount}/{total} paid</Text>
        <Text style={[styles.progressSub, { color: colors.muted }]}>
          {allPaid ? 'Everyone has paid!' : `${remaining} payment${remaining !== 1 ? 's' : ''} remaining`}
        </Text>

        {/* All-paid banner */}
        {allPaid && (
          <Card style={styles.allPaidCard}>
            <Text style={[styles.allPaidText, { color: colors.success }]}>All payments confirmed on Solana!</Text>
            <TouchableOpacity style={[styles.completeBtn, { backgroundColor: colors.success }]} onPress={handleComplete}>
              <Text style={styles.completeBtnText}>Complete Session →</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Per-person cards */}
        {session.participants.map(participant => {
          const isExpanded = expandedQR === participant.name;
          const dSol = participant.amountSol ?? session.eachSol;

          return (
            <Card key={participant.name} style={styles.participantCard}>
              <TouchableOpacity style={styles.cardHeader} onPress={() => setExpandedQR(isExpanded ? null : participant.name)} activeOpacity={0.7}>
                <View style={styles.headerLeft}>
                  <Text style={[styles.participantName, { color: colors.text }]}>{participant.name}</Text>
                  <Text style={[styles.tapHint, { color: colors.muted }]}>
                    {isExpanded ? 'Tap to hide QR ▲' : 'Tap to show QR ▼'}
                  </Text>
                </View>
                <StatusBadge status={participant.status} colors={colors} />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.qrSection}>
                  <View style={[styles.qrBox, { backgroundColor: colors.surface }]}>
                    <QRCode value={participant.payUrl} size={200} />
                  </View>
                  <Text style={[styles.qrHint, { color: colors.muted }]}>Show this QR to {participant.name}</Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <View style={styles.amountCol}>
                  <Text style={[styles.actionEur, { color: colors.text }]}>{eur(dSol * p.solInEur)}</Text>
                  <Text style={[styles.actionMkd, { color: colors.muted }]}>{mkd(dSol * p.solInMkd)}</Text>
                  <Text style={[styles.actionSol, { color: colors.accent }]}>{sol(dSol)}</Text>
                </View>
                <View style={styles.btnCol}>
                  <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.primary }]} onPress={() => handleShare(participant)} activeOpacity={0.75}>
                    <Text style={styles.shareBtnText}>Share Link</Text>
                  </TouchableOpacity>
                  {participant.status === 'scanned' && (
                    <TouchableOpacity style={[styles.pokeBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handlePoke(participant)} activeOpacity={0.75}>
                      <Text style={[styles.pokeBtnText, { color: colors.primary }]}>Poke 👋</Text>
                    </TouchableOpacity>
                  )}
                  {participant.status === 'pending' && (
                    <ActivityIndicator size="small" color={colors.muted} />
                  )}
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 52, gap: 12, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  backText: { fontWeight: '700', fontSize: 16 },
  deleteText: { fontWeight: '700', fontSize: 15 },

  title: { fontSize: 30, fontWeight: '900', marginBottom: 2 },

  otherBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 12, padding: 12, borderWidth: 1,
  },
  otherBannerText: { fontWeight: '700', fontSize: 13 },
  otherBannerLink: { fontWeight: '900', fontSize: 13 },

  progressTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 5 },
  progressLabel: { fontSize: 14, fontWeight: '900' },
  progressSub: { fontSize: 13, marginTop: -4 },

  allPaidCard: { alignItems: 'center', gap: 10 },
  allPaidText: { fontWeight: '900', fontSize: 16 },
  completeBtn: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 },
  completeBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  participantCard: { gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { gap: 2, flex: 1 },
  participantName: { fontSize: 18, fontWeight: '900' },
  tapHint: { fontSize: 11, fontWeight: '600' },

  badge: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1 },
  badgeText: { fontWeight: '800', fontSize: 12 },

  qrSection: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  qrBox: { padding: 14, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
  qrHint: { fontSize: 13, fontWeight: '600' },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  amountCol: { gap: 2 },
  actionEur: { fontSize: 20, fontWeight: '900' },
  actionMkd: { fontSize: 13, fontWeight: '700' },
  actionSol: { fontSize: 13, fontWeight: '700' },

  btnCol: { gap: 8, alignItems: 'flex-end' },
  shareBtn: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  shareBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  pokeBtn: { borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14 },
  pokeBtnText: { fontWeight: '800', fontSize: 13 },

  emptyTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  emptyText: { marginBottom: 20 },
});
