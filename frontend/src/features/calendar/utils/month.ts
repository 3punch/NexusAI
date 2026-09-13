/**
 * Pure calendar math — no date library, no framework.
 *
 * Conventions:
 * - "local" means the browser's timezone (the user's wall clock)
 * - ISO strings carry an explicit UTC offset from the API
 * - datetime-local inputs parse as local; toISOString emits UTC
 */

export interface MonthCell {
  date: Date;
  inMonth: boolean;
}

const CELLS_IN_GRID = 42; // fixed 6x7 grid — same height every month

/** 6x7 matrix of days covering the month (leading/trailing days marked). */
export function buildMonthMatrix(year: number, month: number): MonthCell[][] {
  const firstDayOffset = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const cells: MonthCell[] = [];
  for (let index = 0; index < CELLS_IN_GRID; index += 1) {
    const date = new Date(year, month - 1, 1 - firstDayOffset + index);
    cells.push({ date, inMonth: date.getMonth() === month - 1 });
  }
  const rows: MonthCell[][] = [];
  for (let row = 0; row < 6; row += 1) {
    rows.push(cells.slice(row * 7, row * 7 + 7));
  }
  return rows;
}

/**
 * Half-open UTC boundaries of a month — the same [start, end) convention the
 * API's month filter uses, so boundaries compose without off-by-one days.
 */
export function monthRangeUtc(
  year: number,
  month: number,
): { startIso: string; endIso: string } {
  return {
    startIso: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
    endIso: new Date(Date.UTC(year, month, 1)).toISOString(),
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local wall-clock day key ("2026-09-15") for an ISO instant. */
export function localDayKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** ISO instant → datetime-local input value (local wall clock). */
export function isoToLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** datetime-local input value → ISO instant (null for empty = "no end"). */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}
