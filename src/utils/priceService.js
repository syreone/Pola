const MKD_PER_EUR = 61.5;
const CACHE_MS = 60_000;
let _cache = null;
let _cacheAt = 0;

export const FALLBACK_PRICES = { solInEur: 140, solInMkd: 140 * MKD_PER_EUR, mkdPerEur: MKD_PER_EUR };

export async function fetchPrices() {
  if (_cache && Date.now() - _cacheAt < CACHE_MS) return _cache;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=eur',
      { signal: ctrl.signal }
    );
    clearTimeout(t);
    const json = await res.json();
    const solInEur = json?.solana?.eur;
    if (!solInEur || typeof solInEur !== 'number') throw new Error('invalid');
    _cache = { solInEur, solInMkd: solInEur * MKD_PER_EUR, mkdPerEur: MKD_PER_EUR };
    _cacheAt = Date.now();
    return _cache;
  } catch {
    return _cache ?? FALLBACK_PRICES;
  }
}

export function toSol(amount, currency, prices) {
  const n = Number(amount) || 0;
  if (currency === 'SOL') return n;
  if (currency === 'EUR') return prices.solInEur > 0 ? n / prices.solInEur : 0;
  if (currency === 'MKD') return prices.solInMkd > 0 ? n / prices.solInMkd : 0;
  return 0;
}
