type Cell = string | number | null | undefined;

/** A cell that a spreadsheet would run as a formula gets a leading apostrophe (CSV injection). */
const safe = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);

function cell(v: Cell): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  const t = safe(v);
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** RFC 4180 CSV: CRLF rows, quotes doubled. Numbers stay numbers (a negative number is not a formula). */
export function toCsv(rows: Cell[][]): string {
  return rows.map((r) => r.map(cell).join(",") + "\r\n").join("");
}
