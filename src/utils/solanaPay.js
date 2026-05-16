import * as Linking from 'expo-linking';
import { DEMO_RECIPIENT_WALLET } from '../data/mockData';
import { USDC_DEVNET_MINT } from './solanaRpc';

export function buildSolanaPayUrl({ recipient = DEMO_RECIPIENT_WALLET, amountUsdc, label = 'Pola', message = '', memo = '', reference = '' }) {
  const params = new URLSearchParams();
  // SPL token transfer: attach USDC mint so Phantom sends USDC not SOL
  params.append('spl-token', USDC_DEVNET_MINT);
  if (amountUsdc) params.append('amount', String(amountUsdc));
  params.append('label', label);
  if (message) params.append('message', message);
  if (memo) params.append('memo', memo);
  if (reference) params.append('reference', reference);
  return `solana:${recipient}?${params.toString()}`;
}

export function parseSolanaPayUrl(url) {
  if (!url?.startsWith('solana:')) return null;
  const [recipientPart, query = ''] = url.replace('solana:', '').split('?');
  const params = new URLSearchParams(query);
  return {
    recipient: recipientPart,
    amountUsdc: params.get('amount') || '0',
    label: params.get('label') || 'Pola',
    message: params.get('message') || '',
    memo: params.get('memo') || '',
  };
}

export async function openSolanaPayUrl(url) {
  return Linking.openURL(url);
}
