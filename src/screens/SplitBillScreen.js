import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Modal,
} from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import ScreenBackground from '../components/ScreenBackground';
import { useTheme } from '../context/ThemeContext';
import { useSplitPay } from '../data/SplitPayContext';
import { buildSolanaPayUrl } from '../utils/solanaPay';
import { generateReferenceKey } from '../utils/phantom';
import { eur, mkd, sol } from '../utils/format';
import { fetchPrices, toSol, FALLBACK_PRICES } from '../utils/priceService';

const CURRENCIES = ['EUR', 'MKD', 'SOL'];
const MODES = ['divide', 'fixed'];

export default function SplitBillScreen({ navigation }) {
  const { colors } = useTheme();
  const { walletAddress, activeSplits, startSplit, splitHistory } = useSplitPay();

  const [prices, setPrices] = useState(null);
  const [currency, setCurrency] = useState('EUR');
  const [mode, setMode] = useState('divide');
  const [totalAmount, setTotalAmount] = useState('');
  const [people, setPeople] = useState([]);
  const [nameInput, setNameInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);

  const nameRef = useRef(null);
  const amtRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetchPrices().then(p => { if (alive) setPrices(p); });
    return () => { alive = false; };
  }, []);

  const p = prices ?? FALLBACK_PRICES;
  const count = people.length;
  const totalAmt = Number(totalAmount) || 0;

  const totalSol = useMemo(() => {
    if (mode === 'divide') return toSol(totalAmt, currency, p);
    return people.reduce((acc, person) => acc + toSol(Number(person.amount) || 0, currency, p), 0);
  }, [mode, totalAmt, currency, people, p]);

  const eachSol = useMemo(() => {
    if (mode !== 'divide' || count === 0) return 0;
    return totalSol / count;
  }, [mode, totalSol, count]);

  const eachEur = eachSol * p.solInEur;
  const eachMkd = eachSol * p.solInMkd;
  const totalEur = totalSol * p.solInEur;
  const totalMkd = totalSol * p.solInMkd;

  const recipient = walletAddress || '11111111111111111111111111111111';

  const canGenerate = count >= 2 &&
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
      const participantSol = mode === 'fixed'
        ? toSol(Number(person.amount) || 0, currency, p)
        : eachSol;
      const referenceKey = generateReferenceKey();
      const payUrl = buildSolanaPayUrl({
        recipient,
        amountSol: participantSol.toFixed(5),
        label: 'SplitPay',
        message: `Split bill — ${person.name}`,
        memo: `splitpay-${person.name}`,
        reference: referenceKey,
      });
      return { name: person.name, referenceKey, payUrl, status: 'pending', amountSol: participantSol };
    });
    startSplit({ sessionId, totalSol, eachSol, prices: p, originalAmount: totalAmt, originalCurrency: currency, mode, participants, createdAt: Date.now() });
    navigation.navigate('SplitDashboard', { sessionId });
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>Split Bill</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Choose a currency and mode, add names, then generate QR codes.
        </Text>

        {/* Active sessions banner */}
        {activeSplits.length > 0 && (
          <TouchableOpacity
            style={[styles.activeBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('SplitDashboard', { sessionId: activeSplits[0].sessionId })}
            activeOpacity={0.75}
          >
            <Text style={[styles.activeBannerText, { color: colors.text }]}>
              {activeSplits.length} active split{activeSplits.length > 1 ? 's' : ''}
            </Text>
            <Text style={[styles.activeBannerLink, { color: colors.primary }]}>View Dashboard →</Text>
          </TouchableOpacity>
        )}

        {/* Currency selector */}
        <View style={styles.tabRow}>
          {CURRENCIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.tab, { backgroundColor: colors.card, borderColor: colors.border },
                currency === c && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setCurrency(c)}
            >
              <Text style={[styles.tabText, { color: currency === c ? '#fff' : colors.text }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

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

        {/* Total amount — Divide mode only */}
        {mode === 'divide' && (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Total Amount ({currency})</Text>
            <TextInput
              style={[styles.bigInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
              keyboardType="decimal-pad"
              value={totalAmount}
              onChangeText={setTotalAmount}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
            />
          </View>
        )}

        {/* Add person row */}
        <View style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.addCardLabel, { color: colors.muted }]}>
            {mode === 'fixed' ? 'Add person & amount' : 'Add person'}
          </Text>
          <View style={styles.addRow}>
            <TextInput
              ref={nameRef}
              style={[styles.addNameInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter name here"
              placeholderTextColor={colors.muted}
              returnKeyType={mode === 'fixed' ? 'next' : 'done'}
              onSubmitEditing={() => mode === 'fixed' ? amtRef.current?.focus() : handleAdd()}
            />
            {mode === 'fixed' && (
              <TextInput
                ref={amtRef}
                style={[styles.addAmtInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                keyboardType="decimal-pad"
                value={amountInput}
                onChangeText={setAmountInput}
                placeholder={currency}
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
            Add at least 2 people to generate QR codes.
          </Text>
        )}

        {/* People list */}
        {people.map(person => {
          const personSol = mode === 'fixed' ? toSol(Number(person.amount) || 0, currency, p) : eachSol;
          const personEur = personSol * p.solInEur;
          const personMkd = personSol * p.solInMkd;
          return (
            <Card key={person.name} style={styles.personCard}>
              <View style={styles.personRow}>
                <View style={styles.personLeft}>
                  <Text style={[styles.personName, { color: colors.text }]}>{person.name}</Text>
                  {mode === 'fixed' ? (
                    <Text style={[styles.personAmt, { color: colors.accent }]}>{currency} {person.amount}</Text>
                  ) : (
                    eachSol > 0 && (
                      <Text style={[styles.personAmt, { color: colors.accent }]}>{eur(personEur)}  ·  {mkd(personMkd)}</Text>
                    )
                  )}
                </View>
                <View style={styles.personRight}>
                  {personSol > 0 && <Text style={[styles.personSol, { color: colors.muted }]}>{sol(personSol)}</Text>}
                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(person.name)} activeOpacity={0.75}>
                    <Text style={[styles.removeBtnText, { color: colors.danger }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        })}

        {/* Preview summary */}
        {count >= 2 && totalSol > 0 && (
          <Card style={styles.previewCard}>
            {mode === 'divide' ? (
              <>
                <Text style={[styles.previewLabel, { color: colors.muted }]}>Each person pays</Text>
                <Text style={[styles.previewMain, { color: colors.text }]}>{eur(eachEur)}</Text>
                <Text style={[styles.previewSub, { color: colors.accent }]}>{mkd(eachMkd)}  ·  {sol(eachSol)}</Text>
              </>
            ) : (
              <>
                <Text style={[styles.previewLabel, { color: colors.muted }]}>Total bill</Text>
                <Text style={[styles.previewMain, { color: colors.text }]}>{eur(totalEur)}</Text>
                <Text style={[styles.previewSub, { color: colors.accent }]}>{mkd(totalMkd)}  ·  {sol(totalSol)}</Text>
              </>
            )}
            <Text style={[styles.previewNote, { color: colors.muted }]}>
              {count} {count === 1 ? 'person' : 'people'}
              {prices ? '  ·  Live rate · CoinGecko' : '  ·  Estimated rate'}
            </Text>
          </Card>
        )}

        <Button
          title="Generate QR Codes"
          onPress={canGenerate ? handleGenerate : undefined}
          variant={canGenerate ? 'primary' : 'secondary'}
          style={!canGenerate && styles.btnDisabled}
        />

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
            <Text style={[styles.historyTitle, { color: colors.text }]}>Split History</Text>
            {splitHistory.map(session => {
              const date = new Date(session.completedAt ?? session.createdAt);
              const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
              const sp = session.prices ?? FALLBACK_PRICES;
              const totalEurH = session.totalSol * sp.solInEur;
              const totalMkdH = session.totalSol * sp.solInMkd;
              return (
                <Card key={session.sessionId} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={[styles.historyDate, { color: colors.text }]}>{dateStr}</Text>
                    <Text style={[styles.historyMode, { color: colors.muted }]}>
                      {session.mode === 'fixed' ? 'Fixed Price' : 'Divide Total'} · {session.participants.length} people
                    </Text>
                  </View>
                  <Text style={[styles.historyTotal, { color: colors.text }]}>{eur(totalEurH)}</Text>
                  <Text style={[styles.historyTotalSub, { color: colors.accent }]}>{mkd(totalMkdH)}  ·  {sol(session.totalSol)}</Text>
                  <View style={[styles.historyDivider, { backgroundColor: colors.border }]} />
                  {session.participants.map(pt => {
                    const ptSol = pt.amountSol ?? session.eachSol;
                    const ptEur = ptSol * sp.solInEur;
                    return (
                      <View key={pt.name} style={styles.historyRow}>
                        <Text style={[styles.historyPtName, { color: colors.text }]}>{pt.name}</Text>
                        <View style={styles.historyPtAmts}>
                          <Text style={[styles.historyPtEur, { color: colors.text }]}>{eur(ptEur)}</Text>
                          <Text style={[styles.historyPtSol, { color: colors.muted }]}>{sol(ptSol)}</Text>
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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 58, gap: 14, paddingBottom: 48 },
  title: { fontSize: 30, fontWeight: '900' },
  subtitle: { marginBottom: 4 },

  activeBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  activeBannerText: { fontWeight: '700', fontSize: 14 },
  activeBannerLink: { fontWeight: '800', fontSize: 14 },

  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  tabText: { fontWeight: '800', fontSize: 13 },

  modeRow: { flexDirection: 'row', gap: 10 },
  modeBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  modeBtnText: { fontWeight: '800' },

  field: { gap: 6 },
  fieldLabel: { fontWeight: '700', fontSize: 13, paddingLeft: 4 },
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
  personLeft: { flex: 1, gap: 3 },
  personName: { fontSize: 17, fontWeight: '800' },
  personAmt: { fontSize: 13, fontWeight: '700' },
  personRight: { alignItems: 'flex-end', gap: 6 },
  personSol: { fontSize: 13, fontWeight: '800' },
  removeBtn: { borderRadius: 10, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  removeBtnText: { fontWeight: '800', fontSize: 13 },

  previewCard: { alignItems: 'center', gap: 4 },
  previewLabel: { fontWeight: '700', fontSize: 13 },
  previewMain: { fontSize: 38, fontWeight: '900' },
  previewSub: { fontWeight: '800', fontSize: 15 },
  previewNote: { fontSize: 12, marginTop: 4 },

  btnDisabled: { opacity: 0.45 },

  upgradeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  upgradeBox: { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', gap: 12, width: '100%' },
  upgradeEmoji: { fontSize: 44 },
  upgradeTitle: { fontSize: 22, fontWeight: '900' },
  upgradeBody: { textAlign: 'center', lineHeight: 22 },
  upgradeProBtn: { width: '100%' },
  upgradeLater: { paddingVertical: 8 },
  upgradeLaterText: { fontWeight: '700' },

  historyTitle: { fontSize: 22, fontWeight: '900', marginTop: 8 },
  historyCard: { gap: 6 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyDate: { fontWeight: '800', fontSize: 14 },
  historyMode: { fontSize: 12, fontWeight: '700' },
  historyTotal: { fontSize: 28, fontWeight: '900' },
  historyTotalSub: { fontSize: 13, fontWeight: '700', marginTop: -2 },
  historyDivider: { height: 1, marginVertical: 6 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  historyPtName: { fontWeight: '700', fontSize: 14 },
  historyPtAmts: { alignItems: 'flex-end', gap: 1 },
  historyPtEur: { fontSize: 14, fontWeight: '800' },
  historyPtSol: { fontSize: 11, fontWeight: '700' },
});
