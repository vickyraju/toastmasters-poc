"use client";

import { useRef, useState } from "react";
import { CircleAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UploadFile } from "@/lib/services";
import { cn } from "@/lib/utils";

export const ALLOWED = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "image/png": "png",
  "image/jpeg": "jpg",
} as const;
const MAX_BYTES = 10 * 1024 * 1024;

/** Client-side check mirroring the service (R-14): PDF, DOCX, PNG, JPG, up to 10 MB. Returns the error or null. */
export function checkAgendaFile(f: {
  name: string;
  type: string;
  size: number;
}): string | null {
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  const okType =
    f.type in ALLOWED &&
    (ext === ALLOWED[f.type as keyof typeof ALLOWED] ||
      (ext === "jpeg" && f.type === "image/jpeg"));
  if (!okType) return "Upload a PDF, DOCX, PNG or JPG file.";
  if (f.size > MAX_BYTES) return "File must be under 10 MB.";
  return null;
}

/** Drag and drop plus a browse button. In mock mode the file becomes an object URL for the session (R-14). */
export function AgendaUpload({
  busy = false,
  onFile,
  label = "Upload agenda",
}: {
  busy?: boolean;
  onFile: (file: UploadFile) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  function take(f: File | undefined) {
    if (!f) return;
    const problem = checkAgendaFile(f);
    setError(problem);
    if (!problem)
      onFile({
        name: f.name,
        mimeType: f.type,
        sizeBytes: f.size,
        url: URL.createObjectURL(f),
      });
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border-input p-6 text-center",
          over && "border-primary bg-primary-soft",
        )}
      >
        <Upload className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm">Drag a file here, or</p>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {label}
        </Button>
        <input
          ref={input}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-label="Agenda file"
          accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => {
            take(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <p className="text-xs text-muted-foreground">
          PDF, DOCX, PNG, JPG, up to 10 MB
        </p>
      </div>
      {error ? (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-sm text-danger"
        >
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
