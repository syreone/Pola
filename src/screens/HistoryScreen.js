import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import Card from '../components/Card';
import { colors } from '../theme';
import { useSplitPay } from '../data/SplitPayContext';
import { eur, sol } from '../utils/format';

export default function HistoryScreen() {
  const { transactions } = useSplitPay();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>Recent sent, received, and split bill activity.</Text>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item }) => (
          <Card style={styles.item}>
            <View style={styles.row}>
              <View>
                <Text style={styles.txTitle}>{item.title}</Text>
                <Text style={styles.note}>{item.note}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.amount, item.type === 'received' && styles.received]}>{item.type === 'received' ? '+' : '-'}{eur(item.amountEur)}</Text>
                <Text style={styles.sol}>{sol(item.amountSol)}</Text>
              </View>
            </View>
            <Text style={styles.date}>{item.date} · {item.type}</Text>
          </Card>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 58 },
  title: { fontSize: 30, fontWeight: '900', color: colors.text }, subtitle: { color: colors.muted, marginTop: 6, marginBottom: 18 },
  item: { marginBottom: 12 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, txTitle: { color: colors.text, fontSize: 17, fontWeight: '900' }, note: { color: colors.muted, marginTop: 4 }, amount: { color: colors.text, fontWeight: '900', fontSize: 17 }, received: { color: colors.success }, sol: { color: colors.muted, marginTop: 4 }, date: { marginTop: 12, color: colors.muted, fontSize: 12, textTransform: 'uppercase', fontWeight: '800' }
});
