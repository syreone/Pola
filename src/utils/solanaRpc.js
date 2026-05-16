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

// Returns array of confirmed signatures for the address.
// For Solana Pay reference keys: if length > 0, the payment has been made.
export async function getSignaturesForAddress(address, { limit = 1 } = {}) {
  return call('getSignaturesForAddress', [address, { limit, commitment: 'confirmed' }]);
}
