import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { initialTransactions } from './mockData';
import { buildPhantomConnectUrl, decryptPhantomPayload } from '../utils/phantom';
import { getUsdcBalance, getRecentSender } from '../utils/solanaRpc';
import { FALLBACK_RATES } from '../utils/priceService';

const SplitPayContext = createContext(null);
const STORAGE_ACTIVE = '@splitpay_active_splits';
const STORAGE_HISTORY = '@splitpay_split_history';

export function SplitPayProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null); // in USDC
  const [connecting, setConnecting] = useState(false);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [activeSplits, setActiveSplits] = useState([]);
  const [splitHistory, setSplitHistory] = useState([]);
  const [notification, setNotification] = useState(null);

  const rxBaselineRef = useRef(null);
  const rxPollRef = useRef(null);
  const rxDetectedRef = useRef(false);

  // Persist splits to AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_ACTIVE).then(v => {
      if (v) { try { setActiveSplits(JSON.parse(v)); } catch { /* silent */ } }
    });
    AsyncStorage.getItem(STORAGE_HISTORY).then(v => {
      if (v) { try { setSplitHistory(JSON.parse(v)); } catch { /* silent */ } }
    });
  }, []);

  useEffect(() => { AsyncStorage.setItem(STORAGE_ACTIVE, JSON.stringify(activeSplits)); }, [activeSplits]);
  useEffect(() => { AsyncStorage.setItem(STORAGE_HISTORY, JSON.stringify(splitHistory)); }, [splitHistory]);

  const activeSplit = activeSplits[0] ?? null;

  const handleDeepLink = useCallback(({ url }) => {
    if (!url) return;
    try {
      const parsed = Linking.parse(url);
      const isConnect = parsed.path === 'onConnect' || url.includes('onConnect');
      if (!isConnect) return;
      const q = parsed.queryParams || {};
      if (q.errorCode) { setConnecting(false); return; }
      const { phantom_encryption_public_key: pk, nonce, data } = q;
      if (pk && nonce && data) {
        const payload = decryptPhantomPayload(pk, nonce, data);
        setWalletAddress(payload.public_key);
      }
    } catch (e) {
      console.warn('Phantom connect error:', e.message);
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then(url => { if (url) handleDeepLink({ url }); });
    return () => sub.remove();
  }, [handleDeepLink]);

  const connectPhantom = async () => {
    setConnecting(true);
    try {
      const url = buildPhantomConnectUrl();
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL('https://phantom.app/download');
        setConnecting(false);
      }
    } catch (e) {
      console.warn('Phantom connect error:', e.message);
      setConnecting(false);
    }
  };

  const setWalletManually = (address, name = null) => {
    setWalletAddress(address);
    if (name) setDisplayName(name);
  };

  const disconnect = () => {
    setWalletAddress(null);
    setWalletBalance(null);
    setDisplayName(null);
  };

  // Global balance polling — fetch immediately on connect, then every 5s
  useEffect(() => {
    if (!walletAddress) return;
    rxBaselineRef.current = null;
    rxDetectedRef.current = false;

    const fetchAndUpdate = async () => {
      try {
        const current = await getUsdcBalance(walletAddress);
        // Always update the displayed balance
        setWalletBalance(current);
        // On first run just record the baseline for incoming-payment detection
        if (rxBaselineRef.current === null) {
          rxBaselineRef.current = current;
          return;
        }
        if (!rxDetectedRef.current && current > rxBaselineRef.current) {
          const diff = current - rxBaselineRef.current;
          rxDetectedRef.current = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          let senderAddr = null;
          try { senderAddr = await getRecentSender(walletAddress); } catch { /* silent */ }
          setTransactions(prev => [{
            id: `${Date.now()}`, timestamp: Date.now(), type: 'received',
            title: 'Payment received', amountUsdc: diff, amountMkd: diff * FALLBACK_RATES.mkdPerUsdc,
            note: 'Payment received', senderAddress: senderAddr, recipientAddress: walletAddress,
          }, ...prev]);
          setNotification({ type: 'received', amountUsdc: diff, newBalance: current });
        }
      } catch { /* silent */ }
    };

    // Fetch immediately so balance shows right after entering address
    fetchAndUpdate();
    rxPollRef.current = setInterval(fetchAndUpdate, 5000);
    return () => clearInterval(rxPollRef.current);
  }, [walletAddress]);

  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const b = await getUsdcBalance(walletAddress);
      setWalletBalance(b);
    } catch { /* silent */ }
  }, [walletAddress]);

  const triggerNotification = useCallback((notif) => setNotification(notif), []);
  const dismissNotification = useCallback(() => {
    setNotification(null);
    rxDetectedRef.current = false;
    rxBaselineRef.current = null;
  }, []);

  const startSplit = useCallback((split) => {
    setActiveSplits(prev => {
      if (prev.length >= 2) return prev;
      return [split, ...prev];
    });
  }, []);

  const clearSplit = useCallback((sessionId) => {
    if (!sessionId) {
      console.warn('clearSplit expects a sessionId');
      return;
    }
    setActiveSplits(prev => prev.filter(s => s.sessionId !== sessionId));
  }, []);

  const completeSplit = useCallback((sessionId) => {
    setActiveSplits(prev => {
      const session = prev.find(s => s.sessionId === sessionId);
      if (session) setSplitHistory(h => [{ ...session, completedAt: Date.now() }, ...h]);
      return prev.filter(s => s.sessionId !== sessionId);
    });
  }, []);

  const markParticipantPaid = useCallback((sessionId, name) => {
    setActiveSplits(prev => prev.map(s =>
      s.sessionId !== sessionId ? s : {
        ...s,
        participants: s.participants.map(p => p.name === name ? { ...p, status: 'paid' } : p),
      }
    ));
  }, []);

  const addTransaction = useCallback((transaction) => {
    setTransactions(current => [{ id: `${Date.now()}`, timestamp: Date.now(), ...transaction }, ...current]);
  }, []);

  const clearSplitHistory = useCallback(() => {
    setSplitHistory([]);
  }, []);

  const value = useMemo(() => ({
    walletAddress, displayName, walletBalance, connecting,
    connectPhantom, disconnect, refreshBalance, setWalletManually,
    transactions, addTransaction,
    activeSplit, activeSplits, splitHistory, clearSplitHistory,
    startSplit, clearSplit, completeSplit,
    markParticipantPaid,
    notification, triggerNotification, dismissNotification,
  }), [
    walletAddress, displayName, walletBalance, connecting,
    transactions, activeSplit, activeSplits, splitHistory, clearSplitHistory,
    refreshBalance, addTransaction,
    startSplit, clearSplit, completeSplit,
    markParticipantPaid,
    notification, triggerNotification, dismissNotification,
  ]);

  return <SplitPayContext.Provider value={value}>{children}</SplitPayContext.Provider>;
}

export function useSplitPay() {
  return useContext(SplitPayContext);
}
