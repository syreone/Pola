export const eur = (value) => `€${Number(value || 0).toFixed(2)}`;
export const sol = (value) => `${Number(value || 0).toFixed(4)} SOL`;

export function eurToDemoSol(eurAmount) {
  // Demo conversion only. For production, fetch live SOL/EUR pricing from a trusted price source.
  return Number(eurAmount || 0) / 140;
}
