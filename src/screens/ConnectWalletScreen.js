import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import * as Linking from 'expo-linking';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { colors } from '../theme';
import { useSplitPay } from '../data/SplitPayContext';

const STORE_URL = Platform.OS === 'ios'
  ? 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977'
  : 'https://play.google.com/store/apps/details?id=app.phantom';

const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Play Store';

export default function ConnectWalletScreen({ navigation }) {
  const { walletAddress, setWalletManually } = useSplitPay();
  const [showManual, setShowManual] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [manualName, setManualName] = useState('');

  useEffect(() => {
    if (walletAddress) navigation.replace('MainTabs');
  }, [walletAddress]);

  const openPhantom = () => Linking.openURL('phantom://');

  const confirmManual = () => {
    const trimmed = manualAddress.trim();
    if (trimmed.length >= 32) {
      setWalletManually(trimmed, manualName.trim() || null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>SplitPay</Text>
        <Text style={styles.subtitle}>
          Split bills with friends on Solana Devnet. Connect your Phantom wallet to receive payments.
        </Text>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Connect Wallet</Text>

          <Button title="Open Phantom" onPress={openPhantom} />
          <Text style={styles.hint}>
            Open Phantom → copy your wallet address → paste it below
          </Text>

          <TouchableOpacity onPress={() => setShowManual(!showManual)}>
            <Text style={styles.toggle}>
              {showManual ? 'Hide address input ▲' : 'Paste wallet address ▼'}
            </Text>
          </TouchableOpacity>

          {showManual && (
            <View style={styles.manualRow}>
              <Input
                value={manualName}
                onChangeText={setManualName}
                placeholder="Your name (optional)"
                autoCorrect={false}
                style={styles.fieldInput}
              />
              <Input
                value={manualAddress}
                onChangeText={setManualAddress}
                placeholder="Your Solana wallet address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.fieldInput}
              />
              <Button title="Connect" onPress={confirmManual} />
            </View>
          )}
        </Card>

        <Text style={styles.footer}>
          Need Phantom?{' '}
          <Text style={styles.storeLink} onPress={() => Linking.openURL(STORE_URL)}>
            Head to the {STORE_NAME}
          </Text>
          {' '}to install it for free.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1, padding: 24,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  logo: { fontSize: 42, fontWeight: '900', color: colors.primary, marginBottom: 8 },
  subtitle: { color: colors.muted, fontSize: 17, lineHeight: 24, marginBottom: 24 },
  card: { gap: 12 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  toggle: { color: colors.primary, fontWeight: '700', textAlign: 'center', paddingVertical: 4 },
  manualRow: { gap: 8 },
  fieldInput: { marginBottom: 0 },
  footer: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 20, lineHeight: 20 },
  storeLink: { color: colors.primary, fontWeight: '700' },
});
