import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal } from 'react-native';
import BlurOverlay from '../components/BlurOverlay';
import QRCode from 'react-native-qrcode-svg';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors } from '../theme';
import { buildSolanaPayUrl } from '../utils/solanaPay';
import { eurToDemoSol, sol } from '../utils/format';
import { useSplitPay } from '../data/SplitPayContext';
import { getBalance, getRecentSender } from '../utils/solanaRpc';

const POLL_MS = 3000;

export default function RequestMoneyScreen({ navigation }) {
  const { walletAddress, addTransaction, refreshBalance } = useSplitPay();
  const [amount, setAmount] = useState('10');
  const [note, setNote] = useState('SplitPay request');
  const [received, setReceived] = useState(null);
  const baselineRef = useRef(null);
  const pollRef = useRef(null);

  const amountSol = useMemo(() => eurToDemoSol(amount), [amount]);
  const url = useMemo(
    () => buildSolanaPayUrl({ recipient: walletAddress, amountSol: amountSol.toFixed(5), message: note, memo: note }),
    [walletAddress, amountSol, note]
  );

  useEffect(() => {
    if (!walletAddress) return;
    getBalance(walletAddress).then(b => { baselineRef.current = b; }).catch(() => {});

    pollRef.current = setInterval(async () => {
      if (received) return;
      try {
        const current = await getBalance(walletAddress);
        if (baselineRef.current !== null && current > baselineRef.current) {
          const diff = current - baselineRef.current;
          clearInterval(pollRef.current);
          const senderAddr = await getRecentSender(walletAddress);
          addTransaction({
            type: 'received',
            title: note || 'Payment received',
            amountEur: diff * 140,
            amountSol: diff,
            note: 'Payment received',
            senderAddress: senderAddr || null,
            recipientAddress: walletAddress,
          });
          refreshBalance();
          setReceived({ amountSol: diff, newBalance: current });
        }
      } catch { /* silent */ }
    }, POLL_MS);

    return () => clearInterval(pollRef.current);
  }, [walletAddress]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Request Money</Text>
      <Text style={styles.subtitle}>
        Set an amount, show the QR to your friend, and you'll be notified when payment arrives.
      </Text>

      <Input keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="Amount in EUR" />
      <Input value={note} onChangeText={setNote} placeholder="Note" />

      <Card style={styles.qrCard}>
        <Text style={styles.big}>€{Number(amount || 0).toFixed(2)}</Text>
        <Text style={styles.sub}>{sol(amountSol)} · Devnet</Text>
        <QRCode value={url || 'https://splitpay.demo'} size={230} />
        <Text style={styles.hint}>Friend scans this with Phantom to pay you</Text>
      </Card>

      <Button title="Close" onPress={() => navigation.goBack()} variant="secondary" />

      <Modal visible={!!received} transparent animationType="fade">
        <BlurOverlay style={styles.overlay}>
          <Card style={styles.modal}>
            <View style={styles.checkCircle}>
              <Text style={styles.checkText}>✓</Text>
            </View>
            <Text style={styles.modalTitle}>Payment Received!</Text>
            <Text style={styles.modalAmount}>+{sol(received?.amountSol)}</Text>
            <Text style={styles.modalSub}>≈ €{((received?.amountSol || 0) * 140).toFixed(2)}</Text>
            <Text style={styles.modalNote}>Confirmed on Solana Devnet</Text>
            <Button
              title="Done"
              onPress={() => { setReceived(null); navigation.goBack(); }}
              style={styles.modalBtn}
            />
          </Card>
        </BlurOverlay>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 58, paddingBottom: 32 },
  title: { fontSize: 30, fontWeight: '900', color: colors.text },
  subtitle: { color: colors.muted, marginTop: 8, marginBottom: 18, lineHeight: 21 },
  qrCard: { alignItems: 'center', gap: 12, marginBottom: 18 },
  big: { fontSize: 38, fontWeight: '900', color: colors.text },
  sub: { color: colors.accent, fontWeight: '800' },
  hint: { color: colors.muted, marginTop: 4, textAlign: 'center' },
  overlay: { flex: 1, justifyContent: 'center', padding: 24 },
  modal: { alignItems: 'center', gap: 10 },
  checkCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: 36, color: colors.success, fontWeight: '900' },
  modalTitle: { fontSize: 24, fontWeight: '900', color: colors.text },
  modalAmount: { fontSize: 32, fontWeight: '900', color: colors.success },
  modalSub: { color: colors.muted, fontWeight: '700' },
  modalNote: { color: colors.accent, fontWeight: '700' },
  modalBtn: { width: '100%', marginTop: 8 },
});
