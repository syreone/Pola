import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  PanResponder, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import Card from '../components/Card';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { useSplitPay } from '../data/SplitPayContext';
import { eur, sol, relativeTime, formatDateTime } from '../utils/format';

const FILTERS = ['all', 'received', 'sent'];

function AddrSpan({ address, style }) {
  if (!address) return <Text style={style}>—</Text>;
  return (
    <Text style={style}>
      <Text style={{ color: '#3B82F6' }}>{address.slice(0, 6)}</Text>
      {'...'}
      <Text style={{ color: '#3B82F6' }}>{address.slice(-6)}</Text>
    </Text>
  );
}

function TxSubText({ tx, colors }) {
  const addr = tx.type === 'sent' ? tx.recipientAddress : tx.senderAddress;
  const prefix = tx.type === 'sent' ? 'To ' : 'From ';
  if (addr) {
    return (
      <Text style={[styles.note, { color: colors.muted }]}>
        {prefix}
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{addr.slice(0, 6)}</Text>
        {'...'}
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{addr.slice(-6)}</Text>
      </Text>
    );
  }
  return tx.note ? <Text style={[styles.note, { color: colors.muted }]}>{tx.note}</Text> : null;
}

function DetailModal({ tx, onClose, colors }) {
  if (!tx) return null;
  const isSent = tx.type === 'sent';
  const addrLabel = isSent ? 'Recipient' : 'Sender';
  const addrValue = isSent ? tx.recipientAddress : tx.senderAddress;

  const rows = [
    { label: 'Status',    plain: 'Confirmed',                                  valueStyle: { color: colors.success, fontWeight: '900' } },
    { label: 'Date',      plain: formatDateTime(tx.timestamp) || tx.date || '—' },
    { label: 'Type',      plain: tx.type.charAt(0).toUpperCase() + tx.type.slice(1) },
    { label: 'Amount',    plain: `${isSent ? '-' : '+'}${sol(tx.amountSol)}`,  valueStyle: { color: isSent ? colors.danger : colors.success, fontWeight: '900' } },
    { label: 'EUR value', plain: `${isSent ? '-' : '+'}${eur(tx.amountEur)}` },
    { label: 'Network',   plain: 'Solana Devnet' },
    { label: 'Note',      plain: tx.note || '—' },
    { label: addrLabel,   addr: addrValue },
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.tabBar, borderColor: colors.border }]}>
        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Transaction Details</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeX, { color: colors.muted }]}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView>
          {rows.map((row, i) => (
            <View key={i} style={[styles.detailRow, i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>{row.label}</Text>
              {row.addr !== undefined ? (
                <AddrSpan address={row.addr} style={[styles.detailValue, { color: colors.text }]} />
              ) : (
                <Text style={[styles.detailValue, { color: colors.text }, row.valueStyle]}>{row.plain}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function HistoryScreen({ navigation }) {
  const { colors } = useTheme();
  const { transactions } = useSplitPay();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const filtered = filter === 'all'
    ? transactions
    : transactions.filter(t => t.type === filter);

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
            <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.75}>
              <Card style={styles.item}>
                <View style={styles.row}>
                  <View style={styles.left}>
                    <Text style={[styles.txTitle, { color: colors.text }]}>{item.title}</Text>
                    <TxSubText tx={item} colors={colors} />
                  </View>
                  <View style={styles.right}>
                    <Text style={[styles.amount, { color: item.type === 'received' ? colors.success : colors.danger }]}>
                      {item.type === 'received' ? '+' : '-'}{eur(item.amountEur)}
                    </Text>
                    <Text style={[styles.solText, { color: colors.muted }]}>{sol(item.amountSol)}</Text>
                  </View>
                </View>
                <Text style={[styles.date, { color: colors.muted }]}>{relativeTime(item.timestamp) || item.date}</Text>
              </Card>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.muted }]}>
              {filter === 'all' ? 'No transactions yet.' : `No ${filter} transactions.`}
            </Text>
          }
        />
        <DetailModal tx={selected} onClose={() => setSelected(null)} colors={colors} />
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
  left: { flex: 1 },
  right: { alignItems: 'flex-end' },
  txTitle: { fontSize: 17, fontWeight: '900' },
  note: { marginTop: 4 },
  amount: { fontWeight: '900', fontSize: 17 },
  solText: { marginTop: 4 },
  date: { marginTop: 10, fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
    maxHeight: '75%', position: 'absolute', bottom: 0, left: 0, right: 0,
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
