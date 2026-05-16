import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  PanResponder, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import Card from '../components/Card';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { useSplitPay } from '../data/SplitPayContext';
import { usdc, mkd, relativeTime, formatDateTime, formatDate } from '../utils/format';
import { FALLBACK_RATES } from '../utils/priceService';

const FILTERS = ['all', 'received', 'sent'];

// ─── Address snippet ───────────────────────────────────────────────────────────
function AddrSpan({ address, style, colors }) {
  if (!address) return <Text style={style}>—</Text>;
  return (
    <Text style={style}>
      <Text style={{ color: colors.primary, fontWeight: '700' }}>{address.slice(0, 6)}</Text>
      {'...'}
      <Text style={{ color: colors.primary, fontWeight: '700' }}>{address.slice(-6)}</Text>
    </Text>
  );
}

// ─── Detail modal ──────────────────────────────────────────────────────────────
function DetailModal({ item, onClose, colors }) {
  if (!item) return null;

  if (item.kind === 'split') {
    const sr = item.rates ?? FALLBACK_RATES;
    const totalMkd = (item.totalUsdc ?? 0) * sr.mkdPerUsdc;
    return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.tabBar, borderColor: colors.border }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Split Bill Details</Text>
            <TouchableOpacity onPress={onClose}><Text style={[styles.closeX, { color: colors.muted }]}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView>
            {[
              { label: 'Status',    plain: 'Completed',   valueStyle: { color: colors.success, fontWeight: '900' } },
              { label: 'Date',      plain: formatDateTime(item.timestamp) },
              { label: 'Mode',      plain: item.mode === 'fixed' ? 'Fixed Price' : 'Divide Total' },
              { label: 'Total',     plain: `${mkd(totalMkd)} · ${usdc(item.totalUsdc ?? 0)}`, valueStyle: { fontWeight: '900' } },
              { label: 'Network',   plain: 'USDC' },
            ].map((row, i, arr) => (
              <View key={i} style={[styles.detailRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>{row.label}</Text>
                <Text style={[styles.detailValue, { color: colors.text }, row.valueStyle]}>{row.plain}</Text>
              </View>
            ))}
            <View style={[styles.detailRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Participants</Text>
            </View>
            {(item.participants ?? []).map((pt, i) => {
              const ptUsdc = pt.amountUsdc ?? item.eachUsdc ?? 0;
              const ptMkd = ptUsdc * (item.rates?.mkdPerUsdc ?? FALLBACK_RATES.mkdPerUsdc);
              return (
                <View key={i} style={[styles.detailRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.text, fontWeight: '800' }]}>{pt.name}</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {mkd(ptMkd)}{'\n'}
                    <Text style={{ color: colors.primary, fontSize: 12 }}>{usdc(ptUsdc)}</Text>
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // Transaction modal
  const isSent = item.type === 'sent';
  const addrLabel = isSent ? 'Recipient' : 'Sender';
  const addrValue = isSent ? item.recipientAddress : item.senderAddress;
  const amountUsdc = item.amountUsdc ?? 0;
  const amountMkd = item.amountMkd ?? (amountUsdc * FALLBACK_RATES.mkdPerUsdc);

  const rows = [
    { label: 'Status',    plain: 'Confirmed',             valueStyle: { color: colors.success, fontWeight: '900' } },
    { label: 'Date',      plain: formatDateTime(item.timestamp) || '—' },
    { label: 'Type',      plain: isSent ? 'Sent' : 'Received' },
    { label: 'Amount',    plain: `${isSent ? '-' : '+'}${mkd(amountMkd)}`, valueStyle: { color: isSent ? colors.danger : colors.success, fontWeight: '900' } },
    { label: 'USDC',      plain: `${isSent ? '-' : '+'}${usdc(amountUsdc)}`, valueStyle: { color: colors.primary } },
    { label: 'Network',   plain: 'USDC' },
    { label: 'Note',      plain: item.note || (isSent ? 'Payment sent' : 'Payment received') },
    { label: addrLabel,   addr: addrValue },
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.tabBar, borderColor: colors.border }]}>
        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Transaction Details</Text>
          <TouchableOpacity onPress={onClose}><Text style={[styles.closeX, { color: colors.muted }]}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView>
          {rows.map((row, i) => (
            <View key={i} style={[styles.detailRow, i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>{row.label}</Text>
              {row.addr !== undefined
                ? <AddrSpan address={row.addr} style={[styles.detailValue, { color: colors.text }]} colors={colors} />
                : <Text style={[styles.detailValue, { color: colors.text }, row.valueStyle]}>{row.plain}</Text>
              }
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Single history row ────────────────────────────────────────────────────────
function HistoryRow({ item, onPress, colors }) {
  const isSplit = item.kind === 'split';
  const isSent = item.type === 'sent';
  const amountMkd = item.amountMkd ?? 0;
  const amountUsdc = item.amountUsdc ?? 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Card style={styles.item}>
        <View style={styles.row}>
          <View style={styles.left}>
            {/* Title */}
            <Text style={[styles.txTitle, { color: colors.text }]}>
              {isSplit ? (item.title || 'Split Bill') : (item.title || (isSent ? 'Payment sent' : 'Payment received'))}
            </Text>

            {/* To / From line */}
            {isSplit ? (
              <Text style={[styles.note, { color: colors.muted }]}>
                From: {(item.participants ?? []).map(p => p.name).join(', ')}
              </Text>
            ) : (
              item.type === 'sent' && item.recipientAddress ? (
                <Text style={[styles.note, { color: colors.muted }]}>
                  {'To '}
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.recipientAddress.slice(0, 6)}</Text>
                  {'...'}
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.recipientAddress.slice(-6)}</Text>
                </Text>
              ) : item.type === 'received' && item.senderAddress ? (
                <Text style={[styles.note, { color: colors.muted }]}>
                  {'From '}
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.senderAddress.slice(0, 6)}</Text>
                  {'...'}
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.senderAddress.slice(-6)}</Text>
                </Text>
              ) : null
            )}

            {/* Date */}
            <Text style={[styles.date, { color: colors.muted }]}>{relativeTime(item.timestamp)}</Text>
          </View>

          <View style={styles.right}>
            {/* Amount MKD — primary */}
            <Text style={[
              styles.amount,
              { color: isSent ? colors.danger : colors.success },
            ]}>
              {isSent ? '-' : '+'}{mkd(amountMkd)}
            </Text>
            {/* Amount USDC — secondary */}
            <Text style={[styles.amountUsdc, { color: colors.primary }]}>
              {isSent ? '-' : '+'}{usdc(amountUsdc)}
            </Text>
            {/* Type badge */}
            <View style={[styles.typeBadge, {
              backgroundColor: isSplit
                ? (colors.isDark ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.08)')
                : (isSent
                    ? (colors.isDark ? 'rgba(248,113,113,0.15)' : '#FEF2F2')
                    : (colors.isDark ? 'rgba(74,222,128,0.12)' : '#F0FDF4')),
            }]}>
              <Text style={[styles.typeBadgeText, {
                color: isSplit ? colors.primary : (isSent ? colors.danger : colors.success),
              }]}>
                {isSplit ? 'Split' : (isSent ? 'Sent' : 'Received')}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function HistoryScreen({ navigation }) {
  const { colors } = useTheme();
  const { transactions, splitHistory } = useSplitPay();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  // Combine transactions + completed split sessions into one unified list
  const allItems = useMemo(() => {
    const txItems = transactions.map(tx => {
      const amountUsdc = tx.amountUsdc ?? 0;
      const sr = FALLBACK_RATES;
      return {
        ...tx,
        kind: 'transaction',
        amountMkd: tx.amountMkd ?? (amountUsdc * sr.mkdPerUsdc),
      };
    });

    const splitItems = splitHistory.map(session => {
      const sr = session.rates ?? FALLBACK_RATES;
      const totalUsdc = session.totalUsdc ?? 0;
      return {
        id: session.sessionId,
        kind: 'split',
        type: 'received', // split bills = you receive money from friends
        title: session.title || '',
        timestamp: session.completedAt ?? session.createdAt,
        amountUsdc: totalUsdc,
        amountMkd: totalUsdc * sr.mkdPerUsdc,
        rates: session.rates,
        mode: session.mode,
        participants: session.participants,
        eachUsdc: session.eachUsdc,
        totalUsdc,
      };
    });

    return [...txItems, ...splitItems].sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, splitHistory]);

  const filtered = useMemo(() => {
    if (filter === 'all') return allItems;
    return allItems.filter(item => item.type === filter);
  }, [allItems, filter]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx > 60) navigation.goBack();
      },
    })
  ).current;

  return (
    <ScreenBackground>
      <View style={styles.wrapper} {...panResponder.panHandlers}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View>
              <Text style={[styles.title, { color: colors.text }]}>History</Text>
              <View style={styles.filterRow}>
                {FILTERS.map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.filterBtn,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                      filter === f && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setFilter(f)}
                  >
                    <Text style={[styles.filterText, { color: filter === f ? '#fff' : colors.muted }]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <HistoryRow item={item} colors={colors} onPress={() => setSelected(item)} />
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.muted }]}>
              {filter === 'all' ? 'No history yet.' : `No ${filter} transactions.`}
            </Text>
          }
        />
        <DetailModal item={selected} onClose={() => setSelected(null)} colors={colors} />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  content: { padding: 20, paddingTop: 58, paddingBottom: 30 },
  title: { fontSize: 30, fontWeight: '900', marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  filterText: { fontWeight: '800', fontSize: 14 },

  item: { marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  left: { flex: 1, gap: 3 },
  right: { alignItems: 'flex-end', gap: 3 },
  txTitle: { fontSize: 16, fontWeight: '900' },
  note: { fontSize: 13, fontWeight: '600' },
  date: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  amount: { fontWeight: '900', fontSize: 17 },
  amountUsdc: { fontSize: 12, fontWeight: '700' },
  typeBadge: { borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8, marginTop: 4 },
  typeBadgeText: { fontSize: 11, fontWeight: '800' },

  empty: { textAlign: 'center', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
    maxHeight: '80%', position: 'absolute', bottom: 0, left: 0, right: 0,
    borderWidth: 1,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '900' },
  closeX: { fontSize: 18, fontWeight: '700', padding: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  detailLabel: { fontWeight: '700', fontSize: 14 },
  detailValue: { fontWeight: '700', fontSize: 14, maxWidth: '60%', textAlign: 'right' },
});
