import { AppError } from "../../services/errors";
import type {
  MeetingsService,
  MeetingListItem,
  StatusResult,
  UploadFile,
} from "../../services/interfaces";
import { meetingInput } from "../../domain/schemas";
import { lifecycleCheck } from "../../domain/rules/lifecycle";
import * as ev from "../../domain/events";
import { newId } from "../../domain/ids";
import { now } from "../../time/clock";
import { assertCan, me, mutate, type Ctx } from "./runtime";
import { can } from "../../permissions/can";
import type { Meeting, MeetingRole, MeetingStatus } from "../../domain/types";
import type { MockData } from "./state";
import {
  assertEditable,
  holdersOf,
  log,
  meetingOf,
  tmodHolder,
  tmplOf,
} from "./helpers";

const ALLOWED_FILES: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
};
const MAX_BYTES = 10 * 1024 * 1024;

const validation = (fields: Record<string, string>) =>
  new AppError("VALIDATION", Object.values(fields)[0] ?? "Check the form.", {
    fields,
  });

/** Create the slots for a new meeting: `roles` or the meeting type's role list (J-07). */
function buildSlots(
  d: MockData,
  meetingId: string,
  roles: { roleTemplateId: string; count: number }[],
): MeetingRole[] {
  const slots: MeetingRole[] = [];
  let order = 0;
  for (const { roleTemplateId, count } of roles) {
    const tpl = d.roleTemplates.find((t) => t.id === roleTemplateId);
    if (!tpl) throw new AppError("NOT_FOUND", "Role not found in the catalog.");
    for (let i = 1; i <= count; i++) {
      const suffix = count > 1 ? ` ${i}` : "";
      const base = tpl.code === "tmod" ? "tmod" : tpl.code.replace(/_/g, "-");
      slots.push({
        id: `${meetingId}:${base}${count > 1 ? `-${i}` : ""}`,
        meetingId,
        roleTemplateId,
        label: `${tpl.name}${suffix}`,
        sortOrder: order++,
        memberId: null,
        status: "open",
        isMain: tpl.category === "main",
        assignedBy: null,
        assignedAt: null,
        version: 0,
        evaluatesSlotId: null,
      });
    }
  }
  for (const s of slots) {
    if (tmplOf(d, s).isEvaluator) {
      const n = s.id.split("-").pop();
      s.evaluatesSlotId =
        slots.find(
          (x) => x.id.endsWith(`speaker-${n}`) && tmplOf(d, x).isSpeaker,
        )?.id ?? null;
    }
  }
  return slots;
}

/** One lifecycle transition with its side effects (R-07). Used by setStatus and cancel. */
function transition(
  d: MockData,
  actorId: string,
  id: string,
  to: MeetingStatus,
  reason?: string,
): StatusResult {
  const m = meetingOf(d, id);
  const at = now();
  const slots = d.meetingRoles.filter((s) => s.meetingId === id);
  const missingReports = slots.filter(
    (s) =>
      tmplOf(d, s).reportKind &&
      !d.reports.some((r) => r.meetingRoleId === s.id && r.submittedAt),
  ).length;
  const check = lifecycleCheck({
    from: m.status,
    to,
    hasVenueOrLink: !!(m.venue || m.meetingLink),
    slotCount: slots.length,
    openSlots: slots.filter((s) => s.status === "open").length,
    endsAt: new Date(m.endsAt),
    now: at,
    missingReports,
    reason,
  });
  if (!check.ok) {
    const msg = {
      NOT_ALLOWED: ["INVALID_STATE", "That status change is not allowed."],
      NO_VENUE_OR_LINK: [
        "VALIDATION",
        "Add a venue or a meeting link before opening.",
      ],
      NO_ROLES: ["VALIDATION", "Add at least one role before opening."],
      NOT_ENDED: ["INVALID_STATE", "The meeting has not ended yet."],
      REASON_REQUIRED: ["VALIDATION", "Give a reason for cancelling."],
    }[check.reason] as [ConstructorParameters<typeof AppError>[0], string];
    throw new AppError(
      msg[0],
      msg[1],
      msg[0] === "VALIDATION"
        ? {
            fields: {
              [check.reason === "REASON_REQUIRED" ? "reason" : "meeting"]:
                msg[1],
            },
          }
        : {},
    );
  }
  const from = m.status;
  m.status = to;
  const holders = holdersOf(d, id);
  if (to === "open" && from === "draft") ev.n01MeetingOpened(d, at, m);
  if (to === "finalized") ev.n02Finalized(d, at, m, holders);
  if (to === "completed") {
    m.completedAt = at.toISOString();
    ev.removeTasks(
      d,
      (t) => t.code === "T-01" && t.link.startsWith(`/meetings/${id}`),
    );
  }
  if (to === "cancelled") {
    m.cancelledReason = reason!.trim();
    ev.n04Cancelled(d, at, m, holders);
    ev.removeTasks(d, (t) => t.link.startsWith(`/meetings/${id}`));
  }
  log(
    d,
    at,
    actorId,
    to === "cancelled" ? "meeting.cancel" : "meeting.status",
    "meeting",
    id,
    { status: from },
    { status: to, ...(reason ? { cancelledReason: reason.trim() } : {}) },
  );
  return { meeting: { ...m }, warnings: check.warnings };
}

export function meetingsService({ store, call }: Ctx): MeetingsService {
  return {
    list: (f = {}) =>
      call((sid) => {
        const d = store.getState();
        const { actor, member } = me(d, sid);
        const typeName = (id: string) =>
          d.meetingTypes.find((t) => t.id === id)?.name ?? "";
        return d.meetings
          .filter((m) =>
            can(actor, "meeting.view", { meetingStatus: m.status }),
          )
          .filter(
            (m) =>
              (!f.from || m.startsAt >= f.from) &&
              (!f.to || m.startsAt <= f.to) &&
              (!f.typeId || m.meetingTypeId === f.typeId) &&
              (!f.status || m.status === f.status),
          )
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          .map((m): MeetingListItem => {
            const slots = d.meetingRoles.filter((s) => s.meetingId === m.id);
            return {
              ...m,
              typeName: typeName(m.meetingTypeId),
              total: slots.length,
              filled: slots.filter((s) => s.memberId).length,
              myRoles: slots
                .filter((s) => s.memberId === member.id)
                .map((s) => s.label),
            };
          });
      }),
    get: (id) =>
      call((sid) => {
        const d = store.getState();
        const { actor } = me(d, sid);
        const m = meetingOf(d, id);
        assertCan(actor, "meeting.view", { meetingStatus: m.status });
        return {
          ...m,
          typeName:
            d.meetingTypes.find((t) => t.id === m.meetingTypeId)?.name ?? "",
          agendaFile: d.files.find((f) => f.id === m.agendaFileId) ?? null,
        };
      }),
    create: (input) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, "meeting.create");
          const at = now();
          const parsed = meetingInput(at).safeParse(input);
          if (!parsed.success)
            throw validation(
              Object.fromEntries(
                parsed.error.issues.map((i) => [
                  String(i.path[0] ?? "meeting"),
                  i.message,
                ]),
              ),
            );
          const type = d.meetingTypes.find((t) => t.id === input.meetingTypeId);
          if (!type)
            throw validation({ meetingTypeId: "Choose a meeting type." });
          const id = newId("mtg");
          const roles =
            input.roles ??
            d.meetingTypeRoles
              .filter((r) => r.meetingTypeId === type.id)
              .sort((a, b) => a.sortOrder - b.sortOrder);
          const m: Meeting = {
            id,
            title: parsed.data.title,
            meetingTypeId: type.id,
            templateId: null,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            venue: input.venue?.trim() || null,
            meetingLink: input.meetingLink?.trim() || null,
            status: "draft",
            theme: null,
            welcomeNote: null,
            wordOfTheDay: null,
            wordMeaning: null,
            themePublishedAt: null,
            agendaFileId: null,
            withdrawalCutoffHours: null,
            cancelledReason: null,
            completedAt: null,
            createdBy: actor.id,
          };
          d.meetings.push(m);
          d.meetingRoles.push(
            ...buildSlots(
              d,
              id,
              roles.map((r) => ({
                roleTemplateId: r.roleTemplateId,
                count: r.count,
              })),
            ),
          );
          log(d, at, actor.id, "meeting.create", "meeting", id, null, {
            title: m.title,
            startsAt: m.startsAt,
          });
          return { ...m };
        }),
      ),
    update: (id, patch) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, "meeting.update");
          const m = meetingOf(d, id);
          assertEditable(m);
          const at = now();
          const before: Record<string, unknown> = {};
          const after: Record<string, unknown> = {};
          const timeChanged =
            (patch.startsAt && patch.startsAt !== m.startsAt) ||
            (patch.endsAt && patch.endsAt !== m.endsAt);
          if (timeChanged) {
            const parsed = meetingInput(at).safeParse({
              title: patch.title ?? m.title,
              meetingTypeId: m.meetingTypeId,
              startsAt: patch.startsAt ?? m.startsAt,
              endsAt: patch.endsAt ?? m.endsAt,
            });
            if (!parsed.success)
              throw validation(
                Object.fromEntries(
                  parsed.error.issues.map((i) => [
                    String(i.path[0] ?? "meeting"),
                    i.message,
                  ]),
                ),
              );
          }
          for (const [k, v] of Object.entries(patch) as [
            keyof typeof patch,
            never,
          ][]) {
            if (v === undefined || m[k] === v) continue;
            before[k] = m[k];
            after[k] = v;
            (m[k] as unknown) = v;
          }
          if (Object.keys(after).length === 0) return { ...m };
          if (timeChanged) ev.n03Rescheduled(d, at, m, holdersOf(d, id));
          log(
            d,
            at,
            actor.id,
            timeChanged ? "meeting.reschedule" : "meeting.update",
            "meeting",
            id,
            before,
            after,
          );
          return { ...m };
        }),
      ),
    cancel: (id, reason) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, "meeting.cancel");
          return transition(d, actor.id, id, "cancelled", reason).meeting;
        }),
      ),
    setStatus: (id, status) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(
            actor,
            status === "completed" ? "meeting.complete" : "meeting.status",
          );
          return transition(d, actor.id, id, status);
        }),
      ),
    publishTheme: (id, input) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          const m = meetingOf(d, id);
          assertCan(actor, "meeting.theme.edit", {
            meetingStatus: m.status,
            tmodHolderId: tmodHolder(d, id),
          });
          assertEditable(m);
          const at = now();
          const clean = (v: string | null) => v?.trim() || null;
          const before = { theme: m.theme, wordOfTheDay: m.wordOfTheDay };
          m.theme = clean(input.theme);
          m.welcomeNote = clean(input.welcomeNote);
          m.wordOfTheDay = clean(input.wordOfTheDay);
          m.wordMeaning = clean(input.wordMeaning);
          if (m.theme || m.wordOfTheDay) {
            m.themePublishedAt = at.toISOString();
            ev.n05ThemePublished(d, at, m, m.theme, m.wordOfTheDay);
          }
          if (m.theme && m.wordOfTheDay)
            ev.closeTasks(d, at, (t) => t.code === "T-07" && t.refId === id);
          log(d, at, actor.id, "meeting.update", "meeting", id, before, {
            theme: m.theme,
            wordOfTheDay: m.wordOfTheDay,
          });
          return { ...m };
        }),
      ),
    agendaOutline: (id) =>
      call((sid) => {
        const d = store.getState();
        const { actor } = me(d, sid);
        const m = meetingOf(d, id);
        assertCan(actor, "meeting.view", { meetingStatus: m.status });
        const slots = d.meetingRoles
          .filter((s) => s.meetingId === id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        let at = Date.parse(m.startsAt);
        return d.agendaItems
          .filter((i) => i.meetingTypeId === m.meetingTypeId)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((i) => {
            const row = {
              id: i.id,
              startsAt: new Date(at).toISOString(),
              title: i.title,
              durationMinutes: i.durationMinutes,
              holders: slots
                .filter(
                  (s) =>
                    i.roleTemplateId &&
                    s.roleTemplateId === i.roleTemplateId &&
                    s.memberId,
                )
                .map(
                  (s) => d.members.find((x) => x.id === s.memberId)?.name ?? "",
                ),
            };
            at += i.durationMinutes * 60_000;
            return row;
          });
      }),
    uploadAgenda: (id, file: UploadFile) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, "meeting.agenda.upload");
          const m = meetingOf(d, id);
          const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
          if (!(ALLOWED_FILES[file.mimeType] ?? []).includes(ext))
            throw validation({ file: "Upload a PDF, DOCX, PNG or JPG file." });
          if (file.sizeBytes > MAX_BYTES)
            throw validation({ file: "The file must be 10 MB or smaller." });
          const at = now();
          const safe = file.name
            .split(/[\\/]/)
            .pop()!
            .replace(/[^A-Za-z0-9._-]/g, "_");
          const rec = {
            id: newId("file"),
            storageKey: file.url ?? `mock/${id}/${safe}`,
            originalName: safe,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            uploadedBy: actor.id,
            createdAt: at.toISOString(),
          };
          d.files.push(rec);
          log(
            d,
            at,
            actor.id,
            "meeting.update",
            "meeting",
            id,
            { agendaFileId: m.agendaFileId },
            { agendaFileId: rec.id },
          );
          m.agendaFileId = rec.id; // one agenda file per meeting: replace overwrites (R-14)
          return rec;
        }),
      ),
  };
}
