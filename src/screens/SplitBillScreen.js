import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { useSplitPay } from '../data/SplitPayContext';
import { buildSolanaPayUrl } from '../utils/solanaPay';
import { generateReferenceKey } from '../utils/phantom';
import { eurToDemoSol, eur, sol } from '../utils/format';

const MODES = ['divide', 'fixed'];

export default function SplitBillScreen({ navigation }) {
  const { colors } = useTheme();
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
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Split Bill</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Choose a split mode, add names, then open the dashboard.
        </Text>

        <View style={styles.modeRow}>
          {MODES.map(m => (
            <TouchableOpacity
              key={m}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                mode === m && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.modeBtnText, { color: mode === m ? '#fff' : colors.muted }]}>
                {m === 'divide' ? 'Divide Total' : 'Fixed Price'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'divide' ? (
          <Input keyboardType="decimal-pad" value={total} onChangeText={setTotal} placeholder="0.00" />
        ) : (
          <Input keyboardType="decimal-pad" value={pricePerPerson} onChangeText={setPricePerPerson} placeholder="0.00" />
        )}

        <Card style={styles.summary}>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>
            {mode === 'divide' ? 'Each person owes' : 'Price per person'}
          </Text>
          <Text style={[styles.summaryBig, { color: colors.text }]}>{eur(eachEur)}</Text>
          <Text style={[styles.summarySub, { color: colors.accent }]}>{sol(eachSol)} · Devnet</Text>
          {mode === 'fixed' && names.length > 0 && (
            <Text style={[styles.totalLine, { color: colors.primary }]}>
              Total: {eur(computedTotal)} for {count} {count === 1 ? 'person' : 'people'}
            </Text>
          )}
          <Text style={[styles.peopleCount, { color: colors.muted }]}>
            {names.length} {names.length === 1 ? 'person' : 'people'}
          </Text>
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
              <View>
                <Text style={[styles.nameText, { color: colors.text }]}>{n}</Text>
                <Text style={[styles.nameAmount, { color: eachEur > 0 ? colors.text : colors.muted }]}>
                  {eur(eachEur)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeName(n)} style={styles.removeBtn}>
                <Text style={[styles.removeText, { color: colors.danger }]}>Remove</Text>
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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 58, gap: 12, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '900' },
  subtitle: { marginBottom: 4 },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  modeBtnText: { fontWeight: '800' },
  summary: { alignItems: 'center', gap: 4 },
  summaryLabel: { fontWeight: '800' },
  summaryBig: { fontSize: 38, fontWeight: '900', marginTop: 4 },
  summarySub: { fontWeight: '800' },
  totalLine: { fontWeight: '700', fontSize: 14, marginTop: 4 },
  peopleCount: { fontSize: 13, marginTop: 2 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  nameInput: { flex: 1, marginBottom: 0 },
  addBtn: { marginTop: 0, minWidth: 72 },
  nameCard: { paddingVertical: 12 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameText: { fontSize: 17, fontWeight: '700' },
  nameAmount: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  removeBtn: { paddingVertical: 4, paddingHorizontal: 10 },
  removeText: { fontWeight: '700', fontSize: 14 },
  startBtn: { marginTop: 8 },
});
