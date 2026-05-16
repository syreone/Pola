import * as Linking from 'expo-linking';
import { DEMO_RECIPIENT_WALLET } from '../data/mockData';

export function buildSolanaPayUrl({ recipient = DEMO_RECIPIENT_WALLET, amountSol, label = 'SplitPay', message = '', memo = '', reference = '' }) {
  const params = new URLSearchParams();
  if (amountSol) params.append('amount', String(amountSol));
  params.append('label', label);
  if (message) params.append('message', message);
  if (memo) params.append('memo', memo);
  // reference is a base58 public key; Phantom adds it as an account on the tx,
  // allowing us to confirm payment via getSignaturesForAddress(reference)
  if (reference) params.append('reference', reference);
  return `solana:${recipient}?${params.toString()}`;
}

export function parseSolanaPayUrl(url) {
  if (!url?.startsWith('solana:')) return null;
  const [recipientPart, query = ''] = url.replace('solana:', '').split('?');
  const params = new URLSearchParams(query);
  return {
    recipient: recipientPart,
    amountSol: params.get('amount') || '0',
    label: params.get('label') || 'SplitPay',
    message: params.get('message') || '',
    memo: params.get('memo') || ''
  };
}

export async function openSolanaPayUrl(url) {
  // Real Devnet transaction attempt concept:
  // A compatible wallet such as Phantom can read this Solana Pay transfer URL and compose the transfer.
  // Devnet depends on the wallet/network setup. The app then shows a mocked success screen for stage reliability.
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) return Linking.openURL(url);
  return Linking.openURL(`https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent('https://splitpay.demo')}`);
}
