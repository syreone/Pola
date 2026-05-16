import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import * as Linking from 'expo-linking';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { useSplitPay } from '../data/SplitPayContext';

const STORE_URL = Platform.OS === 'ios'
  ? 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977'
  : 'https://play.google.com/store/apps/details?id=app.phantom';

const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Play Store';

export default function ConnectWalletScreen({ navigation }) {
  const { colors } = useTheme();
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
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / headline */}
          <View style={styles.hero}>
            <Text style={[styles.logo, { color: colors.primary }]}>SplitPay</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Split bills with friends on Solana Devnet.{'\n'}Connect your Phantom wallet to get started.
            </Text>
          </View>

          {/* Card */}
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Connect Wallet</Text>

            <View style={styles.cardDivider} />

            <Button title="Open Phantom" onPress={openPhantom} />

            <Text style={[styles.hint, { color: colors.muted }]}>
              Open Phantom → copy your address → paste below
            </Text>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              onPress={() => setShowManual(!showManual)}
              style={styles.toggleRow}
            >
              <Text style={[styles.toggle, { color: colors.primary }]}>
                {showManual ? 'Hide address input ▲' : 'Paste wallet address ▼'}
              </Text>
            </TouchableOpacity>

            {showManual && (
              <View style={styles.manualSection}>
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

          {/* Footer */}
          <Text style={[styles.footer, { color: colors.muted }]}>
            Need Phantom?{' '}
            <Text
              style={{ color: colors.primary, fontWeight: '700' }}
              onPress={() => Linking.openURL(STORE_URL)}
            >
              Head to the {STORE_NAME}
            </Text>
            {' '}to install it for free.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 72,
    paddingBottom: 48,
  },
  hero: {
    marginBottom: 28,
  },
  logo: {
    fontSize: 44,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  cardDivider: {
    height: 16,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 12,
  },
  separator: {
    height: 1,
    marginVertical: 16,
  },
  toggleRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggle: {
    fontWeight: '700',
    fontSize: 14,
  },
  manualSection: {
    marginTop: 14,
  },
  fieldInput: {
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  footer: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
});
