import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors } from '../theme';
import { useSplitPay } from '../data/SplitPayContext';
import { buildSolanaPayUrl } from '../utils/solanaPay';
import { generateReferenceKey } from '../utils/phantom';
import { eurToDemoSol, eur, sol } from '../utils/format';

export default function SplitBillScreen({ navigation }) {
  const { walletAddress, startSplit } = useSplitPay();
  const [total, setTotal] = useState('40');
  const [nameInput, setNameInput] = useState('');
  const [names, setNames] = useState(['Ana', 'Marko']);

  const count = Math.max(names.length, 1);
  const eachEur = (Number(total) || 0) / count;
  const eachSol = useMemo(() => eurToDemoSol(eachEur), [eachEur]);
  // Use connected wallet as recipient, fall back to system address as placeholder
  const recipient = walletAddress || '11111111111111111111111111111111';

  const addName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && !names.includes(trimmed)) {
      setNames([...names, trimmed]);
      setNameInput('');
    }
  };

  const removeName = (n) => setNames(names.filter(x => x !== n));

  const startDashboard = () => {
    const participants = names.map(n => {
      const referenceKey = generateReferenceKey();
      const payUrl = buildSolanaPayUrl({
        recipient,
        amountSol: eachSol.toFixed(5),
        label: 'SplitPay',
        message: `Split bill — ${n}`,
        memo: `splitpay-${n}`,
        reference: referenceKey,
      });
      return { name: n, referenceKey, payUrl, status: 'pending' };
    });
    startSplit({
      sessionId: `${Date.now()}`,
      totalEur: Number(total) || 0,
      eachSol,
      participants,
    });
    navigation.navigate('SplitDashboard');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Split Bill</Text>
      <Text style={styles.subtitle}>
        Enter the total and add each person's name. Everyone gets their own QR code on the dashboard.
      </Text>

      <Input
        keyboardType="decimal-pad"
        value={total}
        onChangeText={setTotal}
        placeholder="Total bill in EUR"
      />

      <Card style={styles.summary}>
        <Text style={styles.label}>Each person owes</Text>
        <Text style={styles.big}>{eur(eachEur)}</Text>
        <Text style={styles.sub}>{sol(eachSol)} · Devnet</Text>
        <Text style={styles.peopleCount}>{names.length} {names.length === 1 ? 'person' : 'people'}</Text>
      </Card>

      <View style={styles.addRow}>
        <Input
          value={nameInput}
          onChangeText={setNameInput}
          placeholder="Add a name…"
          onSubmitEditing={addName}
          style={styles.nameInput}
        />
        <Button title="Add" onPress={addName} style={styles.addBtn} />
      </View>

      {names.map(n => (
        <Card key={n} style={styles.nameCard}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>{n}</Text>
            <TouchableOpacity onPress={() => removeName(n)} style={styles.removeBtn}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}

      {names.length > 0 && (
        <Button
          title={`Open Dashboard  (${names.length} people)`}
          onPress={startDashboard}
          style={styles.startBtn}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 58, gap: 12, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '900', color: colors.text },
  subtitle: { color: colors.muted, marginBottom: 4 },
  summary: { alignItems: 'center', gap: 4 },
  label: { color: colors.muted, fontWeight: '800' },
  big: { fontSize: 38, fontWeight: '900', color: colors.text, marginTop: 4 },
  sub: { color: colors.accent, fontWeight: '800' },
  peopleCount: { color: colors.muted, fontSize: 13, marginTop: 2 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  nameInput: { flex: 1, marginBottom: 0 },
  addBtn: { marginTop: 0, minWidth: 72 },
  nameCard: { paddingVertical: 12 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameText: { fontSize: 17, fontWeight: '700', color: colors.text },
  removeBtn: { paddingVertical: 4, paddingHorizontal: 10 },
  removeText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
  startBtn: { marginTop: 8 },
});
