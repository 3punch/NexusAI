import { describe, expect, it } from "vitest";

import {
  buildMonthMatrix,
  isoToLocalInputValue,
  localDayKey,
  localInputToIso,
  monthRangeUtc,
} from "./month";

describe("buildMonthMatrix", () => {
  it("returns a 6x7 grid of 42 cells", () => {
    const matrix = buildMonthMatrix(2026, 9);
    expect(matrix).toHaveLength(6);
    expect(matrix[0]).toHaveLength(7);
    expect(matrix.flat()).toHaveLength(42);
  });

  it("starts the grid on a Sunday", () => {
    const matrix = buildMonthMatrix(2026, 9);
    expect(matrix[0][0].date.getDay()).toBe(0);
  });

  it("marks exactly the displayed month's days as inMonth", () => {
    expect(buildMonthMatrix(2026, 9).flat().filter((cell) => cell.inMonth)).toHaveLength(30);
    expect(buildMonthMatrix(2024, 2).flat().filter((cell) => cell.inMonth)).toHaveLength(29); // leap year
    expect(buildMonthMatrix(2023, 2).flat().filter((cell) => cell.inMonth)).toHaveLength(28);
    expect(buildMonthMatrix(2026, 12).flat().filter((cell) => cell.inMonth)).toHaveLength(31);
  });

  it("places the 1st as the first in-month day", () => {
    const firstInMonth = buildMonthMatrix(2026, 9).flat().find((cell) => cell.inMonth);
    expect(firstInMonth?.date.getDate()).toBe(1);
    expect(firstInMonth?.date.getMonth()).toBe(8); // 0-indexed September
  });
});

describe("monthRangeUtc", () => {
  it("returns the half-open UTC boundaries of the month", () => {
    expect(monthRangeUtc(2026, 9)).toEqual({
      startIso: "2026-09-01T00:00:00.000Z",
      endIso: "2026-10-01T00:00:00.000Z",
    });
  });

  it("rolls over from December to the next year", () => {
    expect(monthRangeUtc(2026, 12).endIso).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("local round-trips", () => {
  it("keeps the local wall time through iso round-trips", () => {
    const local = "2026-09-15T10:30";
    const iso = localInputToIso(local);
    expect(iso).not.toBeNull();
    expect(isoToLocalInputValue(iso as string)).toBe(local);
  });

  it("keeps the day key stable through the round-trip", () => {
    const local = "2026-09-15T10:30";
    const iso = localInputToIso(local) as string;
    expect(localDayKey(iso)).toBe("2026-09-15");
  });

  it("maps an empty input to null and back to an empty string", () => {
    expect(localInputToIso("")).toBeNull();
    expect(isoToLocalInputValue(null)).toBe("");
  });
});
