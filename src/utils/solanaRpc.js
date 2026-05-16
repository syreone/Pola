const RPC = 'https://api.devnet.solana.com';

// Circle's official devnet USDC mint (used by circle.com/faucet)
export const USDC_DEVNET_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
export const USDC_MINT = USDC_DEVNET_MINT;

async function call(method, params) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

// Returns USDC balance for a wallet (queries SPL token account)
export async function getUsdcBalance(address) {
  try {
    const result = await call('getTokenAccountsByOwner', [
      address,
      { mint: USDC_DEVNET_MINT },
      { encoding: 'jsonParsed', commitment: 'confirmed' },
    ]);
    const accounts = result?.value ?? [];
    if (accounts.length === 0) return 0;
    return accounts[0].account.data.parsed.info.tokenAmount.uiAmount ?? 0;
  } catch {
    return 0;
  }
}

export async function getSignaturesForAddress(address, { limit = 1 } = {}) {
  return call('getSignaturesForAddress', [address, { limit, commitment: 'confirmed' }]);
}

// Returns the sender address of the most recent incoming tx for receiverAddress, or null.
export async function getRecentSender(receiverAddress) {
  try {
    const sigs = await call('getSignaturesForAddress', [receiverAddress, { limit: 1, commitment: 'confirmed' }]);
    if (!sigs?.length) return null;
    const tx = await call('getTransaction', [sigs[0].signature, {
      encoding: 'jsonParsed',
      maxSupportedTransactionVersion: 0,
    }]);
    const accountKeys = tx?.transaction?.message?.accountKeys;
    if (!accountKeys?.length) return null;
    // jsonParsed returns objects with { pubkey, signer, writable } — pick first key that isn't the receiver
    for (const key of accountKeys) {
      const addr = typeof key === 'string' ? key : key?.pubkey;
      if (addr && addr !== receiverAddress) return addr;
    }
    return null;
  } catch {
    return null;
  }
}
