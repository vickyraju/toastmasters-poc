import { AppError } from "../../services/errors";
import type {
  MeetingTypeView,
  RecurringView,
  TemplatesService,
} from "../../services/interfaces";
import {
  meetingTypeInput,
  projectInput,
  recurringInput,
  roleTemplateInput,
} from "../../domain/schemas";
import { recurringDates } from "../../domain/rules/recurring";
import * as ev from "../../domain/events";
import { newId } from "../../domain/ids";
import { now } from "../../time/clock";
import { istDate } from "../../time/ist";
import type { Meeting, RoleTemplate } from "../../domain/types";
import type { ZodType, ZodTypeDef } from "zod";
import { assertCan, me, mutate, type Ctx } from "./runtime";
import { log } from "./helpers";
import type { MockData } from "./state";
import { buildSlots } from "./slots";

/** Parse with a schema; failures become VALIDATION with a field map (schema.md section 8). */
function parse<T>(schema: ZodType<T, ZodTypeDef, unknown>, value: unknown): T {
  const r = schema.safeParse(value);
  if (r.success) return r.data;
  const fields = Object.fromEntries(
    r.error.issues.map((i) => [String(i.path.join(".") || "form"), i.message]),
  );
  throw new AppError(
    "VALIDATION",
    Object.values(fields)[0] ?? "Check the form.",
    { fields },
  );
}

const taken = (names: string[], name: string, exceptIndex: number) =>
  names.some(
    (n, i) =>
      i !== exceptIndex && n.trim().toLowerCase() === name.trim().toLowerCase(),
  );

const slug = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

/** Slots for every date the template is missing; existing ones (same template and start) are left alone. */
function generate(d: MockData, at: Date): number {
  let created = 0;
  for (const t of d.recurringTemplates.filter((x) => x.isActive)) {
    const type = d.meetingTypes.find((x) => x.id === t.meetingTypeId);
    if (!type?.isActive) continue;
    const have = new Set(
      d.meetings.filter((m) => m.templateId === t.id).map((m) => m.startsAt),
    );
    for (const startsAt of recurringDates(t, at.toISOString())) {
      if (have.has(startsAt)) continue;
      const id = `mtg-${istDate(startsAt)}${d.meetings.some((m) => m.id === `mtg-${istDate(startsAt)}`) ? `-${newId("g").slice(2)}` : ""}`;
      const m: Meeting = {
        id,
        title: type.name,
        meetingTypeId: type.id,
        templateId: t.id,
        startsAt,
        endsAt: new Date(
          Date.parse(startsAt) + t.durationMinutes * 60_000,
        ).toISOString(),
        venue: t.venue,
        meetingLink: t.meetingLink,
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
        createdBy: d.positions[0]?.memberId ?? "system",
      };
      d.meetings.push(m);
      const roles = d.meetingTypeRoles
        .filter((r) => r.meetingTypeId === type.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
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
      created++;
    }
  }
  return created;
}

export function templatesService({ store, call }: Ctx): TemplatesService {
  return {
    roleTemplates: () =>
      call((sid) => {
        const d = store.getState();
        me(d, sid);
        return d.roleTemplates;
      }),
    projects: () =>
      call((sid) => {
        const d = store.getState();
        me(d, sid);
        return d.projects;
      }),
    meetingTypes: () =>
      call((sid): MeetingTypeView[] => {
        const d = store.getState();
        me(d, sid);
        return d.meetingTypes.map((t) => ({
          ...t,
          roles: d.meetingTypeRoles
            .filter((r) => r.meetingTypeId === t.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((r) => ({
              roleTemplateId: r.roleTemplateId,
              roleName:
                d.roleTemplates.find((x) => x.id === r.roleTemplateId)?.name ??
                "",
              count: r.count,
            })),
          agendaItems: d.agendaItems
            .filter((a) => a.meetingTypeId === t.id)
            .sort((a, b) => a.sortOrder - b.sortOrder),
        }));
      }),
    recurring: () =>
      call((sid): RecurringView[] => {
        const d = store.getState();
        me(d, sid);
        return d.recurringTemplates.map((t) => ({
          ...t,
          typeName:
            d.meetingTypes.find((x) => x.id === t.meetingTypeId)?.name ?? "",
        }));
      }),

    saveMeetingType: (id, raw) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, "meeting_type.edit");
          const v = parse(meetingTypeInput, raw);
          const names = d.meetingTypes.map((t) => t.name);
          const idx = id ? d.meetingTypes.findIndex((t) => t.id === id) : -1;
          if (id && idx < 0)
            throw new AppError("NOT_FOUND", "Meeting type not found.");
          if (taken(names, v.name, idx))
            throw new AppError(
              "VALIDATION",
              "A meeting type with this name already exists.",
              {
                fields: {
                  name: "A meeting type with this name already exists.",
                },
              },
            );
          const at = now();
          const type = id
            ? Object.assign(d.meetingTypes[idx], {
                name: v.name,
                defaultDurationMinutes: v.defaultDurationMinutes,
                isActive: v.isActive,
              })
            : {
                id: newId("mt"),
                name: v.name,
                defaultDurationMinutes: v.defaultDurationMinutes,
                isActive: v.isActive,
              };
          if (!id) d.meetingTypes.push(type);
          d.meetingTypeRoles = d.meetingTypeRoles.filter(
            (r) => r.meetingTypeId !== type.id,
          );
          v.roles
            .filter((r) => r.count > 0)
            .forEach((r, i) =>
              d.meetingTypeRoles.push({
                meetingTypeId: type.id,
                roleTemplateId: r.roleTemplateId,
                count: r.count,
                sortOrder: i,
              }),
            );
          d.agendaItems = d.agendaItems.filter(
            (a) => a.meetingTypeId !== type.id,
          );
          v.agendaItems.forEach((a, i) =>
            d.agendaItems.push({
              id: newId("agi"),
              meetingTypeId: type.id,
              sortOrder: i,
              title: a.title,
              durationMinutes: a.durationMinutes,
              roleTemplateId: a.roleTemplateId,
            }),
          );
          if (!id)
            ev.n08TemplateAdded(
              d,
              at,
              type.id,
              `New meeting type added: ${type.name}`,
            );
          log(
            d,
            at,
            actor.id,
            "template.change",
            "meeting_type",
            type.id,
            id ? { name: names[idx] } : null,
            { name: type.name },
          );
          return { ...type };
        }),
      ),

    saveRoleTemplate: (id, raw) =>
      call((sid) =>
        mutate(store, (d): RoleTemplate => {
          const { actor } = me(d, sid);
          assertCan(actor, "template.edit");
          const v = parse(roleTemplateInput, raw);
          const idx = id ? d.roleTemplates.findIndex((t) => t.id === id) : -1;
          if (id && idx < 0) throw new AppError("NOT_FOUND", "Role not found.");
          if (
            taken(
              d.roleTemplates.map((t) => t.name),
              v.name,
              idx,
            )
          )
            throw new AppError(
              "VALIDATION",
              "A role with this name already exists.",
              { fields: { name: "A role with this name already exists." } },
            );
          const at = now();
          const fields = {
            name: v.name,
            category: v.category,
            reportKind: v.reportKind,
            isSpeaker: v.isSpeaker,
            isEvaluator: v.isEvaluator,
            defaultCount: v.defaultCount,
          };
          const role: RoleTemplate = id
            ? Object.assign(d.roleTemplates[idx], fields)
            : { id: `rt-${slug(v.name)}`, code: slug(v.name), ...fields };
          if (!id) {
            d.roleTemplates.push(role);
            ev.n08TemplateAdded(
              d,
              at,
              role.id,
              `New role added to the catalog: ${role.name}`,
            );
          }
          log(
            d,
            at,
            actor.id,
            "template.change",
            "role_template",
            role.id,
            id ? { name: role.name } : null,
            { name: role.name },
          );
          return { ...role };
        }),
      ),

    saveProject: (id, raw) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, "template.edit");
          const v = parse(projectInput, raw);
          const idx = id ? d.projects.findIndex((p) => p.id === id) : -1;
          if (id && idx < 0)
            throw new AppError("NOT_FOUND", "Project not found.");
          const at = now();
          const p = id
            ? Object.assign(d.projects[idx], {
                pathway: v.pathway,
                level: v.level,
                name: v.name,
                minSeconds: v.minSeconds,
                maxSeconds: v.maxSeconds,
              })
            : {
                id: newId("prj"),
                pathway: v.pathway,
                level: v.level,
                name: v.name,
                minSeconds: v.minSeconds,
                maxSeconds: v.maxSeconds,
                isCustom: true,
              };
          if (!id) d.projects.push(p);
          log(d, at, actor.id, "template.change", "project", p.id, null, {
            name: p.name,
            minSeconds: p.minSeconds,
            maxSeconds: p.maxSeconds,
          });
          return { ...p };
        }),
      ),

    saveRecurring: (id, raw, applyToDrafts = false) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, "template.edit");
          const v = parse(recurringInput, raw);
          if (!d.meetingTypes.some((t) => t.id === v.meetingTypeId))
            throw new AppError("VALIDATION", "Choose a meeting type.", {
              fields: { meetingTypeId: "Choose a meeting type." },
            });
          const idx = id
            ? d.recurringTemplates.findIndex((t) => t.id === id)
            : -1;
          if (id && idx < 0)
            throw new AppError("NOT_FOUND", "Template not found.");
          if (
            taken(
              d.recurringTemplates.map((t) => t.name),
              v.name,
              idx,
            )
          )
            throw new AppError(
              "VALIDATION",
              "A template with this name already exists.",
              { fields: { name: "A template with this name already exists." } },
            );
          const at = now();
          const fields = { ...v, skipDates: [...v.skipDates].sort() };
          const t = id
            ? Object.assign(d.recurringTemplates[idx], fields)
            : { id: newId("tpl"), ...fields };
          if (!id) {
            d.recurringTemplates.push(t);
            ev.n08TemplateAdded(
              d,
              at,
              t.id,
              `New recurring meeting template added: ${t.name}`,
            );
          } else if (applyToDrafts) {
            // R-08: only generated, still-Draft meetings with nobody in a role; everything else is left alone.
            for (const m of d.meetings.filter(
              (x) => x.templateId === t.id && x.status === "draft",
            )) {
              if (
                d.meetingRoles.some((r) => r.meetingId === m.id && r.memberId)
              )
                continue;
              const date = istDate(m.startsAt);
              m.startsAt = new Date(
                Date.parse(`${date}T${t.startTime}:00+05:30`),
              ).toISOString();
              m.endsAt = new Date(
                Date.parse(m.startsAt) + t.durationMinutes * 60_000,
              ).toISOString();
              m.venue = t.venue;
              m.meetingLink = t.meetingLink;
            }
          }
          log(
            d,
            at,
            actor.id,
            "template.change",
            "recurring_template",
            t.id,
            null,
            { name: t.name, applyToDrafts },
          );
          return { ...t };
        }),
      ),

    generateRecurring: () =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, "template.edit");
          return { created: generate(d, now()) };
        }),
      ),
  };
}
