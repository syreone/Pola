import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import { initialTransactions } from './mockData';
import { buildPhantomConnectUrl, decryptPhantomPayload } from '../utils/phantom';
import { getBalance } from '../utils/solanaRpc';

const SplitPayContext = createContext(null);

export function SplitPayProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [transactions, setTransactions] = useState(initialTransactions);
  // activeSplit: { sessionId, totalEur, eachSol, participants: [{ name, referenceKey, payUrl, status }] }
  const [activeSplit, setActiveSplit] = useState(null);

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
    const url = buildPhantomConnectUrl();
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // Phantom not installed — open App Store / Play Store page
      await Linking.openURL('https://phantom.app/download');
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setWalletAddress(null);
    setWalletBalance(null);
  };

  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const b = await getBalance(walletAddress);
      setWalletBalance(b);
    } catch { /* silent */ }
  }, [walletAddress]);

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
    setTransactions(current => [{ id: `${Date.now()}`, date: 'Just now', ...transaction }, ...current]);
  }, []);

  const value = useMemo(() => ({
    walletAddress, walletBalance, connecting,
    connectPhantom, disconnect, refreshBalance,
    transactions, addTransaction,
    activeSplit, startSplit, clearSplit, markParticipantPaid,
  }), [walletAddress, walletBalance, connecting, transactions, activeSplit,
      refreshBalance, addTransaction, startSplit, clearSplit, markParticipantPaid]);

  return <SplitPayContext.Provider value={value}>{children}</SplitPayContext.Provider>;
}

export function useSplitPay() {
  return useContext(SplitPayContext);
}
