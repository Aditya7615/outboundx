import { fillDailySeries, rate, toDateKey } from "../../src/services/analytics.helpers";

describe("rate", () => {
  it("computes a one-decimal percentage", () => {
    expect(rate(1, 3)).toBe(33.3);
    expect(rate(2, 2)).toBe(100);
  });

  it("returns zero for an empty denominator", () => {
    expect(rate(0, 0)).toBe(0);
  });
});

describe("toDateKey", () => {
  it("normalises dates and strings to ISO days", () => {
    expect(toDateKey(new Date("2026-02-10T18:00:00Z"))).toBe("2026-02-10");
    expect(toDateKey("2026-02-10T00:00:00.000Z")).toBe("2026-02-10");
  });
});

describe("fillDailySeries", () => {
  it("fills gaps and keeps existing values", () => {
    const series = fillDailySeries(
      [{ date: "2026-02-09", sent: 4, opened: 2, clicked: 1 }],
      3,
      new Date("2026-02-10T12:00:00Z")
    );

    expect(series).toEqual([
      { date: "2026-02-08", sent: 0, opened: 0, clicked: 0 },
      { date: "2026-02-09", sent: 4, opened: 2, clicked: 1 },
      { date: "2026-02-10", sent: 0, opened: 0, clicked: 0 }
    ]);
  });
});
