/** Hands a CSV to the browser as a download. The BOM lets Excel read non-ASCII names as UTF-8. */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(
    new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
