import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, KeyboardAvoidingView, ScrollView, Image,
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
  const { colors, isDark } = useTheme();
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
          <View style={styles.hero}>
            <Image
              source={isDark
                ? require('../../assets/pola-logo-dark.png')
                : require('../../assets/pola-logo-light.png')}
              style={styles.logoImage}
              resizeMode="contain"
              fadeDuration={0}
            />
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
                  placeholder="Your wallet address"
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
    paddingTop: 40,
    paddingBottom: 32,
  },
  hero: {
    marginBottom: 12,
    alignItems: 'center',
    width: '100%',
  },
  logoImage: {
    width: '100%',
    height: 240,
    marginBottom: 4,
    backgroundColor: 'transparent',
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
