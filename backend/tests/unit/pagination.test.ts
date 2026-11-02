import { HttpError } from "../../src/middlewares/error";
import { chunk, decodeCursor, encodeCursor } from "../../src/utils/pagination";

describe("cursor pagination", () => {
  it("round-trips a contact id", () => {
    const cursor = encodeCursor(42);
    expect(decodeCursor(cursor)).toBe(42);
  });

  it("produces an opaque cursor", () => {
    expect(encodeCursor(42)).not.toContain("42");
  });

  it.each(["", "not-a-cursor", Buffer.from("user:1").toString("base64url")])(
    "rejects invalid cursor %p",
    (cursor) => {
      expect(() => decodeCursor(cursor)).toThrow(HttpError);
    }
  );
});

describe("chunk", () => {
  it("splits arrays into fixed sized batches", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns an empty array for empty input", () => {
    expect(chunk([], 10)).toEqual([]);
  });
});
