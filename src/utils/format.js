export const usdc = (value) => `${Number(value || 0).toFixed(2)} USDC`;
export const mkd = (value) => `${Number(value || 0).toFixed(0)} ден`;
export const eur = (value) => `€${Number(value || 0).toFixed(2)}`;

export function relativeTime(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  const mo = Math.floor(d / 30);
  const yr = Math.floor(d / 365);
  if (s < 60) return 'Just now';
  if (m < 60) return `${m} min ago`;
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  if (d < 30) return `${d} day${d > 1 ? 's' : ''} ago`;
  if (mo < 12) return `${mo} month${mo > 1 ? 's' : ''} ago`;
  return `${yr} year${yr > 1 ? 's' : ''} ago`;
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
