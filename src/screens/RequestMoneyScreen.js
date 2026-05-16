import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { buildSolanaPayUrl } from '../utils/solanaPay';
import { usdc, mkd } from '../utils/format';
import { fetchRates, FALLBACK_RATES } from '../utils/priceService';
import { useSplitPay } from '../data/SplitPayContext';

export default function RequestMoneyScreen({ navigation }) {
  const { colors } = useTheme();
  const { walletAddress } = useSplitPay();
  const [amountMkd, setAmountMkd] = useState('');
  const [note, setNote] = useState('');
  const [rates, setRates] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchRates().then(r => { if (alive) setRates(r); });
    return () => { alive = false; };
  }, []);

  const r = rates ?? FALLBACK_RATES;
  const mkdValue = Number(amountMkd || 0);
  const usdcValue = r.mkdPerUsdc > 0 ? mkdValue / r.mkdPerUsdc : 0;

  const url = useMemo(
    () => buildSolanaPayUrl({ recipient: walletAddress, amountUsdc: usdcValue.toFixed(2), message: note, memo: note }),
    [walletAddress, usdcValue, note]
  );

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Request Money</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Set an amount, show the QR to your friend, and you'll be notified when payment arrives.
        </Text>

        <Input
          keyboardType="decimal-pad"
          value={amountMkd}
          onChangeText={setAmountMkd}
          placeholder="Amount in MKD"
        />
        <Input value={note} onChangeText={setNote} placeholder="Note (optional)" />

        <Card style={styles.qrCard}>
          {/* MKD primary — large black */}
          <Text style={[styles.bigMkd, { color: colors.text }]}>{mkd(mkdValue)}</Text>
          {/* USDC secondary — small blue */}
          <Text style={[styles.subUsdc, { color: colors.primary }]}>{usdc(usdcValue)}</Text>

          <View style={styles.qrWrap}>
            <QRCode value={url || 'https://splitpay.demo'} size={220} />
          </View>
          <Text style={[styles.hint, { color: colors.muted }]}>Friend scans this with Phantom to pay you</Text>
        </Card>

        <Button title="Close" onPress={() => navigation.goBack()} variant="secondary" />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 58, paddingBottom: 32, gap: 16 },
  title: { fontSize: 30, fontWeight: '900' },
  subtitle: { lineHeight: 21 },
  qrCard: { alignItems: 'center', gap: 8, paddingVertical: 24, paddingHorizontal: 20 },
  bigMkd: { fontSize: 42, fontWeight: '900', letterSpacing: -1 },
  subUsdc: { fontSize: 16, fontWeight: '700' },
  qrWrap: { alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: 12 },
  hint: { textAlign: 'center', lineHeight: 20 },
});
