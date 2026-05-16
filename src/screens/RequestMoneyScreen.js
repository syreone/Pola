import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors } from '../theme';
import { buildSolanaPayUrl } from '../utils/solanaPay';
import { eurToDemoSol, sol } from '../utils/format';

export default function RequestMoneyScreen({ navigation }) {
  const [amount, setAmount] = useState('10');
  const [note, setNote] = useState('SplitPay request');
  const amountSol = useMemo(() => eurToDemoSol(amount), [amount]);
  const url = useMemo(() => buildSolanaPayUrl({ amountSol: amountSol.toFixed(5), message: note, memo: note }), [amountSol, note]);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Request Money</Text>
      <Text style={styles.subtitle}>Enter an amount, generate a Solana Pay QR, and let your friend pay from Phantom.</Text>
      <Input keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="Amount in EUR" />
      <Input value={note} onChangeText={setNote} placeholder="Note" />
      <Card style={styles.qrCard}>
        <Text style={styles.big}>€{Number(amount || 0).toFixed(2)}</Text>
        <Text style={styles.sub}>{sol(amountSol)} · Devnet demo</Text>
        <QRCode value={url} size={230} />
        <Text style={styles.hint}>Solana Pay URL embedded in QR</Text>
      </Card>
      <Button title="Done" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg }, content: { padding: 20, paddingTop: 58 },
  title: { fontSize: 30, fontWeight: '900', color: colors.text }, subtitle: { color: colors.muted, marginTop: 8, marginBottom: 18, lineHeight: 21 },
  qrCard: { alignItems: 'center', gap: 12, marginBottom: 18 }, big: { fontSize: 38, fontWeight: '900', color: colors.text }, sub: { color: colors.accent, fontWeight: '800' }, hint: { color: colors.muted, marginTop: 4 }
});
