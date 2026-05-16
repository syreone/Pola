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

// 'divide' = total ÷ people  |  'fixed' = set price per person
const MODES = ['divide', 'fixed'];

export default function SplitBillScreen({ navigation }) {
  const { walletAddress, startSplit } = useSplitPay();
  const [mode, setMode] = useState('divide');
  const [total, setTotal] = useState('');
  const [pricePerPerson, setPricePerPerson] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [names, setNames] = useState([]);

  const count = Math.max(names.length, 1);

  const eachEur = useMemo(() => {
    if (mode === 'divide') return (Number(total) || 0) / count;
    return Number(pricePerPerson) || 0;
  }, [mode, total, pricePerPerson, count]);

  const computedTotal = useMemo(() => {
    if (mode === 'divide') return Number(total) || 0;
    return eachEur * count;
  }, [mode, total, eachEur, count]);

  const eachSol = useMemo(() => eurToDemoSol(eachEur), [eachEur]);
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
    startSplit({ sessionId: `${Date.now()}`, totalEur: computedTotal, eachSol, participants });
    navigation.navigate('SplitDashboard');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Split Bill</Text>
      <Text style={styles.subtitle}>
        Choose a split mode, add names, then open the dashboard.
      </Text>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        {MODES.map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
              {m === 'divide' ? 'Divide Total' : 'Fixed Price'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'divide' ? (
        <Input
          keyboardType="decimal-pad"
          value={total}
          onChangeText={setTotal}
          placeholder="0.00"
        />
      ) : (
        <Input
          keyboardType="decimal-pad"
          value={pricePerPerson}
          onChangeText={setPricePerPerson}
          placeholder="0.00"
        />
      )}

      {/* Summary card */}
      <Card style={styles.summary}>
        <Text style={styles.label}>
          {mode === 'divide' ? 'Each person owes' : 'Price per person'}
        </Text>
        <Text style={styles.big}>{eur(eachEur)}</Text>
        <Text style={styles.sub}>{sol(eachSol)} · Devnet</Text>
        {mode === 'fixed' && names.length > 0 && (
          <Text style={styles.totalLine}>Total: {eur(computedTotal)} for {count} {count === 1 ? 'person' : 'people'}</Text>
        )}
        <Text style={styles.peopleCount}>
          {names.length} {names.length === 1 ? 'person' : 'people'}
        </Text>
      </Card>

      {/* Add name row */}
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
            <View>
              <Text style={styles.nameText}>{n}</Text>
              <Text style={[styles.nameAmount, eachEur > 0 && styles.nameAmountActive]}>
                {eur(eachEur)}
              </Text>
            </View>
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
  modeRow: { flexDirection: 'row', gap: 10 },
  modeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeBtnText: { fontWeight: '800', color: colors.text },
  modeBtnTextActive: { color: '#fff' },
  summary: { alignItems: 'center', gap: 4 },
  label: { color: colors.muted, fontWeight: '800' },
  big: { fontSize: 38, fontWeight: '900', color: colors.text, marginTop: 4 },
  sub: { color: colors.accent, fontWeight: '800' },
  totalLine: { color: colors.primary, fontWeight: '700', fontSize: 14, marginTop: 4 },
  peopleCount: { color: colors.muted, fontSize: 13, marginTop: 2 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  nameInput: { flex: 1, marginBottom: 0 },
  addBtn: { marginTop: 0, minWidth: 72 },
  nameCard: { paddingVertical: 12 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameText: { fontSize: 17, fontWeight: '700', color: colors.text },
  nameAmount: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 2 },
  nameAmountActive: { color: colors.text },
  removeBtn: { paddingVertical: 4, paddingHorizontal: 10 },
  removeText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
  startBtn: { marginTop: 8 },
});
