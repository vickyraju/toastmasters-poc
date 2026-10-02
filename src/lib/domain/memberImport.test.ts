import { describe, expect, it } from "vitest";
import {
  MAX_IMPORT_ROWS,
  importRowsFromTable,
  IMPORT_TEMPLATE,
} from "./memberImport";

describe("importRowsFromTable", () => {
  it("maps headers case- and punctuation-insensitively; lines count from the file (header is line 1)", () => {
    const r = importRowsFromTable([
      ["Employee ID", "NAME", "E-mail", "Toastmasters ID", "Pathway", "Level"],
      ["IL7001", "A", "a@x.com", "TM1", "Path", "2"],
      ["IL7002", "B", "b@x.com", "", "", ""],
    ]);
    expect(r).toEqual([
      {
        line: 2,
        employeeId: "IL7001",
        name: "A",
        email: "a@x.com",
        toastmastersId: "TM1",
        pathway: "Path",
        level: "2",
      },
      {
        line: 3,
        employeeId: "IL7002",
        name: "B",
        email: "b@x.com",
        toastmastersId: "",
        pathway: "",
        level: "",
      },
    ]);
  });
  it("optional columns may be missing; extra columns are ignored", () => {
    expect(
      importRowsFromTable([
        ["employee_id", "name", "email", "department"],
        ["IL1", "A", "a@x.com", "Eng"],
      ])[0],
    ).toMatchObject({
      employeeId: "IL1",
      toastmastersId: "",
      pathway: "",
      level: "",
    });
  });
  it("a missing required column names it", () => {
    expect(() =>
      importRowsFromTable([
        ["employee_id", "name"],
        ["IL1", "A"],
      ]),
    ).toThrow("Missing column: email");
    expect(() => importRowsFromTable([])).toThrow("empty");
  });
  it("only a header row is an error; too many rows is an error", () => {
    expect(() =>
      importRowsFromTable([["employee_id", "name", "email"]]),
    ).toThrow("no members");
    const big = [
      ["employee_id", "name", "email"],
      ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => [
        `IL${i}`,
        "n",
        `n${i}@x.com`,
      ]),
    ];
    expect(() => importRowsFromTable(big)).toThrow(`${MAX_IMPORT_ROWS}`);
  });
  it("the downloadable template parses cleanly", () => {
    expect(importRowsFromTable(IMPORT_TEMPLATE)).toHaveLength(1);
  });
});
