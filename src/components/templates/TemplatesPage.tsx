"use client";

import { useState } from "react";
import { CircleAlert, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryBlock } from "@/components/shared/QueryBlock";
import {
  useGenerateRecurring,
  useMeetingTypes,
  useRecurring,
} from "@/hooks/useTemplates";
import { useProjects, useRoleTemplates } from "@/hooks/useRoles";
import { useCan } from "@/hooks/useSession";
import type { PathwaysProject, RoleTemplate } from "@/lib/domain/types";
import { formatSeconds } from "@/lib/time/ist";
import {
  MeetingTypeDialog,
  ProjectDialog,
  RecurringDialog,
  RoleDialog,
} from "./TemplateDialogs";
import type { MeetingTypeView, RecurringView } from "@/lib/services";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const th = "px-4 py-2 font-medium";

type Dialog =
  | { kind: "recurring"; row: RecurringView | null }
  | { kind: "type"; row: MeetingTypeView | null }
  | { kind: "role"; row: RoleTemplate | null }
  | { kind: "project"; row: PathwaysProject | null }
  | null;

/** S-06: four tabs of tables with add and edit dialogs (design.md section 7). */
export function TemplatesPage() {
  const canEdit = useCan("template.edit");
  const [dialog, setDialog] = useState<Dialog>(null);
  const recurring = useRecurring();
  const types = useMeetingTypes();
  const roles = useRoleTemplates();
  const projects = useProjects();
  const generate = useGenerateRecurring();
  const close = () => setDialog(null);

  const edit = (d: Dialog, label: string) =>
    canEdit ? (
      <Button
        variant="outline"
        size="icon"
        className="size-9 max-lg:size-11"
        aria-label={label}
        onClick={() => setDialog(d)}
      >
        <Pencil aria-hidden="true" />
      </Button>
    ) : null;
  const add = (d: Dialog, label: string) =>
    canEdit ? (
      <Button onClick={() => setDialog(d)}>
        <Plus aria-hidden="true" />
        {label}
      </Button>
    ) : null;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="recurring">
        <TabsList className="max-w-full justify-start overflow-x-auto group-data-horizontal/tabs:h-auto">
          {[
            ["recurring", "Recurring templates"],
            ["types", "Meeting types"],
            ["roles", "Role catalog"],
            ["projects", "Project timings"],
          ].map(([v, l]) => (
            <TabsTrigger
              key={v}
              value={v}
              className="min-h-9 px-4 whitespace-nowrap max-lg:min-h-11"
            >
              {l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="recurring" className="space-y-3 pt-4">
          <div className="flex flex-wrap justify-end gap-2">
            {canEdit ? (
              <Button
                variant="outline"
                disabled={generate.isPending}
                onClick={() => generate.mutate(undefined)}
              >
                Generate meetings now
              </Button>
            ) : null}
            {add({ kind: "recurring", row: null }, "Add template")}
          </div>
          <QueryBlock
            query={recurring}
            label="templates"
            rows={3}
            isEmpty={(d) => d.length === 0}
            empty="No templates yet"
          >
            {(rows) => (
              <Table
                head={[
                  "Name",
                  "Type",
                  "Day and time",
                  "Duration",
                  "Venue",
                  "Weeks ahead",
                  "Active",
                  "",
                ]}
              >
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3">{t.typeName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {WEEKDAYS[t.weekday]} {t.startTime} IST
                    </td>
                    <td className="px-4 py-3">{t.durationMinutes} min</td>
                    <td className="px-4 py-3">{t.venue ?? "Not set"}</td>
                    <td className="px-4 py-3">{t.weeksAhead}</td>
                    <td className="px-4 py-3">
                      {t.isActive ? "Active" : "Paused"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {edit({ kind: "recurring", row: t }, `Edit ${t.name}`)}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </QueryBlock>
        </TabsContent>

        <TabsContent value="types" className="space-y-3 pt-4">
          <div className="flex justify-end">
            {add({ kind: "type", row: null }, "Add meeting type")}
          </div>
          <QueryBlock
            query={types}
            label="meeting types"
            rows={4}
            isEmpty={(d) => d.length === 0}
            empty="No meeting types yet"
          >
            {(rows) => (
              <Table
                head={[
                  "Name",
                  "Default duration",
                  "Roles",
                  "Agenda items",
                  "Status",
                  "",
                ]}
              >
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3">
                      {t.defaultDurationMinutes} min
                    </td>
                    <td className="px-4 py-3">
                      {t.roles.reduce((n, r) => n + r.count, 0)}
                    </td>
                    <td className="px-4 py-3">{t.agendaItems.length}</td>
                    <td className="px-4 py-3">
                      {t.isActive ? "Active" : "Retired"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {edit({ kind: "type", row: t }, `Edit ${t.name}`)}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </QueryBlock>
        </TabsContent>

        <TabsContent value="roles" className="space-y-3 pt-4">
          <div className="flex justify-end">
            {add({ kind: "role", row: null }, "Add role")}
          </div>
          <QueryBlock
            query={roles}
            label="the role catalog"
            rows={5}
            isEmpty={(d) => d.length === 0}
            empty="No roles yet"
          >
            {(rows) => (
              <Table
                head={[
                  "Role",
                  "Code",
                  "Category",
                  "Report",
                  "Default count",
                  "",
                ]}
              >
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-3 capitalize">{r.category}</td>
                    <td className="px-4 py-3">
                      {r.reportKind ? r.reportKind.replace(/_/g, " ") : "None"}
                    </td>
                    <td className="px-4 py-3">{r.defaultCount}</td>
                    <td className="px-4 py-3 text-right">
                      {edit({ kind: "role", row: r }, `Edit ${r.name}`)}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </QueryBlock>
        </TabsContent>

        <TabsContent value="projects" className="space-y-3 pt-4">
          <p
            role="note"
            className="flex items-center gap-2 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning"
          >
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            Verify these timings with the VPE before relying on them.
          </p>
          <div className="flex justify-end">
            {add({ kind: "project", row: null }, "Add project timing")}
          </div>
          <QueryBlock
            query={projects}
            label="project timings"
            rows={5}
            isEmpty={(d) => d.length === 0}
            empty="No project timings yet"
          >
            {(rows) => (
              <Table
                head={["Project", "Pathway", "Level", "Minimum", "Maximum", ""]}
              >
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">
                      {p.name}
                      {p.isCustom ? (
                        <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">
                          Custom
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{p.pathway}</td>
                    <td className="px-4 py-3">
                      {p.level > 0 ? p.level : "n/a"}
                    </td>
                    <td className="px-4 py-3">{formatSeconds(p.minSeconds)}</td>
                    <td className="px-4 py-3">{formatSeconds(p.maxSeconds)}</td>
                    <td className="px-4 py-3 text-right">
                      {edit({ kind: "project", row: p }, `Edit ${p.name}`)}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </QueryBlock>
        </TabsContent>
      </Tabs>

      {dialog?.kind === "recurring" && types.data ? (
        <RecurringDialog row={dialog.row} types={types.data} onClose={close} />
      ) : null}
      {dialog?.kind === "type" && roles.data ? (
        <MeetingTypeDialog
          row={dialog.row}
          catalog={roles.data}
          onClose={close}
        />
      ) : null}
      {dialog?.kind === "role" ? (
        <RoleDialog row={dialog.row} onClose={close} />
      ) : null}
      {dialog?.kind === "project" ? (
        <ProjectDialog row={dialog.row} onClose={close} />
      ) : null}
    </div>
  );
}

/** A table from md; each row becomes a stacked card below md (design.md 2.4). */
function Table({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="bg-background text-muted-foreground">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className={th}>
                {h || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}
