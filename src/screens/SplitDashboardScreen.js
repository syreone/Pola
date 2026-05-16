import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Share,
} from 'react-native';
import ConfirmModal from '../components/ConfirmModal';
import QRCode from 'react-native-qrcode-svg';
import Card from '../components/Card';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { useSplitPay } from '../data/SplitPayContext';
import { getSignaturesForAddress } from '../utils/solanaRpc';
import { usdc, mkd, formatDate } from '../utils/format';
import { FALLBACK_RATES } from '../utils/priceService';

const POLL_MS = 4000;

function StatusBadge({ status, colors }) {
  const isPaid = status === 'paid';
  return (
    <View style={[
      styles.badge,
      { borderColor: isPaid ? colors.success : colors.muted, backgroundColor: colors.card },
    ]}>
      <Text style={[styles.badgeText, { color: isPaid ? colors.success : colors.muted }]}>
        {isPaid ? 'Paid' : 'Unpaid'}
      </Text>
    </View>
  );
}

function SplitListCard({ session, onPress, onDelete, colors }) {
  const r = session.rates ?? FALLBACK_RATES;
  const paidCount = session.participants.filter(p => p.status === 'paid').length;
  const total = session.participants.length;
  const allPaid = paidCount === total;
  const dateStr = formatDate(session.createdAt);

  return (
    <TouchableOpacity
      style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.listCardTop}>
        <View style={styles.listCardLeft}>
          {session.title ? (
            <Text style={[styles.listCardTitle, { color: colors.text }]} numberOfLines={1}>{session.title}</Text>
          ) : null}
          <Text style={[styles.listCardDate, { color: colors.muted }]}>{dateStr}</Text>
          <Text style={[styles.listCardPeople, { color: colors.muted }]}>
            {total} {total === 1 ? 'person' : 'people'}
          </Text>
        </View>
        <View style={styles.listCardRight}>
          <Text style={[styles.listCardAmount, { color: colors.text }]}>{mkd((session.totalUsdc ?? 0) * r.mkdPerUsdc)}</Text>
          <View style={[
            styles.listCardStatus,
            { backgroundColor: allPaid ? colors.success : colors.primary },
          ]}>
            <Text style={styles.listCardStatusText}>{paidCount}/{total} paid</Text>
          </View>
        </View>
      </View>
      <View style={styles.listCardActions}>
        <Text style={[styles.listCardView, { color: colors.primary }]}>View Details →</Text>
        <TouchableOpacity onPress={onDelete}>
          <Text style={[styles.listCardDelete, { color: colors.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function SplitDashboardScreen({ navigation, route }) {
  const { colors } = useTheme();
  const {
    activeSplits, markParticipantPaid,
    completeSplit, clearSplit, refreshBalance,
  } = useSplitPay();

  const paramSessionId = route.params?.sessionId;
  const [selectedSessionId, setSelectedSessionId] = useState(paramSessionId ?? null);
  const [confirmModal, setConfirmModal] = useState(null);

  const session = selectedSessionId
    ? (activeSplits.find(s => s.sessionId === selectedSessionId) ?? null)
    : null;

  const showList = !session;
  const [expandedQR, setExpandedQR] = useState(null);
  const pollRef = useRef(null);

  // On-chain payment polling for the selected session
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

  const handleShare = async (participant) => {
    const r = session.rates ?? FALLBACK_RATES;
    const dUsdc = participant.amountUsdc ?? session.eachUsdc ?? 0;
    try {
      await Share.share({ message: participant.payUrl, title: `Pay your share: ${usdc(dUsdc)}` });
    } catch { /* dismissed */ }
  };

  const handleComplete = () => {
    setConfirmModal({
      title: 'Complete Session',
      message: 'Save this split to history and close it?',
      confirmText: 'Complete',
      destructive: false,
      onConfirm: () => {
        completeSplit(session.sessionId);
        if (activeSplits.length <= 1) navigation.goBack();
        else setSelectedSessionId(null);
      },
    });
  };

  const handleDelete = (sessionId) => {
    setConfirmModal({
      title: 'Delete Split',
      message: 'This will permanently discard this split without saving to history.',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: () => {
        clearSplit(sessionId);
        if (sessionId === selectedSessionId) {
          if (activeSplits.length <= 1) navigation.goBack();
          else setSelectedSessionId(null);
        }
      },
    });
  };

  if (activeSplits.length === 0) {
    return (
      <ScreenBackground>
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No active splits</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>Go to Split Bill to start one.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </ScreenBackground>
    );
  }

  // LIST VIEW
  if (showList) {
    return (
      <ScreenBackground>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Active Splits</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {activeSplits.length} active split{activeSplits.length !== 1 ? 's' : ''} — tap to manage
          </Text>
          {activeSplits.map(s => (
            <SplitListCard
              key={s.sessionId}
              session={s}
              colors={colors}
              onPress={() => setSelectedSessionId(s.sessionId)}
              onDelete={() => handleDelete(s.sessionId)}
            />
          ))}
        </ScrollView>
      </ScreenBackground>
    );
  }

  // DETAIL VIEW
  const paidCount = session.participants.filter(pt => pt.status === 'paid').length;
  const total = session.participants.length;
  const paidPct = total > 0 ? (paidCount / total) * 100 : 0;
  const allPaid = paidCount === total;
  const remaining = total - paidCount;
  const r = session.rates ?? FALLBACK_RATES;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => activeSplits.length > 1 ? setSelectedSessionId(null) : navigation.goBack()}>
            <Text style={[styles.backText, { color: colors.primary }]}>
              {activeSplits.length > 1 ? '← All Splits' : '← Back'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(session.sessionId)}>
            <Text style={[styles.deleteText, { color: colors.danger }]}>Delete Split</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {session.title || 'Split Dashboard'}
        </Text>
        <Text style={[styles.dateLabel, { color: colors.muted }]}>{formatDate(session.createdAt)}</Text>

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
          <Card>
            <View style={styles.allPaidInner}>
              <View style={[styles.allPaidIcon, { backgroundColor: colors.isDark ? 'rgba(74,222,128,0.15)' : '#DCFCE7' }]}>
                <Text style={[styles.allPaidIconText, { color: colors.success }]}>✓</Text>
              </View>
              <Text style={[styles.allPaidTitle, { color: colors.success }]}>All payments confirmed!</Text>
              <Text style={[styles.allPaidSub, { color: colors.muted }]}>Everyone has paid their share</Text>
              <View style={[styles.allPaidDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={[styles.completeBtn, { backgroundColor: colors.success }]} onPress={handleComplete}>
                <Text style={styles.completeBtnText}>Complete Session</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Per-person cards */}
        {session.participants.map(participant => {
          const isExpanded = expandedQR === participant.name;
          const dUsdc = participant.amountUsdc ?? session.eachUsdc ?? 0;
          const dMkd = dUsdc * r.mkdPerUsdc;


          return (
            <Card key={participant.name}>
              <View style={styles.participantInner}>
                {/* Name + amounts + badge */}
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <Text style={[styles.participantName, { color: colors.text }]}>{participant.name}</Text>
                    <Text style={[styles.participantMkd, { color: colors.text }]}>{mkd(dMkd)}</Text>
                    <Text style={[styles.participantUsdc, { color: colors.primary }]}>{usdc(dUsdc)}</Text>
                  </View>
                  <StatusBadge status={participant.status} colors={colors} />
                </View>

                {/* QR code */}
                {isExpanded && (
                  <View style={styles.qrSection}>
                    <View style={[styles.qrBox, { backgroundColor: '#fff' }]}>
                      <QRCode value={participant.payUrl} size={220} />
                    </View>
                    <Text style={[styles.qrHint, { color: colors.muted }]}>
                      {participant.name} scans this with Phantom to pay
                    </Text>
                  </View>
                )}

                {/* Divider before buttons */}
                <View style={[styles.participantDivider, { backgroundColor: colors.border }]} />

                {/* Buttons */}
                <View style={styles.btnStack}>
                  <TouchableOpacity
                    style={[styles.qrToggleBtn, { backgroundColor: isExpanded ? colors.border : colors.primary }]}
                    onPress={() => setExpandedQR(isExpanded ? null : participant.name)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.qrToggleBtnText, { color: isExpanded ? colors.text : '#fff' }]}>
                      {isExpanded ? 'Hide QR Code ▲' : 'Show QR Code ▼'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.shareBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleShare(participant)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.shareBtnText, { color: colors.primary }]}>Share Link</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        })}
      </ScrollView>

      <ConfirmModal
        visible={!!confirmModal}
        title={confirmModal?.title}
        message={confirmModal?.message}
        confirmText={confirmModal?.confirmText}
        destructive={confirmModal?.destructive}
        onCancel={() => setConfirmModal(null)}
        onConfirm={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}
      />
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
  subtitle: { fontSize: 14, marginBottom: 4 },
  dateLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },

  // List view
  listCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 12,
  },
  listCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  listCardLeft: { flex: 1, gap: 3 },
  listCardTitle: { fontSize: 16, fontWeight: '900' },
  listCardDate: { fontSize: 13, fontWeight: '700' },
  listCardPeople: { fontSize: 12, fontWeight: '600' },
  listCardRight: { alignItems: 'flex-end', gap: 6 },
  listCardAmount: { fontSize: 18, fontWeight: '900' },
  listCardStatus: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  listCardStatusText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  listCardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  listCardView: { fontWeight: '800', fontSize: 14 },
  listCardDelete: { fontWeight: '700', fontSize: 13 },

  // Progress
  progressTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 5 },
  progressLabel: { fontSize: 14, fontWeight: '900' },
  progressSub: { fontSize: 13, marginTop: -4 },

  // All-paid card — inner wrapper (Card already has padding:18)
  allPaidInner: { alignItems: 'center', gap: 12, paddingVertical: 10 },
  allPaidIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  allPaidIconText: { fontSize: 36, fontWeight: '900' },
  allPaidTitle: { fontWeight: '900', fontSize: 20 },
  allPaidSub: { fontSize: 13, textAlign: 'center', color: '#6B7280' },
  allPaidDivider: { height: 1, width: '100%', marginVertical: 4 },
  completeBtn: { borderRadius: 14, paddingVertical: 16, width: '100%', alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },

  // Participant cards — inner wrapper applies the gap
  participantInner: { gap: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { gap: 3, flex: 1 },
  participantName: { fontSize: 17, fontWeight: '900' },
  participantMkd: { fontSize: 24, fontWeight: '900' },
  participantUsdc: { fontSize: 13, fontWeight: '700' },

  badge: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1 },
  badgeText: { fontWeight: '800', fontSize: 12 },

  participantDivider: { height: 1 },
  qrSection: { alignItems: 'center', gap: 12, paddingVertical: 4 },
  qrBox: { padding: 16, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
  qrHint: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  btnStack: { gap: 10 },
  qrToggleBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  qrToggleBtnText: { fontWeight: '800', fontSize: 15 },
  shareBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1 },
  shareBtnText: { fontWeight: '800', fontSize: 14 },

  emptyTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  emptyText: { marginBottom: 20 },
});
