import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import ConfirmModal from '../components/ConfirmModal';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Button from '../components/Button';
import Card from '../components/Card';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { openSolanaPayUrl, parseSolanaPayUrl } from '../utils/solanaPay';
import { useSplitPay } from '../data/SplitPayContext';
import { getUsdcBalance } from '../utils/solanaRpc';
import { mkd, usdc } from '../utils/format';
import { FALLBACK_RATES } from '../utils/priceService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const QR_SIZE = SCREEN_WIDTH - 48; // square, full-width minus padding

export default function SendMoneyScreen({ navigation }) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [payment, setPayment] = useState(null);
  const [showInvalidQR, setShowInvalidQR] = useState(false);
  const { addTransaction, walletAddress, triggerNotification } = useSplitPay();

  const onBarcodeScanned = ({ data }) => {
    if (scanned) return;
    const parsed = parseSolanaPayUrl(data);
    if (!parsed) {
      setShowInvalidQR(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanned(true);
    setPayment({ ...parsed, rawUrl: data });
  };

  const pay = async () => {
    if (!payment) return;
    let senderPreTxBalance = null;
    try { senderPreTxBalance = await getUsdcBalance(walletAddress); } catch (_) {}
    try { await openSolanaPayUrl(payment.rawUrl); } catch (_) {}
    const amountUsdc = Number(payment.amountUsdc) || 0;
    addTransaction({
      type: 'sent',
      title: payment.message || 'USDC Payment',
      amountUsdc,
      amountMkd: amountUsdc * FALLBACK_RATES.mkdPerUsdc,
      note: 'Payment sent',
      recipientAddress: payment.recipient,
    });
    triggerNotification({
      type: 'sent',
      recipientAddress: payment.recipient,
      senderAddress: walletAddress,
      senderPreTxBalance,
      amountUsdc,
    });
    setPayment(null);
    setScanned(false);
  };

  if (!permission?.granted) {
    return (
      <ScreenBackground>
        <View style={styles.permContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Scan QR</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Camera access is needed to scan payment QR codes.
          </Text>
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
          <>
            <Text style={[styles.contextText, { color: colors.muted }]}>
              Point your camera at a Pola QR code to send USDC to a friend.
            </Text>
            <View style={[styles.cameraWrap, { width: QR_SIZE, height: QR_SIZE }]}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={onBarcodeScanned}
              />
              {/* Corner markers for visual framing */}
              <View style={[styles.corner, styles.topLeft, { borderColor: colors.primary }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: colors.primary }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary }]} />
            </View>
            <Text style={[styles.scanHint, { color: colors.muted }]}>
              Align the QR code inside the frame
            </Text>
            <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
          </>
        ) : (
          <Card style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.muted }]}>Payment Details</Text>
            <Text style={[styles.label, { color: colors.muted }]}>Recipient</Text>
            <Text style={styles.value}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{payment.recipient.slice(0, 6)}</Text>
              <Text style={{ color: colors.muted, fontWeight: '700' }}>...</Text>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{payment.recipient.slice(-6)}</Text>
            </Text>
            <Text style={[styles.label, { color: colors.muted }]}>Amount</Text>
            <Text style={[styles.amountMkd, { color: colors.text }]}>
              {mkd(Number(payment.amountUsdc) * FALLBACK_RATES.mkdPerUsdc)}
            </Text>
            <Text style={[styles.amountUsdc, { color: colors.primary }]}>{payment.amountUsdc} USDC</Text>
            {!!payment.message && (
              <>
                <Text style={[styles.label, { color: colors.muted }]}>Note</Text>
                <Text style={[styles.value, { color: colors.text }]}>{payment.message}</Text>
              </>
            )}
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

      <ConfirmModal
        visible={showInvalidQR}
        title="Invalid QR"
        message="This is not a valid Pola QR code."
        confirmText="OK"
        onConfirm={() => setShowInvalidQR(false)}
      />
    </ScreenBackground>
  );
}

const CORNER = 22;
const BORDER = 3;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 58, gap: 16, alignItems: 'center' },
  permContainer: { flex: 1, padding: 20, paddingTop: 58, gap: 16 },
  title: { fontSize: 30, fontWeight: '900', alignSelf: 'flex-start' },
  contextText: { alignSelf: 'flex-start', lineHeight: 21, fontSize: 14 },
  scanHint: { fontSize: 13, fontWeight: '600' },
  cameraWrap: { overflow: 'hidden', borderRadius: 18, backgroundColor: '#000', position: 'relative' },
  camera: { flex: 1 },

  // Corner markers
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderWidth: BORDER },
  topLeft: { top: 12, left: 12, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  topRight: { top: 12, right: 12, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bottomLeft: { bottom: 12, left: 12, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  bottomRight: { bottom: 12, right: 12, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },

  card: { width: '100%', gap: 4 },
  cardTitle: { fontWeight: '800', fontSize: 13, marginBottom: 8 },
  label: { fontWeight: '800', marginTop: 10, fontSize: 13 },
  value: { fontWeight: '700', marginTop: 2 },
  amountMkd: { fontSize: 32, fontWeight: '900', marginTop: 2 },
  amountUsdc: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  payBtn: { marginTop: 16 },
  rescanBtn: { marginTop: 8 },
});
