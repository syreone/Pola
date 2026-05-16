import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Button from '../components/Button';
import Card from '../components/Card';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { openSolanaPayUrl, parseSolanaPayUrl } from '../utils/solanaPay';
import { useSplitPay } from '../data/SplitPayContext';
import { getBalance } from '../utils/solanaRpc';

export default function SendMoneyScreen({ navigation }) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [payment, setPayment] = useState(null);
  const { addTransaction, walletAddress, triggerNotification } = useSplitPay();

  const onBarcodeScanned = ({ data }) => {
    if (scanned) return;
    const parsed = parseSolanaPayUrl(data);
    if (!parsed) {
      Alert.alert('Invalid QR', 'This is not a Solana Pay QR code.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanned(true);
    setPayment({ ...parsed, rawUrl: data });
  };

  const pay = async () => {
    if (!payment) return;
    let senderPreTxBalance = null;
    try { senderPreTxBalance = await getBalance(walletAddress); } catch (_) {}
    try { await openSolanaPayUrl(payment.rawUrl); } catch (_) {}
    addTransaction({
      type: 'sent',
      title: payment.message || 'Solana Pay',
      amountEur: Number(payment.amountSol) * 140,
      amountSol: Number(payment.amountSol),
      note: 'Payment sent',
      recipientAddress: payment.recipient,
    });
    triggerNotification({
      type: 'sent',
      recipientAddress: payment.recipient,
      senderAddress: walletAddress,
      senderPreTxBalance,
      amountSol: payment.amountSol,
    });
    setPayment(null);
    setScanned(false);
  };

  if (!permission?.granted) {
    return (
      <ScreenBackground>
        <View style={styles.permContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Scan QR</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Camera access is needed to scan Solana Pay QR codes.</Text>
          <Button title="Allow Camera" onPress={requestPermission} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Send Money</Text>
        {!payment ? (
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={onBarcodeScanned}
            />
          </View>
        ) : (
          <Card style={styles.card}>
            <Text style={[styles.label, { color: colors.muted }]}>Recipient</Text>
            <Text style={styles.value}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{payment.recipient.slice(0, 6)}</Text>
              <Text style={{ color: colors.muted, fontWeight: '700' }}>...</Text>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{payment.recipient.slice(-6)}</Text>
            </Text>
            <Text style={[styles.label, { color: colors.muted }]}>Amount</Text>
            <Text style={[styles.amount, { color: colors.primary }]}>{payment.amountSol} SOL</Text>
            <Text style={[styles.label, { color: colors.muted }]}>Note</Text>
            <Text style={[styles.value, { color: colors.text }]}>{payment.message || 'No note'}</Text>
            <Button title="Pay with Phantom" onPress={pay} style={styles.payBtn} />
            <Button
              title="Scan Again"
              variant="secondary"
              onPress={() => { setPayment(null); setScanned(false); }}
              style={styles.rescanBtn}
            />
          </Card>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 58 },
  permContainer: { flex: 1, padding: 20, paddingTop: 58 },
  title: { fontSize: 30, fontWeight: '900' },
  subtitle: { lineHeight: 21, marginVertical: 14 },
  cameraWrap: { overflow: 'hidden', borderRadius: 26, flex: 1, marginVertical: 18, backgroundColor: '#000' },
  camera: { flex: 1 },
  card: { marginTop: 20 },
  label: { fontWeight: '800', marginTop: 12 },
  value: { fontWeight: '700', marginTop: 4 },
  amount: { fontSize: 32, fontWeight: '900', marginTop: 4 },
  payBtn: { marginTop: 16 },
  rescanBtn: { marginTop: 10 },
});
