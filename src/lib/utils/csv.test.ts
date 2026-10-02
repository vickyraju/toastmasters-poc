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
