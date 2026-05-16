import React, { useMemo, useState } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { buildSolanaPayUrl } from '../utils/solanaPay';
import { eurToDemoSol, sol } from '../utils/format';
import { useSplitPay } from '../data/SplitPayContext';

export default function RequestMoneyScreen({ navigation }) {
  const { colors } = useTheme();
  const { walletAddress } = useSplitPay();
  const [amount, setAmount] = useState('10');
  const [note, setNote] = useState('SplitPay request');

  const amountSol = useMemo(() => eurToDemoSol(amount), [amount]);
  const url = useMemo(
    () => buildSolanaPayUrl({ recipient: walletAddress, amountSol: amountSol.toFixed(5), message: note, memo: note }),
    [walletAddress, amountSol, note]
  );

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Request Money</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Set an amount, show the QR to your friend, and you'll be notified when payment arrives.
        </Text>

        <Input keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="Amount in EUR" />
        <Input value={note} onChangeText={setNote} placeholder="Note" />

        <Card style={styles.qrCard}>
          <Text style={[styles.big, { color: colors.text }]}>€{Number(amount || 0).toFixed(2)}</Text>
          <Text style={[styles.sub, { color: colors.accent }]}>{sol(amountSol)} · Devnet</Text>
          <QRCode value={url || 'https://splitpay.demo'} size={220} />
          <Text style={[styles.hint, { color: colors.muted }]}>Friend scans this with Phantom to pay you</Text>
        </Card>

        <Button title="Close" onPress={() => navigation.goBack()} variant="secondary" />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 58, paddingBottom: 32 },
  title: { fontSize: 30, fontWeight: '900' },
  subtitle: { marginTop: 8, marginBottom: 18, lineHeight: 21 },
  qrCard: { alignItems: 'center', gap: 12, marginBottom: 18 },
  big: { fontSize: 38, fontWeight: '900' },
  sub: { fontWeight: '800' },
  hint: { marginTop: 4, textAlign: 'center' },
});
