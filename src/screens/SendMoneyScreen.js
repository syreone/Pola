import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors } from '../theme';
import { openSolanaPayUrl, parseSolanaPayUrl } from '../utils/solanaPay';
import { useSplitPay } from '../data/SplitPayContext';
import { getBalance } from '../utils/solanaRpc';

export default function SendMoneyScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [payment, setPayment] = useState(null);
  const { addTransaction, walletAddress } = useSplitPay();

  const onBarcodeScanned = ({ data }) => {
    if (scanned) return;
    const parsed = parseSolanaPayUrl(data);
    if (!parsed) {
      Alert.alert('Invalid QR', 'This is not a Solana Pay QR code.');
      return;
    }
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
    navigation.navigate('Success', {
      recipientAddress: payment.recipient,
      senderAddress: walletAddress,
      senderPreTxBalance,
      amountSol: payment.amountSol,
    });
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Scan QR</Text>
        <Text style={styles.subtitle}>Camera access is needed to scan Solana Pay QR codes.</Text>
        <Button title="Allow Camera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send Money</Text>
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
          <Text style={styles.label}>Recipient</Text>
          <Text style={styles.value}>
            <Text style={styles.addrBlue}>{payment.recipient.slice(0, 6)}</Text>
            <Text style={styles.addrMuted}>...</Text>
            <Text style={styles.addrBlue}>{payment.recipient.slice(-6)}</Text>
          </Text>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.amount}>{payment.amountSol} SOL</Text>
          <Text style={styles.label}>Note</Text>
          <Text style={styles.value}>{payment.message || 'No note'}</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 58 },
  title: { fontSize: 30, fontWeight: '900', color: colors.text },
  subtitle: { color: colors.muted, lineHeight: 21, marginVertical: 14 },
  cameraWrap: { overflow: 'hidden', borderRadius: 26, flex: 1, marginVertical: 18, backgroundColor: '#000' },
  camera: { flex: 1 },
  card: { marginTop: 20 },
  label: { color: colors.muted, fontWeight: '800', marginTop: 12 },
  value: { fontWeight: '700', marginTop: 4 },
  addrBlue: { color: colors.primary, fontWeight: '700' },
  addrMuted: { color: colors.muted, fontWeight: '700' },
  amount: { fontSize: 32, color: colors.primary, fontWeight: '900', marginTop: 4 },
  payBtn: { marginTop: 16 },
  rescanBtn: { marginTop: 10 },
});
