"use client";

import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/shared/Card";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { useAgendaOutline } from "@/hooks/useMeeting";
import { useUploadAgenda } from "@/hooks/useMeetingActions";
import { useCan } from "@/hooks/useSession";
import { AgendaUpload } from "./AgendaUpload";
import type { FileRecord } from "@/lib/domain/types";
import type { MeetingDetail } from "@/lib/services";
import { formatIST } from "@/lib/time/ist";

/** Seeded files live under public/; uploaded ones (M7) carry a blob: or http(s) URL. */
export function fileUrl(f: FileRecord): string {
  return /^(blob:|https?:)/.test(f.storageKey)
    ? f.storageKey
    : `/${f.storageKey.replace(/^\/+/, "")}`;
}

/** S-04 Agenda: the uploaded file (PDF embedded, image shown, DOCX downloaded), then the template outline. */
export function AgendaTab({ meeting: m }: { meeting: MeetingDetail }) {
  const outline = useAgendaOutline(m.id);
  const canUpload = useCan("meeting.agenda.upload");
  const upload = useUploadAgenda();
  const f = m.agendaFile;

  return (
    <div className="space-y-4">
      <Card title="Agenda file">
        {f ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="size-5 text-primary" aria-hidden="true" />
              <span className="flex-1 font-medium break-all">
                {f.originalName}
              </span>
              <Button asChild variant="outline">
                <a href={fileUrl(f)} download={f.originalName}>
                  <Download aria-hidden="true" />
                  Download
                </a>
              </Button>
            </div>
            {f.mimeType === "application/pdf" ? (
              <iframe
                title={`Agenda: ${f.originalName}`}
                src={fileUrl(f)}
                className="h-[480px] w-full rounded-lg border border-border max-md:h-80"
              />
            ) : f.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element -- user files are not static assets for next/image
              <img
                src={fileUrl(f)}
                alt={`Agenda: ${f.originalName}`}
                className="max-h-[480px] rounded-lg border border-border"
              />
            ) : null}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-muted-foreground">
            <FileText className="size-5" aria-hidden="true" />
            No agenda uploaded yet
          </p>
        )}
        {canUpload ? (
          <div className="mt-4">
            <AgendaUpload
              busy={upload.isPending}
              label={f ? "Replace agenda" : "Upload agenda"}
              onFile={(file) => upload.mutate({ id: m.id, file })}
            />
          </div>
        ) : null}
      </Card>

      <Card title="Agenda outline">
        <QueryBlock
          query={outline}
          label="the agenda outline"
          rows={4}
          isEmpty={(d) => d.length === 0}
          empty="This meeting type has no agenda outline."
        >
          {(rows) => (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Time
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Item
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Role holder
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {formatIST(r.startsAt, "h:mm a")}
                    </td>
                    <td className="py-2 pr-4">
                      {r.title}{" "}
                      <span className="text-muted-foreground">
                        ({r.durationMinutes} min)
                      </span>
                    </td>
                    <td className="py-2">
                      {r.holders.length ? (
                        r.holders.join(", ")
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </QueryBlock>
      </Card>
    </div>
  );
}
