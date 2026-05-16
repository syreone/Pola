// 1 USDC == 1 USD (stablecoin). We track USD→MKD exchange rate.
const FALLBACK_MKD_PER_USDC = 53;
const CACHE_MS = 5 * 60 * 1000; // 5 minutes

let _cache = null;
let _cacheAt = 0;

export const FALLBACK_RATES = { mkdPerUsdc: FALLBACK_MKD_PER_USDC };

export async function fetchRates() {
  if (_cache && Date.now() - _cacheAt < CACHE_MS) return _cache;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: ctrl.signal });
    clearTimeout(t);
    const json = await res.json();
    const mkdRate = json?.rates?.MKD;
    if (!mkdRate || typeof mkdRate !== 'number') throw new Error('invalid');
    _cache = { mkdPerUsdc: mkdRate };
    _cacheAt = Date.now();
    return _cache;
  } catch {
    return _cache ?? FALLBACK_RATES;
  }
}

export function toUsdc(amount, currency, rates) {
  const n = Number(amount) || 0;
  if (currency === 'USDC') return n;
  if (currency === 'MKD') return rates.mkdPerUsdc > 0 ? n / rates.mkdPerUsdc : 0;
  return 0;
}
