import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { initialTransactions } from './mockData';
import { buildPhantomConnectUrl, decryptPhantomPayload } from '../utils/phantom';
import { getBalance, getRecentSender } from '../utils/solanaRpc';

const SplitPayContext = createContext(null);

export function SplitPayProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [transactions, setTransactions] = useState(initialTransactions);
  // activeSplit: { sessionId, totalEur, eachSol, participants: [{ name, referenceKey, payUrl, status }] }
  const [activeSplit, setActiveSplit] = useState(null);
  const [notification, setNotification] = useState(null);

  // Global incoming-payment polling
  const rxBaselineRef = useRef(null);
  const rxPollRef = useRef(null);
  const rxDetectedRef = useRef(false);

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

  useEffect(() => {
    if (!walletAddress) return;
    rxBaselineRef.current = null;
    rxDetectedRef.current = false;
    rxPollRef.current = setInterval(async () => {
      if (rxDetectedRef.current) return;
      try {
        const current = await getBalance(walletAddress);
        if (rxBaselineRef.current === null) { rxBaselineRef.current = current; return; }
        if (current > rxBaselineRef.current) {
          const diff = current - rxBaselineRef.current;
          rxDetectedRef.current = true;
          setWalletBalance(current);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          let senderAddr = null;
          try { senderAddr = await getRecentSender(walletAddress); } catch { /* silent */ }
          setTransactions(prev => [{
            id: `${Date.now()}`, timestamp: Date.now(), type: 'received',
            title: 'Payment received', amountEur: diff * 140, amountSol: diff,
            note: 'Payment received', senderAddress: senderAddr, recipientAddress: walletAddress,
          }, ...prev]);
          setNotification({ type: 'received', amountSol: diff, newBalance: current });
        }
      } catch { /* silent */ }
    }, 3000);
    return () => clearInterval(rxPollRef.current);
  }, [walletAddress]);

  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const b = await getBalance(walletAddress);
      setWalletBalance(b);
    } catch { /* silent */ }
  }, [walletAddress]);

  const triggerNotification = useCallback((notif) => setNotification(notif), []);
  const dismissNotification = useCallback(() => {
    setNotification(null);
    // Reset rx polling baseline so next payment can be detected
    rxDetectedRef.current = false;
    rxBaselineRef.current = null;
  }, []);

  const startSplit = useCallback((split) => setActiveSplit(split), []);
  const clearSplit = useCallback(() => setActiveSplit(null), []);

  const markParticipantPaid = useCallback((name) => {
    setActiveSplit(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        participants: prev.participants.map(p =>
          p.name === name ? { ...p, status: 'paid' } : p
        ),
      };
    });
  }, []);

  const addTransaction = useCallback((transaction) => {
    setTransactions(current => [{ id: `${Date.now()}`, timestamp: Date.now(), ...transaction }, ...current]);
  }, []);

  const value = useMemo(() => ({
    walletAddress, displayName, walletBalance, connecting,
    connectPhantom, disconnect, refreshBalance, setWalletManually,
    transactions, addTransaction,
    activeSplit, startSplit, clearSplit, markParticipantPaid,
    notification, triggerNotification, dismissNotification,
  }), [walletAddress, walletBalance, connecting, transactions, activeSplit,
      refreshBalance, addTransaction, startSplit, clearSplit, markParticipantPaid,
      notification, triggerNotification, dismissNotification]);

  return <SplitPayContext.Provider value={value}>{children}</SplitPayContext.Provider>;
}

export function useSplitPay() {
  return useContext(SplitPayContext);
}
