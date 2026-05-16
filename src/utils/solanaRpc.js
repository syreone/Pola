const RPC = 'https://api.devnet.solana.com';

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

// Returns balance in SOL (converts from lamports)
export async function getBalance(address) {
  const result = await call('getBalance', [address, { commitment: 'confirmed' }]);
  return result.value / 1e9;
}

export async function getSignaturesForAddress(address, { limit = 1 } = {}) {
  return call('getSignaturesForAddress', [address, { limit, commitment: 'confirmed' }]);
}

// Returns the sender address of the most recent incoming tx for receiverAddress, or null.
export async function getRecentSender(receiverAddress) {
  try {
    const sigs = await call('getSignaturesForAddress', [receiverAddress, { limit: 1, commitment: 'confirmed' }]);
    if (!sigs?.length) return null;
    const tx = await call('getTransaction', [sigs[0].signature, { encoding: 'json', maxSupportedTransactionVersion: 0 }]);
    const accounts = tx?.transaction?.message?.accountKeys;
    if (!accounts) return null;
    return accounts.find(a => a !== receiverAddress) || null;
  } catch {
    return null;
  }
}
