import { AppError } from "../../services/errors";
import type {
  ImportResult,
  MemberProfile,
  MemberRoleLine,
  MemberRow,
  MembersService,
  PositionsService,
  RemovalImpact,
} from "../../services/interfaces";
import { memberAddInput, memberEditInput } from "../../domain/schemas";
import { MAX_IMPORT_ROWS } from "../../domain/memberImport";
import { can } from "../../permissions/can";
import * as ev from "../../domain/events";
import { newId } from "../../domain/ids";
import { POSITION_LABELS } from "../../domain/constants";
import { now } from "../../time/clock";
import type { Member, Position } from "../../domain/types";
import type { ZodType, ZodTypeDef } from "zod";
import { assertCan, me, mutate, type Ctx } from "./runtime";
import { expireSlotRequests, log, meetingOf } from "./helpers";
import type { MockData } from "./state";

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

const positionOf = (d: MockData, memberId: string): Position | null =>
  d.positions.find((p) => p.memberId === memberId)?.code ?? null;

/** account_type is derived from positions and recomputed whenever they change (schema.md section 2). */
function recompute(d: MockData, memberId: string | null) {
  const m = d.members.find((x) => x.id === memberId);
  if (!m) return;
  const pos = positionOf(d, m.id);
  m.accountType = pos === "president" ? "president" : pos ? "excomm" : "member";
}

/** Officer-only tasks end when the seat does; the VPE's verification tasks move with the seat. */
function closeOfficerTasks(d: MockData, memberId: string, at: Date) {
  ev.closeTasks(
    d,
    at,
    (t) =>
      t.memberId === memberId &&
      ["T-02", "T-03", "T-05", "T-08"].includes(t.code),
  );
}

function setSeat(
  d: MockData,
  code: Position,
  memberId: string | null,
  byId: string,
  at: Date,
) {
  const seat = d.positions.find((p) => p.code === code)!;
  const previous = seat.memberId;
  seat.memberId = memberId;
  seat.assignedAt = memberId ? at.toISOString() : null;
  seat.assignedBy = memberId ? byId : null;
  recompute(d, previous);
  recompute(d, memberId);
  if (previous && previous !== memberId) {
    closeOfficerTasks(d, previous, at);
    // pending withdrawals need ExComm; the demoted member's own T-02 tasks are closed above, nothing else changes
  }
  if (code === "vpe") {
    const open = d.completions.filter((c) => c.status === "pending");
    if (previous)
      ev.closeTasks(d, at, (t) => t.code === "T-03" && t.memberId === previous);
    if (memberId) {
      for (const c of open) {
        const name =
          d.members.find((x) => x.id === c.memberId)?.name ?? "A member";
        ev.levelLogged(d, at, { id: c.id, memberName: name, level: c.level });
      }
    }
  }
  return previous;
}

/** Future roles in meetings that have not started and are not over (Open, Finalized, Draft). */
function futureSlots(d: MockData, memberId: string, at: Date) {
  return d.meetingRoles
    .filter((s) => s.memberId === memberId)
    .map((s) => ({ s, m: meetingOf(d, s.meetingId) }))
    .filter(
      ({ m }) =>
        (m.status === "draft" ||
          m.status === "open" ||
          m.status === "finalized") &&
        Date.parse(m.endsAt) > at.getTime(),
    )
    .sort((a, b) => a.m.startsAt.localeCompare(b.m.startsAt));
}

function impactOf(
  d: MockData,
  actorId: string,
  memberId: string,
  at: Date,
): RemovalImpact {
  const target = d.members.find((m) => m.id === memberId);
  if (!target) throw new AppError("NOT_FOUND", "Member not found.");
  const pos = positionOf(d, memberId);
  const blocked =
    memberId === actorId
      ? "You cannot remove yourself."
      : pos === "president"
        ? "Transfer the presidency first."
        : target.status === "removed"
          ? "This member was already removed."
          : null;
  return {
    roles: futureSlots(d, memberId, at).map(({ s, m }) => ({
      slotId: s.id,
      meetingId: m.id,
      meetingTitle: m.title,
      startsAt: m.startsAt,
      label: s.label,
    })),
    position: pos,
    blocked,
  };
}

/** Release future roles, vacate the seat, end swaps and requests on those slots, drop open tasks (R-16, schema.md section 5). */
function stepDown(
  d: MockData,
  actorId: string,
  memberId: string,
  at: Date,
): number {
  const slots = futureSlots(d, memberId, at);
  for (const { s } of slots) {
    s.memberId = null;
    s.status = "open";
    s.version += 1;
    s.assignedBy = null;
    s.assignedAt = null;
    expireSlotRequests(d, s.id, at, actorId);
  }
  const pos = positionOf(d, memberId);
  if (pos) {
    setSeat(d, pos, null, actorId, at);
    log(
      d,
      at,
      actorId,
      "position.remove",
      "position",
      pos,
      { memberId },
      { memberId: null },
    );
  }
  if (d.settings.nextPresidentId === memberId)
    d.settings.nextPresidentId = null;
  ev.removeTasks(d, (t) => t.memberId === memberId);
  return slots.length;
}

export function membersService({ store, call }: Ctx): MembersService {
  const row = (d: MockData, m: Member): MemberRow => ({
    ...m,
    position: positionOf(d, m.id),
  });
  const find = (d: MockData, id: string) => {
    const m = d.members.find((x) => x.id === id);
    if (!m) throw new AppError("NOT_FOUND", "Member not found.");
    return m;
  };

  return {
    list: () =>
      call((sid) => {
        const d = store.getState();
        assertCan(me(d, sid).actor, "member.view_directory");
        return d.members.map((m) => row(d, m));
      }),
    get: (id) =>
      call((sid) => {
        const d = store.getState();
        const { actor } = me(d, sid);
        if (actor.id !== id) assertCan(actor, "member.view_directory");
        return find(d, id);
      }),

    profile: (id) =>
      call((sid): MemberProfile => {
        const d = store.getState();
        const { actor } = me(d, sid);
        if (actor.id !== id) assertCan(actor, "member.view_directory");
        const m = find(d, id);
        const roles: MemberRoleLine[] = d.meetingRoles
          .filter((s) => s.memberId === id)
          .map((s) => ({ s, mt: meetingOf(d, s.meetingId) }))
          .filter(
            ({ mt }) => mt.status !== "cancelled" && mt.status !== "draft",
          )
          .sort((a, b) => a.mt.startsAt.localeCompare(b.mt.startsAt))
          .map(({ s, mt }) => ({
            meetingId: mt.id,
            meetingTitle: mt.title,
            startsAt: mt.startsAt,
            label: s.label,
            meetingStatus: mt.status,
          }));
        const completions = d.completions
          .filter((c) => c.memberId === id)
          .sort((a, b) => b.completedOn.localeCompare(a.completedOn));
        return {
          member: row(d, m),
          roles,
          completions,
          projectsCompleted: completions.filter(
            (c) => c.kind === "project" && c.status === "counted",
          ).length,
        };
      }),

    importCsv: (rows, commit) =>
      call((sid) =>
        mutate(store, (d): ImportResult => {
          const { actor } = me(d, sid);
          assertCan(actor, "member.add");
          if (rows.length === 0)
            throw new AppError("VALIDATION", "The file has no members.");
          if (rows.length > MAX_IMPORT_ROWS)
            throw new AppError(
              "VALIDATION",
              `Import up to ${MAX_IMPORT_ROWS} members at a time.`,
            );
          const at = now();
          const seenIds = new Set<string>();
          const seenEmails = new Set<string>();
          const out: ImportResult = {
            rows: [],
            valid: 0,
            invalid: 0,
            added: 0,
          };
          for (const r of rows) {
            const errors: string[] = [];
            const parsed = memberAddInput.safeParse({
              employeeId: r.employeeId,
              name: r.name,
              email: r.email,
              toastmastersId: r.toastmastersId,
              pathway: r.pathway,
              currentLevel: r.level === "" ? undefined : r.level,
            });
            if (!parsed.success) {
              for (const i of parsed.error.issues)
                errors.push(
                  i.path[0] === "currentLevel"
                    ? "The level must be a whole number from 1 to 5."
                    : i.message,
                );
            } else {
              const v = parsed.data;
              if (seenIds.has(v.employeeId))
                errors.push("This employee ID appears earlier in the file.");
              else if (d.members.some((m) => m.employeeId === v.employeeId))
                errors.push("A member with this employee ID already exists.");
              if (seenEmails.has(v.email))
                errors.push("This email appears earlier in the file.");
              else if (d.members.some((m) => m.email === v.email))
                errors.push("A member with this email already exists.");
              seenIds.add(v.employeeId);
              seenEmails.add(v.email);
              if (errors.length === 0 && commit) {
                const m: Member = {
                  id: newId("mem"),
                  employeeId: v.employeeId,
                  name: v.name,
                  email: v.email,
                  toastmastersId: v.toastmastersId,
                  pathway: v.pathway,
                  currentLevel: v.currentLevel,
                  accountType: "member",
                  status: "active",
                  joinedAt: null,
                  lastActiveAt: null,
                };
                d.members.push(m);
                log(d, at, actor.id, "member.add", "member", m.id, null, {
                  employeeId: m.employeeId,
                  name: m.name,
                  source: "csv import",
                });
                out.added++;
              }
            }
            out.rows.push({
              line: r.line,
              name: r.name,
              employeeId: r.employeeId,
              errors,
            });
            if (errors.length) out.invalid++;
            else out.valid++;
          }
          return out;
        }),
      ),

    add: (raw) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, "member.add");
          const v = parse(memberAddInput, raw);
          const fields: Record<string, string> = {};
          if (d.members.some((m) => m.employeeId === v.employeeId))
            fields.employeeId =
              "A member with this employee ID already exists.";
          if (d.members.some((m) => m.email === v.email))
            fields.email = "A member with this email already exists.";
          if (Object.keys(fields).length)
            throw new AppError("VALIDATION", Object.values(fields)[0], {
              fields,
            });
          const at = now();
          const m: Member = {
            id: newId("mem"),
            employeeId: v.employeeId,
            name: v.name,
            email: v.email,
            toastmastersId: v.toastmastersId,
            pathway: v.pathway,
            currentLevel: v.currentLevel,
            accountType: "member",
            status: "active",
            joinedAt: null,
            lastActiveAt: null,
          };
          d.members.push(m);
          log(d, at, actor.id, "member.add", "member", m.id, null, {
            employeeId: m.employeeId,
            name: m.name,
          });
          return { ...m };
        }),
      ),

    update: (id, raw) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          const m = find(d, id);
          const officer = can(actor, "member.update");
          if (!officer && !can(actor, "member.edit_self", { ownerId: id }))
            throw new AppError("FORBIDDEN", "You do not have access to this.");
          if (m.status === "removed")
            throw new AppError(
              "INVALID_STATE",
              "A removed member cannot be edited.",
            );
          // Toastmasters ID is read-only for the member themselves (S-18).
          if (
            !officer &&
            raw.toastmastersId !== undefined &&
            (raw.toastmastersId ?? null) !== m.toastmastersId
          )
            throw new AppError(
              "FORBIDDEN",
              "Only ExComm can change the Toastmasters ID.",
            );
          const v = parse(memberEditInput, {
            name: m.name,
            email: m.email,
            toastmastersId: m.toastmastersId,
            pathway: m.pathway,
            ...raw,
          });
          if (d.members.some((x) => x.id !== id && x.email === v.email))
            throw new AppError(
              "VALIDATION",
              "A member with this email already exists.",
              { fields: { email: "A member with this email already exists." } },
            );
          const before: Record<string, unknown> = {};
          const after: Record<string, unknown> = {};
          for (const k of [
            "name",
            "email",
            "toastmastersId",
            "pathway",
          ] as const) {
            if (m[k] !== v[k]) {
              before[k] = m[k];
              after[k] = v[k];
              (m[k] as unknown) = v[k];
            }
          }
          if (Object.keys(after).length)
            log(
              d,
              now(),
              actor.id,
              "member.update",
              "member",
              id,
              before,
              after,
            );
          return { ...m };
        }),
      ),

    impact: (id) =>
      call((sid) => {
        const d = store.getState();
        const { actor } = me(d, sid);
        assertCan(actor, "member.remove");
        return impactOf(d, actor.id, id, now());
      }),

    setActive: (id, active) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, "member.remove");
          const m = find(d, id);
          const at = now();
          if (m.status === "removed")
            throw new AppError(
              "INVALID_STATE",
              "A removed member cannot be changed.",
            );
          if (!active) {
            const imp = impactOf(d, actor.id, id, at);
            if (imp.blocked)
              throw new AppError(
                "INVALID_STATE",
                imp.blocked.replace("remove", "deactivate"),
              );
          }
          const before = m.status;
          m.status = active ? "active" : "inactive";
          const released = active ? 0 : stepDown(d, actor.id, id, at);
          if (before !== m.status)
            log(
              d,
              at,
              actor.id,
              "member.update",
              "member",
              id,
              { status: before },
              { status: m.status, released },
            );
          return { released };
        }),
      ),

    remove: (id) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, "member.remove");
          const m = find(d, id);
          const at = now();
          const imp = impactOf(d, actor.id, id, at);
          if (imp.blocked) throw new AppError("INVALID_STATE", imp.blocked);
          const before = m.status;
          m.status = "removed";
          const released = stepDown(d, actor.id, id, at);
          log(
            d,
            at,
            actor.id,
            "member.remove",
            "member",
            id,
            { status: before },
            { status: "removed", released },
          );
          return { released };
        }),
      ),
  };
}

export function positionsService({ store, call }: Ctx): PositionsService {
  const nameOf = (d: MockData, id: string | null) =>
    id ? (d.members.find((m) => m.id === id)?.name ?? null) : null;
  const activeMember = (d: MockData, id: string) => {
    const m = d.members.find((x) => x.id === id);
    if (!m || m.status !== "active")
      throw new AppError("VALIDATION", "Choose an active member.", {
        fields: { memberId: "Choose an active member." },
      });
    return m;
  };

  return {
    list: () =>
      call((sid) => {
        const d = store.getState();
        assertCan(me(d, sid).actor, "position.assign");
        return {
          items: d.positions.map((p) => ({
            code: p.code,
            memberId: p.memberId,
            memberName: nameOf(d, p.memberId),
          })),
          nextPresidentId: d.settings.nextPresidentId,
          nextPresidentName: nameOf(d, d.settings.nextPresidentId),
        };
      }),

    assign: (code, memberId) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, memberId ? "position.assign" : "position.remove");
          if (code === "president")
            throw new AppError(
              "INVALID_STATE",
              "The presidency moves only through Transfer presidency.",
            );
          const at = now();
          const seat = d.positions.find((p) => p.code === code)!;
          if (memberId) {
            const m = activeMember(d, memberId);
            const held = positionOf(d, m.id);
            if (held && held !== code)
              throw new AppError(
                "INVALID_STATE",
                `${m.name} already holds ${POSITION_LABELS[held]}. Remove that position first.`,
              );
            if (held === code) return;
          } else if (!seat.memberId) return;
          const previous = setSeat(d, code, memberId, actor.id, at);
          const label = POSITION_LABELS[code];
          if (previous && previous !== memberId)
            ev.n11Position(
              d,
              at,
              previous,
              `You are no longer ${label}`,
              `${code}:${at.getTime()}:off`,
            );
          if (memberId)
            ev.n11Position(
              d,
              at,
              memberId,
              `You were assigned ${label}`,
              `${code}:${at.getTime()}:on`,
            );
          log(
            d,
            at,
            actor.id,
            memberId ? "position.assign" : "position.remove",
            "position",
            code,
            { memberId: previous },
            { memberId },
          );
        }),
      ),

    setNextPresident: (memberId) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, "position.assign");
          if (memberId) {
            const m = activeMember(d, memberId);
            if (m.id === actor.id)
              throw new AppError(
                "VALIDATION",
                "Choose someone other than yourself.",
                { fields: { memberId: "Choose someone other than yourself." } },
              );
          }
          const before = d.settings.nextPresidentId;
          if (before === memberId) return;
          d.settings.nextPresidentId = memberId;
          log(
            d,
            now(),
            actor.id,
            "settings.change",
            "club_settings",
            "next_president",
            { nextPresidentId: before },
            { nextPresidentId: memberId },
          );
        }),
      ),

    transfer: () =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, "president.transfer");
          const nextId = d.settings.nextPresidentId;
          if (!nextId)
            throw new AppError(
              "INVALID_STATE",
              "Name the next President first.",
            );
          const next = activeMember(d, nextId);
          const at = now();
          const oldSeat = positionOf(d, next.id); // their current seat becomes vacant
          if (oldSeat) setSeat(d, oldSeat, null, actor.id, at);
          // Outgoing President first, then the new one, so there is never more than one in the end (R-12).
          setSeat(d, "president", next.id, actor.id, at);
          d.settings.nextPresidentId = null;
          ev.n11Position(
            d,
            at,
            actor.id,
            "You handed the presidency to " + next.name,
            `president:${at.getTime()}:off`,
          );
          ev.n11Position(
            d,
            at,
            next.id,
            "You are now President",
            `president:${at.getTime()}:on`,
          );
          log(
            d,
            at,
            actor.id,
            "president.transfer",
            "position",
            "president",
            { memberId: actor.id },
            { memberId: next.id },
          );
          if (
            d.members.filter(
              (m) => m.accountType === "president" && m.status === "active",
            ).length !== 1
          )
            throw new AppError(
              "INTERNAL",
              "There must be exactly one President.",
            );
        }),
      ),
  };
}
