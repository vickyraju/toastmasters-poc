import { AppError } from "../../services/errors";
import type {
  AuditService,
  AuthService,
  DevService,
  MembersService,
  NotificationsService,
  TasksService,
  CurrentUser,
} from "../../services/interfaces";
import { notify } from "../../domain/events";
import { now } from "../../time/clock";
import {
  actorOf,
  assertCan,
  mockStartMs,
  me,
  mutate,
  runTick,
  type Ctx,
} from "./runtime";
import { createSeed } from "./seed";
import { appendAudit, tick } from "./tick";
import type { MockData } from "./state";

const userOf = (d: MockData, id: string): CurrentUser => {
  const m = d.members.find((x) => x.id === id)!;
  return { ...m, position: actorOf(d, id).position };
};

export function authService({ store, call }: Ctx): AuthService {
  return {
    signIn: (employeeId) =>
      call(() => {
        const id = employeeId.trim().toUpperCase();
        if (!id)
          throw new AppError("VALIDATION", "Enter your employee ID.", {
            fields: { employeeId: "Enter your employee ID." },
          });
        const d = store.getState();
        const m = d.members.find((x) => x.employeeId === id);
        // flow.md J-01: unknown, inactive and removed IDs get the same message, so it does not reveal which IDs exist.
        if (!m || m.status !== "active")
          throw new AppError(
            "NOT_FOUND",
            "We could not find that employee ID.",
          );
        store.setState({ session: { memberId: m.id } });
        return userOf(store.getState(), m.id);
      }),
    demoAccounts: () =>
      call(
        () => {
          if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return [];
          const d = store.getState();
          return d.members.map((m) => ({
            employeeId: m.employeeId,
            name: m.name,
            position: actorOf(d, m.id).position,
            status: m.status,
          }));
        },
        { bypassError: true },
      ),
    // Session calls ignore "Simulate error" so the dev panel and Sign out stay reachable.
    signOut: () =>
      call(() => void store.setState({ session: { memberId: null } }), {
        bypassError: true,
      }),
    getCurrentUser: () =>
      call(
        (sid) => {
          const d = store.getState();
          const m = sid ? d.members.find((x) => x.id === sid) : undefined;
          return m && m.status === "active" ? userOf(d, m.id) : null;
        },
        { bypassError: true },
      ),
  };
}

export function membersService({ store, call }: Ctx): MembersService {
  return {
    list: () =>
      call((sid) => {
        const d = store.getState();
        assertCan(me(d, sid).actor, "member.view_directory");
        return d.members.filter((m) => m.status !== "removed");
      }),
    get: (id) =>
      call((sid) => {
        const d = store.getState();
        const { actor } = me(d, sid);
        if (actor.id !== id) assertCan(actor, "member.view_directory");
        const m = d.members.find((x) => x.id === id);
        if (!m) throw new AppError("NOT_FOUND", "Member not found.");
        return m;
      }),
  };
}

export function tasksService({ store, call }: Ctx): TasksService {
  return {
    listMine: () =>
      call((sid) => {
        me(store.getState(), sid);
        runTick(store);
        return store
          .getState()
          .tasks.filter((t) => t.memberId === sid && !t.doneAt);
      }),
  };
}

export function notificationsService({
  store,
  call,
}: Ctx): NotificationsService {
  return {
    listMine: () =>
      call((sid) => {
        me(store.getState(), sid);
        runTick(store);
        const items = store
          .getState()
          .notifications.filter((n) => n.memberId === sid)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return { items, unread: items.filter((n) => !n.readAt).length };
      }),
    markRead: (ids) =>
      call((sid) =>
        mutate(store, (d) => {
          me(d, sid);
          for (const n of d.notifications)
            if (n.memberId === sid && ids.includes(n.id) && !n.readAt)
              n.readAt = now().toISOString();
        }),
      ),
    markAllRead: () =>
      call((sid) =>
        mutate(store, (d) => {
          me(d, sid);
          for (const n of d.notifications)
            if (n.memberId === sid && !n.readAt) n.readAt = now().toISOString();
        }),
      ),
    subscribe: (listener) => {
      let seen = new Set(store.getState().notifications.map((n) => n.id));
      return store.subscribe((state) => {
        const me = state.session.memberId;
        for (const n of state.notifications)
          if (!seen.has(n.id) && n.memberId === me) listener(n);
        seen = new Set(state.notifications.map((n) => n.id));
      });
    },
  };
}

export function auditService({ store, call }: Ctx): AuditService {
  return {
    list: (f = {}) =>
      call((sid) => {
        const d = store.getState();
        assertCan(me(d, sid).actor, "audit.view");
        return d.audit
          .filter(
            (a) =>
              (!f.action || a.action === f.action) &&
              (!f.actorId || a.actorId === f.actorId) &&
              (!f.from || a.createdAt >= f.from) &&
              (!f.to || a.createdAt <= f.to),
          )
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }),
    recordDenied: (path) =>
      call(
        (sid) =>
          mutate(store, (d) => {
            const { actor } = me(d, sid);
            appendAudit(
              d,
              actor.id,
              "permission.denied",
              "route",
              path,
              now(),
              null,
              { path },
            );
          }),
        { bypassError: true },
      ),
  };
}

export function devService({ store, call }: Ctx): DevService {
  const run = <T>(fn: (sid: string | null) => T) =>
    call(fn, { bypassError: true });
  return {
    jump: (to) =>
      run(() => {
        const d = store.getState();
        const at = now().getTime();
        let ms = 0;
        if (typeof to === "object") ms = to.ms;
        else {
          const key = to === "next-meeting-start" ? "startsAt" : "endsAt";
          const next = d.meetings
            .filter(
              (m) =>
                m.status !== "draft" &&
                m.status !== "cancelled" &&
                Date.parse(m[key]) > at,
            )
            .map((m) => Date.parse(m[key]))
            .sort((a, b) => a - b)[0];
          if (next === undefined)
            throw new AppError("NOT_FOUND", "No upcoming meeting to jump to.");
          ms = next - at;
        }
        mutate(store, (x) => {
          x.dev.clockJumpMs += ms;
        });
        runTick(store);
      }),
    // Keeps the signed-in member so the dev panel stays open after a reset.
    reset: () =>
      run(() => {
        const session = store.getState().session;
        store.setState({ ...createSeed(mockStartMs()), session }, true);
        runTick(store);
      }),
    setSimulateError: (on) =>
      run(() =>
        mutate(store, (d) => {
          d.dev.simulateError = on;
        }),
      ),
    sendTestNotification: () =>
      run((sid) =>
        mutate(store, (d) => {
          const { member } = me(d, sid);
          notify(d, now(), {
            memberId: member.id,
            code: "N-07",
            title: "Test notification: you were assigned a role",
            link: "/home",
          });
        }),
      ),
    tick: () => run(() => mutate(store, (d) => tick(d, now()))),
    status: () =>
      run(() => ({
        now: now().toISOString(),
        simulateError: store.getState().dev.simulateError,
      })),
  };
}
