export function getStatus(tracked: number, started: number, ended: number, limit: number): number {
  const totalHoursTracked: number = tracked;
  const totalHoursPassed: number = ended - started;
  const limitK: number = limit / (24 * 7);
  const currentK: number = totalHoursTracked / totalHoursPassed;
  return Math.round(100 * currentK / limitK * 10) / 10;
}
