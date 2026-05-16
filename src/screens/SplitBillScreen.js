import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Modal,
} from 'react-native';
import ConfirmModal from '../components/ConfirmModal';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Card from '../components/Card';
import Button from '../components/Button';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { useSplitPay } from '../data/SplitPayContext';
import { buildSolanaPayUrl } from '../utils/solanaPay';
import { generateReferenceKey } from '../utils/phantom';
import { usdc, mkd } from '../utils/format';
import { fetchRates, toUsdc, FALLBACK_RATES } from '../utils/priceService';

const MODES = ['divide', 'fixed'];

export default function SplitBillScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { walletAddress, activeSplits, startSplit, splitHistory, clearSplitHistory } = useSplitPay();

  const [rates, setRates] = useState(null);
  const [mode, setMode] = useState('divide');
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [people, setPeople] = useState([]);
  const [nameInput, setNameInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const nameRef = useRef(null);
  const amtRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetchRates().then(r => { if (alive) setRates(r); });
    return () => { alive = false; };
  }, []);

  const r = rates ?? FALLBACK_RATES;
  const count = people.length;
  const totalAmt = Number(totalAmount) || 0;

  // All amounts entered in MKD, converted to USDC internally
  const totalUsdc = useMemo(() => {
    if (mode === 'divide') return toUsdc(totalAmt, 'MKD', r);
    return people.reduce((acc, person) => acc + toUsdc(Number(person.amount) || 0, 'MKD', r), 0);
  }, [mode, totalAmt, people, r]);

  const eachUsdc = useMemo(() => {
    if (mode !== 'divide' || count === 0) return 0;
    return totalUsdc / (count + 1);
  }, [mode, totalUsdc, count]);

  const eachMkd = eachUsdc * r.mkdPerUsdc;
  const totalMkd = totalUsdc * r.mkdPerUsdc;

  const recipient = walletAddress || '11111111111111111111111111111111';

  const canGenerate = count >= 1 &&
    (mode === 'divide' ? totalAmt > 0 : people.every(person => Number(person.amount) > 0));

  const handleAdd = () => {
    const name = nameInput.trim();
    if (!name) return;
    if (people.some(existing => existing.name.toLowerCase() === name.toLowerCase())) return;
    if (mode === 'fixed') {
      const amt = Number(amountInput) || 0;
      if (amt <= 0) { amtRef.current?.focus(); return; }
      setPeople(prev => [...prev, { name, amount: amountInput.trim() }]);
      setAmountInput('');
    } else {
      setPeople(prev => [...prev, { name, amount: '' }]);
    }
    setNameInput('');
    nameRef.current?.focus();
  };

  const handleRemove = (name) => setPeople(prev => prev.filter(person => person.name !== name));

  const handleGenerate = () => {
    if (activeSplits.length >= 2) { setShowUpgrade(true); return; }
    const sessionId = `split_${Date.now()}`;
    const participants = people.map(person => {
      const participantUsdc = mode === 'fixed'
        ? toUsdc(Number(person.amount) || 0, 'MKD', r)
        : eachUsdc;
      const referenceKey = generateReferenceKey();
      const payUrl = buildSolanaPayUrl({
        recipient,
        amountUsdc: participantUsdc.toFixed(2),
        label: 'Pola',
        message: `${title ? title + ' — ' : ''}${person.name}`,
        memo: `splitpay-${person.name}`,
        reference: referenceKey,
      });
      return { name: person.name, referenceKey, payUrl, status: 'pending', amountUsdc: participantUsdc };
    });
    startSplit({
      sessionId, totalUsdc, eachUsdc, rates: r,
      originalAmount: totalAmt, originalCurrency: 'MKD',
      mode, title: title.trim(), participants, createdAt: Date.now(),
    });
    navigation.navigate('SplitDashboard', { sessionId });
  };

  const handleClearHistory = () => setShowClearConfirm(true);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Title row with dark mode toggle */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>Split Bill</Text>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTheme(); }}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Add friends, enter amounts in MKD, and generate QR codes.
        </Text>

        {/* Active sessions banner */}
        {activeSplits.length > 0 && (
          <TouchableOpacity
            style={[styles.activeBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('SplitDashboard')}
            activeOpacity={0.75}
          >
            <Text style={[styles.activeBannerText, { color: colors.text }]}>
              {activeSplits.length} active split{activeSplits.length > 1 ? 's' : ''}
            </Text>
            <Text style={[styles.activeBannerLink, { color: colors.primary }]}>View Dashboard →</Text>
          </TouchableOpacity>
        )}

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          {MODES.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, { backgroundColor: colors.card, borderColor: colors.border },
                mode === m && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.modeBtnText, { color: mode === m ? '#fff' : colors.text }]}>
                {m === 'divide' ? 'Divide Total' : 'Fixed Price'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Optional title */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Title (optional)</Text>
          <TextInput
            style={[styles.titleInput, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g Beer at Irish Pub"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
          />
        </View>

        {/* Total amount — Divide mode only */}
        {mode === 'divide' && (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Total Amount (MKD)</Text>
            <TextInput
              style={[styles.bigInput, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
              keyboardType="decimal-pad"
              value={totalAmount}
              onChangeText={setTotalAmount}
              placeholder="0 ден"
              placeholderTextColor={colors.muted}
            />
          </View>
        )}

        {/* Add person row */}
        <View style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.addCardLabel, { color: colors.muted }]}>
            {mode === 'fixed' ? 'Add person & amount (MKD)' : 'Add person'}
          </Text>
          <View style={styles.addRow}>
            <TextInput
              ref={nameRef}
              style={[styles.addNameInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Name"
              placeholderTextColor={colors.muted}
              returnKeyType={mode === 'fixed' ? 'next' : 'done'}
              onSubmitEditing={() => mode === 'fixed' ? amtRef.current?.focus() : handleAdd()}
            />
            {mode === 'fixed' && (
              <TextInput
                ref={amtRef}
                style={[styles.addAmtInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                keyboardType="decimal-pad"
                value={amountInput}
                onChangeText={setAmountInput}
                placeholder="MKD"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
              />
            )}
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={handleAdd} activeOpacity={0.75}>
              <Text style={styles.addBtnText}>ADD</Text>
            </TouchableOpacity>
          </View>
        </View>

        {people.length === 0 && (
          <Text style={[styles.emptyHint, { color: colors.muted }]}>
            Add at least 1 friend to generate QR codes.
          </Text>
        )}

        {/* People list */}
        {people.map(person => {
          const personUsdc = mode === 'fixed' ? toUsdc(Number(person.amount) || 0, 'MKD', r) : eachUsdc;
          const personMkd = mode === 'fixed' ? Number(person.amount) || 0 : eachMkd;
          return (
            <Card key={person.name} style={styles.personCard}>
              <View style={styles.personRow}>
                <View style={styles.personLeft}>
                  <Text style={[styles.personName, { color: colors.text }]}>{person.name}</Text>
                  {mode === 'fixed' ? (
                    <Text style={[styles.personAmt, { color: colors.text }]}>{mkd(personMkd)}</Text>
                  ) : (
                    eachUsdc > 0 && (
                      <Text style={[styles.personAmt, { color: colors.text }]}>{mkd(personMkd)}</Text>
                    )
                  )}
                  {personUsdc > 0 && (
                    <Text style={[styles.personUsdc, { color: colors.primary }]}>{usdc(personUsdc)}</Text>
                  )}
                </View>
                <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(person.name)} activeOpacity={0.75}>
                  <Text style={[styles.removeBtnText, { color: colors.danger }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}

        {/* Preview summary */}
        {count >= 1 && totalUsdc > 0 && (
          <Card style={styles.previewCard}>
            {mode === 'divide' ? (
              <>
                <Text style={[styles.previewLabel, { color: colors.muted }]}>Each friend pays</Text>
                <Text style={[styles.previewMain, { color: colors.text }]}>{mkd(eachMkd)}</Text>
                <Text style={[styles.previewSub, { color: colors.primary }]}>{usdc(eachUsdc)}</Text>
                <Text style={[styles.previewNote, { color: colors.muted }]}>
                  Split between {count + 1} people (you + {count} {count === 1 ? 'friend' : 'friends'})
                  {rates ? '  ·  Live rate' : '  ·  Estimated rate'}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.previewLabel, { color: colors.muted }]}>Total bill</Text>
                <Text style={[styles.previewMain, { color: colors.text }]}>{mkd(totalMkd)}</Text>
                <Text style={[styles.previewSub, { color: colors.primary }]}>{usdc(totalUsdc)}</Text>
                <Text style={[styles.previewNote, { color: colors.muted }]}>
                  {count} {count === 1 ? 'person' : 'people'}
                  {rates ? '  ·  Live rate' : '  ·  Estimated rate'}
                </Text>
              </>
            )}
          </Card>
        )}

        {/* Generate QR — prominent button */}
        <TouchableOpacity
          style={[
            styles.generateBtn,
            canGenerate
              ? { backgroundColor: colors.primary }
              : { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' },
          ]}
          onPress={canGenerate ? handleGenerate : undefined}
          activeOpacity={canGenerate ? 0.8 : 1}
        >
          <Text style={[
            styles.generateBtnText,
            { color: canGenerate ? '#fff' : (isDark ? colors.muted : '#9CA3AF') },
          ]}>
            Generate QR Codes
          </Text>
        </TouchableOpacity>

        {/* Upgrade modal */}
        <Modal visible={showUpgrade} transparent animationType="fade" onRequestClose={() => setShowUpgrade(false)}>
          <TouchableOpacity style={styles.upgradeOverlay} activeOpacity={1} onPress={() => setShowUpgrade(false)}>
            <View style={styles.upgradeBox}>
              <Text style={styles.upgradeEmoji}>🚀</Text>
              <Text style={[styles.upgradeTitle, { color: colors.text }]}>Upgrade to Pro</Text>
              <Text style={[styles.upgradeBody, { color: colors.muted }]}>
                You already have 2 active split sessions.{'\n'}Want to run more simultaneously?
              </Text>
              <Button title="$2.99 / month — Go Pro" onPress={() => setShowUpgrade(false)} style={styles.upgradeProBtn} />
              <TouchableOpacity style={styles.upgradeLater} onPress={() => setShowUpgrade(false)}>
                <Text style={[styles.upgradeLaterText, { color: colors.muted }]}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Split history */}
        {splitHistory.length > 0 && (
          <>
            <View style={styles.historyTitleRow}>
              <Text style={[styles.historyTitle, { color: colors.text }]}>Split History</Text>
              <TouchableOpacity onPress={handleClearHistory}>
                <Text style={[styles.clearHistoryBtn, { color: colors.danger }]}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {splitHistory.map(session => {
              const date = new Date(session.completedAt ?? session.createdAt);
              const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
              const sr = session.rates ?? FALLBACK_RATES;
              const totalMkdH = (session.totalUsdc ?? 0) * sr.mkdPerUsdc;
              return (
                <Card key={session.sessionId} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    {session.title ? (
                      <Text style={[styles.historySessionTitle, { color: colors.text }]}>{session.title}</Text>
                    ) : null}
                    <Text style={[styles.historyDate, { color: colors.muted }]}>{dateStr}</Text>
                    <Text style={[styles.historyMode, { color: colors.muted }]}>
                      {session.mode === 'fixed' ? 'Fixed Price' : 'Divide Total'} · {session.participants.length} {session.participants.length === 1 ? 'person' : 'people'}
                    </Text>
                  </View>
                  <Text style={[styles.historyTotal, { color: colors.text }]}>{mkd(totalMkdH)}</Text>
                  <Text style={[styles.historyTotalSub, { color: colors.primary }]}>{usdc(session.totalUsdc ?? 0)}</Text>
                  <View style={[styles.historyDivider, { backgroundColor: colors.border }]} />
                  {session.participants.map(pt => {
                    const ptUsdc = pt.amountUsdc ?? session.eachUsdc ?? 0;
                    const ptMkd = ptUsdc * sr.mkdPerUsdc;
                    return (
                      <View key={pt.name} style={styles.historyRow}>
                        <Text style={[styles.historyPtName, { color: colors.text }]}>{pt.name}</Text>
                        <View style={styles.historyPtAmts}>
                          <Text style={[styles.historyPtMkd, { color: colors.text }]}>{mkd(ptMkd)}</Text>
                          <Text style={[styles.historyPtUsdc, { color: colors.primary }]}>{usdc(ptUsdc)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>

      <ConfirmModal
        visible={showClearConfirm}
        title="Clear History"
        message="Remove all completed split sessions from history?"
        confirmText="Clear"
        destructive
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={() => { clearSplitHistory(); setShowClearConfirm(false); }}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 58, gap: 14, paddingBottom: 48 },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '900' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  subtitle: { marginBottom: 4 },

  activeBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  activeBannerText: { fontWeight: '700', fontSize: 14 },
  activeBannerLink: { fontWeight: '800', fontSize: 14 },

  modeRow: { flexDirection: 'row', gap: 10 },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  modeBtnText: { fontWeight: '800' },

  field: { gap: 6 },
  fieldLabel: { fontWeight: '700', fontSize: 13, paddingLeft: 4 },
  titleInput: {
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, fontWeight: '600',
  },
  bigInput: {
    borderWidth: 1, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14,
    fontSize: 24, fontWeight: '800',
  },

  addCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  addCardLabel: { fontWeight: '700', fontSize: 13 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addNameInput: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontWeight: '700',
  },
  addAmtInput: {
    width: 90, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, fontWeight: '700', textAlign: 'right',
  },
  addBtn: { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16 },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  emptyHint: { textAlign: 'center', fontSize: 14, fontWeight: '600', marginTop: 4 },

  personCard: { paddingVertical: 12 },
  personRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  personLeft: { flex: 1, gap: 2 },
  personName: { fontSize: 17, fontWeight: '800' },
  personAmt: { fontSize: 15, fontWeight: '800' },
  personUsdc: { fontSize: 12, fontWeight: '700' },
  removeBtn: { borderRadius: 10, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  removeBtnText: { fontWeight: '800', fontSize: 13 },

  previewCard: { alignItems: 'center', gap: 4 },
  previewLabel: { fontWeight: '700', fontSize: 13 },
  previewMain: { fontSize: 38, fontWeight: '900' },
  previewSub: { fontWeight: '700', fontSize: 15 },
  previewNote: { fontSize: 12, marginTop: 4, textAlign: 'center' },

  generateBtn: {
    borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  generateBtnText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.3 },

  upgradeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  upgradeBox: { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', gap: 12, width: '100%' },
  upgradeEmoji: { fontSize: 44 },
  upgradeTitle: { fontSize: 22, fontWeight: '900' },
  upgradeBody: { textAlign: 'center', lineHeight: 22 },
  upgradeProBtn: { width: '100%' },
  upgradeLater: { paddingVertical: 8 },
  upgradeLaterText: { fontWeight: '700' },

  historyTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  historyTitle: { fontSize: 22, fontWeight: '900' },
  clearHistoryBtn: { fontWeight: '800', fontSize: 14 },
  historyCard: { gap: 6 },
  historyHeader: { gap: 2 },
  historySessionTitle: { fontWeight: '900', fontSize: 15 },
  historyDate: { fontWeight: '700', fontSize: 13 },
  historyMode: { fontSize: 12, fontWeight: '600' },
  historyTotal: { fontSize: 28, fontWeight: '900' },
  historyTotalSub: { fontSize: 13, fontWeight: '700', marginTop: -2 },
  historyDivider: { height: 1, marginVertical: 6 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  historyPtName: { fontWeight: '700', fontSize: 14 },
  historyPtAmts: { alignItems: 'flex-end', gap: 1 },
  historyPtMkd: { fontSize: 14, fontWeight: '800' },
  historyPtUsdc: { fontSize: 11, fontWeight: '700' },
});
