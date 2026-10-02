import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes commas, quotes and newlines; nulls are empty; CRLF between rows", () => {
    expect(
      toCsv([
        ["a", 'say "hi"', "x,y", null, 3],
        ["line\nbreak", "", "ok", "", ""],
      ]),
    ).toBe('a,"say ""hi""","x,y",,3\r\n"line\nbreak",,ok,,\r\n');
  });
  it("neutralises spreadsheet formulas by prefixing an apostrophe", () => {
    expect(toCsv([["=SUM(A1)", "+1", "-1", "@cmd", "\t=x", "plain", -5]])).toBe(
      "'=SUM(A1),'+1,'-1,'@cmd,'\t=x,plain,-5\r\n",
    );
  });
  it("an empty table is an empty file", () => {
    expect(toCsv([])).toBe("");
  });
});

import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("handles quotes, commas, doubled quotes, embedded newlines, CRLF and a BOM", () => {
    expect(
      parseCsv('﻿a,b,c\r\n1,"x,y","say ""hi"""\r\n"line\nbreak",,end\r\n'),
    ).toEqual([
      ["a", "b", "c"],
      ["1", "x,y", 'say "hi"'],
      ["line\nbreak", "", "end"],
    ]);
  });
  it("skips blank lines, trims a missing final newline, and keeps a trailing empty cell", () => {
    expect(parseCsv("a,b\n\n1,2,\n3,4")).toEqual([
      ["a", "b"],
      ["1", "2", ""],
      ["3", "4"],
    ]);
    expect(parseCsv("")).toEqual([]);
  });
  it("round-trips what toCsv writes, except the formula apostrophe", () => {
    const rows = [
      ["a", 'q"uote', "c,d", ""],
      ["x", "y", "z", "w"],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
  it("an unterminated quote is an error, not silent data loss", () => {
    expect(() => parseCsv('a,"b\n1,2')).toThrow("quote");
  });
});
