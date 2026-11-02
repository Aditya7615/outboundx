export interface DailySeriesPoint {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
}

export function rate(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 1000) / 10;
}

export function toDateKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function fillDailySeries(
  points: DailySeriesPoint[],
  days: number,
  now: Date = new Date()
): DailySeriesPoint[] {
  const byDate = new Map(points.map((point) => [point.date, point]));
  const result: DailySeriesPoint[] = [];
  const cursor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(cursor);
    date.setUTCDate(cursor.getUTCDate() - offset);
    const key = date.toISOString().slice(0, 10);
    const point = byDate.get(key);
    result.push({
      date: key,
      sent: Number(point?.sent ?? 0),
      opened: Number(point?.opened ?? 0),
      clicked: Number(point?.clicked ?? 0)
    });
  }

  return result;
}
