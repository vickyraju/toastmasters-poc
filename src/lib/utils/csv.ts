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

/** RFC 4180 reader: quoted cells, doubled quotes, newlines inside quotes, CRLF or LF, leading BOM. Blank lines are skipped. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let sawAny = false;
  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    if (row.some((c) => c !== "") || row.length > 1) rows.push(row);
    row = [];
    sawAny = false;
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") {
      quoted = true;
      sawAny = true;
    } else if (ch === ",") {
      endCell();
      sawAny = true;
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      endRow();
    } else {
      cell += ch;
      sawAny = true;
    }
  }
  if (quoted)
    throw new Error("The file has an opening quote that is never closed.");
  if (sawAny || cell !== "" || row.length) endRow();
  return rows;
}
