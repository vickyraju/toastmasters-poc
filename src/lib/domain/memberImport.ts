import type { ImportRow } from "../services/interfaces";

export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_BYTES = 1024 * 1024;

/** The sample file members download to see the columns. */
export const IMPORT_TEMPLATE: string[][] = [
  ["employee_id", "name", "email", "toastmasters_id", "pathway", "level"],
  [
    "IL2001",
    "Example Person",
    "example.person@example.com",
    "",
    "Presentation Mastery",
    "1",
  ],
];

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");
const COLUMNS = {
  employeeId: ["employeeid", "empid", "employeenumber"],
  name: ["name", "fullname"],
  email: ["email", "emailaddress"],
  toastmastersId: ["toastmastersid", "tmid"],
  pathway: ["pathway"],
  level: ["level", "currentlevel"],
} as const;
const REQUIRED = ["employeeId", "name", "email"] as const;
const LABEL = {
  employeeId: "employee_id",
  name: "name",
  email: "email",
} as const;

/** Turn a parsed CSV table into import rows. Throws a plain-language error for an unusable file. */
export function importRowsFromTable(table: string[][]): ImportRow[] {
  if (table.length === 0) throw new Error("The file is empty.");
  const header = table[0].map(norm);
  const at = (key: keyof typeof COLUMNS) =>
    header.findIndex((h) => (COLUMNS[key] as readonly string[]).includes(h));
  for (const k of REQUIRED)
    if (at(k) < 0) throw new Error(`Missing column: ${LABEL[k]}`);
  if (table.length === 1)
    throw new Error("The file has a header but no members.");
  if (table.length - 1 > MAX_IMPORT_ROWS)
    throw new Error(`Import up to ${MAX_IMPORT_ROWS} members at a time.`);
  const cell = (row: string[], key: keyof typeof COLUMNS) =>
    at(key) >= 0 ? (row[at(key)] ?? "").trim() : "";
  return table.slice(1).map((row, i) => ({
    line: i + 2,
    employeeId: cell(row, "employeeId"),
    name: cell(row, "name"),
    email: cell(row, "email"),
    toastmastersId: cell(row, "toastmastersId"),
    pathway: cell(row, "pathway"),
    level: cell(row, "level"),
  }));
}
