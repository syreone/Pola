import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors } from '../theme';
import { openSolanaPayUrl, parseSolanaPayUrl, buildSolanaPayUrl } from '../utils/solanaPay';
import { eurToDemoSol } from '../utils/format';
import { useSplitPay } from '../data/SplitPayContext';

export default function SendMoneyScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [payment, setPayment] = useState(null);
  const { addTransaction } = useSplitPay();

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

  const scanSample = () => {
    const sample = buildSolanaPayUrl({ amountSol: eurToDemoSol(12).toFixed(5), message: 'Demo dinner split', memo: 'SplitPay demo' });
    setScanned(true);
    setPayment({ ...parseSolanaPayUrl(sample), rawUrl: sample });
  };

  const pay = async () => {
    if (!payment) return;
    try { await openSolanaPayUrl(payment.rawUrl); } catch (_) {}
    addTransaction({ type: 'sent', title: payment.message || 'Solana Pay', amountEur: Number(payment.amountSol) * 140, amountSol: Number(payment.amountSol), note: `Paid to ${payment.recipient.slice(0, 6)}...` });
    navigation.replace('Success', { title: 'Payment sent', subtitle: 'The Devnet transaction was attempted through a Solana Pay / Phantom-compatible link. Success is mocked for the demo.' });
  };

  if (!permission?.granted) {
    return <View style={styles.container}><Text style={styles.title}>Scan QR</Text><Text style={styles.subtitle}>Camera access is needed to scan Solana Pay QR codes.</Text><Button title="Allow Camera" onPress={requestPermission} /><Button title="Use Demo QR" variant="secondary" onPress={scanSample} style={{ marginTop: 12 }} /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send Money</Text>
      {!payment ? (
        <>
          <View style={styles.cameraWrap}><CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onBarcodeScanned} /></View>
          <Button title="Use Demo QR" variant="secondary" onPress={scanSample} />
        </>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.label}>Recipient</Text><Text style={styles.value}>{payment.recipient}</Text>
          <Text style={styles.label}>Amount</Text><Text style={styles.amount}>{payment.amountSol} SOL</Text>
          <Text style={styles.label}>Note</Text><Text style={styles.value}>{payment.message || 'No note'}</Text>
          <Button title="Pay with Phantom" onPress={pay} style={{ marginTop: 16 }} />
          <Button title="Scan Again" variant="secondary" onPress={() => { setPayment(null); setScanned(false); }} style={{ marginTop: 10 }} />
        </Card>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 58 },
  title: { fontSize: 30, fontWeight: '900', color: colors.text }, subtitle: { color: colors.muted, lineHeight: 21, marginVertical: 14 },
  cameraWrap: { overflow: 'hidden', borderRadius: 26, height: 420, marginVertical: 18, backgroundColor: '#000' }, camera: { flex: 1 },
  card: { marginTop: 20 }, label: { color: colors.muted, fontWeight: '800', marginTop: 12 }, value: { color: colors.text, fontWeight: '700', marginTop: 4 }, amount: { fontSize: 32, color: colors.primary, fontWeight: '900', marginTop: 4 }
});
