export function round(n: number, e: number): number {
  const p: number = Math.pow(10, e);
  return Math.round(n * p) / p;
}

export function cround(n: number, label: string): number {
  switch (label) {
    case 'LTC': return round(n, 3);
    case 'BTC': return round(n, 5);
    default: return round(n, 5);
  }
}
