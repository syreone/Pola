import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  PanResponder, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import Card from '../components/Card';
import { colors } from '../theme';
import { useSplitPay } from '../data/SplitPayContext';
import { eur, sol, relativeTime, formatDateTime } from '../utils/format';

const FILTERS = ['all', 'received', 'sent'];

function AddrSpan({ address, style }) {
  if (!address) return <Text style={style}>—</Text>;
  return (
    <Text style={style}>
      <Text style={{ color: colors.primary }}>{address.slice(0, 6)}</Text>
      {'...'}
      <Text style={{ color: colors.primary }}>{address.slice(-6)}</Text>
    </Text>
  );
}

function TxSubText({ tx }) {
  const addr = tx.type === 'sent' ? tx.recipientAddress : tx.senderAddress;
  const prefix = tx.type === 'sent' ? 'To ' : 'From ';
  if (addr) {
    return (
      <Text style={styles.note}>
        {prefix}
        <Text style={styles.noteAddr}>{addr.slice(0, 6)}</Text>
        {'...'}
        <Text style={styles.noteAddr}>{addr.slice(-6)}</Text>
      </Text>
    );
  }
  return tx.note ? <Text style={styles.note}>{tx.note}</Text> : null;
}

function DetailModal({ tx, onClose }) {
  if (!tx) return null;
  const isSent = tx.type === 'sent';

  const rows = [
    { label: 'Status',    plain: 'Confirmed',                                  valueStyle: { color: colors.success, fontWeight: '900' } },
    { label: 'Date',      plain: formatDateTime(tx.timestamp) || tx.date || '—' },
    { label: 'Type',      plain: tx.type.charAt(0).toUpperCase() + tx.type.slice(1) },
    { label: 'Amount',    plain: `${isSent ? '-' : '+'}${sol(tx.amountSol)}`,  valueStyle: { color: isSent ? colors.danger : colors.success, fontWeight: '900' } },
    { label: 'EUR value', plain: `${isSent ? '-' : '+'}${eur(tx.amountEur)}` },
    { label: 'Network',   plain: 'Solana Devnet' },
    { label: 'Note',      plain: tx.note || '—' },
    isSent
      ? { label: 'Recipient', addr: tx.recipientAddress }
      : { label: 'Sender',    addr: tx.senderAddress },
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Transaction Details</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeX}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView>
          {rows.map((row, i) => (
            <View key={i} style={[styles.detailRow, i < rows.length - 1 && styles.detailRowBorder]}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              {row.addr !== undefined ? (
                <AddrSpan address={row.addr} style={styles.detailValue} />
              ) : (
                <Text style={[styles.detailValue, row.valueStyle]}>{row.plain}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function HistoryScreen({ navigation }) {
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
    <View style={styles.wrapper} {...panResponder.panHandlers}>
      <FlatList
        style={styles.container}
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>History</Text>
            <View style={styles.filterRow}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
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
                  <Text style={styles.txTitle}>{item.title}</Text>
                  <TxSubText tx={item} />
                </View>
                <View style={styles.right}>
                  <Text style={[styles.amount, item.type === 'received' ? styles.received : styles.sent]}>
                    {item.type === 'received' ? '+' : '-'}{eur(item.amountEur)}
                  </Text>
                  <Text style={styles.solText}>{sol(item.amountSol)}</Text>
                </View>
              </View>
              <Text style={styles.date}>{relativeTime(item.timestamp) || item.date}</Text>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {filter === 'all' ? 'No transactions yet.' : `No ${filter} transactions.`}
          </Text>
        }
      />
      <DetailModal tx={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 58, paddingBottom: 30 },
  title: { fontSize: 30, fontWeight: '900', color: colors.text, marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  filterBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 14,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontWeight: '800', fontSize: 14, color: colors.text },
  filterTextActive: { color: '#fff' },
  item: { marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  left: { flex: 1 },
  right: { alignItems: 'flex-end' },
  txTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  note: { color: colors.muted, marginTop: 4 },
  noteAddr: { color: colors.primary, fontWeight: '700' },
  amount: { fontWeight: '900', fontSize: 17 },
  received: { color: colors.success },
  sent: { color: colors.danger },
  solText: { color: colors.muted, marginTop: 4 },
  date: { marginTop: 10, color: colors.muted, fontSize: 12, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
    maxHeight: '75%',
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
  closeX: { fontSize: 18, color: colors.muted, fontWeight: '700', padding: 4 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 14,
  },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.muted, fontWeight: '700', fontSize: 14 },
  detailValue: { color: colors.text, fontWeight: '700', fontSize: 14, maxWidth: '60%', textAlign: 'right' },
});
