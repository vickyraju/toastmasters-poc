"use client";

import { useRef, useState } from "react";
import { CircleAlert, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { downloadCsv } from "@/components/admin/download";
import { useImportMembers } from "@/hooks/useMembers";
import {
  IMPORT_TEMPLATE,
  MAX_IMPORT_BYTES,
  importRowsFromTable,
} from "@/lib/domain/memberImport";
import type { ImportResult, ImportRow } from "@/lib/services";
import { parseCsv, toCsv } from "@/lib/utils/csv";

/** Works in browsers and in jsdom (which has no Blob.text in older versions). */
const readText = (f: File): Promise<string> =>
  typeof f.text === "function"
    ? f.text()
    : new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsText(f);
      });

/** CSV import for the first load (flow.md J-10). Check first, then add only the rows that pass. */
export function ImportDialog({ onClose }: { onClose: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const run = useImportMembers();
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function pick(f: File | undefined) {
    if (!f) return;
    setRows(null);
    setPreview(null);
    setProblem(null);
    setFileName(f.name);
    if (f.size > MAX_IMPORT_BYTES)
      return setProblem("The file must be 1 MB or smaller.");
    try {
      const parsed = importRowsFromTable(parseCsv(await readText(f)));
      setRows(parsed);
      run.mutate({ rows: parsed, commit: false }, { onSuccess: setPreview });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not read that file.");
    }
  }

  const bad = preview?.rows.filter((r) => r.errors.length) ?? [];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import members from CSV</DialogTitle>
          <DialogDescription>
            Columns: employee_id, name and email are required; toastmasters_id,
            pathway and level are optional. Members who pass every check are
            added; the rest are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => input.current?.click()}
            disabled={run.isPending}
          >
            <FileUp aria-hidden="true" />
            {fileName ? "Choose another file" : "Choose CSV file"}
          </Button>
          <input
            ref={input}
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              downloadCsv("members-template.csv", toCsv(IMPORT_TEMPLATE))
            }
          >
            Download template
          </Button>
          {fileName ? (
            <span className="text-sm break-all text-muted-foreground">
              {fileName}
            </span>
          ) : null}
        </div>

        {problem ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger"
          >
            <CircleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            {problem}
          </p>
        ) : null}
        {run.isPending && !preview ? (
          <p className="text-sm text-muted-foreground">Checking the file…</p>
        ) : null}

        {preview ? (
          <div className="space-y-3">
            <p role="status" className="font-medium">
              {preview.valid} will be added
              {preview.invalid ? `, ${preview.invalid} will be skipped` : ""}.
            </p>
            {bad.length ? (
              <ul className="max-h-60 space-y-2 overflow-y-auto rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
                {bad.map((r) => (
                  <li key={r.line}>
                    <span className="font-medium">Line {r.line}</span>
                    {r.name ? ` (${r.name})` : ""}: {r.errors.join(" ")}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!rows || !preview || preview.valid === 0 || run.isPending}
            onClick={() =>
              run.mutate(
                { rows: rows!, commit: true },
                {
                  onSuccess: (r) => {
                    toast.success(
                      `${r.added} ${r.added === 1 ? "member" : "members"} added.${r.invalid ? ` ${r.invalid} skipped.` : ""}`,
                    );
                    onClose();
                  },
                },
              )
            }
          >
            {preview && preview.valid > 0
              ? `Add ${preview.valid} ${preview.valid === 1 ? "member" : "members"}`
              : "Add members"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
