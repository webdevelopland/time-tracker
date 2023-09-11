export function fee(usd: number, feeP: number, feeC: number): number {
  if (feeP) {
    usd *= 1 - feeP / 100;
  }
  if (feeC) {
    usd -= feeC;
  }
  if (usd < 0) {
    usd = 0;
  }
  return usd;
}
