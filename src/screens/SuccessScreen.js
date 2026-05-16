import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import { colors } from '../theme';

export default function SuccessScreen({ navigation, route }) {
  const title = route.params?.title || 'Success';
  const subtitle = route.params?.subtitle || 'The payment flow completed.';
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Button title="Back Home" onPress={() => navigation.replace('MainTabs')} />
      </Card>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, justifyContent: 'center' }, card: { alignItems: 'center', gap: 16 },
  check: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }, checkText: { fontSize: 42, color: colors.success, fontWeight: '900' },
  title: { fontSize: 30, fontWeight: '900', color: colors.text, textAlign: 'center' }, subtitle: { color: colors.muted, lineHeight: 22, textAlign: 'center', marginBottom: 8 }
});
