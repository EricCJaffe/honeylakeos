import { describe, expect, it } from "vitest";
import { ensureArray, safeFormatDate } from "./safety";

describe("runtime safety smoke", () => {
  it("ensureArray guards cache-shape collisions", () => {
    const fromBadCache = { projects: [{ id: "p1" }] };
    const normalized = ensureArray<{ id: string }>(fromBadCache);

    expect(Array.isArray(normalized)).toBe(true);
    expect(normalized).toHaveLength(0);
    expect(() => normalized.map((p) => p.id)).not.toThrow();
  });

  it("ensureArray preserves valid arrays", () => {
    const source = [{ id: "p1" }, { id: "p2" }];
    const normalized = ensureArray<{ id: string }>(source);

    expect(normalized).toHaveLength(2);
    expect(normalized.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("safeFormatDate returns fallback for invalid input", () => {
    expect(safeFormatDate("not-a-date", "MMM d, yyyy")).toBe("Invalid date");
    expect(safeFormatDate(undefined, "MMM d, yyyy", "—")).toBe("—");
  });

  it("safeFormatDate formats valid dates", () => {
    expect(safeFormatDate("2026-02-14T12:00:00.000Z", "yyyy-MM-dd")).toBe("2026-02-14");
  });
});
